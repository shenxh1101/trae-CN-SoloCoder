import json
import os
from typing import List, Dict, Optional
from codedoc.config import Diagnosis


FEEDBACK_FILE = ".codedoc_feedback.json"


class FeedbackStore:
    def __init__(self, project_root: str = "."):
        self.project_root = os.path.abspath(project_root)
        self.feedback_path = self._find_feedback_file()
        self._data = self._load()

    def _find_feedback_file(self) -> str:
        if os.path.isfile(os.path.join(self.project_root, FEEDBACK_FILE)):
            return os.path.join(self.project_root, FEEDBACK_FILE)
        d = self.project_root
        while True:
            p = os.path.join(d, FEEDBACK_FILE)
            if os.path.isfile(p):
                return p
            parent = os.path.dirname(d)
            if parent == d:
                break
            d = parent
        return os.path.join(self.project_root, FEEDBACK_FILE)

    def _load(self) -> Dict:
        if os.path.isfile(self.feedback_path):
            try:
                with open(self.feedback_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {"entries": [], "suppressed_rules": [], "stats": {}}

    def _save(self):
        with open(self.feedback_path, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)

    def mark_feedback(self, diagnosis: Diagnosis, feedback_type: str, comment: str = "") -> bool:
        if feedback_type not in ("false_positive", "helpful"):
            return False

        entry = {
            "file": diagnosis.file,
            "line": diagnosis.line,
            "rule_id": diagnosis.rule_id,
            "message": diagnosis.message,
            "feedback": feedback_type,
            "comment": comment,
        }

        self._data["entries"].append(entry)

        rule_id = diagnosis.rule_id
        if rule_id not in self._data["stats"]:
            self._data["stats"][rule_id] = {"false_positive": 0, "helpful": 0}
        self._data["stats"][rule_id][feedback_type] += 1

        if feedback_type == "false_positive":
            rule_stats = self._data["stats"][rule_id]
            total = rule_stats["false_positive"] + rule_stats["helpful"]
            if total >= 3 and rule_stats["false_positive"] / total >= 0.6:
                if rule_id not in self._data["suppressed_rules"]:
                    self._data["suppressed_rules"].append(rule_id)

        self._save()
        return True

    def get_suppressed_rules(self) -> List[str]:
        return self._data.get("suppressed_rules", [])

    def should_suppress(self, diagnosis: Diagnosis) -> bool:
        return diagnosis.rule_id in self.get_suppressed_rules()

    def get_stats(self) -> Dict:
        return self._data.get("stats", {})

    def list_entries(self, rule_id: Optional[str] = None, feedback_type: Optional[str] = None) -> List[Dict]:
        entries = self._data.get("entries", [])
        if rule_id:
            entries = [e for e in entries if e["rule_id"] == rule_id]
        if feedback_type:
            entries = [e for e in entries if e["feedback"] == feedback_type]
        return entries

    def reset_suppressed(self, rule_id: str) -> bool:
        if rule_id in self._data.get("suppressed_rules", []):
            self._data["suppressed_rules"].remove(rule_id)
            self._save()
            return True
        return False

    def mark_interactive(self, results: List[Diagnosis]) -> List[Diagnosis]:
        suppressed = self.get_suppressed_rules()
        return [d for d in results if d.rule_id not in suppressed]
