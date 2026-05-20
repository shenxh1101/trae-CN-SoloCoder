from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    email_notification = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tracking_numbers = relationship("TrackingNumber", back_populates="owner", cascade="all, delete-orphan")


class TrackingNumber(Base):
    __tablename__ = "tracking_numbers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tracking_number = Column(String(100), nullable=False, index=True)
    courier_code = Column(String(50), nullable=False)
    remark = Column(String(255))
    status = Column(String(50), default="in_transit")
    latest_status = Column(String(255))
    is_subscribed = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    owner = relationship("User", back_populates="tracking_numbers")
    logistics_records = relationship("LogisticsRecord", back_populates="tracking", cascade="all, delete-orphan")


class LogisticsRecord(Base):
    __tablename__ = "logistics_records"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(Integer, ForeignKey("tracking_numbers.id"), nullable=False)
    status = Column(String(100), nullable=False)
    description = Column(String(500), nullable=False)
    location = Column(String(255))
    time = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tracking = relationship("TrackingNumber", back_populates="logistics_records")
