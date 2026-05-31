from typing import List, Optional, Dict
from config import Config
from utils.json_utils import load_json_file, save_json_file, generate_id, get_current_timestamp

class KnowledgeRepository:
    def __init__(self):
        self.file_path = Config.KNOWLEDGE_BASE_FILE
        self._ensure_initialized()

    def _ensure_initialized(self):
        data = load_json_file(self.file_path, {"entries": []})
        if "entries" not in data:
            data["entries"] = []
            save_json_file(self.file_path, data)

    def get_all_entries(self) -> List[Dict]:
        data = load_json_file(self.file_path)
        return data.get("entries", [])

    def get_entry_by_id(self, entry_id: str) -> Optional[Dict]:
        entries = self.get_all_entries()
        for entry in entries:
            if entry["id"] == entry_id:
                return entry
        return None

    def add_entry(self, entry_data: Dict) -> Dict:
        data = load_json_file(self.file_path)
        new_entry = {
            "id": generate_id("entry"),
            "question": entry_data["question"],
            "keywords": entry_data.get("keywords", []),
            "answer_points": entry_data["answer_points"],
            "legal_references": entry_data.get("legal_references", []),
            "category": entry_data.get("category", "未分类"),
            "weight": entry_data.get("weight", 1.0),
            "helpful_count": 0,
            "not_helpful_count": 0,
            "created_at": get_current_timestamp(),
            "updated_at": get_current_timestamp()
        }
        data["entries"].append(new_entry)
        save_json_file(self.file_path, data)
        return new_entry

    def update_entry(self, entry_id: str, update_data: Dict) -> Optional[Dict]:
        data = load_json_file(self.file_path)
        for i, entry in enumerate(data["entries"]):
            if entry["id"] == entry_id:
                for key, value in update_data.items():
                    if key in entry:
                        entry[key] = value
                entry["updated_at"] = get_current_timestamp()
                data["entries"][i] = entry
                save_json_file(self.file_path, data)
                return entry
        return None

    def delete_entry(self, entry_id: str) -> bool:
        data = load_json_file(self.file_path)
        for i, entry in enumerate(data["entries"]):
            if entry["id"] == entry_id:
                del data["entries"][i]
                save_json_file(self.file_path, data)
                return True
        return False

    def update_vote_count(self, entry_id: str, is_helpful: bool) -> Optional[Dict]:
        entry = self.get_entry_by_id(entry_id)
        if not entry:
            return None
        
        if is_helpful:
            entry["helpful_count"] += 1
            entry["weight"] = min(2.0, entry["weight"] + 0.01)
        else:
            entry["not_helpful_count"] += 1
            entry["weight"] = max(0.5, entry["weight"] - 0.01)
        
        return self.update_entry(entry_id, entry)

    def search_entries(self, keyword: str) -> List[Dict]:
        entries = self.get_all_entries()
        keyword = keyword.lower()
        results = []
        for entry in entries:
            if (keyword in entry["question"].lower() or
                any(keyword in k.lower() for k in entry["keywords"]) or
                keyword in entry["category"].lower()):
                results.append(entry)
        return results
