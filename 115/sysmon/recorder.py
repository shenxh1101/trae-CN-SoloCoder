import time
import signal
import sys

from sysmon.collector import collect_snapshot, build_headers, snapshot_to_row
from sysmon.storage import append_csv_row, get_csv_filename


_running = True


def _signal_handler(sig, frame):
    global _running
    _running = False
    print("\n停止采集...")


def run_record(args):
    global _running

    interval = args.interval
    duration = args.duration
    output = args.output
    no_net = args.no_network_sample

    if not output:
        output = get_csv_filename()

    net_interval = 0.0 if no_net else min(interval, 1.0)

    print(f"系统资源采集器")
    print(f"  间隔: {interval}秒")
    if duration > 0:
        print(f"  时长: {duration}秒")
    else:
        print(f"  时长: 无限 (Ctrl+C 停止)")
    print(f"  输出: {output}")
    print()

    signal.signal(signal.SIGINT, _signal_handler)

    headers = None
    count = 0
    start_time = time.time()

    while _running:
        net_interval_used = net_interval if not no_net else 0.0
        snapshot = collect_snapshot(net_interval=net_interval_used)

        if headers is None:
            headers = build_headers(snapshot)

        row = snapshot_to_row(snapshot, headers)
        append_csv_row(output, headers, row)
        count += 1

        cpu = snapshot["cpu"]["total"]
        mem = snapshot["memory"]["percent"]
        net_up = snapshot["network"]["upload_bytes_per_sec"]
        net_down = snapshot["network"]["download_bytes_per_sec"]
        print(
            f"[{snapshot['timestamp']}] "
            f"CPU:{cpu:5.1f}% MEM:{mem:5.1f}% "
            f"↑{net_up/1024:7.1f}KB/s ↓{net_down/1024:7.1f}KB/s"
        )

        if duration > 0 and (time.time() - start_time) >= duration:
            print(f"\n已达到指定时长 {duration}秒，停止采集。")
            break

        if not _running:
            break

        elapsed = time.time() - start_time
        if no_net:
            sleep_time = interval
        else:
            sleep_time = max(0, interval - net_interval)
        if sleep_time > 0:
            time.sleep(sleep_time)

    print(f"\n采集完成，共 {count} 条记录写入 {output}")
