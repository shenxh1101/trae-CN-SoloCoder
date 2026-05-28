from dataclasses import dataclass, field
from typing import List, Optional
from datetime import date, datetime
import json


@dataclass
class DailyItinerary:
    day: int
    time: str
    location: str
    notes: str = ""


@dataclass
class BudgetItem:
    category: str
    description: str
    amount: float
    currency: str = "CNY"
    is_spent: bool = False


@dataclass
class TravelPlan:
    id: str
    name: str
    destination: str
    start_date: date
    end_date: date
    daily_itineraries: List[DailyItinerary] = field(default_factory=list)
    budget_items: List[BudgetItem] = field(default_factory=list)
    packing_list: List[str] = field(default_factory=list)
    notes: str = ""

    @property
    def duration(self) -> int:
        return (self.end_date - self.start_date).days + 1

    def total_budget(self, currency: str = "CNY", exchange_rate: float = 1.0) -> float:
        total = 0.0
        for item in self.budget_items:
            if item.currency == currency:
                total += item.amount
            elif currency == "CNY" and item.currency == "USD":
                total += item.amount * exchange_rate
            elif currency == "USD" and item.currency == "CNY":
                total += item.amount / exchange_rate
        return total

    def total_spent(self, currency: str = "CNY", exchange_rate: float = 1.0) -> float:
        total = 0.0
        for item in self.budget_items:
            if item.is_spent:
                if item.currency == currency:
                    total += item.amount
                elif currency == "CNY" and item.currency == "USD":
                    total += item.amount * exchange_rate
                elif currency == "USD" and item.currency == "CNY":
                    total += item.amount / exchange_rate
        return total

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "destination": self.destination,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "daily_itineraries": [
                {"day": i.day, "time": i.time, "location": i.location, "notes": i.notes}
                for i in self.daily_itineraries
            ],
            "budget_items": [
                {
                    "category": b.category,
                    "description": b.description,
                    "amount": b.amount,
                    "currency": b.currency,
                    "is_spent": b.is_spent,
                }
                for b in self.budget_items
            ],
            "packing_list": self.packing_list,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TravelPlan":
        return cls(
            id=data["id"],
            name=data["name"],
            destination=data["destination"],
            start_date=date.fromisoformat(data["start_date"]),
            end_date=date.fromisoformat(data["end_date"]),
            daily_itineraries=[DailyItinerary(**i) for i in data["daily_itineraries"]],
            budget_items=[BudgetItem(**b) for b in data["budget_items"]],
            packing_list=data["packing_list"],
            notes=data.get("notes", ""),
        )
