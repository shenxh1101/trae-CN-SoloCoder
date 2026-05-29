import signal
import subprocess
import sys
import time
from typing import Callable, Optional


class Scheduler:
    def __init__(
        self,
        sync_func: Callable[[], None],
        interval: int = 0,
        schedule: Optional[str] = None,
    ):
        self.sync_func = sync_func
        self.interval = interval
        self.schedule = schedule
        self._running = True

    def _handle_signal(self, signum, frame):
        self._running = False
        print("\nScheduler stopping...")
        sys.exit(0)

    def run_loop(self) -> None:
        if self.interval <= 0:
            print("Error: interval must be > 0 for loop scheduling")
            return

        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

        print(f"Scheduler started with interval: {self.interval}s")
        while self._running:
            try:
                self.sync_func()
            except Exception as e:
                print(f"Sync error: {e}")
            print(f"\nNext sync in {self.interval}s (Ctrl+C to stop)")
            for _ in range(self.interval):
                if not self._running:
                    break
                time.sleep(1)

    def setup_cron(self, script_path: str) -> str:
        import os

        if not self.schedule:
            return "No schedule pattern specified"

        cron_expr = self.schedule
        python_path = sys.executable
        cron_line = f"{cron_expr} {python_path} {script_path} --config $(dirname {script_path})/sync_config.yaml >> /tmp/foldersync_cron.log 2>&1"

        result = subprocess.run(
            ["crontab", "-l"],
            capture_output=True,
            text=True,
        )

        existing = result.stdout if result.returncode == 0 else ""
        if cron_line in existing:
            return "Cron job already exists"

        new_cron = existing.rstrip("\n") + "\n" + cron_line + "\n"
        proc = subprocess.run(
            ["crontab", "-"],
            input=new_cron,
            text=True,
            capture_output=True,
        )

        if proc.returncode == 0:
            return f"Cron job added: {cron_line}"
        else:
            return f"Failed to add cron job: {proc.stderr}"

    def remove_cron(self, script_identifier: str = "foldersync") -> str:
        result = subprocess.run(
            ["crontab", "-l"],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return "No crontab found"

        lines = result.stdout.split("\n")
        filtered = [l for l in lines if script_identifier not in l]
        new_cron = "\n".join(filtered) + "\n"

        proc = subprocess.run(
            ["crontab", "-"],
            input=new_cron,
            text=True,
            capture_output=True,
        )

        if proc.returncode == 0:
            return "Cron job removed"
        else:
            return f"Failed to remove cron job: {proc.stderr}"
