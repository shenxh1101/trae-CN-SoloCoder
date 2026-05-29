import time
import threading
from datetime import datetime, timedelta
from typing import Callable, Optional, List, Dict, Any
import sys
import platform


class Scheduler:
    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def run_interval(self, callback: Callable[[], Any],
                     interval: float, count: int,
                     initial_delay: float = 0) -> List[Any]:
        results = []
        
        if initial_delay > 0:
            print(f"等待 {initial_delay} 秒后开始...")
            time.sleep(initial_delay)
        
        for i in range(count):
            if self._stop_event.is_set():
                break
            print(f"[{i + 1}/{count}] 执行截图...")
            result = callback()
            results.append(result)
            
            if i < count - 1:
                self._stop_event.wait(interval)
        
        return results

    def run_scheduled(self, callback: Callable[[], Any],
                      target_time: str,
                      wait: bool = True) -> Any:
        target = self._parse_time(target_time)
        now = datetime.now()
        
        if target <= now:
            target += timedelta(days=1)
        
        wait_seconds = (target - now).total_seconds()
        print(f"等待到 {target.strftime('%Y-%m-%d %H:%M:%S')} 执行截图...")
        print(f"还需等待: {self._format_duration(wait_seconds)}")
        
        if wait:
            self._stop_event.wait(wait_seconds)
            if not self._stop_event.is_set():
                return callback()
        else:
            def _delayed_exec():
                self._stop_event.wait(wait_seconds)
                if not self._stop_event.is_set():
                    callback()
            
            self._thread = threading.Thread(target=_delayed_exec, daemon=True)
            self._thread.start()
        
        return None

    def run_daily_schedule(self, callback: Callable[[], Any],
                           target_times: List[str],
                           days: Optional[int] = None) -> List[Any]:
        results = []
        day_count = 0
        
        while not self._stop_event.is_set():
            if days is not None and day_count >= days:
                break
            
            for target_time in sorted(target_times):
                if self._stop_event.is_set():
                    break
                
                result = self.run_scheduled(callback, target_time, wait=True)
                if result:
                    results.append(result)
            
            day_count += 1
            if days is None or day_count < days:
                print(f"等待下一天...")
                self._stop_event.wait(60)
        
        return results

    def stop(self):
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)

    @staticmethod
    def _parse_time(time_str: str) -> datetime:
        now = datetime.now()
        formats = [
            "%H:%M:%S",
            "%H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M"
        ]
        
        for fmt in formats:
            try:
                parsed = datetime.strptime(time_str, fmt)
                if fmt in ["%H:%M:%S", "%H:%M"]:
                    parsed = parsed.replace(year=now.year, month=now.month, day=now.day)
                return parsed
            except ValueError:
                continue
        
        raise ValueError(f"无法解析时间格式: {time_str}，支持格式: HH:MM:SS, HH:MM, YYYY-MM-DD HH:MM:SS")

    @staticmethod
    def _format_duration(seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        
        parts = []
        if hours > 0:
            parts.append(f"{hours}小时")
        if minutes > 0:
            parts.append(f"{minutes}分钟")
        if secs > 0 or not parts:
            parts.append(f"{secs}秒")
        
        return "".join(parts)


class WindowHider:
    @staticmethod
    def hide_console():
        system = platform.system()
        if system == "Windows":
            try:
                import ctypes
                whnd = ctypes.windll.kernel32.GetConsoleWindow()
                if whnd != 0:
                    ctypes.windll.user32.ShowWindow(whnd, 0)
                return True
            except Exception as e:
                print(f"隐藏窗口失败: {e}")
                return False
        elif system == "Darwin":
            try:
                import subprocess
                script = '''
                tell application "System Events"
                    set frontmostProcess to first process where it is frontmost
                    set visible of frontmostProcess to false
                end tell
                '''
                subprocess.run(["osascript", "-e", script], capture_output=True)
                return True
            except Exception as e:
                print(f"隐藏窗口失败: {e}")
                return False
        else:
            print("当前系统不支持隐藏命令行窗口")
            return False

    @staticmethod
    def minimize_console():
        system = platform.system()
        if system == "Windows":
            try:
                import ctypes
                whnd = ctypes.windll.kernel32.GetConsoleWindow()
                if whnd != 0:
                    ctypes.windll.user32.ShowWindow(whnd, 6)
                return True
            except Exception as e:
                print(f"最小化窗口失败: {e}")
                return False
        elif system == "Darwin":
            try:
                import subprocess
                script = '''
                tell application "System Events"
                    set frontmostProcess to first process where it is frontmost
                    set miniaturized of frontmostProcess to true
                end tell
                '''
                subprocess.run(["osascript", "-e", script], capture_output=True)
                return True
            except Exception as e:
                print(f"最小化窗口失败: {e}")
                return False
        else:
            print("当前系统不支持最小化命令行窗口")
            return False
