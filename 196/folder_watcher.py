import os
import time
import threading
from datetime import datetime

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from file_scanner import is_heic_file, get_output_path
from converter import convert_heic_to_jpg


class HEICEventHandler(FileSystemEventHandler):
    def __init__(self, input_dir, output_dir=None, preserve_structure=True, convert_options=None, debounce_seconds=2):
        self.input_dir = os.path.abspath(input_dir)
        self.output_dir = os.path.abspath(output_dir) if output_dir else None
        self.preserve_structure = preserve_structure
        self.convert_options = convert_options or {}
        self.debounce_seconds = debounce_seconds
        self._pending_files = {}
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._cleanup_thread = threading.Thread(target=self._cleanup_pending, daemon=True)
        self._cleanup_thread.start()

    def _cleanup_pending(self):
        while not self._stop_event.is_set():
            now = time.time()
            with self._lock:
                ready = [path for path, t in self._pending_files.items() if now - t >= self.debounce_seconds]
                for path in ready:
                    del self._pending_files[path]
            for path in ready:
                self._process_file(path)
            time.sleep(0.5)

    def _process_file(self, file_path):
        try:
            output_path = get_output_path(
                file_path,
                self.input_dir,
                self.output_dir,
                self.preserve_structure
            )
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 检测到新文件: {file_path}")
            result = convert_heic_to_jpg(
                file_path,
                output_path=output_path,
                **self.convert_options
            )
            print(f"  ✓ 转换成功 -> {result}")
        except Exception as e:
            print(f"  ✗ 转换失败: {e}")

    def on_created(self, event):
        if event.is_directory:
            return
        if is_heic_file(event.src_path):
            with self._lock:
                self._pending_files[event.src_path] = time.time()

    def on_moved(self, event):
        if event.is_directory:
            return
        if is_heic_file(event.dest_path):
            with self._lock:
                self._pending_files[event.dest_path] = time.time()

    def stop(self):
        self._stop_event.set()
        self._cleanup_thread.join(timeout=5)


class FolderWatcher:
    def __init__(self, input_dir, output_dir=None, recursive=True, preserve_structure=True, convert_options=None):
        self.input_dir = os.path.abspath(input_dir)
        self.output_dir = os.path.abspath(output_dir) if output_dir else None
        self.recursive = recursive
        self.preserve_structure = preserve_structure
        self.convert_options = convert_options or {}
        self.observer = None
        self.event_handler = None

    def start(self):
        if not os.path.isdir(self.input_dir):
            raise NotADirectoryError(f"目录不存在: {self.input_dir}")
        self.event_handler = HEICEventHandler(
            self.input_dir,
            self.output_dir,
            self.preserve_structure,
            self.convert_options
        )
        self.observer = Observer()
        self.observer.schedule(self.event_handler, self.input_dir, recursive=self.recursive)
        self.observer.start()
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 文件夹监控已启动")
        print(f"  监控目录: {self.input_dir}")
        print(f"  输出目录: {self.output_dir or '原位输出'}")
        print(f"  递归监控: {'是' if self.recursive else '否'}")
        print("  按 Ctrl+C 停止监控...\n")

    def stop(self):
        if self.observer:
            self.observer.stop()
            self.observer.join()
        if self.event_handler:
            self.event_handler.stop()
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 文件夹监控已停止")

    def run_forever(self):
        self.start()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()
