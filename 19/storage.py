import json
import os
import secrets
import string
import shutil
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from config import Config

class JSONStorage:
    def __init__(self, filepath: str):
        self.filepath = filepath
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.filepath):
            with open(self.filepath, 'w', encoding='utf-8') as f:
                if self.filepath.endswith('locked_links.json'):
                    json.dump({}, f, indent=2, ensure_ascii=False)
                else:
                    json.dump([], f, indent=2, ensure_ascii=False)

    def _read(self) -> Any:
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return [] if not self.filepath.endswith('locked_links.json') else {}

    def _write(self, data: Any):
        tmp_path = self.filepath + '.tmp'
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, self.filepath)

class FileStorage(JSONStorage):
    def __init__(self):
        super().__init__(Config.FILES_JSON)

    def generate_short_code(self) -> str:
        existing = {f['short_code'] for f in self._read()}
        alphabet = string.ascii_letters + string.digits
        while True:
            code = ''.join(secrets.choice(alphabet) for _ in range(Config.SHORT_CODE_LENGTH))
            if code not in existing:
                return code

    def generate_extract_code(self) -> str:
        digits = string.digits
        return ''.join(secrets.choice(digits) for _ in range(Config.EXTRACT_CODE_LENGTH))

    def generate_admin_key(self) -> str:
        existing = {f['admin_key'] for f in self._read()}
        alphabet = string.ascii_letters + string.digits
        while True:
            key = ''.join(secrets.choice(alphabet) for _ in range(Config.ADMIN_KEY_LENGTH))
            if key not in existing:
                return key

    def add_file(self, file_info: Dict) -> Dict:
        files = self._read()
        file_info['short_code'] = self.generate_short_code()
        file_info['extract_code'] = self.generate_extract_code()
        file_info['admin_key'] = self.generate_admin_key()
        file_info['download_count'] = 0
        file_info['created_at'] = datetime.now().isoformat()
        file_info['failed_attempts'] = 0
        file_info['locked_until'] = None
        file_info['status'] = 'active'
        files.append(file_info)
        self._write(files)
        return file_info

    def get_file(self, short_code: str) -> Optional[Dict]:
        files = self._read()
        for f in files:
            if f['short_code'] == short_code:
                return f
        return None

    def update_file(self, short_code: str, updates: Dict) -> Optional[Dict]:
        files = self._read()
        for i, f in enumerate(files):
            if f['short_code'] == short_code:
                files[i].update(updates)
                self._write(files)
                return files[i]
        return None

    def delete_file(self, short_code: str) -> bool:
        files = self._read()
        for i, f in enumerate(files):
            if f['short_code'] == short_code:
                deleted = files.pop(i)
                self._write(files)
                file_path = os.path.join(Config.UPLOAD_FOLDER, deleted.get('storage_path', ''))
                if os.path.exists(file_path):
                    if os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                    else:
                        os.remove(file_path)
                return True
        return False

    def get_files_by_admin_key(self, admin_key: str) -> List[Dict]:
        files = self._read()
        return [f for f in files if f.get('admin_key') == admin_key]

    def get_all_files(self) -> List[Dict]:
        return self._read()

    def increment_download(self, short_code: str) -> Optional[Dict]:
        files = self._read()
        for i, f in enumerate(files):
            if f['short_code'] == short_code:
                files[i]['download_count'] = files[i].get('download_count', 0) + 1
                self._write(files)
                return files[i]
        return None

    def check_and_update_failed_attempt(self, short_code: str, success: bool) -> Dict:
        files = self._read()
        for i, f in enumerate(files):
            if f['short_code'] == short_code:
                if success:
                    files[i]['failed_attempts'] = 0
                    files[i]['locked_until'] = None
                else:
                    files[i]['failed_attempts'] = files[i].get('failed_attempts', 0) + 1
                    if files[i]['failed_attempts'] >= Config.MAX_RETRY_ATTEMPTS:
                        files[i]['locked_until'] = (datetime.now() + Config.LOCK_DURATION).isoformat()
                self._write(files)
                return files[i]
        return {}

    def search_by_tags(self, tags: List[str]) -> List[Dict]:
        files = self._read()
        result = []
        for f in files:
            file_tags = set(f.get('tags', []))
            if file_tags.intersection(set(tags)):
                result.append(f)
        return result

    def cleanup_expired_files(self) -> int:
        files = self._read()
        now = datetime.now()
        expired = []
        active = []
        for f in files:
            if f.get('expires_at'):
                try:
                    expires_at = datetime.fromisoformat(f['expires_at'])
                    if now >= expires_at:
                        expired.append(f)
                        continue
                except (ValueError, TypeError):
                    pass
            if f.get('max_downloads') and f.get('download_count', 0) >= f['max_downloads']:
                expired.append(f)
                continue
            active.append(f)
        
        for f in expired:
            file_path = os.path.join(Config.UPLOAD_FOLDER, f.get('storage_path', ''))
            if os.path.exists(file_path):
                if os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                else:
                    os.remove(file_path)
        
        self._write(active)
        return len(expired)

class APITokenStorage(JSONStorage):
    def __init__(self):
        super().__init__(Config.API_TOKENS_JSON)

    def generate_token(self) -> str:
        return secrets.token_hex(32)

    def create_token(self, name: str, permissions: List[str] = None) -> Dict:
        tokens = self._read()
        token_info = {
            'token': self.generate_token(),
            'name': name,
            'permissions': permissions or ['upload', 'download'],
            'created_at': datetime.now().isoformat(),
            'last_used': None,
            'active': True
        }
        tokens.append(token_info)
        self._write(tokens)
        return token_info

    def validate_token(self, token: str, permission: str = None) -> Optional[Dict]:
        tokens = self._read()
        for t in tokens:
            if t['token'] == token and t['active']:
                if permission and permission not in t.get('permissions', []):
                    return None
                return t
        return None

    def update_last_used(self, token: str):
        tokens = self._read()
        for i, t in enumerate(tokens):
            if t['token'] == token:
                tokens[i]['last_used'] = datetime.now().isoformat()
                self._write(tokens)
                break

    def list_tokens(self) -> List[Dict]:
        return self._read()

    def revoke_token(self, token: str) -> bool:
        tokens = self._read()
        for i, t in enumerate(tokens):
            if t['token'] == token:
                tokens[i]['active'] = False
                self._write(tokens)
                return True
        return False

class AdminKeyStorage(JSONStorage):
    def __init__(self):
        super().__init__(Config.ADMIN_KEYS_JSON)
        self._init_default_admin()

    def _init_default_admin(self):
        keys = self._read()
        if not keys:
            default_key = {
                'key': Config.DEFAULT_ADMIN_KEY,
                'name': 'Default Admin',
                'created_at': datetime.now().isoformat(),
                'super_admin': True
            }
            keys.append(default_key)
            self._write(keys)

    def validate_admin_key(self, key: str) -> Optional[Dict]:
        keys = self._read()
        for k in keys:
            if k['key'] == key:
                return k
        return None

    def add_admin_key(self, name: str, super_admin: bool = False) -> Dict:
        keys = self._read()
        new_key = {
            'key': secrets.token_hex(16),
            'name': name,
            'created_at': datetime.now().isoformat(),
            'super_admin': super_admin
        }
        keys.append(new_key)
        self._write(keys)
        return new_key

    def list_admin_keys(self) -> List[Dict]:
        return self._read()

    def remove_admin_key(self, key: str) -> bool:
        keys = self._read()
        for i, k in enumerate(keys):
            if k['key'] == key and not k.get('super_admin'):
                keys.pop(i)
                self._write(keys)
                return True
        return False

class LockedLinksStorage(JSONStorage):
    def __init__(self):
        super().__init__(Config.LOCKED_LINKS_JSON)

    def is_locked(self, short_code: str) -> bool:
        data = self._read()
        if short_code in data:
            try:
                locked_until = datetime.fromisoformat(data[short_code])
                if datetime.now() < locked_until:
                    return True
                else:
                    del data[short_code]
                    self._write(data)
            except (ValueError, TypeError):
                pass
        return False

    def lock_link(self, short_code: str, duration: timedelta = None):
        data = self._read()
        duration = duration or Config.LOCK_DURATION
        data[short_code] = (datetime.now() + duration).isoformat()
        self._write(data)

    def unlock_link(self, short_code: str):
        data = self._read()
        if short_code in data:
            del data[short_code]
            self._write(data)

file_storage = FileStorage()
api_token_storage = APITokenStorage()
admin_key_storage = AdminKeyStorage()
locked_links_storage = LockedLinksStorage()
