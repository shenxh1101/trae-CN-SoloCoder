import json
import os
import uuid
from datetime import datetime, date
from threading import Timer
from typing import Dict, List, Optional, Any

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'backup.json')


class TaskStorage:
    def __init__(self):
        self.data: Dict[str, Any] = {"users": {}}
        self.load_from_file()
        self.start_auto_backup()

    def load_from_file(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.data = {"users": {}}

    def save_to_file(self):
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def start_auto_backup(self):
        def backup():
            self.save_to_file()
            Timer(300, backup).start()
        Timer(300, backup).start()

    def _ensure_user(self, username: str):
        if username not in self.data["users"]:
            self.data["users"][username] = {"tasks": {}}

    def get_all_tasks(self, username: str) -> List[Dict[str, Any]]:
        self._ensure_user(username)
        return list(self.data["users"][username]["tasks"].values())

    def get_task(self, username: str, task_id: str) -> Optional[Dict[str, Any]]:
        self._ensure_user(username)
        return self.data["users"][username]["tasks"].get(task_id)

    def create_task(self, username: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_user(username)
        task_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        status = task_data.get("status", "todo")
        task = {
            "id": task_id,
            "title": task_data.get("title", ""),
            "description": task_data.get("description", ""),
            "status": status,
            "priority": task_data.get("priority", "medium"),
            "due_date": task_data.get("due_date"),
            "created_at": now,
            "completed_at": now if status == "completed" else None
        }
        self.data["users"][username]["tasks"][task_id] = task
        self.save_to_file()
        return task

    def update_task(self, username: str, task_id: str, task_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self._ensure_user(username)
        if task_id not in self.data["users"][username]["tasks"]:
            return None
        
        task = self.data["users"][username]["tasks"][task_id]
        for key in ["title", "description", "status", "priority", "due_date"]:
            if key in task_data:
                task[key] = task_data[key]
        
        if task_data.get("status") == "completed" and not task.get("completed_at"):
            task["completed_at"] = datetime.now().isoformat()
        elif task_data.get("status") and task_data.get("status") != "completed":
            task["completed_at"] = None
        
        self.save_to_file()
        return task

    def update_task_status(self, username: str, task_id: str, status: str) -> Optional[Dict[str, Any]]:
        return self.update_task(username, task_id, {"status": status})

    def delete_task(self, username: str, task_id: str) -> bool:
        self._ensure_user(username)
        if task_id in self.data["users"][username]["tasks"]:
            del self.data["users"][username]["tasks"][task_id]
            self.save_to_file()
            return True
        return False

    def get_stats(self, username: str) -> Dict[str, Any]:
        self._ensure_user(username)
        tasks = list(self.data["users"][username]["tasks"].values())
        today = date.today().isoformat()
        
        stats = {
            "total": len(tasks),
            "byStatus": {"todo": 0, "in_progress": 0, "completed": 0},
            "byPriority": {"high": 0, "medium": 0, "low": 0},
            "completedToday": 0,
            "overdue": 0
        }
        
        for task in tasks:
            status = task["status"]
            priority = task["priority"]
            
            if status in stats["byStatus"]:
                stats["byStatus"][status] += 1
            
            if priority in stats["byPriority"]:
                stats["byPriority"][priority] += 1
            
            if status == "completed" and task.get("completed_at"):
                completed_date = task["completed_at"].split("T")[0]
                if completed_date == today:
                    stats["completedToday"] += 1
            
            if task.get("due_date") and status != "completed":
                due_date = task["due_date"]
                if due_date < today:
                    stats["overdue"] += 1
        
        return stats

    def export_json(self, username: str) -> Dict[str, Any]:
        self._ensure_user(username)
        return {
            "username": username,
            "exported_at": datetime.now().isoformat(),
            "tasks": self.get_all_tasks(username)
        }

    def restore_json(self, username: str, data: Dict[str, Any]) -> int:
        self._ensure_user(username)
        tasks = data.get("tasks", [])
        count = 0
        for task in tasks:
            task_id = task.get("id", str(uuid.uuid4()))
            self.data["users"][username]["tasks"][task_id] = task
            count += 1
        self.save_to_file()
        return count

    def import_csv(self, username: str, rows: List[List[str]], on_duplicate: str = "skip") -> Dict[str, int]:
        self._ensure_user(username)
        existing_titles = {t["title"]: t["id"] for t in self.get_all_tasks(username)}
        
        result = {"added": 0, "updated": 0, "skipped": 0, "errors": 0}
        
        for row in rows:
            if len(row) < 1:
                continue
            try:
                title = row[0].strip() if row[0] else ""
                if not title:
                    continue
                
                description = row[1].strip() if len(row) > 1 else ""
                status = row[2].strip().lower() if len(row) > 2 else "todo"
                if status not in ["todo", "in_progress", "completed"]:
                    status = "todo"
                priority = row[3].strip().lower() if len(row) > 3 else "medium"
                if priority not in ["high", "medium", "low"]:
                    priority = "medium"
                due_date = row[4].strip() if len(row) > 4 and row[4].strip() else None
                
                if title in existing_titles:
                    if on_duplicate == "skip":
                        result["skipped"] += 1
                        continue
                    elif on_duplicate == "overwrite":
                        task_id = existing_titles[title]
                        self.update_task(username, task_id, {
                            "description": description,
                            "status": status,
                            "priority": priority,
                            "due_date": due_date
                        })
                        result["updated"] += 1
                        continue
                
                self.create_task(username, {
                    "title": title,
                    "description": description,
                    "status": status,
                    "priority": priority,
                    "due_date": due_date
                })
                result["added"] += 1
            except Exception:
                result["errors"] += 1
        
        return result


storage = TaskStorage()
