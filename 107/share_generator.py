from models import TravelPlan
from datetime import timedelta
from typing import Optional


class ShareGenerator:
    def __init__(self, exchange_rate: float = 7.0):
        self.exchange_rate = exchange_rate

    def generate_share_text(self, plan: TravelPlan, style: str = "normal") -> str:
        if style == "compact":
            return self._generate_compact(plan)
        elif style == "detailed":
            return self._generate_detailed(plan)
        else:
            return self._generate_normal(plan)

    def _generate_normal(self, plan: TravelPlan) -> str:
        lines = []
        lines.append(f"✈️ 旅行计划: {plan.name}")
        lines.append(f"📍 目的地: {plan.destination}")
        lines.append(f"📅 {plan.start_date} 至 {plan.end_date} ({plan.duration}天)")
        lines.append("")

        if plan.daily_itineraries:
            lines.append("📝 行程概览:")
            current_day = 0
            for itinerary in plan.daily_itineraries:
                if itinerary.day != current_day:
                    current_day = itinerary.day
                    lines.append(f"  第{itinerary.day}天:")
                lines.append(f"    • {itinerary.time} {itinerary.location}")
            lines.append("")

        if plan.budget_items:
            total = plan.total_budget("CNY", self.exchange_rate)
            lines.append(f"💰 预算: ¥{total:.0f}")

        return "\n".join(lines)

    def _generate_compact(self, plan: TravelPlan) -> str:
        locations = list(dict.fromkeys([i.location for i in plan.daily_itineraries]))
        loc_str = " → ".join(locations[:3])
        if len(locations) > 3:
            loc_str += f" 等{len(locations)}个地点"

        text = f"【{plan.name}】{plan.destination} {plan.start_date}~{plan.end_date} {plan.duration}天"
        if loc_str:
            text += f" | {loc_str}"
        if plan.budget_items:
            total = plan.total_budget("CNY", self.exchange_rate)
            text += f" | 预算¥{total:.0f}"
        return text

    def _generate_detailed(self, plan: TravelPlan) -> str:
        lines = []
        lines.append("=" * 50)
        lines.append(f"✨ {plan.name} ✨")
        lines.append("=" * 50)
        lines.append(f"")
        lines.append(f"🌍 目的地: {plan.destination}")
        lines.append(f"🚀 出发: {plan.start_date}")
        lines.append(f"🏠 返回: {plan.end_date}")
        lines.append(f"⏱️ 时长: {plan.duration} 天")
        lines.append(f"")

        if plan.daily_itineraries:
            lines.append("📅 详细行程:")
            lines.append("-" * 50)
            current_day = 0
            for itinerary in plan.daily_itineraries:
                if itinerary.day != current_day:
                    current_day = itinerary.day
                    current_date = plan.start_date + timedelta(days=itinerary.day - 1)
                    lines.append(f"")
                    lines.append(f"【第 {itinerary.day} 天 - {current_date}】")
                    lines.append("-" * 30)
                lines.append(f"  ⏰ {itinerary.time}")
                lines.append(f"  📍 {itinerary.location}")
                if itinerary.notes:
                    lines.append(f"  📝 {itinerary.notes}")
                lines.append("")

        if plan.budget_items:
            lines.append("=" * 50)
            lines.append("💰 预算明细:")
            lines.append("-" * 50)
            for item in plan.budget_items:
                status = "✓" if item.is_spent else "○"
                lines.append(f"  {status} {item.category}: {item.description} - {item.amount:.2f} {item.currency}")
            lines.append("-" * 50)
            total = plan.total_budget("CNY", self.exchange_rate)
            spent = plan.total_spent("CNY", self.exchange_rate)
            lines.append(f"  总预算: ¥{total:.2f}")
            lines.append(f"  已花费: ¥{spent:.2f}")
            lines.append(f"  剩余: ¥{total - spent:.2f}")

        if plan.packing_list:
            lines.append("")
            lines.append("=" * 50)
            lines.append("🎒 行李清单:")
            lines.append("-" * 50)
            for item in plan.packing_list[:15]:
                lines.append(f"  ☐ {item}")
            if len(plan.packing_list) > 15:
                lines.append(f"  ... 等{len(plan.packing_list)}项")

        lines.append("")
        lines.append("=" * 50)
        lines.append("🎉 祝旅途愉快!")
        lines.append("=" * 50)

        return "\n".join(lines)

    def print_share_text(self, plan: TravelPlan) -> None:
        print("\n" + "=" * 60)
        print("📋 行程分享文本 (可复制到微信)")
        print("=" * 60)
        print("\n【简洁版】")
        print(self._generate_compact(plan))
        print("\n【普通版】")
        print(self._generate_normal(plan))
        print("\n【详细版】")
        print(self._generate_detailed(plan))
        print("=" * 60 + "\n")
