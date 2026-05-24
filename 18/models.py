import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Any


class PasswordEntry:
    def __init__(
        self,
        website: str,
        username: str,
        password: str,
        notes: str = "",
        custom_fields: Optional[Dict[str, Any]] = None,
        expiration_date: Optional[str] = None,
        entry_id: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None,
        strength_score: Optional[int] = None,
        strength_feedback: Optional[List[str]] = None,
    ):
        self.id = entry_id or str(uuid.uuid4())
        self.website = website
        self.username = username
        self.password = password
        self.notes = notes
        self.custom_fields = custom_fields or {}
        self.expiration_date = expiration_date
        self.created_at = created_at or datetime.now().isoformat()
        self.updated_at = updated_at or datetime.now().isoformat()
        self.strength_score = strength_score
        self.strength_feedback = strength_feedback or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "website": self.website,
            "username": self.username,
            "password": self.password,
            "notes": self.notes,
            "custom_fields": self.custom_fields,
            "expiration_date": self.expiration_date,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "strength_score": self.strength_score,
            "strength_feedback": self.strength_feedback,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PasswordEntry":
        return cls(
            entry_id=data.get("id"),
            website=data.get("website", ""),
            username=data.get("username", ""),
            password=data.get("password", ""),
            notes=data.get("notes", ""),
            custom_fields=data.get("custom_fields", {}),
            expiration_date=data.get("expiration_date"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            strength_score=data.get("strength_score"),
            strength_feedback=data.get("strength_feedback", []),
        )

    def is_expired(self) -> bool:
        if not self.expiration_date:
            return False
        try:
            exp_date = datetime.fromisoformat(self.expiration_date)
            return datetime.now() > exp_date
        except (ValueError, TypeError):
            return False

    def days_until_expiration(self) -> Optional[int]:
        if not self.expiration_date:
            return None
        try:
            exp_date = datetime.fromisoformat(self.expiration_date)
            delta = exp_date - datetime.now()
            return delta.days
        except (ValueError, TypeError):
            return None

    def set_expiration_days(self, days: int):
        exp_date = datetime.now() + timedelta(days=days)
        self.expiration_date = exp_date.isoformat()
        self.updated_at = datetime.now().isoformat()

    def update_password(self, new_password: str):
        self.password = new_password
        self.updated_at = datetime.now().isoformat()
        self.strength_score = None
        self.strength_feedback = []
