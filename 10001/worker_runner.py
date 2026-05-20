import subprocess
import sys
import os
import threading
import time
import logging
from app.database import SessionLocal
from app.worker_manager import worker_manager
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def heartbeat_loop(worker_id):
    logger.info("Starting heartbeat loop...")
    while True:
        try:
            db = SessionLocal()
            try:
                worker_manager.send_heartbeat(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
        time.sleep(settings.WORKER_HEARTBEAT_INTERVAL)


if __name__ == "__main__":
    worker_name = os.environ.get("WORKER_NAME", "worker-1")
    concurrency = int(os.environ.get("WORKER_CONCURRENCY", "1"))
    
    db = SessionLocal()
    try:
        worker = worker_manager.register_worker(
            db,
            name=worker_name,
            concurrency=concurrency,
            queues=["default"]
        )
        logger.info(f"Worker registered with ID: {worker.id}")
    finally:
        db.close()
    
    heartbeat_thread = threading.Thread(target=heartbeat_loop, args=(worker.id,), daemon=True)
    heartbeat_thread.start()
    
    cmd = [
        sys.executable, "-m", "celery",
        "-A", "app.celery_app", "worker",
        "--loglevel=info",
        "--concurrency", str(concurrency),
        "-n", f"{worker_name}@%h"
    ]
    
    logger.info(f"Starting Celery worker: {worker_name}")
    subprocess.run(cmd)
