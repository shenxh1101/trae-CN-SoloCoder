#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import time
import csv
import signal
import platform
import subprocess
from datetime import datetime, timedelta
from collections import defaultdict

import psutil
from colorama import init, Fore, Back, Style

init(autoreset=True)


class Colors:
    HEADER = Fore.MAGENTA + Style.BRIGHT
    OKBLUE = Fore.CYAN + Style.BRIGHT
    OKGREEN = Fore.GREEN + Style.BRIGHT
    WARNING = Fore.YELLOW + Style.BRIGHT
    FAIL = Fore.RED + Style.BRIGHT
    ENDC = Style.RESET_ALL
    BOLD = Style.BRIGHT
    UNDERLINE = Style.BRIGHT


def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')


def create_progress_bar(percent, width=30, color=True):
    filled = int(width * percent / 100)
    bar = '█' * filled + '░' * (width - filled)
    
    if color:
        if percent >= 90:
            return f"{Fore.RED}{bar}{Style.RESET_ALL}"
        elif percent >= 70:
            return f"{Fore.YELLOW}{bar}{Style.RESET_ALL}"
        elif percent >= 50:
            return f"{Fore.CYAN}{bar}{Style.RESET_ALL}"
        else:
            return f"{Fore.GREEN}{bar}{Style.RESET_ALL}"
    return bar


def format_size(bytes_size):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.2f} PB"


def format_speed(bytes_per_sec):
    speed = bytes_per_sec
    for unit in ['B/s', 'KB/s', 'MB/s', 'GB/s']:
        if speed < 1024.0:
            return f"{speed:.2f} {unit}"
        speed /= 1024.0
    return f"{speed:.2f} TB/s"


def get_cpu_info():
    cpu_count = psutil.cpu_count(logical=False)
    cpu_count_logical = psutil.cpu_count(logical=True)
    cpu_percent_total = psutil.cpu_percent(interval=0.1)
    cpu_percent_per_core = psutil.cpu_percent(interval=0.1, percpu=True)
    
    cpu_freq = psutil.cpu_freq()
    freq_current = cpu_freq.current if cpu_freq else 0
    freq_max = cpu_freq.max if cpu_freq else 0
    
    return {
        'physical_cores': cpu_count,
        'logical_cores': cpu_count_logical,
        'total_percent': cpu_percent_total,
        'per_core_percent': cpu_percent_per_core,
        'freq_current': freq_current,
        'freq_max': freq_max
    }


def display_cpu_info(cpu_info):
    print(f"\n{Colors.HEADER}=== CPU 信息 ==={Colors.ENDC}")
    print(f"物理核心数: {Colors.OKBLUE}{cpu_info['physical_cores']}{Colors.ENDC} | "
          f"逻辑核心数: {Colors.OKBLUE}{cpu_info['logical_cores']}{Colors.ENDC}")
    
    if cpu_info['freq_current'] > 0:
        print(f"当前频率: {Colors.OKGREEN}{cpu_info['freq_current']:.2f} MHz{Colors.ENDC} | "
              f"最大频率: {Colors.OKGREEN}{cpu_info['freq_max']:.2f} MHz{Colors.ENDC}")
    
    print(f"\n{Colors.BOLD}总 CPU 使用率:{Colors.ENDC}")
    bar = create_progress_bar(cpu_info['total_percent'])
    print(f"  {bar} {Colors.WARNING}{cpu_info['total_percent']:.1f}%{Colors.ENDC}")
    
    print(f"\n{Colors.BOLD}各核心使用率:{Colors.ENDC}")
    for i, percent in enumerate(cpu_info['per_core_percent']):
        bar = create_progress_bar(percent, width=20)
        print(f"  Core {i:2d}: {bar} {Colors.WARNING}{percent:5.1f}%{Colors.ENDC}")


def get_memory_info():
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    return {
        'total': mem.total,
        'available': mem.available,
        'used': mem.used,
        'free': mem.free,
        'percent': mem.percent,
        'buffers': getattr(mem, 'buffers', 0),
        'cached': getattr(mem, 'cached', 0),
        'shared': getattr(mem, 'shared', 0),
        'swap_total': swap.total,
        'swap_used': swap.used,
        'swap_free': swap.free,
        'swap_percent': swap.percent
    }


def display_memory_info(mem_info):
    print(f"\n{Colors.HEADER}=== 内存信息 ==={Colors.ENDC}")
    print(f"总内存: {Colors.OKBLUE}{format_size(mem_info['total'])}{Colors.ENDC} | "
          f"已用: {Colors.OKGREEN}{format_size(mem_info['used'])}{Colors.ENDC} | "
          f"空闲: {Colors.WARNING}{format_size(mem_info['free'])}{Colors.ENDC}")
    
    if mem_info['buffers'] > 0:
        print(f"缓存: {Colors.CYAN}{format_size(mem_info['buffers'])}{Colors.ENDC} | "
              f"缓冲: {Colors.CYAN}{format_size(mem_info['cached'])}{Colors.ENDC}")
    
    print(f"\n{Colors.BOLD}内存使用率:{Colors.ENDC}")
    bar = create_progress_bar(mem_info['percent'])
    print(f"  {bar} {Colors.WARNING}{mem_info['percent']:.1f}%{Colors.ENDC}")
    
    if mem_info['swap_total'] > 0:
        print(f"\n{Colors.BOLD}交换分区:{Colors.ENDC}")
        print(f"总大小: {Colors.OKBLUE}{format_size(mem_info['swap_total'])}{Colors.ENDC} | "
              f"已用: {Colors.OKGREEN}{format_size(mem_info['swap_used'])}{Colors.ENDC} | "
              f"空闲: {Colors.WARNING}{format_size(mem_info['swap_free'])}{Colors.ENDC}")
        bar = create_progress_bar(mem_info['swap_percent'])
        print(f"  {bar} {Colors.WARNING}{mem_info['swap_percent']:.1f}%{Colors.ENDC}")


def get_disk_info():
    disks = []
    for partition in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            disks.append({
                'device': partition.device,
                'mountpoint': partition.mountpoint,
                'fstype': partition.fstype,
                'total': usage.total,
                'used': usage.used,
                'free': usage.free,
                'percent': usage.percent
            })
        except (PermissionError, OSError):
            continue
    return disks


def display_disk_info(disks):
    print(f"\n{Colors.HEADER}=== 磁盘信息 ==={Colors.ENDC}")
    print(f"{'分区':<25} {'挂载点':<20} {'类型':<10} {'总容量':<12} "
          f"{'已用':<12} {'空闲':<12} {'使用率':<8}")
    print("-" * 110)
    
    for disk in disks:
        percent_str = f"{disk['percent']:.1f}%"
        if disk['percent'] >= 90:
            percent_str = f"{Back.RED}{Fore.WHITE}{percent_str}{Style.RESET_ALL}"
        elif disk['percent'] >= 80:
            percent_str = f"{Fore.RED}{Style.BRIGHT}{percent_str}{Style.RESET_ALL}"
        elif disk['percent'] >= 70:
            percent_str = f"{Fore.YELLOW}{percent_str}{Style.RESET_ALL}"
        
        device = disk['device'][-24:] if len(disk['device']) > 24 else disk['device']
        mount = disk['mountpoint'][-19:] if len(disk['mountpoint']) > 19 else disk['mountpoint']
        
        print(f"{device:<25} {mount:<20} {disk['fstype']:<10} "
              f"{format_size(disk['total']):<12} {format_size(disk['used']):<12} "
              f"{format_size(disk['free']):<12} {percent_str}")


def get_network_info(prev_counters=None, interval=1):
    interfaces = {}
    current_counters = psutil.net_io_counters(pernic=True)
    
    if_addrs = psutil.net_if_addrs()
    if_stats = psutil.net_if_stats()
    
    for iface, addrs in if_addrs.items():
        ip_address = None
        mac_address = None
        for addr in addrs:
            if addr.family == 2:
                ip_address = addr.address
            elif addr.family == 17:
                mac_address = addr.address
        
        counters = current_counters.get(iface, None)
        if counters is None:
            continue
        
        upload_speed = 0
        download_speed = 0
        if prev_counters and iface in prev_counters:
            prev = prev_counters[iface]
            upload_speed = (counters.bytes_sent - prev.bytes_sent) / interval
            download_speed = (counters.bytes_recv - prev.bytes_recv) / interval
        
        interfaces[iface] = {
            'ip': ip_address,
            'mac': mac_address,
            'bytes_sent': counters.bytes_sent,
            'bytes_recv': counters.bytes_recv,
            'packets_sent': counters.packets_sent,
            'packets_recv': counters.packets_recv,
            'upload_speed': upload_speed,
            'download_speed': download_speed,
            'is_up': if_stats[iface].isup if iface in if_stats else False,
            'mtu': if_stats[iface].mtu if iface in if_stats else 0
        }
    
    return interfaces, current_counters


def display_network_info(interfaces):
    print(f"\n{Colors.HEADER}=== 网络信息 ==={Colors.ENDC}")
    
    for iface, info in interfaces.items():
        status = f"{Fore.GREEN}● 运行中{Style.RESET_ALL}" if info['is_up'] else f"{Fore.RED}● 已停止{Style.RESET_ALL}"
        print(f"\n{Colors.BOLD}{iface}{Colors.ENDC} {status}")
        
        if info['ip']:
            print(f"  IP 地址: {Colors.OKBLUE}{info['ip']}{Colors.ENDC}")
        if info['mac']:
            print(f"  MAC 地址: {Colors.OKBLUE}{info['mac']}{Colors.ENDC}")
        if info['mtu'] > 0:
            print(f"  MTU: {Colors.CYAN}{info['mtu']}{Colors.ENDC}")
        
        print(f"  发送: {Colors.OKGREEN}{format_size(info['bytes_sent'])}{Colors.ENDC} "
              f"({info['packets_sent']:,} 包) | "
              f"接收: {Colors.OKGREEN}{format_size(info['bytes_recv'])}{Colors.ENDC} "
              f"({info['packets_recv']:,} 包)")
        
        print(f"  ↑ 上传速度: {Fore.MAGENTA}{format_speed(info['upload_speed'])}{Colors.ENDC} | "
              f"↓ 下载速度: {Fore.CYAN}{format_speed(info['download_speed'])}{Colors.ENDC}")


def get_process_list(sort_by='cpu', limit=15):
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent']):
        try:
            processes.append({
                'pid': proc.info['pid'],
                'name': proc.info['name'],
                'username': proc.info['username'],
                'cpu_percent': proc.info['cpu_percent'] or 0,
                'memory_percent': proc.info['memory_percent'] or 0
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    
    key = 'cpu_percent' if sort_by == 'cpu' else 'memory_percent'
    processes.sort(key=lambda x: x[key], reverse=True)
    return processes[:limit]


def display_process_list(processes, sort_by='cpu'):
    sort_name = 'CPU' if sort_by == 'cpu' else '内存'
    print(f"\n{Colors.HEADER}=== 进程列表 (按{sort_name}使用率排序, 前{len(processes)}个) ==={Colors.ENDC}")
    print(f"{'PID':<8} {'名称':<25} {'用户':<15} {'CPU%':<10} {'内存%':<10}")
    print("-" * 70)
    
    for proc in processes:
        name = proc['name'][:24] if len(proc['name']) > 24 else proc['name']
        username = proc['username'][:14] if proc['username'] and len(proc['username']) > 14 else (proc['username'] or 'N/A')
        cpu_color = Fore.RED if proc['cpu_percent'] > 50 else (Fore.YELLOW if proc['cpu_percent'] > 20 else Fore.GREEN)
        mem_color = Fore.RED if proc['memory_percent'] > 20 else (Fore.YELLOW if proc['memory_percent'] > 10 else Fore.GREEN)
        
        print(f"{proc['pid']:<8} {name:<25} {username:<15} "
              f"{cpu_color}{proc['cpu_percent']:>6.1f}%{Style.RESET_ALL}  "
              f"{mem_color}{proc['memory_percent']:>6.1f}%{Style.RESET_ALL}")


def get_process_tree(filter_name=None):
    processes = {}
    for proc in psutil.process_iter(['pid', 'name', 'ppid', 'username', 'cpu_percent', 'memory_percent']):
        try:
            processes[proc.info['pid']] = {
                'pid': proc.info['pid'],
                'name': proc.info['name'],
                'ppid': proc.info['ppid'],
                'username': proc.info['username'],
                'cpu_percent': proc.info['cpu_percent'] or 0,
                'memory_percent': proc.info['memory_percent'] or 0,
                'children': []
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    
    for pid, proc in processes.items():
        if proc['ppid'] in processes and proc['ppid'] != pid:
            processes[proc['ppid']]['children'].append(pid)
    
    for pid in processes:
        processes[pid]['children'].sort()
    
    root_pids = []
    for pid, proc in processes.items():
        if proc['ppid'] not in processes or proc['ppid'] == 0 or proc['ppid'] == pid:
            root_pids.append(pid)
    
    root_pids.sort()
    
    return processes, root_pids


def display_process_tree(processes, root_pids, filter_name=None, max_depth=5):
    title = f"进程树{' (搜索: ' + filter_name + ')' if filter_name else ''}"
    print(f"\n{Colors.HEADER}=== {title} ==={Colors.ENDC}")
    print(f"{'PID':<8} {'名称':<30} {'用户':<15} {'CPU%':<10} {'内存%':<10}")
    print("-" * 80)
    
    def should_display(pid):
        if not filter_name:
            return True
        return has_matching_descendant(pid, processes, filter_name)
    
    def print_tree(pid, level=0, prefix="", is_last=True):
        if level > max_depth:
            return
        proc = processes.get(pid)
        if not proc:
            return
        
        if filter_name and not should_display(pid):
            return
        
        is_match = not filter_name or filter_name.lower() in proc['name'].lower()
        
        name = proc['name'][:28] if len(proc['name']) > 28 else proc['name']
        username = proc['username'][:14] if proc['username'] and len(proc['username']) > 14 else (proc['username'] or 'N/A')
        
        if level > 0:
            connector = "└─ " if is_last else "├─ "
        else:
            connector = ""
        
        name_display = f"{prefix}{connector}{name}"
        if is_match and filter_name:
            name_display = f"{prefix}{connector}{Fore.YELLOW}{name}{Style.RESET_ALL}"
        
        print(f"{proc['pid']:<8} {name_display:<30} {username:<15} "
              f"{proc['cpu_percent']:>6.1f}%   {proc['memory_percent']:>6.1f}%")
        
        children = [c for c in proc['children'] if should_display(c)]
        
        for i, child_pid in enumerate(children):
            child_is_last = i == len(children) - 1
            if level > 0:
                extension = "   " if is_last else "│  "
            else:
                extension = "   " if is_last else "│  "
            print_tree(child_pid, level + 1, prefix + extension, child_is_last)
    
    count = 0
    for pid in root_pids:
        if filter_name and not should_display(pid):
            continue
        print_tree(pid, 0, "", True)
        count += 1
        if count >= 100:
            print(f"\n{Fore.YELLOW}... 还有更多进程，使用搜索功能过滤{Style.RESET_ALL}")
            break
    
    if filter_name and count == 0:
        print(f"\n{Fore.YELLOW}未找到包含 '{filter_name}' 的进程{Style.RESET_ALL}")


def has_matching_descendant(pid, processes, filter_name, visited=None):
    if visited is None:
        visited = set()
    
    if pid in visited:
        return False
    visited.add(pid)
    
    proc = processes.get(pid)
    if not proc:
        return False
    
    if filter_name.lower() in proc['name'].lower():
        return True
    
    for child_pid in proc['children']:
        if has_matching_descendant(child_pid, processes, filter_name, visited):
            return True
    
    return False


def kill_process(pid):
    try:
        proc = psutil.Process(pid)
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except psutil.TimeoutExpired:
            proc.kill()
        return True, f"进程 {pid} 已成功终止"
    except psutil.NoSuchProcess:
        return False, f"进程 {pid} 不存在"
    except psutil.AccessDenied:
        return False, f"权限不足，无法终止进程 {pid}"
    except Exception as e:
        return False, f"终止进程时出错: {str(e)}"


def get_sensor_info():
    sensors = {
        'temperatures': {},
        'fans': {},
        'battery': None
    }
    
    try:
        temps = psutil.sensors_temperatures()
        for name, entries in temps.items():
            sensors['temperatures'][name] = []
            for entry in entries:
                sensors['temperatures'][name].append({
                    'label': entry.label or name,
                    'current': entry.current,
                    'high': entry.high,
                    'critical': entry.critical
                })
    except Exception:
        pass
    
    try:
        fans = psutil.sensors_fans()
        for name, entries in fans.items():
            sensors['fans'][name] = []
            for entry in entries:
                sensors['fans'][name].append({
                    'label': entry.label or name,
                    'current': entry.current
                })
    except Exception:
        pass
    
    try:
        battery = psutil.sensors_battery()
        if battery:
            sensors['battery'] = {
                'percent': battery.percent,
                'secs_left': battery.secsleft,
                'power_plugged': battery.power_plugged
            }
    except Exception:
        pass
    
    return sensors


def display_sensor_info(sensors):
    print(f"\n{Colors.HEADER}=== 传感器信息 ==={Colors.ENDC}")
    
    if sensors['temperatures']:
        print(f"\n{Colors.BOLD}温度传感器:{Colors.ENDC}")
        for name, entries in sensors['temperatures'].items():
            for entry in entries:
                temp = entry['current']
                temp_str = f"{temp:.1f}°C"
                
                if entry['critical'] and temp >= entry['critical']:
                    temp_str = f"{Back.RED}{Fore.WHITE}{temp_str}{Style.RESET_ALL}"
                elif entry['high'] and temp >= entry['high']:
                    temp_str = f"{Fore.RED}{Style.BRIGHT}{temp_str}{Style.RESET_ALL}"
                elif temp >= 70:
                    temp_str = f"{Fore.YELLOW}{temp_str}{Style.RESET_ALL}"
                else:
                    temp_str = f"{Fore.GREEN}{temp_str}{Style.RESET_ALL}"
                
                high_str = f"/{entry['high']:.0f}°C" if entry['high'] else ""
                crit_str = f"/{entry['critical']:.0f}°C" if entry['critical'] else ""
                
                print(f"  {entry['label']:<20}: {temp_str} {high_str}{crit_str}")
    else:
        print(f"\n  {Fore.YELLOW}未检测到温度传感器{Style.RESET_ALL}")
    
    if sensors['fans']:
        print(f"\n{Colors.BOLD}风扇转速:{Colors.ENDC}")
        for name, entries in sensors['fans'].items():
            for entry in entries:
                rpm = entry['current']
                rpm_str = f"{rpm:.0f} RPM" if rpm > 0 else "已停止"
                if rpm > 4000:
                    rpm_str = f"{Fore.RED}{rpm_str}{Style.RESET_ALL}"
                elif rpm > 2000:
                    rpm_str = f"{Fore.YELLOW}{rpm_str}{Style.RESET_ALL}"
                else:
                    rpm_str = f"{Fore.GREEN}{rpm_str}{Style.RESET_ALL}"
                print(f"  {entry['label']:<20}: {rpm_str}")
    else:
        print(f"  {Fore.YELLOW}未检测到风扇传感器{Style.RESET_ALL}")


def display_battery_info(sensors):
    print(f"\n{Colors.HEADER}=== 电池信息 ==={Colors.ENDC}")
    
    battery = sensors.get('battery')
    if not battery:
        print(f"  {Fore.YELLOW}未检测到电池{Style.RESET_ALL}")
        return
    
    percent = battery['percent']
    power_plugged = battery['power_plugged']
    secs_left = battery['secs_left']
    
    if power_plugged:
        plug_status = f"{Fore.GREEN}● 电源已接入{Style.RESET_ALL}"
        charge_status = "充电中" if percent < 100 else "已充满"
    else:
        plug_status = f"{Fore.RED}● 未接入电源{Style.RESET_ALL}"
        charge_status = "使用电池"
    
    print(f"状态: {plug_status} | {charge_status}")
    
    if percent >= 80:
        percent_color = Fore.GREEN
    elif percent >= 30:
        percent_color = Fore.YELLOW
    else:
        percent_color = Fore.RED
    
    bar = create_progress_bar(percent)
    print(f"电量: {bar} {percent_color}{percent:.1f}%{Style.RESET_ALL}")
    
    if not power_plugged and secs_left != psutil.POWER_TIME_UNLIMITED and secs_left != psutil.POWER_TIME_UNKNOWN:
        hours = secs_left // 3600
        minutes = (secs_left % 3600) // 60
        time_str = f"{hours}小时{minutes}分钟" if hours > 0 else f"{minutes}分钟"
        print(f"剩余时间: {Colors.OKBLUE}{time_str}{Style.RESET_ALL}")


def collect_historical_data(duration_seconds, interval_seconds, output_file):
    start_time = time.time()
    end_time = start_time + duration_seconds
    record_count = 0
    
    prev_net_counters = psutil.net_io_counters(pernic=True)
    
    headers = ['timestamp', 'cpu_total_percent', 'memory_percent', 'memory_used',
               'memory_available', 'swap_percent', 'swap_used',
               'disk_usage_percent', 'disk_used', 'disk_free',
               'network_bytes_sent', 'network_bytes_recv',
               'network_upload_speed', 'network_download_speed']
    
    cpu_cores = psutil.cpu_count(logical=True)
    for i in range(cpu_cores):
        headers.append(f'cpu_core_{i}_percent')
    
    for part in psutil.disk_partitions(all=False):
        mount = part.mountpoint.replace('/', '_').replace(':', '_')
        headers.append(f'disk_{mount}_percent')
    
    for iface in psutil.net_io_counters(pernic=True).keys():
        headers.append(f'net_{iface}_sent')
        headers.append(f'net_{iface}_recv')
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        print(f"\n{Colors.OKGREEN}开始采集数据...{Colors.ENDC}")
        print(f"采集时长: {duration_seconds} 秒, 间隔: {interval_seconds} 秒")
        print(f"输出文件: {output_file}")
        print(f"按 Ctrl+C 停止采集\n")
        
        try:
            while time.time() < end_time:
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                elapsed = int(time.time() - start_time)
                remaining = int(end_time - time.time())
                
                cpu_info = get_cpu_info()
                mem_info = get_memory_info()
                disks = get_disk_info()
                net_info, prev_net_counters = get_network_info(prev_net_counters, interval_seconds)
                
                total_sent = sum(v['bytes_sent'] for v in net_info.values())
                total_recv = sum(v['bytes_recv'] for v in net_info.values())
                total_upload = sum(v['upload_speed'] for v in net_info.values())
                total_download = sum(v['download_speed'] for v in net_info.values())
                
                main_disk = disks[0] if disks else {'percent': 0, 'used': 0, 'free': 0}
                
                row = [
                    timestamp,
                    cpu_info['total_percent'],
                    mem_info['percent'],
                    mem_info['used'],
                    mem_info['available'],
                    mem_info['swap_percent'],
                    mem_info['swap_used'],
                    main_disk['percent'],
                    main_disk['used'],
                    main_disk['free'],
                    total_sent,
                    total_recv,
                    total_upload,
                    total_download
                ]
                
                for p in cpu_info['per_core_percent']:
                    row.append(p)
                
                for disk in disks:
                    row.append(disk['percent'])
                
                for iface in sorted(net_info.keys()):
                    row.append(net_info[iface]['bytes_sent'])
                    row.append(net_info[iface]['bytes_recv'])
                
                writer.writerow(row)
                record_count += 1
                
                print(f"\r已采集: {record_count} 条 | 已用时: {elapsed}s | 剩余: {remaining}s | "
                      f"CPU: {cpu_info['total_percent']:.1f}% | 内存: {mem_info['percent']:.1f}%", end='')
                
                time.sleep(interval_seconds)
                
        except KeyboardInterrupt:
            print(f"\n\n{Colors.WARNING}用户中断采集{Colors.ENDC}")
    
    print(f"\n\n{Colors.OKGREEN}采集完成! 共采集 {record_count} 条数据{Colors.ENDC}")
    return record_count


def send_desktop_notification(title, message):
    try:
        if platform.system() == 'Darwin':
            script = f'display notification "{message}" with title "{title}"'
            subprocess.run(['osascript', '-e', script], check=False)
        elif platform.system() == 'Linux':
            subprocess.run(['notify-send', title, message], check=False)
        elif platform.system() == 'Windows':
            try:
                from plyer import notification
                notification.notify(title=title, message=message, timeout=10)
            except ImportError:
                pass
    except Exception:
        pass


def check_alerts(sensors, disks, cpu_temp_threshold=80, disk_threshold=90):
    alerts = []
    
    for name, entries in sensors.get('temperatures', {}).items():
        for entry in entries:
            if entry['current'] >= cpu_temp_threshold:
                alerts.append(('temp', f"{entry['label']} 温度过高: {entry['current']:.1f}°C"))
    
    for disk in disks:
        if disk['percent'] >= disk_threshold:
            alerts.append(('disk', f"分区 {disk['mountpoint']} 使用率过高: {disk['percent']:.1f}%"))
    
    return alerts


def blink_screen():
    print('\033[?5h', end='', flush=True)
    time.sleep(0.3)
    print('\033[?5l', end='', flush=True)


def display_realtime_monitor(interval=1, cpu_temp_threshold=80, disk_threshold=90):
    prev_net_counters = None
    alert_cooldown = {}
    
    print(f"\n{Colors.OKGREEN}按 Ctrl+C 返回主菜单{Colors.ENDC}\n")
    
    try:
        while True:
            clear_screen()
            print(f"{Colors.HEADER}=== 实时系统监控 ==={Colors.ENDC}")
            print(f"更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            cpu_info = get_cpu_info()
            mem_info = get_memory_info()
            disks = get_disk_info()
            net_info, prev_net_counters = get_network_info(prev_net_counters, interval)
            sensors = get_sensor_info()
            
            display_cpu_info(cpu_info)
            display_memory_info(mem_info)
            display_disk_info(disks)
            display_network_info(net_info)
            display_sensor_info(sensors)
            if sensors.get('battery'):
                display_battery_info(sensors)
            
            alerts = check_alerts(sensors, disks, cpu_temp_threshold, disk_threshold)
            if alerts:
                current_time = time.time()
                for alert_type, msg in alerts:
                    print(f"\n{Colors.FAIL}⚠️  警告: {msg}{Colors.ENDC}")
                    
                    if alert_type == 'temp':
                        if current_time - alert_cooldown.get('temp', 0) > 10:
                            blink_screen()
                            alert_cooldown['temp'] = current_time
                    
                    if alert_type == 'disk':
                        if current_time - alert_cooldown.get('disk', 0) > 60:
                            send_desktop_notification('磁盘空间警告', msg)
                            alert_cooldown['disk'] = current_time
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}已停止实时监控{Colors.ENDC}")
        input("\n按回车键返回主菜单...")


def display_menu():
    clear_screen()
    print(f"\n{Colors.HEADER}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{' '*15}系统监控工具 v1.0{Colors.ENDC}")
    print(f"{Colors.HEADER}{'='*60}{Colors.ENDC}")
    print(f"\n{Colors.BOLD}主菜单:{Colors.ENDC}")
    print(f"  {Colors.OKBLUE}1.{Colors.ENDC} 实时系统监控")
    print(f"  {Colors.OKBLUE}2.{Colors.ENDC} 查看进程列表 (按CPU排序)")
    print(f"  {Colors.OKBLUE}3.{Colors.ENDC} 查看进程列表 (按内存排序)")
    print(f"  {Colors.OKBLUE}4.{Colors.ENDC} 查看进程树")
    print(f"  {Colors.OKBLUE}5.{Colors.ENDC} 搜索进程树")
    print(f"  {Colors.OKBLUE}6.{Colors.ENDC} 结束进程")
    print(f"  {Colors.OKBLUE}7.{Colors.ENDC} 历史数据采集")
    print(f"  {Colors.OKBLUE}8.{Colors.ENDC} 生成数据可视化图表")
    print(f"  {Colors.OKBLUE}9.{Colors.ENDC} 启动远程监控服务器")
    print(f"  {Colors.OKBLUE}10.{Colors.ENDC} 导出HTML报告")
    print(f"  {Colors.OKBLUE}11.{Colors.ENDC} 设置警告阈值")
    print(f"  {Colors.OKBLUE}0.{Colors.ENDC} 退出")
    print(f"\n{Colors.HEADER}{'='*60}{Colors.ENDC}")


def main():
    cpu_temp_threshold = 80
    disk_threshold = 90
    
    while True:
        display_menu()
        choice = input(f"\n{Colors.BOLD}请输入选项 [0-11]: {Colors.ENDC}").strip()
        
        if choice == '1':
            display_realtime_monitor(1, cpu_temp_threshold, disk_threshold)
        
        elif choice == '2':
            clear_screen()
            procs = get_process_list(sort_by='cpu', limit=15)
            display_process_list(procs, sort_by='cpu')
            input("\n按回车键返回主菜单...")
        
        elif choice == '3':
            clear_screen()
            procs = get_process_list(sort_by='memory', limit=15)
            display_process_list(procs, sort_by='memory')
            input("\n按回车键返回主菜单...")
        
        elif choice == '4':
            clear_screen()
            processes, root_pids = get_process_tree()
            display_process_tree(processes, root_pids)
            input("\n按回车键返回主菜单...")
        
        elif choice == '5':
            filter_name = input("请输入要搜索的进程名: ").strip()
            if filter_name:
                clear_screen()
                processes, root_pids = get_process_tree(filter_name)
                display_process_tree(processes, root_pids, filter_name)
                input("\n按回车键返回主菜单...")
        
        elif choice == '6':
            try:
                pid = int(input("请输入要结束的进程PID: ").strip())
                confirm = input(f"确定要终止进程 {pid} 吗? (y/N): ").strip().lower()
                if confirm == 'y':
                    success, msg = kill_process(pid)
                    if success:
                        print(f"\n{Colors.OKGREEN}{msg}{Colors.ENDC}")
                    else:
                        print(f"\n{Colors.FAIL}{msg}{Colors.ENDC}")
                else:
                    print("\n已取消")
            except ValueError:
                print(f"\n{Colors.FAIL}请输入有效的PID{Colors.ENDC}")
            input("\n按回车键返回主菜单...")
        
        elif choice == '7':
            try:
                duration = int(input("采集时长(秒) [默认300]: ").strip() or "300")
                interval = int(input("采集间隔(秒) [默认5]: ").strip() or "5")
                filename = input("输出文件名 [默认system_monitor_log.csv]: ").strip() or "system_monitor_log.csv"
                
                if duration < 1 or interval < 1:
                    print(f"\n{Colors.FAIL}时长和间隔必须大于0{Colors.ENDC}")
                else:
                    collect_historical_data(duration, interval, filename)
            except ValueError:
                print(f"\n{Colors.FAIL}请输入有效的数字{Colors.ENDC}")
            input("\n按回车键返回主菜单...")
        
        elif choice == '8':
            filename = input("历史数据文件名 [默认system_monitor_log.csv]: ").strip() or "system_monitor_log.csv"
            if os.path.exists(filename):
                try:
                    from visualizer import generate_trend_charts
                    generate_trend_charts(filename)
                except ImportError:
                    print(f"\n{Colors.FAIL}visualizer 模块未找到{Colors.ENDC}")
            else:
                print(f"\n{Colors.FAIL}文件 {filename} 不存在{Colors.ENDC}")
            input("\n按回车键返回主菜单...")
        
        elif choice == '9':
            try:
                port = int(input("HTTP服务器端口 [默认5000]: ").strip() or "5000")
                from http_server import start_monitor_server
                print(f"\n{Colors.OKGREEN}启动远程监控服务器在端口 {port}...{Colors.ENDC}")
                print(f"{Colors.WARNING}按 Ctrl+C 停止服务器{Colors.ENDC}\n")
                try:
                    start_monitor_server(port)
                except KeyboardInterrupt:
                    print(f"\n{Colors.WARNING}服务器已停止{Colors.ENDC}")
            except ImportError:
                print(f"\n{Colors.FAIL}http_server 模块未找到{Colors.ENDC}")
            except Exception as e:
                print(f"\n{Colors.FAIL}启动服务器失败: {e}{Colors.ENDC}")
            input("\n按回车键返回主菜单...")
        
        elif choice == '10':
            data_file = input("历史数据文件名 [默认system_monitor_log.csv]: ").strip() or "system_monitor_log.csv"
            output_file = input("输出HTML文件名 [默认system_report.html]: ").strip() or "system_report.html"
            if os.path.exists(data_file):
                try:
                    from html_report import generate_html_report
                    generate_html_report(data_file, output_file)
                except ImportError:
                    print(f"\n{Colors.FAIL}html_report 模块未找到{Colors.ENDC}")
            else:
                print(f"\n{Colors.FAIL}文件 {data_file} 不存在{Colors.ENDC}")
            input("\n按回车键返回主菜单...")
        
        elif choice == '11':
            try:
                new_cpu_temp = input(f"CPU温度警告阈值(°C) [当前{cpu_temp_threshold}]: ").strip()
                new_disk = input(f"磁盘使用率警告阈值(%) [当前{disk_threshold}]: ").strip()
                
                if new_cpu_temp:
                    cpu_temp_threshold = int(new_cpu_temp)
                if new_disk:
                    disk_threshold = int(new_disk)
                
                print(f"\n{Colors.OKGREEN}设置已更新:{Colors.ENDC}")
                print(f"  CPU温度阈值: {cpu_temp_threshold}°C")
                print(f"  磁盘使用率阈值: {disk_threshold}%")
            except ValueError:
                print(f"\n{Colors.FAIL}请输入有效的数字{Colors.ENDC}")
            input("\n按回车键返回主菜单...")
        
        elif choice == '0':
            print(f"\n{Colors.OKGREEN}感谢使用系统监控工具，再见!{Colors.ENDC}\n")
            sys.exit(0)
        
        else:
            print(f"\n{Colors.FAIL}无效选项，请重新输入{Colors.ENDC}")
            time.sleep(1)


if __name__ == '__main__':
    main()
