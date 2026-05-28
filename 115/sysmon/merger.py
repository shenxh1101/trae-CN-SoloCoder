import os
from datetime import datetime

from sysmon.storage import parse_csv_data, list_csv_files, filter_by_time_range
from sysmon.report import compute_stats, print_report, _fmt_bytes_per_sec, _safe_float


def merge_data_from_files(file_list):
    all_data = []
    for f in file_list:
        data = parse_csv_data(f)
        all_data.extend(data)
    all_data.sort(key=lambda d: d.get("timestamp", ""))
    return all_data


def print_merge_report(stats, period_label, file_count):
    if not stats:
        print("无数据可生成报告。")
        return

    print("=" * 60)
    print(f"     系统资源{period_label}报告")
    print("=" * 60)
    print(f"  合并文件数: {file_count}")
    print(f"  数据范围: {stats['time_range']['start']} ~ {stats['time_range']['end']}")
    print(f"  记录总数: {stats['total_records']}")
    print()

    cpu = stats["cpu"]
    print(f"  CPU 使用率")
    print(f"    平均: {cpu['avg']}%   最大: {cpu['max']}%   最小: {cpu['min']}%")
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

    high_cpu_count = 0
    high_mem_count = 0

    print()
    print("=" * 60)


def run_merge(args):
    files = args.files or []
    directory = args.dir
    period = args.period

    if directory:
        files.extend(list_csv_files(directory))

    if not files:
        from sysmon.storage import DEFAULT_CSV_DIR
        files = list_csv_files(DEFAULT_CSV_DIR)

    if not files:
        print("未找到CSV数据文件。")
        return

    period_label = "周报" if period == "week" else "月报"
    print(f"正在合并 {len(files)} 个文件...")

    data = merge_data_from_files(files)
    if not data:
        print("合并后无数据。")
        return

    stats = compute_stats(data)

    if args.output:
        import json
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        print(f"报告已保存到: {args.output}")
    else:
        print_merge_report(stats, period_label, len(files))
