from dataclasses import dataclass, field, asdict
from datetime import date
from typing import List, Optional, Dict
from uuid import uuid4
import json


def generate_id() -> str:
    return uuid4().hex[:12]


@dataclass
class Expense:
    id: str = field(default_factory=generate_id)
    date: str = ""
    category: str = ""
    amount: float = 0.0
    description: str = ""
    currency: str = "CNY"

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "Expense":
        return cls(**data)


@dataclass
class Location:
    name: str = ""
    latitude: float = 0.0
    longitude: float = 0.0

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "Location":
        return cls(**data)


@dataclass
class DiaryEntry:
    id: str = field(default_factory=generate_id)
    date: str = ""
    content: str = ""
    mood: str = ""
    photo_path: str = ""
    location: Optional[Location] = None
    expenses: List[Expense] = field(default_factory=list)

    def to_dict(self) -> Dict:
        data = asdict(self)
        if self.location:
            data["location"] = self.location.to_dict()
        data["expenses"] = [e.to_dict() for e in self.expenses]
        return data

    @classmethod
    def from_dict(cls, data: Dict) -> "DiaryEntry":
        location_data = data.get("location")
        location = Location.from_dict(location_data) if location_data else None
        expenses_data = data.get("expenses", [])
        expenses = [Expense.from_dict(e) for e in expenses_data]
        return cls(
            id=data.get("id", generate_id()),
            date=data.get("date", ""),
            content=data.get("content", ""),
            mood=data.get("mood", ""),
            photo_path=data.get("photo_path", ""),
            location=location,
            expenses=expenses
        )

    def add_expense(self, expense: Expense) -> None:
        self.expenses.append(expense)

    def get_total_expenses(self) -> float:
        return sum(e.amount for e in self.expenses)


@dataclass
class Trip:
    id: str = field(default_factory=generate_id)
    name: str = ""
    destination: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""
    diary_entries: List[DiaryEntry] = field(default_factory=list)
    created_at: str = ""

    def to_dict(self) -> Dict:
        data = asdict(self)
        data["diary_entries"] = [d.to_dict() for d in self.diary_entries]
        return data

    @classmethod
    def from_dict(cls, data: Dict) -> "Trip":
        entries_data = data.get("diary_entries", [])
        entries = [DiaryEntry.from_dict(d) for d in entries_data]
        return cls(
            id=data.get("id", generate_id()),
            name=data.get("name", ""),
            destination=data.get("destination", ""),
            start_date=data.get("start_date", ""),
            end_date=data.get("end_date", ""),
            description=data.get("description", ""),
            diary_entries=entries,
            created_at=data.get("created_at", "")
        )

    def add_diary_entry(self, entry: DiaryEntry) -> None:
        existing = next((e for e in self.diary_entries if e.date == entry.date), None)
        if existing:
            idx = self.diary_entries.index(existing)
            entry.id = existing.id
            self.diary_entries[idx] = entry
        else:
            self.diary_entries.append(entry)
        self.diary_entries.sort(key=lambda x: x.date)

    def get_diary_by_date(self, date_str: str) -> Optional[DiaryEntry]:
        return next((e for e in self.diary_entries if e.date == date_str), None)

    def get_all_expenses(self) -> List[Expense]:
        expenses = []
        for entry in self.diary_entries:
            expenses.extend(entry.expenses)
        return expenses

    def get_total_expenses(self) -> float:
        return sum(d.get_total_expenses() for d in self.diary_entries)

    def get_duration_days(self) -> int:
        try:
            from datetime import datetime
            start = datetime.strptime(self.start_date, "%Y-%m-%d").date()
            end = datetime.strptime(self.end_date, "%Y-%m-%d").date()
            return (end - start).days + 1
        except (ValueError, Exception):
            return len(self.diary_entries)


@dataclass
class User:
    username: str = ""
    display_name: str = ""
    email: str = ""
    created_at: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "User":
        return cls(**data)


class TravelDiaryEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        return super().default(obj)
