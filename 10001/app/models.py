from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    task_type = Column(String, default="periodic")
    function_path = Column(String)
    cron_expression = Column(String, nullable=True)
    parameters = Column(JSON, default=dict)
    timeout = Column(Integer, default=300)
    max_retries = Column(Integer, default=3)
    retry_count = Column(Integer, default=0)
    priority = Column(Integer, default=5)
    status = Column(String, default="pending")
    is_paused = Column(Boolean, default=False)
    dependencies = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)

    executions = relationship("TaskExecution", back_populates="task", cascade="all, delete-orphan")


class TaskExecution(Base):
    __tablename__ = "task_executions"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id"))
    celery_task_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    worker_id = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_attempt = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="executions")
    logs = relationship("TaskLog", back_populates="execution", cascade="all, delete-orphan")


class TaskLog(Base):
    __tablename__ = "task_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    execution_id = Column(String, ForeignKey("task_executions.id"))
    level = Column(String, default="INFO")
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    execution = relationship("TaskExecution", back_populates="logs")


class Worker(Base):
    __tablename__ = "workers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    hostname = Column(String)
    pid = Column(Integer)
    status = Column(String, default="online")
    queues = Column(JSON, default=list)
    concurrency = Column(Integer, default=1)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    registered_at = Column(DateTime, default=datetime.utcnow)
