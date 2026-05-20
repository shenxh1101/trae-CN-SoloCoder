import logging
import signal
import sys
import threading
import time
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


def start_worker(worker_name: str = "default-worker", concurrency: int = 1):
    db = SessionLocal()
    try:
        worker = worker_manager.register_worker(
            db,
            name=worker_name,
            concurrency=concurrency,
            queues=["default"]
        )
        logger.info(f"Worker registered with ID: {worker.id}")
        
        heartbeat_thread = threading.Thread(target=heartbeat_loop, args=(worker.id,), daemon=True)
        heartbeat_thread.start()
        logger.info("Heartbeat thread started")
        
        return worker.id
    finally:
        db.close()


if __name__ == "__main__":
    worker_name = sys.argv[1] if len(sys.argv) > 1 else "default-worker"
    concurrency = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    start_worker(worker_name, concurrency)
