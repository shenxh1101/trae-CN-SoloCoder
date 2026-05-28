import os
import sys
import time
import signal
import subprocess
import threading

from sysmon.collector import collect_snapshot, build_headers, snapshot_to_row
from sysmon.storage import append_csv_row, get_csv_filename, ensure_csv_dir


IS_WINDOWS = sys.platform == "win32"


class Daemon:
    def __init__(self, interval=60.0, output_dir=None, pid_file=None):
        self.interval = interval
        self.output_dir = output_dir
        self.pid_file = pid_file or os.path.join(
            os.path.expanduser("~"), ".sysmon", "sysmon.pid"
        )
        self._running = True

    def _write_pid(self):
        os.makedirs(os.path.dirname(self.pid_file), exist_ok=True)
        with open(self.pid_file, "w") as f:
            f.write(str(os.getpid()))

    def _remove_pid(self):
        try:
            os.remove(self.pid_file)
        except FileNotFoundError:
            pass

    def _signal_handler(self, sig, frame):
        self._running = False

    def _daemonize_unix(self):
        pid = os.fork()
        if pid > 0:
            sys.exit(0)

        os.setsid()

        pid = os.fork()
        if pid > 0:
            sys.exit(0)

        sys.stdout.flush()
        sys.stderr.flush()

        devnull = os.open(os.devnull, os.O_RDWR)
        os.dup2(devnull, sys.stdin.fileno())
        os.dup2(devnull, sys.stdout.fileno())
        os.dup2(devnull, sys.stderr.fileno())
        os.close(devnull)

    def _daemonize_windows(self):
        import ctypes

        pid = subprocess.Popen(
            [sys.executable, "-m", "sysmon", "daemon",
             "-i", str(self.interval),
             "-o", self.output_dir or "",
             "--pid-file", self.pid_file],
            creationflags=subprocess.CREATE_NO_WINDOW
            | subprocess.DETACHED_PROCESS,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
        )
        print(f"Windows 后台进程已启动 (PID: {pid.pid})")
        print(f"  采集间隔: {self.interval}秒")
        print(f"  PID文件: {self.pid_file}")
        sys.exit(0)

    def _setup_signal_handlers(self):
        if IS_WINDOWS:
            try:
                signal.signal(signal.SIGINT, self._signal_handler)
                signal.signal(signal.SIGTERM, self._signal_handler)
            except OSError:
                pass

            def _ctrl_handler(ctrl_type):
                if ctrl_type in (
                    signal.CTRL_C_EVENT,
                    signal.CTRL_BREAK_EVENT,
                ):
                    self._running = False
                    return True
                return False

            try:
                ctypes.windll.kernel32.SetConsoleCtrlHandler(
                    ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_uint)(_ctrl_handler),
                    True,
                )
            except (AttributeError, OSError):
                pass
        else:
            signal.signal(signal.SIGTERM, self._signal_handler)
            signal.signal(signal.SIGINT, self._signal_handler)

    def run_foreground(self):
        self._setup_signal_handlers()

        self._write_pid()
        data_dir = ensure_csv_dir(self.output_dir)
        print(f"守护模式启动 (PID: {os.getpid()})")
        print(f"  采集间隔: {self.interval}秒")
        print(f"  数据目录: {data_dir}")
        print(f"  PID文件: {self.pid_file}")

        headers = None
        count = 0

        while self._running:
            try:
                snapshot = collect_snapshot(net_interval=min(self.interval, 1.0))
                if headers is None:
                    headers = build_headers(snapshot)

                filepath = get_csv_filename(data_dir)
                row = snapshot_to_row(snapshot, headers)
                append_csv_row(filepath, headers, row)
                count += 1
            except Exception as e:
                pass

            sleep_end = time.time() + self.interval
            while self._running and time.time() < sleep_end:
                time.sleep(1)

        self._remove_pid()
        print(f"守护进程停止，共采集 {count} 条记录")

    def run_daemon(self):
        if IS_WINDOWS:
            self._daemonize_windows()
        else:
            self._daemonize_unix()
        self.run_foreground()


def run_daemon(args):
    daemon = Daemon(
        interval=args.interval,
        output_dir=args.output,
        pid_file=args.pid_file,
    )
    daemon.run_daemon()
