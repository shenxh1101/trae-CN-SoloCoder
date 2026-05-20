import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Worker
from app.schemas import WorkerResponse, WorkerHealthResponse
from app.worker_manager import WorkerManager

router = APIRouter(prefix="/api/workers", tags=["workers"])
logger = logging.getLogger(__name__)


@router.get("", response_model=List[WorkerResponse])
def list_workers(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = WorkerManager.get_all_workers(db)
    if status:
        query = [w for w in query if w.status == status]
    return query


@router.get("/{worker_id}", response_model=WorkerResponse)
def get_worker(worker_id: str, db: Session = Depends(get_db)):
    worker = WorkerManager.get_worker_by_id(db, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker


@router.get("/health", response_model=List[WorkerHealthResponse])
def get_all_workers_health(db: Session = Depends(get_db)):
    health_status = WorkerManager.get_health_status_all(db)
    return [
        WorkerHealthResponse(**status)
        for status in health_status
    ]


@router.get("/{worker_id}/health", response_model=WorkerHealthResponse)
def get_worker_health(worker_id: str, db: Session = Depends(get_db)):
    worker = WorkerManager.get_worker_by_id(db, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    health_status = WorkerManager.check_worker_health(db, worker)
    return WorkerHealthResponse(**health_status)


@router.post("/{worker_id}/heartbeat")
def worker_heartbeat(worker_id: str, db: Session = Depends(get_db)):
    worker = WorkerManager.get_worker_by_id(db, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    from datetime import datetime
    worker.last_heartbeat = datetime.utcnow()
    worker.status = "online"
    db.commit()
    
    return {"message": "Heartbeat received"}


@router.post("/cleanup")
def cleanup_stale_workers(db: Session = Depends(get_db)):
    count = WorkerManager.cleanup_stale_workers(db)
    return {"message": f"Cleaned up {count} stale workers", "count": count}
