import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models import Task, TaskExecution, TaskLog
from app.schemas import TaskCreate, TaskResponse, TaskStatusResponse, TaskExecutionResponse, TaskLogResponse, TaskUpdate
from app.scheduler import trigger_task, pause_task, resume_task, cancel_task_execution, initialize_periodic_task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
logger = logging.getLogger(__name__)


@router.post("", response_model=TaskResponse)
def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    if task_data.task_type == "periodic" and not task_data.cron_expression:
        raise HTTPException(status_code=400, detail="cron_expression is required for periodic tasks")
    
    for dep_id in task_data.dependencies:
        dep_task = db.query(Task).filter(Task.id == dep_id).first()
        if not dep_task:
            raise HTTPException(status_code=400, detail=f"Dependency task {dep_id} does not exist")

    task = Task(
        id=str(uuid.uuid4()),
        name=task_data.name,
        description=task_data.description,
        task_type=task_data.task_type,
        function_path=task_data.function_path,
        cron_expression=task_data.cron_expression,
        parameters=task_data.parameters,
        timeout=task_data.timeout,
        max_retries=task_data.max_retries,
        priority=task_data.priority,
        dependencies=task_data.dependencies
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    if task_data.task_type == "one_shot":
        trigger_task(db, task.id)
    elif task_data.task_type == "periodic":
        initialize_periodic_task(db, task)
    
    logger.info(f"Created task: {task.id}")
    return task


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if task_type:
        query = query.filter(Task.task_type == task_type)
    
    return query.offset(skip).limit(limit).all()


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, task_data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    
    task.updated_at = datetime.utcnow()
    
    if task_data.cron_expression and task.task_type == "periodic":
        from app.scheduler import calculate_next_run
        task.next_run_at = calculate_next_run(task_data.cron_expression)
    
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    logger.info(f"Deleted task: {task_id}")
    return {"message": "Task deleted successfully"}


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
def get_task_status(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    latest_execution = db.query(TaskExecution).filter(
        TaskExecution.task_id == task_id
    ).order_by(TaskExecution.created_at.desc()).first()
    
    return TaskStatusResponse(
        task_id=task.id,
        status=task.status,
        last_execution_id=latest_execution.id if latest_execution else None,
        last_execution_status=latest_execution.status if latest_execution else None,
        last_run_at=task.last_run_at,
        next_run_at=task.next_run_at
    )


@router.post("/{task_id}/trigger", response_model=TaskExecutionResponse)
def trigger_task_endpoint(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.is_paused:
        raise HTTPException(status_code=400, detail="Task is paused")
    
    execution = trigger_task(db, task_id)
    if not execution:
        raise HTTPException(status_code=500, detail="Failed to trigger task")
    
    return execution


@router.post("/{task_id}/pause")
def pause_task_endpoint(task_id: str, db: Session = Depends(get_db)):
    success = pause_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task paused successfully"}


@router.post("/{task_id}/resume")
def resume_task_endpoint(task_id: str, db: Session = Depends(get_db)):
    success = resume_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task resumed successfully"}


@router.get("/{task_id}/executions", response_model=List[TaskExecutionResponse])
def get_task_executions(
    task_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    executions = db.query(TaskExecution).filter(
        TaskExecution.task_id == task_id
    ).order_by(TaskExecution.created_at.desc()).offset(skip).limit(limit).all()
    
    return executions


@router.post("/executions/{execution_id}/cancel")
def cancel_execution(execution_id: str, db: Session = Depends(get_db)):
    success = cancel_task_execution(db, execution_id)
    if not success:
        raise HTTPException(status_code=404, detail="Execution not found")
    return {"message": "Execution cancelled successfully"}


@router.get("/executions/{execution_id}/logs", response_model=List[TaskLogResponse])
def get_execution_logs(
    execution_id: str,
    skip: int = 0,
    limit: int = 200,
    level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    execution = db.query(TaskExecution).filter(TaskExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    query = db.query(TaskLog).filter(TaskLog.execution_id == execution_id)
    if level:
        query = query.filter(TaskLog.level == level.upper())
    
    return query.order_by(TaskLog.timestamp).offset(skip).limit(limit).all()
