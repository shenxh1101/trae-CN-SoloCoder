import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable
import re

from .models import ScheduledTask
from .task_manager import TaskManager
from .executor import TaskExecutor


class CronParser:
    @staticmethod
    def parse(cron_expr: str) -> Dict[str, list]:
        parts = cron_expr.strip().split()
        if len(parts) != 5:
            raise ValueError(f"无效的cron表达式: {cron_expr}，需要5个字段")

        minute, hour, day_of_month, month, day_of_week = parts

        return {
            'minute': CronParser._parse_field(minute, 0, 59),
            'hour': CronParser._parse_field(hour, 0, 23),
            'day_of_month': CronParser._parse_field(day_of_month, 1, 31),
            'month': CronParser._parse_field(month, 1, 12),
            'day_of_week': CronParser._parse_field(day_of_week, 0, 6)
        }

    @staticmethod
    def _parse_field(field: str, min_val: int, max_val: int) -> list:
        if field == '*':
            return list(range(min_val, max_val + 1))

        values = set()
        for part in field.split(','):
            if '-' in part:
                start, end = part.split('-')
                values.update(range(int(start), int(end) + 1))
            elif '/' in part:
                base, step = part.split('/')
                if base == '*':
                    base = min_val
                values.update(range(int(base), max_val + 1, int(step)))
            else:
                values.add(int(part))

        return sorted([v for v in values if min_val <= v <= max_val])

    @staticmethod
    def should_run(cron_expr: str, now: datetime) -> bool:
        try:
            parsed = CronParser.parse(cron_expr)
        except ValueError:
            return False

        return (
            now.minute in parsed['minute'] and
            now.hour in parsed['hour'] and
            now.day in parsed['day_of_month'] and
            now.month in parsed['month'] and
            now.weekday() in parsed['day_of_week']
        )


class TaskScheduler:
    def __init__(self, task_manager: TaskManager, executor: TaskExecutor):
        self.task_manager = task_manager
        self.executor = executor
        self.running = False
        self.scheduler_thread: Optional[threading.Thread] = None
        self.last_run: Dict[str, datetime] = {}
        self.on_task_run: Optional[Callable[[str], None]] = None

    def start(self, daemon: bool = True):
        if self.running:
            return

        self.running = True
        self.scheduler_thread = threading.Thread(target=self._run_loop, daemon=daemon)
        self.scheduler_thread.start()
        print("定时任务调度器已启动")

    def stop(self):
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        print("定时任务调度器已停止")

    def _run_loop(self):
        while self.running:
            try:
                now = datetime.now().replace(second=0, microsecond=0)
                for schedule_name, schedule in self.task_manager.schedules.items():
                    if not schedule.enabled:
                        continue

                    last = self.last_run.get(schedule_name)
                    if last and last >= now:
                        continue

                    if CronParser.should_run(schedule.cron_expression, now):
                        self.last_run[schedule_name] = now
                        self._execute_scheduled_task(schedule)
            except Exception as e:
                print(f"调度器错误: {e}")

            time.sleep(60)

    def _execute_scheduled_task(self, schedule: ScheduledTask):
        print(f"\n[定时任务] 执行任务: {schedule.task_name} at {datetime.now()}")
        if self.on_task_run:
            self.on_task_run(schedule.task_name)
        try:
            self.executor.execute_task(schedule.task_name, schedule.parameters)
        except Exception as e:
            print(f"定时任务执行失败: {e}")

    def run_once(self):
        now = datetime.now().replace(second=0, microsecond=0)
        for schedule_name, schedule in self.task_manager.schedules.items():
            if not schedule.enabled:
                continue

            if CronParser.should_run(schedule.cron_expression, now):
                self.last_run[schedule_name] = now
                self._execute_scheduled_task(schedule)
