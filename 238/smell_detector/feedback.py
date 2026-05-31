import json
import os
from typing import List, Optional

from .detectors.base import SmellResult


class FeedbackStore:
    def __init__(self):
        self._store_path = os.path.expanduser("~/.smell_detector/false_positives.json")
        self._records = self._load()

    def _load(self) -> list:
        if os.path.exists(self._store_path):
            try:
                with open(self._store_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save(self):
        os.makedirs(os.path.dirname(self._store_path), exist_ok=True)
        with open(self._store_path, "w", encoding="utf-8") as f:
            json.dump(self._records, f, ensure_ascii=False, indent=2)

    def mark_false_positive(self, file_path: str, smell_type: str,
                            start_line: int, reason: str = ""):
        record = {
            "file_path": file_path,
            "smell_type": smell_type,
            "start_line": start_line,
            "reason": reason,
        }
        for existing in self._records:
            if (existing["file_path"] == file_path
                    and existing["smell_type"] == smell_type
                    and existing["start_line"] == start_line):
                existing["reason"] = reason
                self._save()
                return

        self._records.append(record)
        self._save()

    def unmark_false_positive(self, file_path: str, smell_type: str, start_line: int):
        self._records = [
            r for r in self._records
            if not (r["file_path"] == file_path
                    and r["smell_type"] == smell_type
                    and r["start_line"] == start_line)
        ]
        self._save()

    def filter_false_positives(self, results: List[SmellResult]):
        for result in results:
            for record in self._records:
                if (record["file_path"] == result.location.file_path
                        and record["smell_type"] == result.smell_type
                        and record["start_line"] == result.location.start_line):
                    result.is_false_positive = True
                    break

    def is_false_positive(self, file_path: str, smell_type: str, start_line: int) -> bool:
        return any(
            r["file_path"] == file_path
            and r["smell_type"] == smell_type
            and r["start_line"] == start_line
            for r in self._records
        )

    def list_all(self) -> list:
        return list(self._records)

    def clear_all(self):
        self._records = []
        self._save()
