from datetime import datetime, date
from typing import List, Optional, Dict, Tuple
from pathlib import Path

from .models import User, Trip, DiaryEntry, Expense, Location
from .storage import StorageManager


class DiaryManager:
    EXPENSE_CATEGORIES = ["餐饮", "住宿", "交通", "门票", "购物", "娱乐", "其他"]

    def __init__(self, storage: Optional[StorageManager] = None):
        self.storage = storage or StorageManager()

    def create_user(self, username: str, display_name: str = "", email: str = "") -> User:
        if not username:
            raise ValueError("用户名不能为空")
        if self.storage.user_exists(username):
            raise ValueError(f"用户 '{username}' 已存在")
        user = User(username=username, display_name=display_name or username, email=email)
        self.storage.create_user(user)
        return user

    def get_user(self, username: str) -> Optional[User]:
        return self.storage.get_user(username)

    def list_users(self) -> List[str]:
        return self.storage.list_users()

    def delete_user(self, username: str) -> bool:
        return self.storage.delete_user(username)

    def create_trip(self, username: str, name: str, destination: str,
                    start_date: str, end_date: str, description: str = "") -> Trip:
        if not name:
            raise ValueError("旅行名称不能为空")
        if not destination:
            raise ValueError("目的地不能为空")
        if not self._validate_date(start_date) or not self._validate_date(end_date):
            raise ValueError("日期格式不正确，请使用 YYYY-MM-DD 格式")
        if start_date > end_date:
            raise ValueError("出发日期不能晚于返回日期")
        trip = Trip(
            name=name,
            destination=destination,
            start_date=start_date,
            end_date=end_date,
            description=description
        )
        self.storage.save_trip(username, trip)
        return trip

    def list_trips(self, username: str) -> List[Trip]:
        return self.storage.list_trips(username)

    def get_trip(self, username: str, trip_id: str) -> Optional[Trip]:
        return self.storage.get_trip(username, trip_id)

    def update_trip(self, username: str, trip_id: str, **kwargs) -> Optional[Trip]:
        trip = self.get_trip(username, trip_id)
        if not trip:
            return None
        for key, value in kwargs.items():
            if hasattr(trip, key) and value is not None:
                setattr(trip, key, value)
        self.storage.save_trip(username, trip)
        return trip

    def delete_trip(self, username: str, trip_id: str) -> bool:
        return self.storage.delete_trip(username, trip_id)

    def add_diary_entry(self, username: str, trip_id: str, date_str: str,
                        content: str, mood: str = "", photo_path: str = "",
                        location: Optional[Location] = None) -> DiaryEntry:
        trip = self.get_trip(username, trip_id)
        if not trip:
            raise ValueError(f"旅行 '{trip_id}' 不存在")
        if not self._validate_date(date_str):
            raise ValueError("日期格式不正确，请使用 YYYY-MM-DD 格式")
        if not self._is_date_in_trip(trip, date_str):
            raise ValueError(f"日期 {date_str} 不在旅行期间内 ({trip.start_date} ~ {trip.end_date})")
        if not content:
            raise ValueError("日记内容不能为空")
        saved_photo_path = ""
        if photo_path:
            saved_photo_path = self.storage.save_photo(username, trip_id, photo_path)
        entry = DiaryEntry(
            date=date_str,
            content=content,
            mood=mood,
            photo_path=saved_photo_path,
            location=location
        )
        trip.add_diary_entry(entry)
        self.storage.save_trip(username, trip)
        return entry

    def update_diary_entry(self, username: str, trip_id: str, date_str: str,
                           content: Optional[str] = None, mood: Optional[str] = None,
                           photo_path: Optional[str] = None,
                           location: Optional[Location] = None) -> Optional[DiaryEntry]:
        trip = self.get_trip(username, trip_id)
        if not trip:
            return None
        entry = trip.get_diary_by_date(date_str)
        if not entry:
            return None
        if content is not None:
            entry.content = content
        if mood is not None:
            entry.mood = mood
        if photo_path is not None:
            entry.photo_path = self.storage.save_photo(username, trip_id, photo_path)
        if location is not None:
            entry.location = location
        self.storage.save_trip(username, trip)
        return entry

    def get_diary_entry(self, username: str, trip_id: str, date_str: str) -> Optional[DiaryEntry]:
        trip = self.get_trip(username, trip_id)
        if not trip:
            return None
        return trip.get_diary_by_date(date_str)

    def add_expense(self, username: str, trip_id: str, date_str: str,
                    category: str, amount: float, description: str = "",
                    currency: str = "CNY") -> Expense:
        trip = self.get_trip(username, trip_id)
        if not trip:
            raise ValueError(f"旅行 '{trip_id}' 不存在")
        if category not in self.EXPENSE_CATEGORIES:
            raise ValueError(f"开销类别不正确，必须是: {', '.join(self.EXPENSE_CATEGORIES)}")
        if amount <= 0:
            raise ValueError("开销金额必须大于0")
        if not self._validate_date(date_str):
            raise ValueError("日期格式不正确，请使用 YYYY-MM-DD 格式")
        if not self._is_date_in_trip(trip, date_str):
            raise ValueError(f"日期 {date_str} 不在旅行期间内 ({trip.start_date} ~ {trip.end_date})")
        expense = Expense(
            date=date_str,
            category=category,
            amount=float(amount),
            description=description,
            currency=currency
        )
        entry = trip.get_diary_by_date(date_str)
        if not entry:
            entry = DiaryEntry(date=date_str, content="")
            trip.add_diary_entry(entry)
        entry.add_expense(expense)
        self.storage.save_trip(username, trip)
        return expense

    def list_expenses(self, username: str, trip_id: str, category: Optional[str] = None) -> List[Expense]:
        trip = self.get_trip(username, trip_id)
        if not trip:
            return []
        expenses = trip.get_all_expenses()
        if category:
            expenses = [e for e in expenses if e.category == category]
        expenses.sort(key=lambda x: x.date)
        return expenses

    def get_diary_text(self, username: str, trip_id: str) -> str:
        trip = self.get_trip(username, trip_id)
        if not trip:
            return ""
        lines = []
        lines.append(f"【{trip.name}】")
        lines.append(f"目的地: {trip.destination}")
        lines.append(f"日期: {trip.start_date} ~ {trip.end_date}")
        if trip.description:
            lines.append(f"描述: {trip.description}")
        lines.append("-" * 50)
        for entry in trip.diary_entries:
            lines.append(f"\n日期: {entry.date}")
            if entry.mood:
                lines.append(f"心情: {entry.mood}")
            if entry.location:
                lines.append(f"位置: {entry.location.name} ({entry.location.latitude}, {entry.location.longitude})")
            if entry.content:
                lines.append(f"\n{entry.content}")
            if entry.expenses:
                lines.append("\n当日开销:")
                for exp in entry.expenses:
                    lines.append(f"  [{exp.category}] {exp.description}: ¥{exp.amount:.2f}")
                lines.append(f"  当日总计: ¥{entry.get_total_expenses():.2f}")
            if entry.photo_path:
                lines.append(f"\n照片: {entry.photo_path}")
            lines.append("\n" + "-" * 50)
        total_expense = trip.get_total_expenses()
        lines.append(f"\n旅行总开销: ¥{total_expense:.2f}")
        return "\n".join(lines)

    def get_expense_summary(self, username: str, trip_id: str) -> Dict:
        trip = self.get_trip(username, trip_id)
        if not trip:
            return {}
        expenses = trip.get_all_expenses()
        by_category: Dict[str, float] = {}
        by_date: Dict[str, float] = {}
        total = 0.0
        for exp in expenses:
            total += exp.amount
            by_category[exp.category] = by_category.get(exp.category, 0) + exp.amount
            by_date[exp.date] = by_date.get(exp.date, 0) + exp.amount
        duration = trip.get_duration_days()
        daily_avg = total / duration if duration > 0 else 0
        category_percentages = {}
        for cat, amount in by_category.items():
            category_percentages[cat] = (amount / total * 100) if total > 0 else 0
        return {
            "total": total,
            "daily_average": daily_avg,
            "duration_days": duration,
            "by_category": by_category,
            "by_date": by_date,
            "category_percentages": category_percentages,
            "expense_count": len(expenses)
        }

    def _validate_date(self, date_str: str) -> bool:
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
            return True
        except ValueError:
            return False

    def _is_date_in_trip(self, trip: Trip, date_str: str) -> bool:
        return trip.start_date <= date_str <= trip.end_date

    def get_trip_dates(self, trip: Trip) -> List[str]:
        from datetime import datetime, timedelta
        dates = []
        try:
            start = datetime.strptime(trip.start_date, "%Y-%m-%d").date()
            end = datetime.strptime(trip.end_date, "%Y-%m-%d").date()
            current = start
            while current <= end:
                dates.append(current.strftime("%Y-%m-%d"))
                current += timedelta(days=1)
        except ValueError:
            dates = [e.date for e in trip.diary_entries]
        return dates

    def get_missing_diary_dates(self, username: str, trip_id: str) -> List[str]:
        trip = self.get_trip(username, trip_id)
        if not trip:
            return []
        all_dates = self.get_trip_dates(trip)
        entry_dates = {e.date for e in trip.diary_entries if e.content}
        return [d for d in all_dates if d not in entry_dates]
