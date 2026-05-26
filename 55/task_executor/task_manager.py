import json
import os
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from .models import (
    Task,
    TaskGroup,
    ExecutionLog,
    ScheduledTask,
    TaskStats,
    TaskStatus
)


class TaskManager:
    def __init__(self, data_dir: str = "~/.task_executor"):
        self.data_dir = os.path.expanduser(data_dir)
        Path(self.data_dir).mkdir(parents=True, exist_ok=True)

        self.tasks_file = os.path.join(self.data_dir, "tasks.json")
        self.groups_file = os.path.join(self.data_dir, "groups.json")
        self.logs_file = os.path.join(self.data_dir, "logs.json")
        self.schedules_file = os.path.join(self.data_dir, "schedules.json")
        self.stats_file = os.path.join(self.data_dir, "stats.json")

        self.tasks: Dict[str, Task] = {}
        self.groups: Dict[str, TaskGroup] = {}
        self.logs: List[ExecutionLog] = []
        self.schedules: Dict[str, ScheduledTask] = {}
        self.stats: Dict[str, TaskStats] = {}

        self._load_all()

    def _load_all(self):
        self._load_tasks()
        self._load_groups()
        self._load_logs()
        self._load_schedules()
        self._load_stats()

    def _load_tasks(self):
        if os.path.exists(self.tasks_file):
            with open(self.tasks_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.tasks = {k: Task.from_dict(v) for k, v in data.items()}

    def _save_tasks(self):
        with open(self.tasks_file, "w", encoding="utf-8") as f:
            json.dump({k: v.to_dict() for k, v in self.tasks.items()}, f, indent=2, ensure_ascii=False)

    def _load_groups(self):
        if os.path.exists(self.groups_file):
            with open(self.groups_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.groups = {k: TaskGroup.from_dict(v) for k, v in data.items()}

    def _save_groups(self):
        with open(self.groups_file, "w", encoding="utf-8") as f:
            json.dump({k: v.to_dict() for k, v in self.groups.items()}, f, indent=2, ensure_ascii=False)

    def _load_logs(self):
        if os.path.exists(self.logs_file):
            with open(self.logs_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.logs = [ExecutionLog.from_dict(item) for item in data]

    def _save_logs(self):
        with open(self.logs_file, "w", encoding="utf-8") as f:
            json.dump([log.to_dict() for log in self.logs], f, indent=2, ensure_ascii=False)

    def _load_schedules(self):
        if os.path.exists(self.schedules_file):
            with open(self.schedules_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.schedules = {k: ScheduledTask.from_dict(v) for k, v in data.items()}

    def _save_schedules(self):
        with open(self.schedules_file, "w", encoding="utf-8") as f:
            json.dump({k: v.to_dict() for k, v in self.schedules.items()}, f, indent=2, ensure_ascii=False)

    def _load_stats(self):
        if os.path.exists(self.stats_file):
            with open(self.stats_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.stats = {k: TaskStats.from_dict(v) for k, v in data.items()}

    def _save_stats(self):
        with open(self.stats_file, "w", encoding="utf-8") as f:
            json.dump({k: v.to_dict() for k, v in self.stats.items()}, f, indent=2, ensure_ascii=False)

    def add_task(self, task: Task) -> bool:
        if task.name in self.tasks:
            return False
        self.tasks[task.name] = task
        self._save_tasks()
        if task.name not in self.stats:
            self.stats[task.name] = TaskStats(task_name=task.name)
            self._save_stats()
        return True

    def update_task(self, task: Task) -> bool:
        if task.name not in self.tasks:
            return False
        self.tasks[task.name] = task
        self._save_tasks()
        return True

    def delete_task(self, task_name: str) -> bool:
        if task_name not in self.tasks:
            return False
        del self.tasks[task_name]
        self._save_tasks()

        for group in self.groups.values():
            if task_name in group.tasks:
                group.tasks.remove(task_name)
        self._save_groups()

        for schedule_name in list(self.schedules.keys()):
            if self.schedules[schedule_name].task_name == task_name:
                del self.schedules[schedule_name]
        self._save_schedules()
        return True

    def get_task(self, task_name: str) -> Optional[Task]:
        return self.tasks.get(task_name)

    def list_tasks(self) -> List[Task]:
        return list(self.tasks.values())

    def add_group(self, group: TaskGroup) -> bool:
        if group.name in self.groups:
            return False
        for task_name in group.tasks:
            if task_name not in self.tasks:
                raise ValueError(f"任务 '{task_name}' 不存在")
        self.groups[group.name] = group
        self._save_groups()
        return True

    def update_group(self, group: TaskGroup) -> bool:
        if group.name not in self.groups:
            return False
        for task_name in group.tasks:
            if task_name not in self.tasks:
                raise ValueError(f"任务 '{task_name}' 不存在")
        self.groups[group.name] = group
        self._save_groups()
        return True

    def delete_group(self, group_name: str) -> bool:
        if group_name not in self.groups:
            return False
        del self.groups[group_name]
        self._save_groups()
        return True

    def get_group(self, group_name: str) -> Optional[TaskGroup]:
        return self.groups.get(group_name)

    def list_groups(self) -> List[TaskGroup]:
        return list(self.groups.values())

    def add_schedule(self, schedule: ScheduledTask) -> bool:
        if schedule.task_name not in self.tasks:
            raise ValueError(f"任务 '{schedule.task_name}' 不存在")
        schedule_name = f"{schedule.task_name}_{schedule.cron_expression}"
        self.schedules[schedule_name] = schedule
        self._save_schedules()
        return True

    def delete_schedule(self, schedule_name: str) -> bool:
        if schedule_name not in self.schedules:
            return False
        del self.schedules[schedule_name]
        self._save_schedules()
        return True

    def list_schedules(self) -> List[ScheduledTask]:
        return list(self.schedules.values())

    def add_log(self, log: ExecutionLog):
        self.logs.append(log)
        if len(self.logs) > 1000:
            self.logs = self.logs[-1000:]
        self._save_logs()

        if log.task_name not in self.stats:
            self.stats[log.task_name] = TaskStats(task_name=log.task_name)

        stat = self.stats[log.task_name]
        if log.status == TaskStatus.SUCCESS:
            stat.success_count += 1
        else:
            stat.failure_count += 1
        stat.last_execution = log.end_time

        start_dt = datetime.fromisoformat(log.start_time)
        end_dt = datetime.fromisoformat(log.end_time)
        stat.total_duration += (end_dt - start_dt).total_seconds()
        self._save_stats()

    def get_logs(self, task_name: Optional[str] = None, limit: int = 100) -> List[ExecutionLog]:
        logs = self.logs
        if task_name:
            logs = [log for log in logs if log.task_name == task_name]
        return logs[-limit:]

    def get_stats(self, task_name: Optional[str] = None) -> List[TaskStats]:
        if task_name:
            stat = self.stats.get(task_name)
            return [stat] if stat else []
        return list(self.stats.values())

    def export_tasks(self, export_file: str, task_names: Optional[List[str]] = None):
        if task_names:
            export_data = {
                "tasks": {k: v.to_dict() for k, v in self.tasks.items() if k in task_names},
                "groups": {},
                "schedules": {}
            }
        else:
            export_data = {
                "tasks": {k: v.to_dict() for k, v in self.tasks.items()},
                "groups": {k: v.to_dict() for k, v in self.groups.items()},
                "schedules": {k: v.to_dict() for k, v in self.schedules.items()}
            }
        with open(export_file, "w", encoding="utf-8") as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

    def import_tasks(self, import_file: str, overwrite: bool = False) -> Dict[str, int]:
        with open(import_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        result = {"tasks_added": 0, "tasks_skipped": 0, "groups_added": 0, "groups_skipped": 0}

        for task_name, task_data in data.get("tasks", {}).items():
            if task_name in self.tasks and not overwrite:
                result["tasks_skipped"] += 1
                continue
            self.tasks[task_name] = Task.from_dict(task_data)
            result["tasks_added"] += 1
            if task_name not in self.stats:
                self.stats[task_name] = TaskStats(task_name=task_name)
        self._save_tasks()
        self._save_stats()

        for group_name, group_data in data.get("groups", {}).items():
            if group_name in self.groups and not overwrite:
                result["groups_skipped"] += 1
                continue
            try:
                self.groups[group_name] = TaskGroup.from_dict(group_data)
                result["groups_added"] += 1
            except ValueError:
                result["groups_skipped"] += 1
        self._save_groups()

        return result

    def backup_paths(self, paths: List[str], backup_dir: str) -> List[str]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(backup_dir, f"backup_{timestamp}")
        Path(backup_path).mkdir(parents=True, exist_ok=True)

        backed_up = []
        for path in paths:
            if not os.path.exists(path):
                continue
            dest = os.path.join(backup_path, os.path.basename(path))
            if os.path.isdir(path):
                shutil.copytree(path, dest)
            else:
                shutil.copy2(path, dest)
            backed_up.append(dest)
        return backed_up

    def resolve_dependencies(self, task_name: str) -> List[str]:
        resolved = []
        visited = set()

        def _resolve(name: str):
            if name in visited:
                return
            visited.add(name)
            task = self.tasks.get(name)
            if not task:
                return
            for dep in task.dependencies:
                _resolve(dep)
            resolved.append(name)

        _resolve(task_name)
        return resolved
