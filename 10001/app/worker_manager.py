import uuid
import socket
import os
import threading
import time
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from app.models import Worker
from app.database import SessionLocal
from app.config import settings

logger = logging.getLogger(__name__)


class WorkerManager:
    def __init__(self):
        self._worker_id: Optional[str] = None
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._registered = False

    def register_worker(
        self,
        db: Session,
        name: str,
        hostname: Optional[str] = None,
        pid: Optional[int] = None,
        queues: Optional[List[str]] = None,
        concurrency: int = 1
    ) -> Worker:
        if hostname is None:
            hostname = socket.gethostname()
        if pid is None:
            pid = os.getpid()
        if queues is None:
            queues = ["default"]

        worker = Worker(
            id=str(uuid.uuid4()),
            name=name,
            hostname=hostname,
            pid=pid,
            status="online",
            queues=queues,
            concurrency=concurrency
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)

        self._worker_id = worker.id
        self._registered = True
        logger.info(f"Worker registered: {worker.id} ({worker.name})")
        return worker

    def start_heartbeat(self):
        if not self._worker_id:
            logger.error("Worker not registered, cannot start heartbeat")
            return

        if self._heartbeat_thread and self._heartbeat_thread.is_alive():
            return

        self._stop_event.clear()
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()
        logger.info("Heartbeat thread started")

    def stop_heartbeat(self):
        self._stop_event.set()
        if self._heartbeat_thread:
            self._heartbeat_thread.join(timeout=5)
        logger.info("Heartbeat thread stopped")

    def _heartbeat_loop(self):
        while not self._stop_event.is_set():
            try:
                db = SessionLocal()
                try:
                    self.send_heartbeat(db)
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error sending heartbeat: {e}")
            
            self._stop_event.wait(settings.WORKER_HEARTBEAT_INTERVAL)

    def send_heartbeat(self, db: Session):
        if not self._worker_id:
            return

        worker = db.query(Worker).filter(Worker.id == self._worker_id).first()
        if worker:
            worker.last_heartbeat = datetime.utcnow()
            worker.status = "online"
            db.commit()

    def unregister_worker(self, db: Session):
        if not self._worker_id:
            return

        worker = db.query(Worker).filter(Worker.id == self._worker_id).first()
        if worker:
            worker.status = "offline"
            db.commit()
            logger.info(f"Worker unregistered: {self._worker_id}")

        self._registered = False
        self.stop_heartbeat()

    @staticmethod
    def get_all_workers(db: Session) -> List[Worker]:
        return db.query(Worker).all()

    @staticmethod
    def get_worker_by_id(db: Session, worker_id: str) -> Optional[Worker]:
        return db.query(Worker).filter(Worker.id == worker_id).first()

    @staticmethod
    def check_worker_health(db: Session, worker: Worker) -> Dict:
        now = datetime.utcnow()
        heartbeat_age = (now - worker.last_heartbeat).total_seconds()
        is_healthy = (
            worker.status == "online" and
            heartbeat_age < settings.WORKER_HEARTBEAT_TIMEOUT
        )

        if not is_healthy and worker.status == "online":
            worker.status = "unhealthy"
            db.commit()
            logger.warning(f"Worker {worker.id} marked as unhealthy")

        return {
            "worker_id": worker.id,
            "status": worker.status,
            "is_healthy": is_healthy,
            "last_heartbeat": worker.last_heartbeat,
            "heartbeat_age": heartbeat_age
        }

    @staticmethod
    def get_health_status_all(db: Session) -> List[Dict]:
        workers = WorkerManager.get_all_workers(db)
        return [WorkerManager.check_worker_health(db, w) for w in workers]

    @staticmethod
    def cleanup_stale_workers(db: Session) -> int:
        cutoff = datetime.utcnow() - timedelta(seconds=settings.WORKER_HEARTBEAT_TIMEOUT * 2)
        stale_workers = db.query(Worker).filter(
            Worker.last_heartbeat < cutoff,
            Worker.status != "offline"
        ).all()

        count = 0
        for worker in stale_workers:
            worker.status = "offline"
            count += 1
            logger.info(f"Marked stale worker as offline: {worker.id}")

        db.commit()
        return count


worker_manager = WorkerManager()
