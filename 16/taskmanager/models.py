import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, date
from typing import List, Optional
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class RepeatFrequency(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


PRIORITY_ORDER = {
    Priority.URGENT: 4,
    Priority.HIGH: 3,
    Priority.MEDIUM: 2,
    Priority.LOW: 1,
}


@dataclass
class Task:
    title: str
    description: str = ""
    priority: Priority = Priority.MEDIUM
    tags: List[str] = field(default_factory=list)
    due_date: Optional[date] = None
    status: TaskStatus = TaskStatus.PENDING
    dependencies: List[str] = field(default_factory=list)
    repeat_frequency: RepeatFrequency = RepeatFrequency.NONE
    reminder_time: Optional[datetime] = None
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    reminder_sent: bool = False
    is_template: bool = False
    original_task_id: Optional[str] = None

    def to_dict(self) -> dict:
        data = asdict(self)
        for key, value in data.items():
            if isinstance(value, Enum):
                data[key] = value.value
            elif isinstance(value, (datetime, date)):
                data[key] = value.isoformat() if value else None
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "Task":
        def parse_datetime(val):
            if val is None:
                return None
            return datetime.fromisoformat(val) if isinstance(val, str) else val

        def parse_date(val):
            if val is None:
                return None
            return date.fromisoformat(val) if isinstance(val, str) else val

        return cls(
            id=data.get("id", str(uuid.uuid4())[:8]),
            title=data["title"],
            description=data.get("description", ""),
            priority=Priority(data.get("priority", Priority.MEDIUM.value)),
            tags=data.get("tags", []),
            due_date=parse_date(data.get("due_date")),
            status=TaskStatus(data.get("status", TaskStatus.PENDING.value)),
            dependencies=data.get("dependencies", []),
            repeat_frequency=RepeatFrequency(
                data.get("repeat_frequency", RepeatFrequency.NONE.value)
            ),
            reminder_time=parse_datetime(data.get("reminder_time")),
            created_at=parse_datetime(data.get("created_at")) or datetime.now(),
            updated_at=parse_datetime(data.get("updated_at")) or datetime.now(),
            completed_at=parse_datetime(data.get("completed_at")),
            reminder_sent=data.get("reminder_sent", False),
            is_template=data.get("is_template", False),
            original_task_id=data.get("original_task_id"),
        )

    def is_overdue(self) -> bool:
        if self.due_date is None:
            return False
        return date.today() > self.due_date and self.status != TaskStatus.COMPLETED

    def is_due_today(self) -> bool:
        if self.due_date is None:
            return False
        return date.today() == self.due_date

    def can_start(self, completed_task_ids: List[str]) -> bool:
        return all(dep_id in completed_task_ids for dep_id in self.dependencies)

    def get_blocked_tasks(self, all_tasks: List["Task"]) -> List["Task"]:
        return [t for t in all_tasks if self.id in t.dependencies]

    def __repr__(self) -> str:
        return f"Task(id={self.id}, title={self.title}, status={self.status.value})"
