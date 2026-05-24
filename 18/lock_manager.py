import time
import os
import json
from datetime import datetime, timedelta


class LockManager:
    def __init__(self, lock_file: str = ".lock_state", max_attempts: int = 3, lock_duration_minutes: int = 5):
        self.lock_file = lock_file
        self.max_attempts = max_attempts
        self.lock_duration_minutes = lock_duration_minutes
        self._load_state()

    def _load_state(self):
        if os.path.exists(self.lock_file):
            try:
                with open(self.lock_file, "r") as f:
                    state = json.load(f)
                self.failed_attempts = state.get("failed_attempts", 0)
                self.locked_until = state.get("locked_until")
                self.last_attempt_time = state.get("last_attempt_time")
            except (json.JSONDecodeError, IOError):
                self.failed_attempts = 0
                self.locked_until = None
                self.last_attempt_time = None
        else:
            self.failed_attempts = 0
            self.locked_until = None
            self.last_attempt_time = None

    def _save_state(self):
        state = {
            "failed_attempts": self.failed_attempts,
            "locked_until": self.locked_until,
            "last_attempt_time": self.last_attempt_time,
        }
        try:
            with open(self.lock_file, "w") as f:
                json.dump(state, f)
        except IOError:
            pass

    def is_locked(self) -> bool:
        if self.locked_until:
            lock_end = datetime.fromisoformat(self.locked_until)
            if datetime.now() < lock_end:
                return True
            else:
                self._reset_lock()
        return False

    def get_remaining_lock_time(self) -> int:
        if not self.locked_until:
            return 0
        lock_end = datetime.fromisoformat(self.locked_until)
        remaining = lock_end - datetime.now()
        return max(0, int(remaining.total_seconds()))

    def record_failed_attempt(self) -> bool:
        self.failed_attempts += 1
        self.last_attempt_time = datetime.now().isoformat()

        if self.failed_attempts >= self.max_attempts:
            lock_end = datetime.now() + timedelta(minutes=self.lock_duration_minutes)
            self.locked_until = lock_end.isoformat()
            self._save_state()
            return True

        self._save_state()
        return False

    def record_successful_attempt(self):
        self._reset_lock()

    def _reset_lock(self):
        self.failed_attempts = 0
        self.locked_until = None
        self.last_attempt_time = None
        self._save_state()

    def get_attempts_remaining(self) -> int:
        return max(0, self.max_attempts - self.failed_attempts)

    def clear_lock_file(self):
        if os.path.exists(self.lock_file):
            try:
                os.remove(self.lock_file)
            except IOError:
                pass
        self._reset_lock()
