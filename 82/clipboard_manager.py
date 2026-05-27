import subprocess
import threading
import time
import sys


class ClipboardManager:
    def __init__(self):
        self.timer = None

    def copy(self, text, clear_after=30):
        if sys.platform == 'darwin':
            self._copy_macos(text)
        elif sys.platform.startswith('linux'):
            self._copy_linux(text)
        elif sys.platform == 'win32':
            self._copy_windows(text)
        else:
            raise OSError('不支持的操作系统')

        if self.timer:
            self.timer.cancel()

        if clear_after > 0:
            self.timer = threading.Timer(clear_after, self.clear)
            self.timer.start()

    def clear(self):
        if sys.platform == 'darwin':
            subprocess.run(['pbcopy'], input=b'', check=True)
        elif sys.platform.startswith('linux'):
            try:
                subprocess.run(['xclip', '-selection', 'clipboard'], input=b'', check=True)
            except FileNotFoundError:
                try:
                    subprocess.run(['xsel', '-b', '-i'], input=b'', check=True)
                except FileNotFoundError:
                    pass
        elif sys.platform == 'win32':
            subprocess.run(['clip'], input=b'', check=True)

    def paste(self):
        if sys.platform == 'darwin':
            result = subprocess.run(['pbpaste'], capture_output=True, text=True, check=True)
            return result.stdout
        elif sys.platform.startswith('linux'):
            try:
                result = subprocess.run(['xclip', '-selection', 'clipboard', '-o'],
                                        capture_output=True, text=True, check=True)
                return result.stdout
            except FileNotFoundError:
                try:
                    result = subprocess.run(['xsel', '-b', '-o'],
                                            capture_output=True, text=True, check=True)
                    return result.stdout
                except FileNotFoundError:
                    raise OSError('请安装 xclip 或 xsel')
        elif sys.platform == 'win32':
            result = subprocess.run(['powershell', '-command', 'Get-Clipboard'],
                                    capture_output=True, text=True, check=True)
            return result.stdout.strip()
        else:
            raise OSError('不支持的操作系统')

    def _copy_macos(self, text):
        subprocess.run(['pbcopy'], input=text.encode(), check=True)

    def _copy_linux(self, text):
        try:
            subprocess.run(['xclip', '-selection', 'clipboard'], input=text.encode(), check=True)
        except FileNotFoundError:
            try:
                subprocess.run(['xsel', '-b', '-i'], input=text.encode(), check=True)
            except FileNotFoundError:
                raise OSError('请安装 xclip 或 xsel')

    def _copy_windows(self, text):
        subprocess.run(['clip'], input=text.encode(), check=True)
