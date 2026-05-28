#!/usr/bin/env python3

import argparse
import csv
import json
import os
import signal
import sys
import time
from datetime import datetime

import psutil


def get_processes():
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'username', 'ppid', 'create_time', 'cmdline', 'nice', 'status']):
        try:
            info = p.info
            info['cpu_percent'] = info['cpu_percent'] or 0.0
            info['memory_percent'] = info['memory_percent'] or 0.0
            info['obj'] = p
            procs.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    return procs


def format_uptime(create_time):
    if not create_time:
        return "N/A"
    delta = datetime.now() - datetime.fromtimestamp(create_time)
    days = delta.days
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    parts = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    parts.append(f"{minutes}m")
    parts.append(f"{seconds}s")
    return " ".join(parts)


def cmd_list(args):
    procs = get_processes()
    if args.user:
        current_user = psutil.Process(os.getpid()).username()
        procs = [p for p in procs if p.get('username') == current_user]
    if args.search:
        procs = [p for p in procs if args.search.lower() in p.get('name', '').lower()]
    if args.sort == 'cpu':
        procs.sort(key=lambda x: x['cpu_percent'], reverse=True)
    elif args.sort == 'mem':
        procs.sort(key=lambda x: x['memory_percent'], reverse=True)
    if args.top:
        procs = procs[:args.top]
    header = f"{'PID':<8} {'NAME':<25} {'CPU%':<8} {'MEM%':<8} {'USER':<15} {'STATUS':<10}"
    print(header)
    print("-" * len(header))
    for p in procs:
        status = p.get('status', 'N/A')
        if status == 'stopped':
            status = 'STOPPED'
        print(f"{p['pid']:<8} {p.get('name', 'N/A'):<25} {p['cpu_percent']:<8.1f} {p['memory_percent']:<8.1f} {str(p.get('username', 'N/A')):<15} {status:<10}")


def cmd_top(args):
    try:
        while True:
            os.system('clear' if os.name != 'nt' else 'cls')
            procs = get_processes()
            sort_key = 'cpu_percent' if args.sort == 'cpu' else 'memory_percent'
            procs.sort(key=lambda x: x[sort_key], reverse=True)
            top5 = procs[:5]
            print(f"=== Top 5 Processes by {'CPU' if args.sort == 'cpu' else 'Memory'} (refresh every 2s, Ctrl+C to stop) ===")
            print(f"{'PID':<8} {'NAME':<25} {'CPU%':<8} {'MEM%':<8} {'USER':<15}")
            print("-" * 64)
            for p in top5:
                print(f"{p['pid']:<8} {p.get('name', 'N/A'):<25} {p['cpu_percent']:<8.1f} {p['memory_percent']:<8.1f} {str(p.get('username', 'N/A')):<15}")
            print(f"\nLast updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")


def cmd_search(args):
    procs = get_processes()
    results = [p for p in procs if args.name.lower() in p.get('name', '').lower()]
    if not results:
        print(f"No processes found matching '{args.name}'")
        return
    print(f"Found {len(results)} process(es) matching '{args.name}':")
    print(f"{'PID':<8} {'NAME':<25} {'CPU%':<8} {'MEM%':<8} {'USER':<15}")
    print("-" * 64)
    for p in results:
        print(f"{p['pid']:<8} {p.get('name', 'N/A'):<25} {p['cpu_percent']:<8.1f} {p['memory_percent']:<8.1f} {str(p.get('username', 'N/A')):<15}")


def cmd_kill(args):
    try:
        proc = psutil.Process(args.pid)
        print(f"Process found: PID={proc.pid}, Name={proc.name()}, Status={proc.status()}")
        confirm = input(f"Are you sure you want to kill PID {args.pid}? (y/N): ").strip().lower()
        if confirm == 'y':
            proc.terminate()
            print(f"SIGTERM sent to PID {args.pid}")
            try:
                proc.wait(timeout=3)
                print(f"Process {args.pid} terminated successfully.")
            except psutil.TimeoutExpired:
                proc.kill()
                print(f"Process {args.pid} did not terminate, sent SIGKILL.")
        else:
            print("Operation cancelled.")
    except psutil.NoSuchProcess:
        print(f"Process with PID {args.pid} not found.")
    except psutil.AccessDenied:
        print(f"Access denied. Try running with sudo.")
    except Exception as e:
        print(f"Error: {e}")


def cmd_killall(args):
    procs = get_processes()
    targets = [p for p in procs if p.get('name', '').lower() == args.name.lower()]
    if not targets:
        print(f"No processes found with name '{args.name}'")
        return
    print(f"Found {len(targets)} process(es) with name '{args.name}':")
    for p in targets:
        print(f"  PID={p['pid']}, CPU={p['cpu_percent']:.1f}%, MEM={p['memory_percent']:.1f}%")
    confirm = input(f"Kill all {len(targets)} process(es)? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Operation cancelled.")
        return
    killed = 0
    for p in targets:
        try:
            proc = psutil.Process(p['pid'])
            proc.terminate()
            killed += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    print(f"Termination signal sent to {killed} process(es).")


def cmd_detail(args):
    try:
        proc = psutil.Process(args.pid)
        info = proc.as_dict(['pid', 'name', 'username', 'status', 'create_time', 'cmdline', 'ppid', 'nice', 'cpu_percent', 'memory_percent', 'num_threads', 'exe'])
        try:
            num_fds = proc.num_fds()
        except (psutil.AccessDenied, AttributeError):
            num_fds = "N/A"
        uptime = format_uptime(info.get('create_time'))
        print(f"=== Process Detail: PID {info['pid']} ===")
        print(f"  Name:            {info.get('name', 'N/A')}")
        print(f"  Status:          {info.get('status', 'N/A')}")
        print(f"  Username:        {info.get('username', 'N/A')}")
        print(f"  Executable:      {info.get('exe', 'N/A')}")
        print(f"  Command Line:    {' '.join(info.get('cmdline') or [])}")
        print(f"  Parent PID:      {info.get('ppid', 'N/A')}")
        print(f"  Run Time:        {uptime}")
        cpu_val = info.get('cpu_percent') or 0
        mem_val = info.get('memory_percent') or 0
        print(f"  CPU%:            {cpu_val:.1f}")
        print(f"  Memory%:         {mem_val:.1f}")
        print(f"  Nice Value:      {info.get('nice', 'N/A')}")
        print(f"  Threads:         {info.get('num_threads', 'N/A')}")
        print(f"  File Descriptors:{num_fds}")
    except psutil.NoSuchProcess:
        print(f"Process with PID {args.pid} not found.")
    except psutil.AccessDenied:
        print(f"Access denied. Try running with sudo.")
    except Exception as e:
        print(f"Error: {e}")


def cmd_tree(args):
    procs = get_processes()
    proc_map = {}
    for p in procs:
        proc_map[p['pid']] = {
            'pid': p['pid'],
            'name': p.get('name', 'N/A'),
            'ppid': p.get('ppid', 0),
            'children': []
        }
    for p in procs:
        ppid = p.get('ppid', 0)
        if ppid in proc_map:
            proc_map[ppid]['children'].append(proc_map[p['pid']])
        else:
            if 0 not in proc_map:
                proc_map[0] = {'pid': 0, 'name': 'kernel', 'ppid': None, 'children': []}
            proc_map[0]['children'].append(proc_map[p['pid']])

    def print_tree(node, prefix="", is_last=True, depth=0):
        if depth > args.max_depth:
            return
        connector = "└── " if is_last else "├── "
        if depth == 0:
            print(f"{node['name']} (PID {node['pid']})")
        else:
            print(f"{prefix}{connector}{node['name']} (PID {node['pid']})")
        children = sorted(node.get('children', []), key=lambda x: x['pid'])
        for i, child in enumerate(children):
            is_child_last = (i == len(children) - 1)
            if depth == 0:
                new_prefix = prefix
            else:
                new_prefix = prefix + ("    " if is_last else "│   ")
            print_tree(child, new_prefix, is_child_last, depth + 1)

    root_pids = [pid for pid, p in proc_map.items() if p['ppid'] not in proc_map or p['ppid'] == pid]
    if args.pid:
        if args.pid in proc_map:
            print_tree(proc_map[args.pid])
        else:
            print(f"Process with PID {args.pid} not found.")
    else:
        if 0 in proc_map:
            print_tree(proc_map[0])
        else:
            for rp in root_pids:
                print_tree(proc_map[rp])


def cmd_suspend(args):
    try:
        proc = psutil.Process(args.pid)
        print(f"Process: PID={proc.pid}, Name={proc.name()}, Status={proc.status()}")
        proc.send_signal(signal.SIGSTOP)
        print(f"SIGSTOP sent to PID {args.pid}. Process suspended.")
    except psutil.NoSuchProcess:
        print(f"Process with PID {args.pid} not found.")
    except psutil.AccessDenied:
        print(f"Access denied. Try running with sudo.")
    except Exception as e:
        print(f"Error: {e}")


def cmd_resume(args):
    try:
        proc = psutil.Process(args.pid)
        print(f"Process: PID={proc.pid}, Name={proc.name()}, Status={proc.status()}")
        proc.send_signal(signal.SIGCONT)
        print(f"SIGCONT sent to PID {args.pid}. Process resumed.")
    except psutil.NoSuchProcess:
        print(f"Process with PID {args.pid} not found.")
    except psutil.AccessDenied:
        print(f"Access denied. Try running with sudo.")
    except Exception as e:
        print(f"Error: {e}")


def cmd_priority(args):
    try:
        proc = psutil.Process(args.pid)
        old_nice = proc.nice()
        print(f"Process: PID={proc.pid}, Name={proc.name()}, Current Nice={old_nice}")
        new_nice = args.value
        proc.nice(new_nice)
        print(f"Nice value changed: {old_nice} -> {new_nice}")
    except psutil.NoSuchProcess:
        print(f"Process with PID {args.pid} not found.")
    except psutil.AccessDenied:
        print(f"Access denied. Try running with sudo.")
    except Exception as e:
        print(f"Error: {e}")


def cmd_export(args):
    procs = get_processes()
    if args.user:
        current_user = psutil.Process(os.getpid()).username()
        procs = [p for p in procs if p.get('username') == current_user]
    data = []
    for p in procs:
        data.append({
            'pid': p['pid'],
            'name': p.get('name', 'N/A'),
            'cpu_percent': round(p['cpu_percent'], 2),
            'memory_percent': round(p['memory_percent'], 2),
            'username': str(p.get('username', 'N/A')),
            'status': p.get('status', 'N/A'),
            'ppid': p.get('ppid', 'N/A'),
        })
    output_file = args.output
    if args.format == 'csv':
        if not output_file:
            output_file = f"processes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with open(output_file, 'w', newline='') as f:
            if data:
                writer = csv.DictWriter(f, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
        print(f"Exported {len(data)} processes to {output_file} (CSV)")
    else:
        if not output_file:
            output_file = f"processes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Exported {len(data)} processes to {output_file} (JSON)")


def cmd_overview(args):
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_per_core = psutil.cpu_percent(interval=0, percpu=True)
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    print("=" * 60)
    print("           SYSTEM RESOURCE OVERVIEW")
    print("=" * 60)
    print(f"\n  CPU Usage:")
    print(f"    Overall:    {cpu_percent:.1f}%")
    print(f"    Per Core:   {' | '.join(f'Core{i}: {v:.1f}%' for i, v in enumerate(cpu_per_core))}")
    print(f"\n  Memory:")
    print(f"    Total:      {mem.total / (1024**3):.1f} GB")
    print(f"    Used:       {mem.used / (1024**3):.1f} GB ({mem.percent:.1f}%)")
    print(f"    Available:  {mem.available / (1024**3):.1f} GB")
    print(f"\n  Swap:")
    print(f"    Total:      {swap.total / (1024**3):.1f} GB")
    print(f"    Used:       {swap.used / (1024**3):.1f} GB ({swap.percent:.1f}%)")
    print(f"    Free:       {swap.free / (1024**3):.1f} GB")
    print()
    procs = get_processes()
    by_cpu = sorted(procs, key=lambda x: x['cpu_percent'], reverse=True)[:5]
    print(f"  Top 5 by CPU:")
    print(f"  {'PID':<8} {'NAME':<20} {'CPU%':<8}")
    print(f"  {'-'*36}")
    for p in by_cpu:
        print(f"  {p['pid']:<8} {p.get('name', 'N/A'):<20} {p['cpu_percent']:<8.1f}")
    by_mem = sorted(procs, key=lambda x: x['memory_percent'], reverse=True)[:5]
    print(f"\n  Top 5 by Memory:")
    print(f"  {'PID':<8} {'NAME':<20} {'MEM%':<8}")
    print(f"  {'-'*36}")
    for p in by_mem:
        print(f"  {p['pid']:<8} {p.get('name', 'N/A'):<20} {p['memory_percent']:<8.1f}")
    print("=" * 60)


def cmd_record(args):
    target_name = args.name
    output_file = args.output or f"process_history_{target_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    interval = args.interval
    duration = args.duration
    start_time = time.time()
    fieldnames = ['timestamp', 'pid', 'name', 'cpu_percent', 'memory_percent']
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
    print(f"Recording process '{target_name}' to {output_file}")
    print(f"Interval: {interval}s | Duration: {'unlimited' if duration == 0 else f'{duration}s'}")
    print("Press Ctrl+C to stop early.\n")
    try:
        while True:
            if duration > 0 and (time.time() - start_time) > duration:
                print(f"\nDuration of {duration}s reached. Stopping.")
                break
            procs = get_processes()
            matches = [p for p in procs if target_name.lower() in p.get('name', '').lower()]
            if not matches:
                row = {
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'pid': 'N/A',
                    'name': target_name,
                    'cpu_percent': 0,
                    'memory_percent': 0,
                }
                with open(output_file, 'a', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writerow(row)
                print(f"[{row['timestamp']}] No matching process found.")
            else:
                with open(output_file, 'a', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    for p in matches:
                        row = {
                            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'pid': p['pid'],
                            'name': p.get('name', 'N/A'),
                            'cpu_percent': round(p['cpu_percent'], 2),
                            'memory_percent': round(p['memory_percent'], 2),
                        }
                        writer.writerow(row)
                        print(f"[{row['timestamp']}] PID={p['pid']} CPU={p['cpu_percent']:.1f}% MEM={p['memory_percent']:.1f}%")
            time.sleep(interval)
    except KeyboardInterrupt:
        print(f"\nRecording stopped. Data saved to {output_file}")


def build_parser():
    parser = argparse.ArgumentParser(
        prog='procman',
        description='A comprehensive command-line process management tool',
    )
    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    list_parser = subparsers.add_parser('list', help='List all processes')
    list_parser.add_argument('--sort', choices=['cpu', 'mem'], default='cpu', help='Sort by cpu or memory (default: cpu)')
    list_parser.add_argument('--top', type=int, default=None, help='Show only top N processes')
    list_parser.add_argument('--search', type=str, default=None, help='Search processes by name')
    list_parser.add_argument('--user', action='store_true', help='Show only current user processes')
    list_parser.set_defaults(func=cmd_list)

    top_parser = subparsers.add_parser('top', help='Monitor top processes (refresh every 2s)')
    top_parser.add_argument('--sort', choices=['cpu', 'mem'], default='cpu', help='Sort by cpu or memory (default: cpu)')
    top_parser.set_defaults(func=cmd_top)

    search_parser = subparsers.add_parser('search', help='Search processes by name')
    search_parser.add_argument('name', type=str, help='Process name to search for')
    search_parser.set_defaults(func=cmd_search)

    kill_parser = subparsers.add_parser('kill', help='Kill a process by PID')
    kill_parser.add_argument('pid', type=int, help='PID of the process to kill')
    kill_parser.set_defaults(func=cmd_kill)

    killall_parser = subparsers.add_parser('killall', help='Kill all processes by name')
    killall_parser.add_argument('name', type=str, help='Process name to kill')
    killall_parser.set_defaults(func=cmd_killall)

    detail_parser = subparsers.add_parser('detail', help='Show detailed process information')
    detail_parser.add_argument('pid', type=int, help='PID of the process')
    detail_parser.set_defaults(func=cmd_detail)

    tree_parser = subparsers.add_parser('tree', help='Display process tree')
    tree_parser.add_argument('--pid', type=int, default=None, help='Root PID for the tree (default: all)')
    tree_parser.add_argument('--max-depth', type=int, default=20, help='Maximum tree depth (default: 20)')
    tree_parser.set_defaults(func=cmd_tree)

    suspend_parser = subparsers.add_parser('suspend', help='Suspend a process (SIGSTOP)')
    suspend_parser.add_argument('pid', type=int, help='PID of the process to suspend')
    suspend_parser.set_defaults(func=cmd_suspend)

    resume_parser = subparsers.add_parser('resume', help='Resume a suspended process (SIGCONT)')
    resume_parser.add_argument('pid', type=int, help='PID of the process to resume')
    resume_parser.set_defaults(func=cmd_resume)

    priority_parser = subparsers.add_parser('priority', help='Set process priority (nice value)')
    priority_parser.add_argument('pid', type=int, help='PID of the process')
    priority_parser.add_argument('value', type=int, help='Nice value (-20 highest to 19 lowest)')
    priority_parser.set_defaults(func=cmd_priority)

    export_parser = subparsers.add_parser('export', help='Export process list to CSV or JSON')
    export_parser.add_argument('--format', choices=['csv', 'json'], default='csv', help='Output format (default: csv)')
    export_parser.add_argument('--output', '-o', type=str, default=None, help='Output file path')
    export_parser.add_argument('--user', action='store_true', help='Export only current user processes')
    export_parser.set_defaults(func=cmd_export)

    overview_parser = subparsers.add_parser('overview', help='Show system resource overview')
    overview_parser.set_defaults(func=cmd_overview)

    record_parser = subparsers.add_parser('record', help='Record process CPU/memory history to CSV')
    record_parser.add_argument('name', type=str, help='Process name to record')
    record_parser.add_argument('--output', '-o', type=str, default=None, help='Output CSV file path')
    record_parser.add_argument('--interval', type=int, default=2, help='Sampling interval in seconds (default: 2)')
    record_parser.add_argument('--duration', type=int, default=0, help='Recording duration in seconds (0=unlimited, default: 0)')
    record_parser.set_defaults(func=cmd_record)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)
    args.func(args)


if __name__ == '__main__':
    main()
