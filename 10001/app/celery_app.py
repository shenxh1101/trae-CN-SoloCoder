from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure, task_success
from app.config import settings

celery_app = Celery(
    "task_scheduler",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.DEFAULT_TIMEOUT,
    task_soft_time_limit=settings.DEFAULT_TIMEOUT - 30,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    result_expires=settings.TASK_RESULT_EXPIRES,
    broker_connection_retry_on_startup=True,
)

celery_app.autodiscover_tasks(["app"])
