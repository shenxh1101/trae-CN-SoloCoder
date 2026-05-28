import sys
from datetime import datetime

from sysmon.storage import parse_csv_data, get_csv_filename, filter_by_time_range


def _safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _fmt_bytes_per_sec(bps):
    if bps >= 1024 ** 3:
        return f"{bps / (1024**3):.2f} GB/s"
    elif bps >= 1024 ** 2:
        return f"{bps / (1024**2):.2f} MB/s"
    elif bps >= 1024:
        return f"{bps / 1024:.2f} KB/s"
    else:
        return f"{bps:.2f} B/s"


def compute_stats(data):
    if not data:
        return None

    cpu_totals = [_safe_float(d.get("cpu_total")) for d in data]
    mem_percents = [_safe_float(d.get("mem_percent")) for d in data]
    swap_percents = [_safe_float(d.get("swap_percent")) for d in data]
    net_ups = [_safe_float(d.get("net_upload_bytes_per_sec")) for d in data]
    net_downs = [_safe_float(d.get("net_download_bytes_per_sec")) for d in data]

    disk_keys = set()
    for d in data:
        for k in d.keys():
            if k.startswith("disk_") and k.endswith("_percent"):
                disk_keys.add(k.replace("_percent", ""))

    disk_stats = {}
    for dk in sorted(disk_keys):
        pcts = [_safe_float(d.get(f"{dk}_percent")) for d in data]
        disk_stats[dk] = {
            "avg": round(sum(pcts) / len(pcts), 2) if pcts else 0,
            "max": round(max(pcts), 2) if pcts else 0,
            "min": round(min(pcts), 2) if pcts else 0,
        }

    cpu_core_data = {}
    core_idx = 0
    while True:
        key = f"cpu_core_{core_idx}"
        if key not in data[0]:
            break
        vals = [_safe_float(d.get(key)) for d in data]
        cpu_core_data[core_idx] = {
            "avg": round(sum(vals) / len(vals), 2),
            "max": round(max(vals), 2),
            "min": round(min(vals), 2),
        }
        core_idx += 1

    stats = {
        "total_records": len(data),
        "time_range": {
            "start": data[0].get("timestamp", ""),
            "end": data[-1].get("timestamp", ""),
        },
        "cpu": {
            "avg": round(sum(cpu_totals) / len(cpu_totals), 2),
            "max": round(max(cpu_totals), 2),
            "min": round(min(cpu_totals), 2),
            "cores": cpu_core_data,
        },
        "memory": {
            "avg": round(sum(mem_percents) / len(mem_percents), 2),
            "max": round(max(mem_percents), 2),
            "max_used_gb": max(_safe_float(d.get("mem_used_gb")) for d in data),
            "total_gb": _safe_float(data[-1].get("mem_total_gb")),
        },
        "swap": {
            "avg": round(sum(swap_percents) / len(swap_percents), 2),
            "max": round(max(swap_percents), 2),
        },
        "network": {
            "upload": {
                "avg": round(sum(net_ups) / len(net_ups), 2),
                "peak": round(max(net_ups), 2),
            },
            "download": {
                "avg": round(sum(net_downs) / len(net_downs), 2),
                "peak": round(max(net_downs), 2),
            },
        },
        "disk": disk_stats,
    }
    return stats


def print_report(stats):
    if not stats:
        print("无数据可生成报告。")
        return

    print("=" * 60)
    print("          系统资源使用统计报告")
    print("=" * 60)
    print(f"  数据范围: {stats['time_range']['start']} ~ {stats['time_range']['end']}")
    print(f"  记录总数: {stats['total_records']}")
    print()

    cpu = stats["cpu"]
    print(f"  CPU 使用率")
    print(f"    平均: {cpu['avg']}%   最大: {cpu['max']}%   最小: {cpu['min']}%")
    if cpu["cores"]:
        print(f"    各核心:")
        for idx, cs in cpu["cores"].items():
            print(f"      核心{idx}: 平均 {cs['avg']}%  最大 {cs['max']}%  最小 {cs['min']}%")
    print()

    mem = stats["memory"]
    print(f"  内存使用率")
    print(f"    平均: {mem['avg']}%   最大: {mem['max']}%")
    print(f"    峰值占用: {mem['max_used_gb']} GB / {mem['total_gb']} GB")
    print()

    swap = stats["swap"]
    print(f"  交换分区使用率")
    print(f"    平均: {swap['avg']}%   最大: {swap['max']}%")
    print()

    net = stats["network"]
    print(f"  网络速度")
    print(f"    上传 - 平均: {_fmt_bytes_per_sec(net['upload']['avg'])}  峰值: {_fmt_bytes_per_sec(net['upload']['peak'])}")
    print(f"    下载 - 平均: {_fmt_bytes_per_sec(net['download']['avg'])}  峰值: {_fmt_bytes_per_sec(net['download']['peak'])}")
    print()

    disk = stats["disk"]
    if disk:
        print(f"  磁盘使用率")
        for dk, ds in sorted(disk.items()):
            print(f"    {dk}: 平均 {ds['avg']}%  最大 {ds['max']}%  最小 {ds['min']}%")

    print("=" * 60)


def run_report(args):
    filepath = args.file or get_csv_filename()
    data = parse_csv_data(filepath)
    if not data:
        print(f"文件 {filepath} 无数据。")
        return

    if args.start or args.end:
        data = filter_by_time_range(data, args.start, args.end)
        if not data:
            print("筛选后无数据。")
            return

    stats = compute_stats(data)
    print_report(stats)
