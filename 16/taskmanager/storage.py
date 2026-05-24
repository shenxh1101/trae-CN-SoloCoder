import json
import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional
from pathlib import Path

from .models import Task


class Storage:
    def __init__(self, base_dir: Optional[str] = None):
        if base_dir is None:
            base_dir = os.path.expanduser("~/.taskmanager")

        self.base_dir = base_dir
        self.data_file = os.path.join(base_dir, "tasks.json")
        self.trash_dir = os.path.join(base_dir, "trash")
        self.config_file = os.path.join(base_dir, "config.json")
        self.auto_backup_dir = os.path.join(base_dir, "backups")

        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        os.makedirs(self.base_dir, exist_ok=True)
        os.makedirs(self.trash_dir, exist_ok=True)
        os.makedirs(self.auto_backup_dir, exist_ok=True)

        if not os.path.exists(self.data_file):
            self._write_tasks([])

        if not os.path.exists(self.config_file):
            self._write_config({"theme": "dark", "shortcuts": {}})

    def _read_tasks(self) -> List[dict]:
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _write_tasks(self, tasks_data: List[dict]) -> None:
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(tasks_data, f, indent=2, ensure_ascii=False)

    def _read_config(self) -> dict:
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"theme": "dark", "shortcuts": {}}

    def _write_config(self, config: dict) -> None:
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

    def load_tasks(self) -> List[Task]:
        tasks_data = self._read_tasks()
        return [Task.from_dict(data) for data in tasks_data]

    def save_tasks(self, tasks: List[Task]) -> None:
        self._auto_backup()
        tasks_data = [task.to_dict() for task in tasks]
        self._write_tasks(tasks_data)

    def add_task(self, task: Task) -> None:
        tasks = self.load_tasks()
        tasks.append(task)
        self.save_tasks(tasks)

    def update_task(self, task: Task) -> bool:
        tasks = self.load_tasks()
        for i, t in enumerate(tasks):
            if t.id == task.id:
                tasks[i] = task
                self.save_tasks(tasks)
                return True
        return False

    def delete_task(self, task_id: str) -> Optional[Task]:
        tasks = self.load_tasks()
        for i, task in enumerate(tasks):
            if task.id == task_id:
                deleted_task = tasks.pop(i)
                self._move_to_trash(deleted_task)
                self.save_tasks(tasks)
                return deleted_task
        return None

    def _move_to_trash(self, task: Task) -> None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        trash_file = os.path.join(self.trash_dir, f"{timestamp}_{task.id}.json")
        with open(trash_file, "w", encoding="utf-8") as f:
            json.dump(task.to_dict(), f, indent=2, ensure_ascii=False)

    def get_task_by_id(self, task_id: str) -> Optional[Task]:
        tasks = self.load_tasks()
        for task in tasks:
            if task.id == task_id:
                return task
        return None

    def list_trash(self) -> List[Task]:
        trash_tasks = []
        for filename in os.listdir(self.trash_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(self.trash_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        trash_tasks.append(Task.from_dict(data))
                except (json.JSONDecodeError, FileNotFoundError):
                    continue
        return trash_tasks

    def restore_task(self, task_id: str) -> Optional[Task]:
        for filename in os.listdir(self.trash_dir):
            if task_id in filename and filename.endswith(".json"):
                filepath = os.path.join(self.trash_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        task = Task.from_dict(data)
                    os.remove(filepath)
                    self.add_task(task)
                    return task
                except (json.JSONDecodeError, FileNotFoundError):
                    continue
        return None

    def empty_trash(self) -> int:
        count = 0
        for filename in os.listdir(self.trash_dir):
            if filename.endswith(".json"):
                os.remove(os.path.join(self.trash_dir, filename))
                count += 1
        return count

    def get_config(self) -> dict:
        return self._read_config()

    def update_config(self, key: str, value) -> None:
        config = self._read_config()
        config[key] = value
        self._write_config(config)

    def _auto_backup(self) -> None:
        if os.path.exists(self.data_file):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(self.auto_backup_dir, f"backup_{timestamp}.json")
            shutil.copy2(self.data_file, backup_file)

            backups = sorted(
                [f for f in os.listdir(self.auto_backup_dir) if f.startswith("backup_")]
            )
            if len(backups) > 10:
                for old_backup in backups[:-10]:
                    os.remove(os.path.join(self.auto_backup_dir, old_backup))

    def import_tasks(self, tasks_data: List[dict], merge: bool = True) -> int:
        if not merge:
            self._write_tasks([])

        existing_tasks = self.load_tasks()
        existing_ids = {t.id for t in existing_tasks}

        imported_count = 0
        for data in tasks_data:
            task = Task.from_dict(data)
            if task.id in existing_ids:
                task.id = str(uuid.uuid4())[:8]
            existing_tasks.append(task)
            imported_count += 1

        self.save_tasks(existing_tasks)
        return imported_count

    def export_tasks_json(self, filepath: str) -> None:
        tasks = self.load_tasks()
        tasks_data = [task.to_dict() for task in tasks]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(tasks_data, f, indent=2, ensure_ascii=False)
