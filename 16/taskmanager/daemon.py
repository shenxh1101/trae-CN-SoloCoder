import time
import threading
import sys
import os
from datetime import datetime
from typing import Optional

from .task_manager import TaskManager
from .notifier import Notifier
from .ui import UIRenderer
from .storage import Storage


class TaskDaemon:
    def __init__(self, interval: int = 60):
        self.check_interval = interval
        self.running = False
        self._thread: Optional[threading.Thread] = None

        storage = Storage()
        config = storage.get_config()
        theme_name = config.get("theme", "dark")

        self.storage = storage
        self.ui = UIRenderer(theme_name)
        self.tm = TaskManager(storage)
        self.notifier = Notifier(self.ui)

    def _run_loop(self):
        while self.running:
            try:
                due_reminders = self.tm.check_reminders()
                if due_reminders:
                    self.notifier.check_and_notify(due_reminders)

                self.tm.process_repeating_tasks()

            except Exception as e:
                print(f"[daemon] 错误: {e}", file=sys.stderr)

            time.sleep(self.check_interval)

    def start(self, background: bool = True) -> None:
        if self.running:
            print(self.ui.render_warning("守护进程已在运行"))
            return

        self.running = True

        if background:
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()
            print(self.ui.render_success(f"守护进程已启动 (检查间隔: {self.check_interval}秒)"))
            print(self.ui.render_info("按 Ctrl+C 停止"))

            try:
                while self.running:
                    time.sleep(1)
            except KeyboardInterrupt:
                self.stop()
        else:
            print(self.ui.render_success(f"守护进程已启动 (检查间隔: {self.check_interval}秒)"))
            print(self.ui.render_info("按 Ctrl+C 停止"))
            try:
                self._run_loop()
            except KeyboardInterrupt:
                self.stop()

    def stop(self) -> None:
        if not self.running:
            return

        self.running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

        print(self.ui.render_info("守护进程已停止"))

    def is_running(self) -> bool:
        return self.running
