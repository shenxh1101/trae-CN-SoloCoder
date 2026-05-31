import json
import os
from typing import Dict, List, Optional
from .models import MeetingSummary, ActionItem, Priority
from .utils import generate_id


class FeedbackManager:
    def __init__(self, feedback_dir: str = ".feedback"):
        self.feedback_dir = feedback_dir
        os.makedirs(feedback_dir, exist_ok=True)
        self.feedback_file = os.path.join(feedback_dir, "feedback.json")
        self._load_feedback()

    def _load_feedback(self):
        if os.path.exists(self.feedback_file):
            with open(self.feedback_file, 'r', encoding='utf-8') as f:
                self.feedback_data = json.load(f)
        else:
            self.feedback_data = {
                "corrections": [],
                "preferences": {
                    "priority_keywords": {},
                    "name_aliases": {},
                    "action_keywords": []
                },
                "accuracy_scores": []
            }

    def _save_feedback(self):
        with open(self.feedback_file, 'w', encoding='utf-8') as f:
            json.dump(self.feedback_data, f, ensure_ascii=False, indent=2)

    def add_correction(
        self,
        original_summary: MeetingSummary,
        corrected_field: str,
        original_value: str,
        corrected_value: str,
        notes: Optional[str] = None
    ):
        correction = {
            "id": generate_id(original_summary.title, corrected_field, original_value),
            "meeting_title": original_summary.title,
            "field": corrected_field,
            "original_value": original_value,
            "corrected_value": corrected_value,
            "notes": notes,
            "timestamp": generate_id()
        }
        self.feedback_data["corrections"].append(correction)
        self._save_feedback()

    def add_action_item_correction(
        self,
        action_item: ActionItem,
        field: str,
        corrected_value: str,
        notes: Optional[str] = None
    ):
        original_value = getattr(action_item, field, "")
        if hasattr(original_value, 'value'):
            original_value = original_value.value

        self.add_correction(
            original_summary=type('obj', (object,), {'title': action_item.id})(),
            corrected_field=f"action_item.{field}",
            original_value=str(original_value),
            corrected_value=corrected_value,
            notes=notes
        )

    def add_preference(self, preference_type: str, key: str, value: str):
        if preference_type not in self.feedback_data["preferences"]:
            self.feedback_data["preferences"][preference_type] = {}
        self.feedback_data["preferences"][preference_type][key] = value
        self._save_feedback()

    def add_name_alias(self, alias: str, canonical_name: str):
        self.feedback_data["preferences"]["name_aliases"][alias] = canonical_name
        self._save_feedback()

    def add_priority_keyword(self, keyword: str, priority: Priority):
        self.feedback_data["preferences"]["priority_keywords"][keyword] = priority.value
        self._save_feedback()

    def add_action_keyword(self, keyword: str):
        if keyword not in self.feedback_data["preferences"]["action_keywords"]:
            self.feedback_data["preferences"]["action_keywords"].append(keyword)
            self._save_feedback()

    def rate_accuracy(self, summary: MeetingSummary, score: int, comment: Optional[str] = None):
        if score < 1 or score > 5:
            raise ValueError("Score must be between 1 and 5")

        rating = {
            "meeting_title": summary.title,
            "score": score,
            "comment": comment,
            "action_item_count": len(summary.action_items),
            "timestamp": generate_id()
        }
        self.feedback_data["accuracy_scores"].append(rating)
        self._save_feedback()

    def get_preferences(self) -> Dict:
        return self.feedback_data["preferences"]

    def get_name_aliases(self) -> Dict[str, str]:
        return self.feedback_data["preferences"].get("name_aliases", {})

    def get_priority_keywords(self) -> Dict[str, str]:
        return self.feedback_data["preferences"].get("priority_keywords", {})

    def get_action_keywords(self) -> List[str]:
        return self.feedback_data["preferences"].get("action_keywords", [])

    def get_accuracy_stats(self) -> Dict:
        scores = [s["score"] for s in self.feedback_data["accuracy_scores"]]
        if not scores:
            return {"average": 0, "count": 0}
        return {
            "average": sum(scores) / len(scores),
            "count": len(scores),
            "distribution": {
                str(i): scores.count(i) for i in range(1, 6)
            }
        }

    def apply_preferences_to_summary(self, summary: MeetingSummary) -> MeetingSummary:
        name_aliases = self.get_name_aliases()
        priority_keywords = self.get_priority_keywords()
        action_keywords = self.get_action_keywords()

        for ai in summary.action_items:
            if ai.assignee and ai.assignee in name_aliases:
                ai.assignee = name_aliases[ai.assignee]

            for keyword, priority in priority_keywords.items():
                if keyword.lower() in ai.task.lower():
                    ai.priority = Priority(priority)
                    break

        return summary

    def export_feedback(self, filepath: str):
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.feedback_data, f, ensure_ascii=False, indent=2)

    def import_feedback(self, filepath: str):
        with open(filepath, 'r', encoding='utf-8') as f:
            self.feedback_data = json.load(f)
        self._save_feedback()
