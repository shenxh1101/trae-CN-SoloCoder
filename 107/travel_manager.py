import json
import uuid
from datetime import date
from typing import List, Optional, Dict
from models import TravelPlan, DailyItinerary, BudgetItem


class TravelManager:
    def __init__(self, data_file: str = "travel_plans.json"):
        self.data_file = data_file
        self.plans: Dict[str, TravelPlan] = {}
        self.load_plans()

    def create_plan(
        self, name: str, destination: str, start_date: date, end_date: date
    ) -> TravelPlan:
        plan_id = str(uuid.uuid4())[:8]
        plan = TravelPlan(
            id=plan_id,
            name=name,
            destination=destination,
            start_date=start_date,
            end_date=end_date,
        )
        self.plans[plan_id] = plan
        self.save_plans()
        return plan

    def get_plan(self, plan_id: str) -> Optional[TravelPlan]:
        return self.plans.get(plan_id)

    def get_all_plans(self) -> List[TravelPlan]:
        return sorted(self.plans.values(), key=lambda p: p.start_date)

    def update_plan(self, plan_id: str, **kwargs) -> Optional[TravelPlan]:
        plan = self.plans.get(plan_id)
        if plan:
            for key, value in kwargs.items():
                if hasattr(plan, key):
                    setattr(plan, key, value)
            self.save_plans()
        return plan

    def delete_plan(self, plan_id: str) -> bool:
        if plan_id in self.plans:
            del self.plans[plan_id]
            self.save_plans()
            return True
        return False

    def add_itinerary(
        self, plan_id: str, day: int, time: str, location: str, notes: str = ""
    ) -> Optional[DailyItinerary]:
        plan = self.plans.get(plan_id)
        if plan:
            itinerary = DailyItinerary(day=day, time=time, location=location, notes=notes)
            plan.daily_itineraries.append(itinerary)
            plan.daily_itineraries.sort(key=lambda i: (i.day, i.time))
            self.save_plans()
            return itinerary
        return None

    def delete_itinerary(self, plan_id: str, index: int) -> bool:
        plan = self.plans.get(plan_id)
        if plan and 0 <= index < len(plan.daily_itineraries):
            del plan.daily_itineraries[index]
            self.save_plans()
            return True
        return False

    def add_budget_item(
        self,
        plan_id: str,
        category: str,
        description: str,
        amount: float,
        currency: str = "CNY",
        is_spent: bool = False,
    ) -> Optional[BudgetItem]:
        plan = self.plans.get(plan_id)
        if plan:
            budget_item = BudgetItem(
                category=category,
                description=description,
                amount=amount,
                currency=currency,
                is_spent=is_spent,
            )
            plan.budget_items.append(budget_item)
            self.save_plans()
            return budget_item
        return None

    def delete_budget_item(self, plan_id: str, index: int) -> bool:
        plan = self.plans.get(plan_id)
        if plan and 0 <= index < len(plan.budget_items):
            del plan.budget_items[index]
            self.save_plans()
            return True
        return False

    def mark_budget_spent(self, plan_id: str, index: int, spent: bool = True) -> bool:
        plan = self.plans.get(plan_id)
        if plan and 0 <= index < len(plan.budget_items):
            plan.budget_items[index].is_spent = spent
            self.save_plans()
            return True
        return False

    def add_packing_item(self, plan_id: str, item: str) -> bool:
        plan = self.plans.get(plan_id)
        if plan:
            if item not in plan.packing_list:
                plan.packing_list.append(item)
                self.save_plans()
            return True
        return False

    def remove_packing_item(self, plan_id: str, item: str) -> bool:
        plan = self.plans.get(plan_id)
        if plan and item in plan.packing_list:
            plan.packing_list.remove(item)
            self.save_plans()
            return True
        return False

    def save_plans(self) -> None:
        data = {pid: plan.to_dict() for pid, plan in self.plans.items()}
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_plans(self) -> None:
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.plans = {
                pid: TravelPlan.from_dict(plan_data)
                for pid, plan_data in data.items()
            }
        except FileNotFoundError:
            self.plans = {}

    def export_to_json(self, plan_id: str, filename: str) -> bool:
        plan = self.plans.get(plan_id)
        if plan:
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(plan.to_dict(), f, ensure_ascii=False, indent=2)
            return True
        return False

    def import_from_json(self, filename: str) -> Optional[TravelPlan]:
        try:
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
            plan = TravelPlan.from_dict(data)
            if plan.id not in self.plans:
                self.plans[plan.id] = plan
            else:
                plan.id = str(uuid.uuid4())[:8]
                self.plans[plan.id] = plan
            self.save_plans()
            return plan
        except (FileNotFoundError, json.JSONDecodeError):
            return None
