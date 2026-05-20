import threading
import time
import logging
from datetime import datetime
from app.database import SessionLocal
from app.scheduler import check_and_run_due_tasks
from app.config import settings

logger = logging.getLogger(__name__)


class SchedulerService:
    def __init__(self, check_interval: int = 5):
        self.check_interval = check_interval
        self._stop_event = threading.Event()
        self._thread = None
        self._running = False

    def start(self):
        if self._running:
            logger.warning("Scheduler is already running")
            return
        
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        self._running = True
        logger.info("Scheduler service started")

    def stop(self):
        if not self._running:
            return
        
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        self._running = False
        logger.info("Scheduler service stopped")

    def _run(self):
        logger.info("Scheduler loop started")
        while not self._stop_event.is_set():
            try:
                db = SessionLocal()
                try:
                    executions = check_and_run_due_tasks(db)
                    if executions:
                        logger.info(f"Triggered {len(executions)} tasks")
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}", exc_info=True)
            
            self._stop_event.wait(self.check_interval)
        
        logger.info("Scheduler loop stopped")

    @property
    def is_running(self) -> bool:
        return self._running


scheduler_service = SchedulerService()
