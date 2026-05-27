import threading
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import time
import uuid

logger = logging.getLogger(__name__)


class ScheduledTask:
    def __init__(self, schedule_id, name, cron_expr, config):
        self.schedule_id = schedule_id
        self.name = name
        self.cron_expr = cron_expr
        self.config = config
        self.enabled = True
        self.next_run_time = None
        self.last_run_time = None
        self.run_count = 0
        self.created_at = time.time()

    def to_dict(self):
        return {
            'schedule_id': self.schedule_id,
            'name': self.name,
            'cron_expr': self.cron_expr,
            'url': self.config.get('url', ''),
            'enabled': self.enabled,
            'next_run_time': self.next_run_time,
            'last_run_time': self.last_run_time,
            'run_count': self.run_count,
            'config': self.config,
        }


class SchedulerManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self._scheduler = BackgroundScheduler(daemon=True)
        self._scheduler.start()
        self._schedules = {}
        self._task_manager = None
        self._lock = threading.RLock()

    def set_task_manager(self, task_manager):
        self._task_manager = task_manager

    def _parse_cron(self, cron_expr):
        parts = cron_expr.strip().split()
        if len(parts) == 5:
            return CronTrigger(
                minute=parts[0],
                hour=parts[1],
                day=parts[2],
                month=parts[3],
                day_of_week=parts[4],
            )
        elif len(parts) == 6:
            return CronTrigger(
                second=parts[0],
                minute=parts[1],
                hour=parts[2],
                day=parts[3],
                month=parts[4],
                day_of_week=parts[5],
            )
        else:
            raise ValueError(f"无效的cron表达式: {cron_expr}，需要5或6个字段")

    def add_schedule(self, name, cron_expr, config):
        schedule_id = str(uuid.uuid4())[:8]
        scheduled = ScheduledTask(schedule_id, name, cron_expr, config)
        trigger = self._parse_cron(cron_expr)

        job = self._scheduler.add_job(
            self._execute_scheduled_task,
            trigger=trigger,
            args=[schedule_id],
            id=schedule_id,
            replace_existing=True,
        )
        scheduled.next_run_time = job.next_run_time.isoformat() if job.next_run_time else None

        with self._lock:
            self._schedules[schedule_id] = scheduled
        return scheduled

    def _execute_scheduled_task(self, schedule_id):
        with self._lock:
            scheduled = self._schedules.get(schedule_id)
            if not scheduled or not scheduled.enabled:
                return

        scheduled.last_run_time = time.time()
        scheduled.run_count += 1

        if self._task_manager:
            task = self._task_manager.create_task(scheduled.config.copy())
            self._task_manager.start_task(task.task_id)
            logger.info(f"Scheduled task '{scheduled.name}' started as task {task.task_id}")

        with self._lock:
            job = self._scheduler.get_job(schedule_id)
            if job and job.next_run_time:
                scheduled.next_run_time = job.next_run_time.isoformat()

    def remove_schedule(self, schedule_id):
        with self._lock:
            if schedule_id in self._schedules:
                self._scheduler.remove_job(schedule_id)
                del self._schedules[schedule_id]
                return True
        return False

    def toggle_schedule(self, schedule_id, enabled):
        with self._lock:
            scheduled = self._schedules.get(schedule_id)
            if not scheduled:
                return False
            scheduled.enabled = enabled
            job = self._scheduler.get_job(schedule_id)
            if job:
                if enabled:
                    job.resume()
                else:
                    job.pause()
            return True

    def get_schedules(self):
        with self._lock:
            for schedule_id, scheduled in self._schedules.items():
                job = self._scheduler.get_job(schedule_id)
                if job and job.next_run_time:
                    scheduled.next_run_time = job.next_run_time.isoformat()
            return list(self._schedules.values())

    def get_schedule(self, schedule_id):
        with self._lock:
            return self._schedules.get(schedule_id)

    def shutdown(self):
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
