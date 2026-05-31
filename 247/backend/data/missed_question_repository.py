from typing import List, Optional, Dict
from config import Config
from utils.json_utils import load_json_file, save_json_file, generate_id, get_current_timestamp

class MissedQuestionRepository:
    def __init__(self):
        self.file_path = Config.MISSED_QUESTIONS_FILE
        self._ensure_initialized()

    def _ensure_initialized(self):
        data = load_json_file(self.file_path, {"missed_questions": []})
        if "missed_questions" not in data:
            data["missed_questions"] = []
            save_json_file(self.file_path, data)

    def get_all(self, limit: int = 100) -> List[Dict]:
        data = load_json_file(self.file_path)
        questions = data.get("missed_questions", [])
        questions.sort(key=lambda x: x["count"], reverse=True)
        return questions[:limit]

    def add_or_update(self, question: str) -> Dict:
        data = load_json_file(self.file_path)
        question_norm = question.strip().lower()
        
        for i, mq in enumerate(data["missed_questions"]):
            if mq["question"].strip().lower() == question_norm:
                mq["count"] += 1
                mq["last_asked_at"] = get_current_timestamp()
                data["missed_questions"][i] = mq
                save_json_file(self.file_path, data)
                return mq
        
        new_missed = {
            "id": generate_id("missed"),
            "question": question,
            "count": 1,
            "last_asked_at": get_current_timestamp()
        }
        data["missed_questions"].append(new_missed)
        save_json_file(self.file_path, data)
        return new_missed

    def delete(self, missed_id: str) -> bool:
        data = load_json_file(self.file_path)
        for i, mq in enumerate(data["missed_questions"]):
            if mq["id"] == missed_id:
                del data["missed_questions"][i]
                save_json_file(self.file_path, data)
                return True
        return False

    def get_stats(self) -> Dict:
        data = load_json_file(self.file_path)
        questions = data.get("missed_questions", [])
        total_count = sum(mq["count"] for mq in questions)
        return {
            "total_unique_questions": len(questions),
            "total_ask_count": total_count
        }
