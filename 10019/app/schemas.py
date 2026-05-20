from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    email_notification: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class TrackingNumberBase(BaseModel):
    tracking_number: str = Field(..., min_length=5, max_length=100)
    courier_code: str = Field(..., min_length=2, max_length=50)
    remark: Optional[str] = Field(None, max_length=255)
    is_subscribed: bool = True


class TrackingNumberCreate(TrackingNumberBase):
    pass


class TrackingNumberResponse(TrackingNumberBase):
    id: int
    user_id: int
    status: str
    latest_status: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LogisticsRecordBase(BaseModel):
    status: str
    description: str
    location: Optional[str] = None
    time: datetime


class LogisticsRecordResponse(LogisticsRecordBase):
    id: int
    tracking_id: int

    class Config:
        from_attributes = True


class TrackingDetailResponse(TrackingNumberResponse):
    logistics_records: List[LogisticsRecordResponse] = []


class BatchImportResponse(BaseModel):
    success_count: int
    failed_count: int
    errors: List[str] = []


class StatusUpdateMessage(BaseModel):
    tracking_number: str
    status: str
    latest_status: str
    update_time: datetime
