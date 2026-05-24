import sys
import subprocess
import platform
from typing import List

from .models import Task
from .ui import UIRenderer


class Notifier:
    def __init__(self, ui: UIRenderer):
        self.ui = ui
        self.system = platform.system()
        self._plyer_available = self._check_plyer()
        self._playsound_available = self._check_playsound()

    def _check_plyer(self) -> bool:
        try:
            from plyer import notification
            return True
        except ImportError:
            return False

    def _check_playsound(self) -> bool:
        try:
            from playsound import playsound
            return True
        except ImportError:
            return False

    def _play_notification_sound(self) -> None:
        if not self._playsound_available:
            return
        try:
            if self.system == "Darwin":
                subprocess.run(
                    ["afplay", "/System/Library/Sounds/Glass.aiff"],
                    capture_output=True,
                    timeout=2,
                )
            elif self.system == "Linux":
                subprocess.run(
                    ["paplay", "/usr/share/sounds/freedesktop/stereo/complete.oga"],
                    capture_output=True,
                    timeout=2,
                )
        except Exception:
            pass

    def send_notification(self, title: str, message: str, play_sound: bool = True) -> None:
        print("\n" + self.ui.render_notification(title, message))

        if play_sound:
            self._play_notification_sound()

        if self._plyer_available:
            self._send_plyer_notification(title, message)
        else:
            self._send_native_notification(title, message)

    def _send_plyer_notification(self, title: str, message: str) -> None:
        try:
            from plyer import notification
            notification.notify(
                title=title,
                message=message,
                app_name="TaskManager",
                timeout=10,
            )
        except Exception:
            self._send_native_notification(title, message)

    def _send_native_notification(self, title: str, message: str) -> None:
        try:
            if self.system == "Darwin":
                self._send_mac_notification(title, message)
            elif self.system == "Linux":
                self._send_linux_notification(title, message)
            elif self.system == "Windows":
                self._send_windows_notification(title, message)
        except Exception:
            pass

    def _send_mac_notification(self, title: str, message: str) -> None:
        script = f'display notification "{message}" with title "{title}" sound name "Glass"'
        subprocess.run(["osascript", "-e", script], capture_output=True, timeout=5)

    def _send_linux_notification(self, title: str, message: str) -> None:
        try:
            subprocess.run(
                ["notify-send", title, message, "-u", "normal", "-a", "TaskManager"],
                capture_output=True,
                timeout=5,
            )
        except FileNotFoundError:
            pass

    def _send_windows_notification(self, title: str, message: str) -> None:
        try:
            from win10toast import ToastNotifier

            toaster = ToastNotifier()
            toaster.show_toast(title, message, duration=5, threaded=True)
        except ImportError:
            pass

    def check_and_notify(self, tasks: List[Task]) -> List[Task]:
        notified = []
        for task in tasks:
            self.send_notification(
                "任务提醒",
                f"任务 '{task.title}' 的提醒时间到了！\nID: {task.id}",
            )
            notified.append(task)
        return notified

    def show_today_overview(self, report_data: dict) -> None:
        print("\033c", end="")
        print(self.ui.render_daily_report(report_data))
        sys.stdout.flush()
