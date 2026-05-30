import os
import json
import zipfile
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime

from .storage import StorageManager
from .models import User, Trip, TravelDiaryEncoder


class ZipManager:
    def __init__(self, storage: Optional[StorageManager] = None):
        self.storage = storage or StorageManager()

    def export_user_data(self, username: str, output_path: Optional[str] = None) -> str:
        if not self.storage.user_exists(username):
            raise ValueError(f"用户 '{username}' 不存在")
        if not output_path:
            export_dir = self.storage.get_export_dir(username)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = str(export_dir / f"{username}_travel_data_{timestamp}.zip")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        user_dir = self.storage.get_raw_data_path(username)
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(user_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(user_dir.parent)
                    zipf.write(file_path, arcname)
        return output_path

    def export_trip(self, username: str, trip_id: str, output_path: Optional[str] = None) -> str:
        trip = self.storage.get_trip(username, trip_id)
        if not trip:
            raise ValueError(f"旅行 '{trip_id}' 不存在")
        user = self.storage.get_user(username)
        if not output_path:
            export_dir = self.storage.get_export_dir(username)
            safe_name = "".join(c if c.isalnum() or c in "_-" else "_" for c in trip.name)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = str(export_dir / f"{safe_name}_trip_{timestamp}.zip")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        temp_dir = Path(output_path).parent / f"temp_{trip_id}"
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        temp_dir.mkdir(parents=True)
        try:
            user_dir = temp_dir / username
            user_dir.mkdir(parents=True)
            with open(user_dir / "user.json", "w", encoding="utf-8") as f:
                json.dump(user.to_dict(), f, ensure_ascii=False, indent=2, cls=TravelDiaryEncoder)
            with open(user_dir / "trips.json", "w", encoding="utf-8") as f:
                json.dump([trip.to_dict()], f, ensure_ascii=False, indent=2, cls=TravelDiaryEncoder)
            photo_src_dir = self.storage._get_photos_dir(username, trip_id)
            if photo_src_dir.exists():
                photo_dest_dir = user_dir / "photos" / trip_id
                photo_dest_dir.mkdir(parents=True, exist_ok=True)
                for photo_file in photo_src_dir.iterdir():
                    if photo_file.is_file():
                        shutil.copy2(photo_file, photo_dest_dir / photo_file.name)
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = file_path.relative_to(temp_dir)
                        zipf.write(file_path, arcname)
        finally:
            shutil.rmtree(temp_dir)
        return output_path

    def import_data(self, zip_path: str, overwrite: bool = False) -> str:
        zip_file = Path(zip_path)
        if not zip_file.exists():
            raise FileNotFoundError(f"Zip文件不存在: {zip_path}")
        temp_dir = zip_file.parent / f"temp_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        temp_dir.mkdir(parents=True)
        try:
            with zipfile.ZipFile(zip_path, 'r') as zipf:
                zipf.extractall(temp_dir)
            users_dir = temp_dir / "data" / "users"
            if not users_dir.exists():
                users_dir = temp_dir / "users"
            if not users_dir.exists():
                for item in temp_dir.iterdir():
                    if item.is_dir():
                        potential_user_json = item / "user.json"
                        if potential_user_json.exists():
                            users_dir = temp_dir
                            break
            if not users_dir.exists():
                raise ValueError("Zip文件格式不正确，未找到用户数据")
            imported_users = []
            for user_dir in users_dir.iterdir():
                if not user_dir.is_dir():
                    continue
                user_json = user_dir / "user.json"
                trips_json = user_dir / "trips.json"
                if not user_json.exists():
                    continue
                username = user_dir.name
                if self.storage.user_exists(username) and not overwrite:
                    raise ValueError(
                        f"用户 '{username}' 已存在，请使用 --overwrite 选项覆盖或使用其他用户名"
                    )
                with open(user_json, "r", encoding="utf-8") as f:
                    user_data = json.load(f)
                user = User.from_dict(user_data)
                user.username = username
                if self.storage.user_exists(username):
                    self.storage.delete_user(username)
                self.storage.create_user(user)
                if trips_json.exists():
                    with open(trips_json, "r", encoding="utf-8") as f:
                        trips_data = json.load(f)
                    for trip_data in trips_data:
                        trip = Trip.from_dict(trip_data)
                        self.storage.save_trip(username, trip)
                photos_dir = user_dir / "photos"
                if photos_dir.exists():
                    dest_photos_root = self.storage._get_user_dir(username) / "photos"
                    dest_photos_root.mkdir(parents=True, exist_ok=True)
                    for trip_photo_dir in photos_dir.iterdir():
                        if trip_photo_dir.is_dir():
                            dest_trip_photos = dest_photos_root / trip_photo_dir.name
                            dest_trip_photos.mkdir(parents=True, exist_ok=True)
                            for photo_file in trip_photo_dir.iterdir():
                                if photo_file.is_file():
                                    shutil.copy2(photo_file, dest_trip_photos / photo_file.name)
                imported_users.append(username)
            if not imported_users:
                raise ValueError("Zip文件中未找到有效的用户数据")
            return f"成功导入用户: {', '.join(imported_users)}"
        finally:
            shutil.rmtree(temp_dir)
