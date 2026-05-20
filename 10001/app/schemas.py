from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: str = Field(default="periodic", description="one_shot or periodic")
    function_path: str
    cron_expression: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    timeout: int = 300
    max_retries: int = 3
    priority: int = 5
    dependencies: List[str] = Field(default_factory=list)


class TaskResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    task_type: str
    function_path: str
    cron_expression: Optional[str]
    parameters: Dict[str, Any]
    timeout: int
    max_retries: int
    retry_count: int
    priority: int
    status: str
    is_paused: bool
    dependencies: List[str]
    created_at: datetime
    updated_at: datetime
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]

    class Config:
        from_attributes = True


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    last_execution_id: Optional[str]
    last_execution_status: Optional[str]
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]


class TaskExecutionResponse(BaseModel):
    id: str
    task_id: str
    celery_task_id: Optional[str]
    status: str
    worker_id: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    retry_attempt: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaskLogResponse(BaseModel):
    id: int
    execution_id: str
    level: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True


class WorkerResponse(BaseModel):
    id: str
    name: str
    hostname: str
    pid: int
    status: str
    queues: List[str]
    concurrency: int
    last_heartbeat: datetime
    registered_at: datetime

    class Config:
        from_attributes = True


class WorkerHealthResponse(BaseModel):
    worker_id: str
    status: str
    is_healthy: bool
    last_heartbeat: datetime
    heartbeat_age: float


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cron_expression: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    timeout: Optional[int] = None
    max_retries: Optional[int] = None
    priority: Optional[int] = None
    dependencies: Optional[List[str]] = None
