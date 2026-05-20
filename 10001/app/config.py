from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Distributed Task Scheduler"
    APP_VERSION: str = "1.0.0"
    
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    SQLALCHEMY_DATABASE_URL: str = "sqlite:///./task_scheduler.db"
    
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"
    
    MAX_RETRIES: int = 3
    DEFAULT_TIMEOUT: int = 300
    TASK_RESULT_EXPIRES: int = 86400
    
    WORKER_HEARTBEAT_INTERVAL: int = 10
    WORKER_HEARTBEAT_TIMEOUT: int = 30
    
    class Config:
        env_file = ".env"


settings = Settings()
