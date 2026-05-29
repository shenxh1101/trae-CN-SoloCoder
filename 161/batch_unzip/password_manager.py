import json
import hashlib
from pathlib import Path
from typing import List, Optional, Dict, Iterator
from dataclasses import dataclass

from .config import Config
from .logger import get_logger

logger = get_logger(__name__)


@dataclass
class PasswordAttempt:
    password: str
    success: bool
    attempt_number: int


class PasswordManager:
    def __init__(self, config: Config):
        self.config = config
        self._passwords: List[str] = []
        self._cache: Dict[str, str] = {}
        self._load_passwords()
        self._load_cache()

    def _load_passwords(self) -> None:
        if not self.config.password_file:
            logger.debug("No password file specified, will use empty password list")
            return

        password_file = self.config.password_file
        if not password_file.exists():
            logger.warning(f"Password file not found: {password_file}")
            return

        try:
            with open(password_file, 'r', encoding='utf-8') as f:
                passwords = []
                for line in f:
                    password = line.strip()
                    if password and not password.startswith('#'):
                        passwords.append(password)

            self._passwords = passwords
            logger.info(f"Loaded {len(passwords)} passwords from dictionary")
        except Exception as e:
            logger.error(f"Failed to load password file: {e}")

    def _load_cache(self) -> None:
        cache_file = self.config.password_cache_file
        if not cache_file.exists():
            logger.debug("No password cache found")
            return

        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                self._cache = json.load(f)
            logger.info(f"Loaded {len(self._cache)} cached passwords")
        except Exception as e:
            logger.warning(f"Failed to load password cache: {e}")
            self._cache = {}

    def save_cache(self) -> None:
        cache_file = self.config.password_cache_file
        try:
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(self._cache, f, indent=2, ensure_ascii=False)
            logger.debug(f"Saved {len(self._cache)} passwords to cache")
        except Exception as e:
            logger.error(f"Failed to save password cache: {e}")

    @staticmethod
    def _get_file_hash(file_path: Path) -> str:
        hasher = hashlib.md5()
        hasher.update(file_path.name.encode('utf-8'))
        hasher.update(str(file_path.stat().st_size).encode('utf-8'))
        hasher.update(str(int(file_path.stat().st_mtime)).encode('utf-8'))
        return hasher.hexdigest()

    def get_cached_password(self, file_path: Path) -> Optional[str]:
        file_hash = self._get_file_hash(file_path)
        return self._cache.get(file_hash)

    def cache_password(self, file_path: Path, password: str) -> None:
        file_hash = self._get_file_hash(file_path)
        self._cache[file_hash] = password
        logger.debug(f"Cached password for {file_path.name}")

    def iterate_passwords(self, file_path: Path) -> Iterator[str]:
        cached = self.get_cached_password(file_path)
        if cached:
            logger.debug(f"Trying cached password first for {file_path.name}")
            yield cached

        for password in self._passwords:
            if password != cached:
                yield password

    def get_password_count(self) -> int:
        return len(self._passwords)

    def add_password(self, password: str) -> None:
        if password and password not in self._passwords:
            self._passwords.append(password)
