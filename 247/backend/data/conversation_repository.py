from typing import List, Optional, Dict
from config import Config
from utils.json_utils import load_json_file, save_json_file, generate_id, get_current_timestamp

class ConversationRepository:
    def __init__(self):
        self.file_path = Config.CONVERSATION_HISTORY_FILE
        self._ensure_initialized()

    def _ensure_initialized(self):
        data = load_json_file(self.file_path, {"conversations": []})
        if "conversations" not in data:
            data["conversations"] = []
            save_json_file(self.file_path, data)

    def get_all_conversations(self) -> List[Dict]:
        data = load_json_file(self.file_path)
        return data.get("conversations", [])

    def get_conversation_by_id(self, conversation_id: str) -> Optional[Dict]:
        conversations = self.get_all_conversations()
        for conv in conversations:
            if conv["id"] == conversation_id:
                return conv
        return None

    def create_conversation(self, title: str) -> Dict:
        data = load_json_file(self.file_path)
        new_conversation = {
            "id": generate_id("conv"),
            "title": title,
            "messages": [],
            "created_at": get_current_timestamp(),
            "updated_at": get_current_timestamp()
        }
        data["conversations"].insert(0, new_conversation)
        save_json_file(self.file_path, data)
        return new_conversation

    def add_message(self, conversation_id: str, message: Dict) -> Optional[Dict]:
        data = load_json_file(self.file_path)
        for i, conv in enumerate(data["conversations"]):
            if conv["id"] == conversation_id:
                new_message = {
                    "id": generate_id("msg"),
                    **message,
                    "timestamp": get_current_timestamp()
                }
                conv["messages"].append(new_message)
                conv["updated_at"] = get_current_timestamp()
                data["conversations"][i] = conv
                save_json_file(self.file_path, data)
                return new_message
        return None

    def update_conversation_title(self, conversation_id: str, title: str) -> Optional[Dict]:
        data = load_json_file(self.file_path)
        for i, conv in enumerate(data["conversations"]):
            if conv["id"] == conversation_id:
                conv["title"] = title
                conv["updated_at"] = get_current_timestamp()
                data["conversations"][i] = conv
                save_json_file(self.file_path, data)
                return conv
        return None

    def delete_conversation(self, conversation_id: str) -> bool:
        data = load_json_file(self.file_path)
        for i, conv in enumerate(data["conversations"]):
            if conv["id"] == conversation_id:
                del data["conversations"][i]
                save_json_file(self.file_path, data)
                return True
        return False

    def get_conversation_context(self, conversation_id: str, limit: int = 5) -> List[Dict]:
        conv = self.get_conversation_by_id(conversation_id)
        if not conv:
            return []
        return conv["messages"][-limit:]
