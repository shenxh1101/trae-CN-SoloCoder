import json
import os
import uuid
from datetime import datetime, timezone

def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

def get_current_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()

def load_json_file(file_path: str, default_data: dict = None) -> dict:
    if default_data is None:
        default_data = {}
    
    if not os.path.exists(file_path):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        save_json_file(file_path, default_data)
        return default_data
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return default_data

def save_json_file(file_path: str, data: dict) -> None:
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
