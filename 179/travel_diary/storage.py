import os
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

from .models import User, Trip, TravelDiaryEncoder


class StorageManager:
    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_dir = Path(base_dir).expanduser().resolve()
        else:
            self.base_dir = Path.home() / ".travel_diary"
        self.data_dir = self.base_dir / "data"
        self.users_dir = self.data_dir / "users"
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.users_dir.mkdir(parents=True, exist_ok=True)

    def _get_user_dir(self, username: str) -> Path:
        return self.users_dir / username

    def _get_user_file(self, username: str) -> Path:
        return self._get_user_dir(username) / "user.json"

    def _get_trips_file(self, username: str) -> Path:
        return self._get_user_dir(username) / "trips.json"

    def _get_photos_dir(self, username: str, trip_id: str) -> Path:
        return self._get_user_dir(username) / "photos" / trip_id

    def _ensure_user_dir(self, username: str) -> None:
        user_dir = self._get_user_dir(username)
        user_dir.mkdir(parents=True, exist_ok=True)
        (user_dir / "photos").mkdir(parents=True, exist_ok=True)

    def list_users(self) -> List[str]:
        if not self.users_dir.exists():
            return []
        return [d.name for d in self.users_dir.iterdir() if d.is_dir()]

    def user_exists(self, username: str) -> bool:
        return self._get_user_file(username).exists()

    def create_user(self, user: User) -> bool:
        if self.user_exists(user.username):
            return False
        self._ensure_user_dir(user.username)
        user.created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(self._get_user_file(user.username), "w", encoding="utf-8") as f:
            json.dump(user.to_dict(), f, ensure_ascii=False, indent=2, cls=TravelDiaryEncoder)
        with open(self._get_trips_file(user.username), "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return True

    def get_user(self, username: str) -> Optional[User]:
        if not self.user_exists(username):
            return None
        with open(self._get_user_file(username), "r", encoding="utf-8") as f:
            data = json.load(f)
        return User.from_dict(data)

    def update_user(self, user: User) -> bool:
        if not self.user_exists(user.username):
            return False
        with open(self._get_user_file(user.username), "w", encoding="utf-8") as f:
            json.dump(user.to_dict(), f, ensure_ascii=False, indent=2, cls=TravelDiaryEncoder)
        return True

    def delete_user(self, username: str) -> bool:
        if not self.user_exists(username):
            return False
        import shutil
        shutil.rmtree(self._get_user_dir(username))
        return True

    def list_trips(self, username: str) -> List[Trip]:
        if not self.user_exists(username):
            return []
        trips_file = self._get_trips_file(username)
        if not trips_file.exists():
            return []
        with open(trips_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [Trip.from_dict(t) for t in data]

    def get_trip(self, username: str, trip_id: str) -> Optional[Trip]:
        trips = self.list_trips(username)
        return next((t for t in trips if t.id == trip_id), None)

    def save_trip(self, username: str, trip: Trip) -> bool:
        if not self.user_exists(username):
            return False
        self._ensure_user_dir(username)
        if not trip.created_at:
            trip.created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        trips = self.list_trips(username)
        existing = next((t for t in trips if t.id == trip.id), None)
        if existing:
            idx = trips.index(existing)
            trips[idx] = trip
        else:
            trips.append(trip)
        trips.sort(key=lambda x: x.start_date, reverse=True)
        with open(self._get_trips_file(username), "w", encoding="utf-8") as f:
            json.dump([t.to_dict() for t in trips], f, ensure_ascii=False, indent=2, cls=TravelDiaryEncoder)
        return True

    def delete_trip(self, username: str, trip_id: str) -> bool:
        trips = self.list_trips(username)
        trips = [t for t in trips if t.id != trip_id]
        with open(self._get_trips_file(username), "w", encoding="utf-8") as f:
            json.dump([t.to_dict() for t in trips], f, ensure_ascii=False, indent=2, cls=TravelDiaryEncoder)
        return True

    def save_photo(self, username: str, trip_id: str, photo_path: str) -> str:
        photos_dir = self._get_photos_dir(username, trip_id)
        photos_dir.mkdir(parents=True, exist_ok=True)
        src_path = Path(photo_path)
        if not src_path.exists():
            raise FileNotFoundError(f"Photo file not found: {photo_path}")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_filename = f"{timestamp}_{src_path.name}"
        dest_path = photos_dir / dest_filename
        import shutil
        shutil.copy2(src_path, dest_path)
        return str(dest_path)

    def get_export_dir(self, username: str) -> Path:
        export_dir = self._get_user_dir(username) / "exports"
        export_dir.mkdir(parents=True, exist_ok=True)
        return export_dir

    def get_reports_dir(self, username: str) -> Path:
        reports_dir = self._get_user_dir(username) / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        return reports_dir

    def get_maps_dir(self, username: str) -> Path:
        maps_dir = self._get_user_dir(username) / "maps"
        maps_dir.mkdir(parents=True, exist_ok=True)
        return maps_dir

    def get_raw_data_path(self, username: str) -> Path:
        return self._get_user_dir(username)
