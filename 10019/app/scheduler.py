from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import TrackingNumber, LogisticsRecord
from .express100_client import Express100MockClient
from .websocket_manager import manager
from .email_service import EmailService

scheduler = AsyncIOScheduler()


async def update_all_tracking_status():
    print(f"[{datetime.now()}] Starting scheduled tracking update...")
    
    db = SessionLocal()
    try:
        tracking_numbers = db.query(TrackingNumber).filter(
            TrackingNumber.status != "signed"
        ).all()
        
        for tracking in tracking_numbers:
            try:
                old_status = tracking.status
                old_latest_status = tracking.latest_status
                
                tracking_info = await Express100MockClient.get_tracking_info(
                    tracking.tracking_number,
                    tracking.courier_code
                )
                
                new_status = tracking_info["status"]
                new_latest_status = tracking_info["latest_status"]
                
                status_changed = (old_status != new_status) or (old_latest_status != new_latest_status)
                
                if status_changed:
                    tracking.status = new_status
                    tracking.latest_status = new_latest_status
                    tracking.updated_at = datetime.now()
                    
                    for record_data in tracking_info["data"]:
                        record_time = datetime.strptime(record_data["time"], "%Y-%m-%d %H:%M:%S")
                        existing = db.query(LogisticsRecord).filter(
                            LogisticsRecord.tracking_id == tracking.id,
                            LogisticsRecord.time == record_time,
                            LogisticsRecord.description == record_data["description"]
                        ).first()
                        
                        if not existing:
                            new_record = LogisticsRecord(
                                tracking_id=tracking.id,
                                status=record_data["status"],
                                description=record_data["description"],
                                location=record_data.get("location"),
                                time=record_time
                            )
                            db.add(new_record)
                    
                    db.commit()
                    
                    await manager.broadcast_status_update(
                        user_id=tracking.user_id,
                        tracking_number=tracking.tracking_number,
                        status=new_status,
                        latest_status=new_latest_status
                    )
                    
                    if tracking.is_subscribed and new_status in ["signed", "abnormal"]:
                        user = tracking.owner
                        if user and user.email_notification and user.email:
                            await EmailService.send_status_notification(
                                to_email=user.email,
                                tracking_number=tracking.tracking_number,
                                status=new_status,
                                latest_status=new_latest_status
                            )
                            
            except Exception as e:
                print(f"Error updating tracking {tracking.tracking_number}: {e}")
                db.rollback()
                
    except Exception as e:
        print(f"Scheduler error: {e}")
    finally:
        db.close()
    
    print(f"[{datetime.now()}] Scheduled tracking update completed.")


def start_scheduler():
    scheduler.add_job(
        update_all_tracking_status,
        CronTrigger(hour=9),
        id="daily_tracking_update",
        replace_existing=True
    )
    scheduler.add_job(
        update_all_tracking_status,
        CronTrigger(hour=21),
        id="daily_tracking_update_evening",
        replace_existing=True
    )
    scheduler.start()
    print("Scheduler started. Tracking updates scheduled for 09:00 and 21:00 daily.")


def stop_scheduler():
    scheduler.shutdown()
