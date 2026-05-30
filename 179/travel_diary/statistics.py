from typing import Optional, Dict
from collections import defaultdict

from .manager import DiaryManager


class StatisticsAnalyzer:
    def __init__(self, manager: Optional[DiaryManager] = None):
        self.manager = manager or DiaryManager()

    def get_detailed_summary(self, username: str, trip_id: str) -> Dict:
        summary = self.manager.get_expense_summary(username, trip_id)
        if not summary:
            return {}
        trip = self.manager.get_trip(username, trip_id)
        if not trip:
            return summary
        by_category = summary.get("by_category", {})
        categories_sorted = sorted(by_category.items(), key=lambda x: x[1], reverse=True)
        if categories_sorted:
            top_category, top_amount = categories_sorted[0]
            summary["top_category"] = top_category
            summary["top_category_amount"] = top_amount
        by_date = summary.get("by_date", {})
        if by_date:
            max_date = max(by_date.items(), key=lambda x: x[1])
            summary["highest_spending_day"] = max_date[0]
            summary["highest_spending_amount"] = max_date[1]
        entries_with_content = [e for e in trip.diary_entries if e.content]
        entries_with_photos = [e for e in trip.diary_entries if e.photo_path]
        entries_with_locations = [e for e in trip.diary_entries if e.location and e.location.latitude != 0]
        summary["diary_entries_count"] = len(entries_with_content)
        summary["photos_count"] = len(entries_with_photos)
        summary["locations_count"] = len(entries_with_locations)
        summary["completion_rate"] = (
            len(entries_with_content) / summary.get("duration_days", 1) * 100
            if summary.get("duration_days", 0) > 0 else 0
        )
        return summary

    def print_summary(self, username: str, trip_id: str) -> str:
        summary = self.get_detailed_summary(username, trip_id)
        if not summary:
            return "未找到旅行数据"
        trip = self.manager.get_trip(username, trip_id)
        lines = []
        lines.append("=" * 60)
        lines.append(f"📊 旅行开销统计 - {trip.name if trip else trip_id}")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"📅 旅行天数: {summary.get('duration_days', 0)} 天")
        lines.append(f"📝 日记完成率: {summary.get('completion_rate', 0):.1f}%")
        lines.append(f"📷 照片数量: {summary.get('photos_count', 0)} 张")
        lines.append(f"📍 位置标记: {summary.get('locations_count', 0)} 处")
        lines.append("")
        lines.append("-" * 60)
        lines.append("")
        lines.append(f"💰 总开销: ¥{summary.get('total', 0):.2f}")
        lines.append(f"📈 日均开销: ¥{summary.get('daily_average', 0):.2f}")
        lines.append(f"🧮 开销笔数: {summary.get('expense_count', 0)} 笔")
        lines.append("")
        if summary.get("highest_spending_day"):
            lines.append(f"📆 最高消费日: {summary['highest_spending_day']} (¥{summary['highest_spending_amount']:.2f})")
        if summary.get("top_category"):
            lines.append(f"🏷️  主要开销类别: {summary['top_category']} (¥{summary['top_category_amount']:.2f})")
        lines.append("")
        lines.append("-" * 60)
        lines.append("")
        lines.append("📋 开销类别明细:")
        lines.append("")
        by_category = summary.get("by_category", {})
        percentages = summary.get("category_percentages", {})
        if not by_category:
            lines.append("  (暂无开销记录)")
        else:
            max_amount = max(by_category.values()) if by_category else 1
            for category in sorted(by_category.keys()):
                amount = by_category[category]
                pct = percentages.get(category, 0)
                bar_length = int(amount / max_amount * 30)
                bar = "█" * bar_length + "░" * (30 - bar_length)
                lines.append(f"  {category:6s} | {bar} | ¥{amount:8.2f} ({pct:5.1f}%)")
        lines.append("")
        lines.append("-" * 60)
        lines.append("")
        lines.append("📅 每日开销:")
        lines.append("")
        by_date = summary.get("by_date", {})
        if not by_date:
            lines.append("  (暂无开销记录)")
        else:
            max_daily = max(by_date.values()) if by_date else 1
            for date in sorted(by_date.keys()):
                amount = by_date[date]
                bar_length = int(amount / max_daily * 30)
                bar = "█" * bar_length + "░" * (30 - bar_length)
                lines.append(f"  {date} | {bar} | ¥{amount:8.2f}")
        lines.append("")
        lines.append("=" * 60)
        return "\n".join(lines)

    def get_user_overall_stats(self, username: str) -> Dict:
        trips = self.manager.list_trips(username)
        if not trips:
            return {}
        total_trips = len(trips)
        total_days = 0
        total_expense = 0.0
        all_expenses_by_category: Dict[str, float] = defaultdict(float)
        destinations = set()
        for trip in trips:
            total_days += trip.get_duration_days()
            trip_expense = trip.get_total_expenses()
            total_expense += trip_expense
            destinations.add(trip.destination)
            for exp in trip.get_all_expenses():
                all_expenses_by_category[exp.category] += exp.amount
        overall = {
            "total_trips": total_trips,
            "total_days": total_days,
            "total_expense": total_expense,
            "unique_destinations": len(destinations),
            "avg_trip_duration": total_days / total_trips if total_trips > 0 else 0,
            "avg_daily_expense": total_expense / total_days if total_days > 0 else 0,
            "avg_trip_expense": total_expense / total_trips if total_trips > 0 else 0,
            "by_category": dict(all_expenses_by_category)
        }
        return overall
