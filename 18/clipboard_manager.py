import subprocess
import sys
import threading
import time
from typing import Optional


class ClipboardManager:
    def __init__(self):
        self._clear_timer: Optional[threading.Timer] = None
        self._last_copied: Optional[str] = None

    def _get_clipboard_command(self) -> tuple:
        if sys.platform == "darwin":
            return ("pbcopy", "pbpaste")
        elif sys.platform.startswith("linux"):
            return ("xclip -selection clipboard", "xclip -selection clipboard -o")
        elif sys.platform == "win32":
            return ("clip", "powershell -command Get-Clipboard")
        else:
            raise OSError(f"不支持的操作系统: {sys.platform}")

    def copy(self, text: str, auto_clear: bool = True, clear_after_seconds: int = 60) -> bool:
        try:
            copy_cmd, _ = self._get_clipboard_command()
            process = subprocess.Popen(copy_cmd, stdin=subprocess.PIPE, shell=True)
            process.communicate(input=text.encode("utf-8"))
            process.wait()

            if process.returncode != 0:
                return False

            self._last_copied = text

            if auto_clear:
                self._schedule_clear(clear_after_seconds)

            return True
        except Exception as e:
            print(f"复制到剪贴板失败: {e}")
            return False

    def _schedule_clear(self, seconds: int):
        if self._clear_timer and self._clear_timer.is_alive():
            self._clear_timer.cancel()

        self._clear_timer = threading.Timer(seconds, self.clear)
        self._clear_timer.daemon = True
        self._clear_timer.start()

        threading.Thread(
            target=self._print_clear_notice,
            args=(seconds,),
            daemon=True
        ).start()

    def _print_clear_notice(self, seconds: int):
        for remaining in range(seconds, 0, -10):
            if remaining % 10 == 0 and remaining > 0:
                print(f"\n[提示] 剪贴板将在 {remaining} 秒后自动清空", end="", flush=True)
            time.sleep(10)

    def clear(self) -> bool:
        try:
            copy_cmd, _ = self._get_clipboard_command()
            process = subprocess.Popen(copy_cmd, stdin=subprocess.PIPE, shell=True)
            process.communicate(input=b"")
            process.wait()

            self._last_copied = None
            print("\n[信息] 剪贴板已自动清空")
            return process.returncode == 0
        except Exception as e:
            print(f"\n[警告] 清空剪贴板失败: {e}")
            return False

    def paste(self) -> Optional[str]:
        try:
            _, paste_cmd = self._get_clipboard_command()
            result = subprocess.run(paste_cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                return result.stdout
        except Exception as e:
            print(f"从剪贴板读取失败: {e}")
        return None

    def cancel_auto_clear(self):
        if self._clear_timer and self._clear_timer.is_alive():
            self._clear_timer.cancel()
            self._clear_timer = None
            print("[信息] 已取消自动清空剪贴板")
