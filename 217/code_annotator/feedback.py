import json
import os
from datetime import datetime
from typing import Optional, List


class FeedbackSystem:
    def __init__(self, feedback_file: str = "annotation_feedback.json"):
        self.feedback_file = feedback_file
        self.records = self._load()

    def add_feedback(self, file_path: str, block_name: str, block_type: str,
                     comment: str, rating: str, note: str = ""):
        record = {
            "timestamp": datetime.now().isoformat(),
            "file": file_path,
            "block_name": block_name,
            "block_type": block_type,
            "comment": comment,
            "rating": rating,
            "note": note,
        }
        self.records.append(record)
        self._save()

    def get_feedback(self, file_path: str = None, block_name: str = None,
                     rating: str = None) -> List[dict]:
        results = self.records
        if file_path:
            results = [r for r in results if r["file"] == file_path]
        if block_name:
            results = [r for r in results if r["block_name"] == block_name]
        if rating:
            results = [r for r in results if r["rating"] == rating]
        return results

    def get_stats(self) -> dict:
        total = len(self.records)
        useful = len([r for r in self.records if r["rating"] == "useful"])
        useless = len([r for r in self.records if r["rating"] == "useless"])
        return {
            "total": total,
            "useful": useful,
            "useless": useless,
            "useful_rate": f"{useful / total * 100:.1f}%" if total > 0 else "N/A",
        }

    def _load(self) -> List[dict]:
        if os.path.exists(self.feedback_file):
            try:
                with open(self.feedback_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save(self):
        with open(self.feedback_file, 'w', encoding='utf-8') as f:
            json.dump(self.records, f, ensure_ascii=False, indent=2)
