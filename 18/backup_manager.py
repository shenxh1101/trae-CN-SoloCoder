import os
import shutil
import json
from datetime import datetime
from typing import Optional, List
from crypto import CryptoManager


class BackupManager:
    def __init__(self, crypto: CryptoManager, backup_dir: str = "backups"):
        self.crypto = crypto
        self.backup_dir = backup_dir
        self._ensure_backup_dir()

    def _ensure_backup_dir(self):
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir, exist_ok=True)

    def create_backup(
        self,
        source_file: str,
        master_password: str,
        backup_name: Optional[str] = None,
    ) -> Optional[str]:
        if not os.path.exists(source_file):
            print(f"源文件不存在: {source_file}")
            return None

        self._ensure_backup_dir()

        if backup_name is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}.json"

        backup_path = os.path.join(self.backup_dir, backup_name)

        try:
            with open(source_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            backup_data = {
                "backup_time": datetime.now().isoformat(),
                "original_file": source_file,
                "version": "1.0",
                "data": data,
            }

            with open(backup_path, "w", encoding="utf-8") as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)

            return backup_path
        except Exception as e:
            print(f"创建备份失败: {e}")
            return None

    def restore_backup(
        self,
        backup_file: str,
        master_password: str,
        target_file: str,
        overwrite: bool = False,
    ) -> bool:
        if not os.path.exists(backup_file):
            print(f"备份文件不存在: {backup_file}")
            return False

        if os.path.exists(target_file) and not overwrite:
            print(f"目标文件已存在，使用 --overwrite 强制覆盖")
            return False

        try:
            with open(backup_file, "r", encoding="utf-8") as f:
                backup_data = json.load(f)

            encrypted_data = backup_data.get("data", {})

            try:
                self.crypto.decrypt_data(encrypted_data, master_password)
            except Exception:
                print("主密码错误，无法解密备份数据")
                return False

            if overwrite and os.path.exists(target_file):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_of_target = f"{target_file}.pre_restore_{timestamp}"
                shutil.copy2(target_file, backup_of_target)
                print(f"已创建原文件备份: {backup_of_target}")

            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(encrypted_data, f, indent=2, ensure_ascii=False)

            return True
        except Exception as e:
            print(f"恢复备份失败: {e}")
            return False

    def list_backups(self) -> List[dict]:
        backups = []
        if not os.path.exists(self.backup_dir):
            return backups

        for filename in os.listdir(self.backup_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(self.backup_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        backup_data = json.load(f)
                    backups.append({
                        "filename": filename,
                        "path": filepath,
                        "backup_time": backup_data.get("backup_time", "未知"),
                        "original_file": backup_data.get("original_file", "未知"),
                        "size": os.path.getsize(filepath),
                    })
                except (json.JSONDecodeError, IOError):
                    continue

        return sorted(backups, key=lambda x: x["backup_time"], reverse=True)

    def delete_backup(self, backup_file: str) -> bool:
        try:
            if os.path.exists(backup_file):
                os.remove(backup_file)
                return True
        except Exception as e:
            print(f"删除备份失败: {e}")
        return False

    def cleanup_old_backups(self, keep_days: int = 30) -> int:
        deleted_count = 0
        backups = self.list_backups()
        now = datetime.now()

        for backup in backups:
            try:
                backup_time = datetime.fromisoformat(backup["backup_time"])
                days_old = (now - backup_time).days
                if days_old > keep_days:
                    if self.delete_backup(backup["path"]):
                        deleted_count += 1
            except (ValueError, TypeError):
                continue

        return deleted_count

    def auto_backup(
        self,
        source_file: str,
        master_password: str,
        max_backups: int = 10,
    ) -> Optional[str]:
        backup_path = self.create_backup(source_file, master_password)
        if backup_path:
            backups = self.list_backups()
            if len(backups) > max_backups:
                for old_backup in backups[max_backups:]:
                    self.delete_backup(old_backup["path"])
        return backup_path
