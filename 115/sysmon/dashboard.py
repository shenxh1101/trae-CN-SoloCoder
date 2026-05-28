import time
import sys
import os
import subprocess
import json

from sysmon.collector import collect_snapshot
from sysmon.alert import AlertMonitor


BOLD = "\033[1m"
RESET = "\033[0m"
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
DIM = "\033[2m"


def clear_screen():
    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()


def move_cursor(row, col):
    sys.stdout.write(f"\033[{row};{col}H")
    sys.stdout.flush()


def percent_bar(percent, width=30, label=""):
    filled = int(width * percent / 100)
    empty = width - filled

    if percent >= 90:
        color = RED
    elif percent >= 70:
        color = YELLOW
    elif percent >= 50:
        color = CYAN
    else:
        color = GREEN

    bar = color + "█" * filled + DIM + "░" * empty + RESET
    pct_str = f"{percent:5.1f}%"
    return f"  {label:12s} {bar} {pct_str}"


def format_speed(bps):
    if bps >= 1024 ** 3:
        return f"{bps / (1024**3):.2f} GB/s"
    elif bps >= 1024 ** 2:
        return f"{bps / (1024**2):.2f} MB/s"
    elif bps >= 1024:
        return f"{bps / 1024:.2f} KB/s"
    else:
        return f"{bps:.0f} B/s"


def draw_dashboard(snapshot, alert_monitor):
    clear_screen()

    ts = snapshot["timestamp"]
    cpu = snapshot["cpu"]
    mem = snapshot["memory"]
    swap = snapshot["swap"]
    disk = snapshot["disk"]
    net = snapshot["network"]
    procs = snapshot["processes"]

    print(f"{BOLD}{CYAN}{'═' * 60}{RESET}")
    print(f"{BOLD}  系统资源实时仪表盘{RESET}  {DIM}{ts}{RESET}")
    print(f"{BOLD}{CYAN}{'═' * 60}{RESET}")
    print()

    print(f"{BOLD}  CPU 使用率{RESET}")
    print(percent_bar(cpu["total"], width=40, label="总体"))
    for i, pct in enumerate(cpu["per_core"]):
        print(percent_bar(pct, width=40, label=f"核心 {i}"))
    print()

    print(f"{BOLD}  内存使用率{RESET}")
    print(percent_bar(mem["percent"], width=40, label="内存"))
    print(f"    已用: {mem['used_gb']:.2f} GB / {mem['total_gb']:.2f} GB  可用: {mem['available_gb']:.2f} GB")
    print()

    print(f"{BOLD}  交换分区{RESET}")
    print(percent_bar(swap["percent"], width=40, label="Swap"))
    print(f"    已用: {swap['used_gb']:.2f} GB / {swap['total_gb']:.2f} GB")
    print()

    print(f"{BOLD}  磁盘使用率{RESET}")
    for key, val in disk.items():
        mp = val["mountpoint"]
        print(percent_bar(val["percent"], width=30, label=mp[:12]))
        print(f"    已用: {val['used_gb']:.2f} GB / {val['total_gb']:.2f} GB")
    print()

    print(f"{BOLD}  网络速度{RESET}")
    up = net["upload_bytes_per_sec"]
    down = net["download_bytes_per_sec"]
    up_bar_len = min(int(up / 1024 / 1024), 30)
    down_bar_len = min(int(down / 1024 / 1024), 30)
    print(f"  {'上传':12s} {GREEN}{'▓' * up_bar_len}{DIM}{'░' * (30 - up_bar_len)}{RESET} {format_speed(up)}")
    print(f"  {'下载':12s} {BLUE}{'▓' * down_bar_len}{DIM}{'░' * (30 - down_bar_len)}{RESET} {format_speed(down)}")
    print()

    print(f"{BOLD}  进程 TOP 5{RESET}")
    print(f"  {'CPU 占用':30s}  {'内存占用':30s}")
    for i in range(5):
        cpu_p = procs["top_cpu"][i] if i < len(procs["top_cpu"]) else {"name": "-", "percent": 0}
        mem_p = procs["top_mem"][i] if i < len(procs["top_mem"]) else {"name": "-", "percent": 0}
        cpu_name = cpu_p["name"][:15]
        mem_name = mem_p["name"][:15]
        print(
            f"  {YELLOW}{i+1}.{RESET} {cpu_name:15s} {cpu_p['percent']:6.1f}%"
            f"    {YELLOW}{i+1}.{RESET} {mem_name:15s} {mem_p['percent']:6.1f}%"
        )

    alert_triggered = alert_monitor.check(cpu["total"], mem["percent"])
    if alert_triggered:
        print()
        print(f"{BOLD}{RED}{'⚠' * 20} 警 报 {'⚠' * 20}{RESET}")
        alert_msg = alert_monitor.get_alert_message()
        print(f"{BOLD}{RED}  {alert_msg}{RESET}")
        print(f"{BOLD}{RED}{'⚠' * 48}{RESET}")

    print()
    print(f"{DIM}  按 Ctrl+C 退出{RESET}")


def run_dashboard(args):
    interval = args.interval
    alert_cpu = args.alert_cpu
    alert_mem = args.alert_mem
    alert_consecutive = args.alert_consecutive
    alert_command = args.alert_command

    alert_monitor = AlertMonitor(
        cpu_threshold=alert_cpu,
        mem_threshold=alert_mem,
        consecutive_count=alert_consecutive,
        command=alert_command,
    )

    print(f"{DIM}正在初始化仪表盘...{RESET}")
    time.sleep(0.5)

    try:
        while True:
            snapshot = collect_snapshot(net_interval=min(interval, 1.0))
            draw_dashboard(snapshot, alert_monitor)

            if alert_monitor.is_triggered() and alert_command:
                try:
                    subprocess.Popen(alert_command, shell=True)
                except Exception:
                    pass
                alert_monitor.reset()

            sleep_time = interval - min(interval, 1.0)
            if sleep_time > 0:
                time.sleep(sleep_time)
    except KeyboardInterrupt:
        clear_screen()
        print("仪表盘已退出。")
