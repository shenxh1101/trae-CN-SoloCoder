from datetime import datetime, date, timedelta
from typing import List, Optional, Set, Dict, Any
from enum import Enum

from .models import Task, TaskStatus, Priority, RepeatFrequency, PRIORITY_ORDER
from .storage import Storage


class SortField(str, Enum):
    PRIORITY = "priority"
    DUE_DATE = "due_date"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    STATUS = "status"
    TITLE = "title"


class TaskManager:
    def __init__(self, storage: Optional[Storage] = None):
        self.storage = storage or Storage()

    def add_task(
        self,
        title: str,
        description: str = "",
        priority: Priority = Priority.MEDIUM,
        tags: Optional[List[str]] = None,
        due_date: Optional[date] = None,
        dependencies: Optional[List[str]] = None,
        repeat_frequency: RepeatFrequency = RepeatFrequency.NONE,
        reminder_time: Optional[datetime] = None,
    ) -> Task:
        task = Task(
            title=title,
            description=description,
            priority=priority,
            tags=tags or [],
            due_date=due_date,
            dependencies=dependencies or [],
            repeat_frequency=repeat_frequency,
            reminder_time=reminder_time,
        )
        self.storage.add_task(task)
        return task

    def update_task(
        self,
        task_id: str,
        **kwargs,
    ) -> Optional[Task]:
        task = self.storage.get_task_by_id(task_id)
        if not task:
            return None

        for key, value in kwargs.items():
            if hasattr(task, key) and value is not None:
                setattr(task, key, value)

        task.updated_at = datetime.now()

        if "status" in kwargs and kwargs["status"] == TaskStatus.COMPLETED:
            task.completed_at = datetime.now()
            self._handle_completed_task(task)

        self.storage.update_task(task)
        return task

    def delete_task(self, task_id: str) -> Optional[Task]:
        return self.storage.delete_task(task_id)

    def set_status(self, task_id: str, status: TaskStatus) -> Optional[Task]:
        return self.update_task(task_id, status=status)

    def mark_in_progress(self, task_id: str) -> Optional[Task]:
        task = self.storage.get_task_by_id(task_id)
        if not task:
            return None

        completed_ids = self._get_completed_task_ids()
        if not task.can_start(completed_ids):
            blocking_tasks = [
                self.storage.get_task_by_id(dep_id)
                for dep_id in task.dependencies
                if dep_id not in completed_ids
            ]
            blocking_titles = [t.title for t in blocking_tasks if t]
            raise ValueError(f"任务被以下任务阻塞: {', '.join(blocking_titles)}")

        return self.set_status(task_id, TaskStatus.IN_PROGRESS)

    def mark_completed(self, task_id: str) -> Optional[Task]:
        return self.set_status(task_id, TaskStatus.COMPLETED)

    def mark_on_hold(self, task_id: str) -> Optional[Task]:
        return self.set_status(task_id, TaskStatus.ON_HOLD)

    def _handle_completed_task(self, task: Task) -> None:
        if task.repeat_frequency != RepeatFrequency.NONE:
            self._generate_next_repeat_task(task)

    def _generate_next_repeat_task(self, template_task: Task) -> Task:
        next_due_date = self._calculate_next_due_date(
            template_task.due_date, template_task.repeat_frequency
        )

        new_task = Task(
            title=template_task.title,
            description=template_task.description,
            priority=template_task.priority,
            tags=template_task.tags.copy(),
            due_date=next_due_date,
            status=TaskStatus.PENDING,
            dependencies=template_task.dependencies.copy(),
            repeat_frequency=template_task.repeat_frequency,
            reminder_time=None,
            original_task_id=template_task.original_task_id or template_task.id,
        )

        self.storage.add_task(new_task)
        return new_task

    def _calculate_next_due_date(
        self, current_due: Optional[date], frequency: RepeatFrequency
    ) -> Optional[date]:
        if current_due is None:
            current_due = date.today()

        if frequency == RepeatFrequency.DAILY:
            return current_due + timedelta(days=1)
        elif frequency == RepeatFrequency.WEEKLY:
            return current_due + timedelta(weeks=1)
        elif frequency == RepeatFrequency.MONTHLY:
            year = current_due.year
            month = current_due.month + 1
            day = current_due.day

            if month > 12:
                month = 1
                year += 1

            while True:
                try:
                    return date(year, month, day)
                except ValueError:
                    day -= 1
        return None

    def list_tasks(
        self,
        status: Optional[TaskStatus] = None,
        sort_by: SortField = SortField.PRIORITY,
        reverse: bool = True,
    ) -> List[Task]:
        tasks = self.storage.load_tasks()

        if status:
            tasks = [t for t in tasks if t.status == status]

        return self._sort_tasks(tasks, sort_by, reverse)

    def _sort_tasks(
        self, tasks: List[Task], sort_by: SortField, reverse: bool
    ) -> List[Task]:
        def sort_key(task: Task) -> Any:
            if sort_by == SortField.PRIORITY:
                return PRIORITY_ORDER.get(task.priority, 0)
            elif sort_by == SortField.DUE_DATE:
                return task.due_date or date.max
            elif sort_by == SortField.CREATED_AT:
                return task.created_at
            elif sort_by == SortField.UPDATED_AT:
                return task.updated_at
            elif sort_by == SortField.STATUS:
                return task.status.value
            elif sort_by == SortField.TITLE:
                return task.title.lower()
            return 0

        return sorted(tasks, key=sort_key, reverse=reverse)

    def search_by_tags(
        self, tags: List[str], match_all: bool = True
    ) -> List[Task]:
        tasks = self.storage.load_tasks()
        tag_set = set(t.lower() for t in tags)

        if match_all:
            return [
                t
                for t in tasks
                if tag_set.issubset(set(tag.lower() for tag in t.tags))
            ]
        else:
            return [
                t
                for t in tasks
                if tag_set.intersection(set(tag.lower() for tag in t.tags))
            ]

    def get_overdue_tasks(self) -> List[Task]:
        tasks = self.storage.load_tasks()
        return [t for t in tasks if t.is_overdue()]

    def get_today_tasks(self) -> List[Task]:
        tasks = self.storage.load_tasks()
        return [t for t in tasks if t.is_due_today()]

    def get_today_report(self) -> Dict[str, List[Task]]:
        tasks = self.storage.load_tasks()
        return {
            "due_today": [t for t in tasks if t.is_due_today()],
            "overdue": [t for t in tasks if t.is_overdue()],
            "in_progress": [t for t in tasks if t.status == TaskStatus.IN_PROGRESS],
            "pending": [t for t in tasks if t.status == TaskStatus.PENDING],
        }

    def get_task_dependencies(self, task_id: str) -> List[Task]:
        task = self.storage.get_task_by_id(task_id)
        if not task:
            return []
        return [
            self.storage.get_task_by_id(dep_id)
            for dep_id in task.dependencies
            if self.storage.get_task_by_id(dep_id)
        ]

    def get_blocked_tasks(self, task_id: str) -> List[Task]:
        task = self.storage.get_task_by_id(task_id)
        if not task:
            return []
        return task.get_blocked_tasks(self.storage.load_tasks())

    def add_dependency(self, task_id: str, dependency_id: str) -> Optional[Task]:
        task = self.storage.get_task_by_id(task_id)
        dep_task = self.storage.get_task_by_id(dependency_id)

        if not task or not dep_task:
            return None

        if dependency_id == task_id:
            raise ValueError("任务不能依赖自己")

        if self._would_create_cycle(task_id, dependency_id):
            raise ValueError("添加依赖会创建循环依赖")

        if dependency_id not in task.dependencies:
            task.dependencies.append(dependency_id)
            task.updated_at = datetime.now()
            self.storage.update_task(task)

        return task

    def remove_dependency(self, task_id: str, dependency_id: str) -> Optional[Task]:
        task = self.storage.get_task_by_id(task_id)
        if not task:
            return None

        if dependency_id in task.dependencies:
            task.dependencies.remove(dependency_id)
            task.updated_at = datetime.now()
            self.storage.update_task(task)

        return task

    def _would_create_cycle(self, task_id: str, dependency_id: str) -> bool:
        visited = set()
        queue = [dependency_id]

        while queue:
            current_id = queue.pop(0)
            if current_id == task_id:
                return True
            if current_id in visited:
                continue
            visited.add(current_id)

            current_task = self.storage.get_task_by_id(current_id)
            if current_task:
                queue.extend(current_task.dependencies)

        return False

    def _get_completed_task_ids(self) -> Set[str]:
        tasks = self.storage.load_tasks()
        return {t.id for t in tasks if t.status == TaskStatus.COMPLETED}

    def check_reminders(self) -> List[Task]:
        now = datetime.now()
        tasks = self.storage.load_tasks()
        due_reminders = []

        for task in tasks:
            if (
                task.reminder_time
                and not task.reminder_sent
                and task.status != TaskStatus.COMPLETED
                and task.reminder_time <= now
            ):
                task.reminder_sent = True
                self.storage.update_task(task)
                due_reminders.append(task)

        return due_reminders

    def process_repeating_tasks(self) -> List[Task]:
        tasks = self.storage.load_tasks()
        today = date.today()
        new_tasks = []

        for task in tasks:
            if (
                task.repeat_frequency != RepeatFrequency.NONE
                and task.status == TaskStatus.COMPLETED
                and task.completed_at
                and task.completed_at.date() == today
                and not task.original_task_id
            ):
                existing_generated = any(
                    t.original_task_id == task.id
                    and t.due_date
                    and t.due_date > today
                    for t in tasks
                )
                if not existing_generated:
                    new_task = self._generate_next_repeat_task(task)
                    new_tasks.append(new_task)

        return new_tasks

    def get_all_tags(self) -> Set[str]:
        tasks = self.storage.load_tasks()
        tags = set()
        for task in tasks:
            tags.update(task.tags)
        return tags
