import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from crontab import CronTab
from sqlalchemy.orm import Session
from app.models import Task, TaskExecution
from app.tasks import execute_task
from app.config import settings

logger = logging.getLogger(__name__)


def calculate_next_run(cron_expression: str, from_time: Optional[datetime] = None) -> datetime:
    if from_time is None:
        from_time = datetime.utcnow()
    
    cron = CronTab(cron_expression)
    next_run = cron.next(from_time, default_utc=True)
    return from_time + timedelta(seconds=next_run)


def create_task_execution(db: Session, task_id: str) -> TaskExecution:
    execution = TaskExecution(
        id=str(uuid.uuid4()),
        task_id=task_id,
        status="pending",
        retry_attempt=0
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)
    return execution


def submit_task_to_celery(db: Session, task: Task, execution: TaskExecution):
    celery_task = execute_task.apply_async(
        args=[task.id, execution.id],
        time_limit=task.timeout,
        soft_time_limit=max(task.timeout - 30, 10),
        priority=max(10 - task.priority, 0)
    )
    execution.celery_task_id = celery_task.id
    db.commit()
    logger.info(f"Submitted task {task.id} to Celery: {celery_task.id}")
    return celery_task


def trigger_task(db: Session, task_id: str) -> Optional[TaskExecution]:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        logger.error(f"Task {task_id} not found")
        return None
    
    if task.is_paused:
        logger.warning(f"Task {task_id} is paused, not triggering")
        return None
    
    execution = create_task_execution(db, task_id)
    submit_task_to_celery(db, task, execution)
    
    if task.task_type == "periodic" and task.cron_expression:
        try:
            task.next_run_at = calculate_next_run(task.cron_expression)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to calculate next run for task {task_id}: {e}")
    
    return execution


def check_and_run_due_tasks(db: Session) -> List[TaskExecution]:
    now = datetime.utcnow()
    due_tasks = db.query(Task).filter(
        Task.task_type == "periodic",
        Task.is_paused == False,
        Task.next_run_at <= now
    ).all()
    
    executions = []
    for task in due_tasks:
        try:
            execution = trigger_task(db, task.id)
            if execution:
                executions.append(execution)
        except Exception as e:
            logger.error(f"Failed to trigger task {task.id}: {e}")
    
    return executions


def cancel_task_execution(db: Session, execution_id: str) -> bool:
    from app.celery_app import celery_app
    
    execution = db.query(TaskExecution).filter(TaskExecution.id == execution_id).first()
    if not execution:
        return False
    
    if execution.celery_task_id:
        try:
            celery_app.control.revoke(execution.celery_task_id, terminate=True)
        except Exception as e:
            logger.error(f"Failed to revoke Celery task {execution.celery_task_id}: {e}")
    
    execution.status = "cancelled"
    execution.end_time = datetime.utcnow()
    db.commit()
    
    return True


def pause_task(db: Session, task_id: str) -> bool:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return False
    
    task.is_paused = True
    db.commit()
    logger.info(f"Task {task_id} paused")
    return True


def resume_task(db: Session, task_id: str) -> bool:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return False
    
    task.is_paused = False
    
    if task.task_type == "periodic" and task.cron_expression:
        if not task.next_run_at or task.next_run_at < datetime.utcnow():
            task.next_run_at = calculate_next_run(task.cron_expression)
    
    db.commit()
    logger.info(f"Task {task_id} resumed")
    return True


def initialize_periodic_task(db: Session, task: Task):
    if task.task_type == "periodic" and task.cron_expression:
        try:
            task.next_run_at = calculate_next_run(task.cron_expression)
            db.commit()
            logger.info(f"Initialized periodic task {task.id}, next run at {task.next_run_at}")
        except Exception as e:
            logger.error(f"Failed to initialize periodic task {task.id}: {e}")
