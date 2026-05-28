import os
import json
import hashlib
import secrets
import string
from datetime import datetime
from typing import Optional, Dict, Any
import threading
import time
from collections import defaultdict

from config import (
    SHORT_CODE_LENGTH,
    MANAGE_KEY_LENGTH,
    METADATA_DIR,
    UPLOAD_DIR,
    TEMP_DIR,
    MAX_UPLOADS_PER_HOUR,
    EXPIRY_OPTIONS,
    CLEANUP_INTERVAL
)

_ip_upload_counts: Dict[str, list] = defaultdict(list)
_ip_lock = threading.Lock()


def generate_short_code() -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        code = ''.join(secrets.choice(alphabet) for _ in range(SHORT_CODE_LENGTH))
        if not os.path.exists(os.path.join(METADATA_DIR, f'{code}.json')):
            return code


def generate_manage_key() -> str:
    return secrets.token_hex(MANAGE_KEY_LENGTH)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def get_metadata_path(short_code: str) -> str:
    return os.path.join(METADATA_DIR, f'{short_code}.json')


def load_metadata(short_code: str) -> Optional[Dict[str, Any]]:
    path = get_metadata_path(short_code)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    return None


def save_metadata(short_code: str, metadata: Dict[str, Any]) -> None:
    path = get_metadata_path(short_code)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


def delete_metadata(short_code: str) -> None:
    path = get_metadata_path(short_code)
    if os.path.exists(path):
        os.remove(path)


def delete_file(short_code: str) -> None:
    metadata = load_metadata(short_code)
    if metadata:
        file_path = os.path.join(UPLOAD_DIR, metadata['storage_filename'])
        if os.path.exists(file_path):
            os.remove(file_path)
        delete_metadata(short_code)


def check_ip_limit(ip: str) -> bool:
    now = time.time()
    with _ip_lock:
        counts = _ip_upload_counts[ip]
        counts = [t for t in counts if now - t < 3600]
        _ip_upload_counts[ip] = counts
        if len(counts) >= MAX_UPLOADS_PER_HOUR:
            return False
        counts.append(now)
        return True


def record_ip_upload(ip: str) -> None:
    now = time.time()
    with _ip_lock:
        _ip_upload_counts[ip].append(now)


def is_expired(metadata: Dict[str, Any]) -> bool:
    if metadata.get('expires_at') is None:
        return False
    return datetime.now().timestamp() > metadata['expires_at']


def get_expiry_timestamp(expiry_option: str) -> Optional[float]:
    if expiry_option not in EXPIRY_OPTIONS:
        return None
    delta = EXPIRY_OPTIONS[expiry_option]
    if delta is None:
        return None
    return (datetime.now() + delta).timestamp()


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f'{size_bytes} B'
    elif size_bytes < 1024 * 1024:
        return f'{size_bytes / 1024:.2f} KB'
    elif size_bytes < 1024 * 1024 * 1024:
        return f'{size_bytes / (1024 * 1024):.2f} MB'
    else:
        return f'{size_bytes / (1024 * 1024 * 1024):.2f} GB'


def get_remaining_time(expires_at: Optional[float]) -> Optional[str]:
    if expires_at is None:
        return '永不过期'
    remaining = expires_at - datetime.now().timestamp()
    if remaining <= 0:
        return '已过期'
    hours = int(remaining // 3600)
    minutes = int((remaining % 3600) // 60)
    if hours > 24:
        days = hours // 24
        return f'{days} 天'
    elif hours > 0:
        return f'{hours} 小时 {minutes} 分钟'
    else:
        return f'{minutes} 分钟'


def cleanup_expired_files() -> None:
    while True:
        try:
            now = datetime.now()
            for filename in os.listdir(METADATA_DIR):
                if not filename.endswith('.json'):
                    continue
                short_code = filename[:-5]
                metadata = load_metadata(short_code)
                if metadata:
                    expired = is_expired(metadata)
                    download_limit_reached = (
                        metadata.get('max_downloads') is not None and
                        metadata['download_count'] >= metadata['max_downloads']
                    )
                    if expired or download_limit_reached:
                        delete_file(short_code)
            for temp_file in os.listdir(TEMP_DIR):
                temp_path = os.path.join(TEMP_DIR, temp_file)
                try:
                    if time.time() - os.path.getmtime(temp_path) > 86400:
                        os.remove(temp_path)
                except OSError:
                    pass
        except Exception as e:
            print(f'Cleanup error: {e}')
        time.sleep(CLEANUP_INTERVAL)


def start_cleanup_thread() -> None:
    thread = threading.Thread(target=cleanup_expired_files, daemon=True)
    thread.start()


def get_files_by_manage_key(manage_key: str) -> list:
    files = []
    for filename in os.listdir(METADATA_DIR):
        if not filename.endswith('.json'):
            continue
        short_code = filename[:-5]
        metadata = load_metadata(short_code)
        if metadata and metadata.get('manage_key') == manage_key:
            files.append(metadata)
    return sorted(files, key=lambda x: x['uploaded_at'], reverse=True)
