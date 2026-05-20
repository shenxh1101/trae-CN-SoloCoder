import importlib
import logging
import traceback
import socket
import os
from datetime import datetime
from celery import Task
from celery.exceptions import SoftTimeLimitExceeded
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import TaskExecution, TaskLog, Task
from app.config import settings

logger = logging.getLogger(__name__)


def get_worker_id():
    hostname = socket.gethostname()
    pid = os.getpid()
    return f"{hostname}-{pid}"


def log_task_execution(db, execution_id, level, message):
    log = TaskLog(
        execution_id=execution_id,
        level=level,
        message=message
    )
    db.add(log)
    db.commit()


@celery_app.task(bind=True, max_retries=settings.MAX_RETRIES, default_retry_delay=60)
def execute_task(self, task_id, execution_id):
    db = SessionLocal()
    try:
        execution = db.query(TaskExecution).filter(TaskExecution.id == execution_id).first()
        if not execution:
            logger.error(f"Execution {execution_id} not found")
            return {"error": "Execution not found"}
        
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            execution.status = "failed"
            execution.end_time = datetime.utcnow()
            execution.error_message = "Task not found"
            db.commit()
            return {"error": "Task not found"}
        
        if task.is_paused:
            execution.status = "paused"
            execution.end_time = datetime.utcnow()
            db.commit()
            return {"status": "paused"}
        
        if not check_dependencies(db, task):
            execution.status = "dependency_failed"
            execution.end_time = datetime.utcnow()
            execution.error_message = "Dependencies not met"
            db.commit()
            log_task_execution(db, execution_id, "WARNING", "Task skipped: dependencies not met")
            return {"status": "dependency_failed"}
        
        execution.status = "running"
        execution.start_time = datetime.utcnow()
        execution.worker_id = get_worker_id()
        db.commit()
        
        task.last_run_at = datetime.utcnow()
        db.commit()
        
        log_task_execution(db, execution_id, "INFO", f"Starting task execution: {task.name}")
        
        try:
            module_path, function_name = task.function_path.rsplit('.', 1)
            module = importlib.import_module(module_path)
            func = getattr(module, function_name)
            
            params = task.parameters or {}
            
            result = func(**params)
            
            log_task_execution(db, execution_id, "INFO", f"Task executed successfully: {result}")
            
            execution.status = "success"
            execution.end_time = datetime.utcnow()
            execution.result = {"status": "success", "result": result}
            db.commit()
            
            task.status = "success"
            db.commit()
            
            return {"status": "success", "result": result}
            
        except SoftTimeLimitExceeded as e:
            error_msg = f"Task timed out after {task.timeout} seconds"
            log_task_execution(db, execution_id, "ERROR", error_msg)
            
            if execution.retry_attempt < task.max_retries - 1:
                execution.retry_attempt += 1
                execution.status = "retrying"
                db.commit()
                log_task_execution(db, execution_id, "WARNING", f"Retrying task (attempt {execution.retry_attempt + 1}/{task.max_retries})")
                db.close()
                raise self.retry(countdown=30, exc=e)
            
            execution.status = "timeout"
            execution.end_time = datetime.utcnow()
            execution.error_message = error_msg
            db.commit()
            
            task.status = "failed"
            db.commit()
            
            return {"status": "timeout", "error": error_msg}
            
        except Exception as e:
            error_msg = f"Task failed: {str(e)}\n{traceback.format_exc()}"
            log_task_execution(db, execution_id, "ERROR", error_msg)
            
            if execution.retry_attempt < task.max_retries - 1:
                execution.retry_attempt += 1
                execution.status = "retrying"
                db.commit()
                log_task_execution(db, execution_id, "WARNING", f"Retrying task (attempt {execution.retry_attempt + 1}/{task.max_retries})")
                db.close()
                raise self.retry(countdown=60, exc=e)
            
            execution.status = "failed"
            execution.end_time = datetime.utcnow()
            execution.error_message = str(e)
            db.commit()
            
            task.status = "failed"
            task.retry_count = execution.retry_attempt
            db.commit()
            
            return {"status": "failed", "error": str(e)}
    finally:
        db.close()


def check_dependencies(db, task):
    if not task.dependencies:
        return True
    
    for dep_task_id in task.dependencies:
        dep_task = db.query(Task).filter(Task.id == dep_task_id).first()
        if not dep_task:
            return False
        
        latest_execution = db.query(TaskExecution).filter(
            TaskExecution.task_id == dep_task_id,
            TaskExecution.status.in_(["success", "failed", "timeout"])
        ).order_by(TaskExecution.created_at.desc()).first()
        
        if not latest_execution or latest_execution.status != "success":
            return False
    
    return True
