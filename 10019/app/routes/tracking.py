from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from typing import List
import csv
import io
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import User, TrackingNumber, LogisticsRecord
from ..schemas import (
    TrackingNumberCreate,
    TrackingNumberResponse,
    TrackingDetailResponse,
    BatchImportResponse,
)
from ..auth import get_current_active_user
from ..rate_limiter import rate_limiter
from ..express100_client import Express100MockClient
from ..websocket_manager import manager
from ..email_service import EmailService

router = APIRouter(prefix="/tracking", tags=["快递管理"])


@router.post("/add", response_model=TrackingNumberResponse, status_code=status.HTTP_201_CREATED)
async def add_tracking_number(
    tracking_data: TrackingNumberCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    await rate_limiter(current_user.id)
    
    existing = db.query(TrackingNumber).filter(
        TrackingNumber.user_id == current_user.id,
        TrackingNumber.tracking_number == tracking_data.tracking_number,
        TrackingNumber.courier_code == tracking_data.courier_code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tracking number already exists for this user"
        )
    
    tracking_info = await Express100MockClient.get_tracking_info(
        tracking_data.tracking_number,
        tracking_data.courier_code
    )
    
    new_tracking = TrackingNumber(
        user_id=current_user.id,
        tracking_number=tracking_data.tracking_number,
        courier_code=tracking_data.courier_code,
        remark=tracking_data.remark,
        is_subscribed=tracking_data.is_subscribed,
        status=tracking_info["status"],
        latest_status=tracking_info["latest_status"]
    )
    
    db.add(new_tracking)
    db.flush()
    
    for record_data in tracking_info["data"]:
        record = LogisticsRecord(
            tracking_id=new_tracking.id,
            status=record_data["status"],
            description=record_data["description"],
            location=record_data.get("location"),
            time=datetime.strptime(record_data["time"], "%Y-%m-%d %H:%M:%S")
        )
        db.add(record)
    
    db.commit()
    db.refresh(new_tracking)
    
    return new_tracking


@router.delete("/{tracking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tracking_number(
    tracking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    await rate_limiter(current_user.id)
    
    tracking = db.query(TrackingNumber).filter(
        TrackingNumber.id == tracking_id,
        TrackingNumber.user_id == current_user.id
    ).first()
    
    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tracking number not found"
        )
    
    db.delete(tracking)
    db.commit()


@router.get("/list", response_model=List[TrackingNumberResponse])
async def get_user_tracking_list(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    await rate_limiter(current_user.id)
    
    tracking_list = db.query(TrackingNumber).filter(
        TrackingNumber.user_id == current_user.id
    ).order_by(desc(TrackingNumber.updated_at)).all()
    
    return tracking_list


@router.get("/{tracking_id}", response_model=TrackingDetailResponse)
async def get_tracking_detail(
    tracking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    await rate_limiter(current_user.id)
    
    tracking = db.query(TrackingNumber).filter(
        TrackingNumber.id == tracking_id,
        TrackingNumber.user_id == current_user.id
    ).first()
    
    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tracking number not found"
        )
    
    return tracking


@router.post("/import", response_model=BatchImportResponse)
async def import_tracking_numbers(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    await rate_limiter(current_user.id)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed"
        )
    
    content = await file.read()
    content = content.decode('utf-8-sig')
    
    reader = csv.DictReader(io.StringIO(content))
    
    success_count = 0
    failed_count = 0
    errors = []
    
    required_columns = ['tracking_number', 'courier_code']
    if not all(col in reader.fieldnames for col in required_columns):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV must contain columns: {', '.join(required_columns)}"
        )
    
    for row_num, row in enumerate(reader, start=2):
        try:
            tracking_number = row['tracking_number'].strip()
            courier_code = row['courier_code'].strip()
            remark = row.get('remark', '').strip()
            is_subscribed = row.get('is_subscribed', 'true').lower() == 'true'
            
            if not tracking_number or not courier_code:
                raise ValueError("tracking_number and courier_code cannot be empty")
            
            existing = db.query(TrackingNumber).filter(
                TrackingNumber.user_id == current_user.id,
                TrackingNumber.tracking_number == tracking_number,
                TrackingNumber.courier_code == courier_code
            ).first()
            
            if existing:
                raise ValueError("Tracking number already exists")
            
            tracking_info = await Express100MockClient.get_tracking_info(
                tracking_number, courier_code
            )
            
            new_tracking = TrackingNumber(
                user_id=current_user.id,
                tracking_number=tracking_number,
                courier_code=courier_code,
                remark=remark,
                is_subscribed=is_subscribed,
                status=tracking_info["status"],
                latest_status=tracking_info["latest_status"]
            )
            
            db.add(new_tracking)
            db.flush()
            
            for record_data in tracking_info["data"]:
                record = LogisticsRecord(
                    tracking_id=new_tracking.id,
                    status=record_data["status"],
                    description=record_data["description"],
                    location=record_data.get("location"),
                    time=datetime.strptime(record_data["time"], "%Y-%m-%d %H:%M:%S")
                )
                db.add(record)
            
            success_count += 1
            
        except Exception as e:
            failed_count += 1
            errors.append(f"Row {row_num}: {str(e)}")
    
    db.commit()
    
    return BatchImportResponse(
        success_count=success_count,
        failed_count=failed_count,
        errors=errors
    )
