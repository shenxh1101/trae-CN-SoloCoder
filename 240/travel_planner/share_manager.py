import json
import os
from datetime import datetime
from typing import List, Optional
from .models import TravelPlan, ShareRecord


class ShareManager:
    def __init__(self, data_dir: Optional[str] = None):
        if data_dir:
            self.data_dir = data_dir
        else:
            self.data_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"
            )
        self.share_file = os.path.join(self.data_dir, "shares.json")
        self._shares: List[ShareRecord] = []
        self._load_shares()

    def _load_shares(self) -> None:
        if os.path.exists(self.share_file):
            try:
                with open(self.share_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._shares = [ShareRecord(**item) for item in data]
            except (json.JSONDecodeError, KeyError):
                self._shares = []

    def _save_shares(self) -> None:
        with open(self.share_file, "w", encoding="utf-8") as f:
            json.dump(
                [s.to_dict() for s in self._shares],
                f,
                ensure_ascii=False,
                indent=2,
            )

    def share_plan(self, plan: TravelPlan) -> str:
        existing = self.get_share_by_id(plan.plan_id)
        if existing:
            return plan.plan_id
        
        record = ShareRecord(
            plan_id=plan.plan_id,
            plan_title=plan.title,
            likes=0,
            shared_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            feedbacks=[],
        )
        self._shares.append(record)
        self._save_shares()
        
        return plan.plan_id

    def get_share_by_id(self, plan_id: str) -> Optional[ShareRecord]:
        for record in self._shares:
            if record.plan_id == plan_id:
                return record
        return None

    def like_plan(self, plan_id: str) -> bool:
        record = self.get_share_by_id(plan_id)
        if record:
            record.likes += 1
            self._save_shares()
            return True
        return False

    def add_feedback(self, plan_id: str, feedback: str) -> bool:
        record = self.get_share_by_id(plan_id)
        if record:
            record.feedbacks.append(feedback)
            self._save_shares()
            return True
        return False

    def get_all_shared_plans(self) -> List[ShareRecord]:
        return sorted(self._shares, key=lambda x: x.likes, reverse=True)

    def get_popular_plans(self, limit: int = 10) -> List[ShareRecord]:
        return sorted(self._shares, key=lambda x: x.likes, reverse=True)[:limit]

    def get_share_info(self, plan_id: str) -> str:
        record = self.get_share_by_id(plan_id)
        if not record:
            return f"计划ID {plan_id} 未找到或未分享"
        
        lines = [
            "=" * 50,
            f"📋 计划: {record.plan_title}",
            f"🆔 计划ID: {record.plan_id}",
            f"👍 点赞数: {record.likes}",
            f"📅 分享时间: {record.shared_at}",
            "=" * 50,
        ]
        
        if record.feedbacks:
            lines.append("")
            lines.append("💬 用户反馈:")
            for i, fb in enumerate(record.feedbacks, 1):
                lines.append(f"   {i}. {fb}")
        
        return "\n".join(lines)

    def display_share_link(self, plan_id: str) -> str:
        return (
            f"\n{'='*60}\n"
            f"🎉 分享成功！\n"
            f"📱 分享链接: travelplanner://share/{plan_id}\n"
            f"🔗 分享码: {plan_id}\n"
            f"💡 他人可使用分享码查看并点赞您的计划\n"
            f"{'='*60}\n"
        )
