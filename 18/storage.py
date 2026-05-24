import os
import json
from typing import List, Optional, Dict, Any
from crypto import CryptoManager
from models import PasswordEntry


class StorageManager:
    def __init__(self, data_file: str = "passwords.json"):
        self.data_file = data_file
        self.crypto = CryptoManager()
        self.entries: List[PasswordEntry] = []
        self.master_password_hash: Optional[str] = None
        self.emergency_contact: Optional[Dict[str, Any]] = None
        self.settings: Dict[str, Any] = {
            "auto_lock_attempts": 3,
            "lock_duration_minutes": 5,
            "backup_enabled": False,
            "backup_directory": None,
        }

    def initialize_vault(self, master_password: str) -> bool:
        if os.path.exists(self.data_file):
            return False

        self.master_password_hash = self._hash_password(master_password)
        self._save_to_disk(master_password)
        return True

    def unlock_vault(self, master_password: str) -> bool:
        if not os.path.exists(self.data_file):
            return False

        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                encrypted_package = json.load(f)

            decrypted_data = self.crypto.decrypt_data(encrypted_package, master_password)
            self._load_from_dict(decrypted_data)
            return True
        except (ValueError, json.JSONDecodeError, KeyError):
            return False

    def _hash_password(self, password: str) -> str:
        import hashlib
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    def _load_from_dict(self, data: Dict[str, Any]):
        self.entries = [PasswordEntry.from_dict(e) for e in data.get("entries", [])]
        self.master_password_hash = data.get("master_password_hash")
        self.emergency_contact = data.get("emergency_contact")
        self.settings.update(data.get("settings", {}))

    def _to_dict(self) -> Dict[str, Any]:
        return {
            "entries": [e.to_dict() for e in self.entries],
            "master_password_hash": self.master_password_hash,
            "emergency_contact": self.emergency_contact,
            "settings": self.settings,
        }

    def _save_to_disk(self, master_password: str):
        data = self._to_dict()
        encrypted_package = self.crypto.encrypt_data(data, master_password)
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(encrypted_package, f, indent=2, ensure_ascii=False)

    def save(self, master_password: str):
        self._save_to_disk(master_password)

    def add_entry(self, entry: PasswordEntry, master_password: str):
        self.entries.append(entry)
        self.save(master_password)

    def update_entry(self, entry: PasswordEntry, master_password: str):
        for i, e in enumerate(self.entries):
            if e.id == entry.id:
                self.entries[i] = entry
                break
        self.save(master_password)

    def delete_entry(self, entry_id: str, master_password: str) -> bool:
        for i, e in enumerate(self.entries):
            if e.id == entry_id:
                del self.entries[i]
                self.save(master_password)
                return True
        return False

    def get_entry(self, entry_id: str) -> Optional[PasswordEntry]:
        for e in self.entries:
            if e.id == entry_id:
                return e
        return None

    def get_all_entries(self) -> List[PasswordEntry]:
        return sorted(self.entries, key=lambda e: e.website.lower())

    def search_entries(self, keyword: str, fields: Optional[List[str]] = None) -> List[PasswordEntry]:
        if fields is None:
            fields = ["website", "username", "notes"]

        keyword = keyword.lower()
        results = []
        for entry in self.entries:
            entry_dict = entry.to_dict()
            for field in fields:
                value = str(entry_dict.get(field, "")).lower()
                if keyword in value:
                    results.append(entry)
                    break
        return sorted(results, key=lambda e: e.website.lower())

    def search_by_website(self, website: str) -> List[PasswordEntry]:
        return self.search_entries(website, fields=["website"])

    def search_by_username(self, username: str) -> List[PasswordEntry]:
        return self.search_entries(username, fields=["username"])

    def change_master_password(self, old_password: str, new_password: str) -> bool:
        if not self.unlock_vault(old_password):
            return False
        self.master_password_hash = self._hash_password(new_password)
        self.save(new_password)
        return True

    def set_emergency_contact(self, name: str, public_key: str, master_password: str):
        self.emergency_contact = {
            "name": name,
            "public_key": public_key,
            "created_at": __import__("datetime").datetime.now().isoformat(),
        }
        self.save(master_password)

    def remove_emergency_contact(self, master_password: str):
        self.emergency_contact = None
        self.save(master_password)

    def get_setting(self, key: str) -> Any:
        return self.settings.get(key)

    def set_setting(self, key: str, value: Any, master_password: str):
        self.settings[key] = value
        self.save(master_password)
