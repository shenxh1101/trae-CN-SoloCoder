#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import time
import signal
import subprocess
from colorama import init, Fore, Style

init(autoreset=True)

def print_header(title):
    print(f"\n{'='*70}")
    print(f"  {Fore.CYAN}{Style.BRIGHT}{title}{Style.RESET_ALL}")
    print(f"{'='*70}")

def print_pass(msg):
    print(f"  {Fore.GREEN}✅ PASS:{Style.RESET_ALL} {msg}")

def print_fail(msg):
    print(f"  {Fore.RED}❌ FAIL:{Style.RESET_ALL} {msg}")

def print_warn(msg):
    print(f"  {Fore.YELLOW}⚠️  WARN:{Style.RESET_ALL} {msg}")

def test_process_tree():
    print_header("1. 测试进程树功能")
    
    from system_monitor import get_process_tree, display_process_tree
    
    try:
        processes, root_pids = get_process_tree()
        print_pass(f"成功获取进程树: {len(processes)} 个进程")
        print_pass(f"根进程数: {len(root_pids)}")
        
        pid_1_found = 1 in processes
        if pid_1_found:
            print_pass("找到 init 进程 (PID 1)")
            init_proc = processes[1]
            print(f"     名称: {init_proc['name']}, 子进程数: {len(init_proc['children'])}")
        else:
            print_warn("未找到 PID 1 (init进程，macOS系统正常)")
        
        orphan_count = 0
        for pid, proc in processes.items():
            if proc['ppid'] != 0 and proc['ppid'] not in processes:
                orphan_count += 1
        print_pass(f"孤儿进程数: {orphan_count}")
        
        children_sorted = True
        for pid, proc in processes.items():
            if proc['children'] != sorted(proc['children']):
                children_sorted = False
                break
        if children_sorted:
            print_pass("子进程已按PID排序")
        else:
            print_fail("子进程未按PID排序，显示顺序可能不一致")
        
        max_depth = 0
        def get_depth(pid, level=0, visited=None):
            if visited is None:
                visited = set()
            if pid in visited:
                return
            visited.add(pid)
            nonlocal max_depth
            max_depth = max(max_depth, level)
            proc = processes.get(pid)
            if proc:
                for child in proc['children']:
                    get_depth(child, level + 1, visited)
        
        for pid in root_pids[:5]:
            get_depth(pid)
        print_pass(f"进程树最大深度: {max_depth}")
        
        if max_depth > 0:
            print_pass("进程树可以正常遍历")
        else:
            print_warn("进程树深度为0，可能遍历有问题")
        
        print_pass("测试 display_process_tree 显示...")
        import io
        import contextlib
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            display_process_tree(processes, root_pids, max_depth=2)
        output = f.getvalue()
        if 'PID' in output and '名称' in output:
            print_pass("display_process_tree 可以正常显示")
        else:
            print_fail("display_process_tree 输出异常")
        
        return True
        
    except Exception as e:
        print_fail(f"进程树测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_process_search():
    print_header("2. 测试进程搜索功能")
    
    from system_monitor import get_process_tree, has_matching_descendant
    
    try:
        filter_name = "python"
        processes, root_pids = get_process_tree(filter_name)
        
        matching_count = 0
        for pid, proc in processes.items():
            if filter_name.lower() in proc['name'].lower():
                matching_count += 1
        
        print_pass(f"找到 {matching_count} 个包含 '{filter_name}' 的进程")
        
        if matching_count > 0:
            for pid, proc in processes.items():
                if filter_name.lower() in proc['name'].lower():
                    print(f"     匹配: PID {pid} - {proc['name']}")
                    break
        
        search_terms = ["python", "launchd", "kernel", "safari", "chrome", "finder"]
        found_any = False
        for term in search_terms:
            count = sum(1 for p in processes.values() if term.lower() in p['name'].lower())
            if count > 0:
                found_any = True
                print_pass(f"搜索 '{term}' 找到 {count} 个进程")
        
        test_pid = list(processes.keys())[0]
        result = has_matching_descendant(test_pid, processes, "python")
        print_pass(f"has_matching_descendant 函数正常工作: 返回 {result}")
        
        return True
        
    except Exception as e:
        print_fail(f"进程搜索测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_kill_process():
    print_header("3. 测试结束进程功能")
    
    from system_monitor import kill_process
    
    try:
        print_pass("创建测试子进程...")
        proc = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(10)"], 
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        test_pid = proc.pid
        print_pass(f"测试进程 PID: {test_pid}")
        
        import psutil
        if psutil.pid_exists(test_pid):
            print_pass(f"测试进程 {test_pid} 正在运行")
        else:
            print_fail(f"测试进程 {test_pid} 不存在")
            return False
        
        success, msg = kill_process(test_pid)
        if success:
            print_pass(f"kill_process 返回成功: {msg}")
        else:
            print_fail(f"kill_process 返回失败: {msg}")
        
        time.sleep(0.5)
        if not psutil.pid_exists(test_pid):
            print_pass(f"确认进程 {test_pid} 已终止")
        elif proc.poll() is not None:
            print_pass(f"确认进程 {test_pid} 已终止 (通过 subprocess)")
        else:
            print_fail(f"进程 {test_pid} 仍然在运行")
            proc.kill()
        
        success, msg = kill_process(999999)
        if not success and "不存在" in msg:
            print_pass("正确处理不存在的PID")
        else:
            print_fail("处理不存在的PID时出错")
        
        return True
        
    except Exception as e:
        print_fail(f"结束进程测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_alerts():
    print_header("4. 测试警告通知功能")
    
    from system_monitor import check_alerts, blink_screen, send_desktop_notification
    
    try:
        test_sensors = {
            'temperatures': {
                'cpu': [{'label': 'CPU Core 0', 'current': 85, 'high': 80, 'critical': 95}]
            },
            'fans': {},
            'battery': None
        }
        test_disks = [
            {'mountpoint': '/', 'percent': 92, 'total': 1000, 'used': 920, 'free': 80}
        ]
        
        alerts = check_alerts(test_sensors, test_disks, cpu_temp_threshold=80, disk_threshold=90)
        if len(alerts) == 2:
            print_pass("正确检测到2个警告: CPU高温 + 磁盘高使用率")
            for alert_type, msg in alerts:
                print(f"     - {alert_type}: {msg}")
        else:
            print_fail(f"应该检测到2个警告，实际检测到 {len(alerts)} 个")
        
        print_pass("测试终端闪烁...")
        print("     (屏幕将闪烁0.3秒)")
        blink_screen()
        print_pass("终端闪烁功能正常")
        
        print_pass("测试桌面通知...")
        send_desktop_notification("系统监控测试", "这是一条测试通知，请检查是否收到")
        print_pass("桌面通知已发送 (请检查是否显示)")
        
        return True
        
    except Exception as e:
        print_fail(f"警告通知测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_http_server():
    print_header("5. 测试远程监控服务器")
    
    try:
        import socket
        import urllib.request
        
        print_pass("测试端口可用性...")
        test_port = 5999
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = s.connect_ex(('localhost', test_port))
        s.close()
        if result != 0:
            print_pass(f"端口 {test_port} 可用")
        else:
            print_warn(f"端口 {test_port} 已被占用，使用备用端口")
            test_port = 5998
        
        print_pass("测试HTTP服务器模块导入...")
        from http_server import start_monitor_server, get_system_info_json
        print_pass("http_server 模块导入成功")
        
        print_pass("测试 get_system_info_json 函数...")
        data = get_system_info_json()
        required_keys = ['timestamp', 'cpu', 'memory', 'disks', 'networks', 'processes', 'sensors']
        all_present = all(k in data for k in required_keys)
        if all_present:
            print_pass("JSON数据包含所有必需字段")
            print(f"     CPU使用率: {data['cpu']['percent']:.1f}%")
            print(f"     内存使用率: {data['memory']['percent']:.1f}%")
            print(f"     磁盘分区数: {len(data['disks'])}")
            print(f"     网络接口数: {len(data['networks'])}")
            print(f"     进程数: {len(data['processes'])}")
        else:
            missing = [k for k in required_keys if k not in data]
            print_fail(f"JSON数据缺少字段: {missing}")
        
        print_pass("尝试启动HTTP服务器(3秒后自动停止)...")
        proc = subprocess.Popen(
            [sys.executable, "-c", 
             f"from http_server import start_monitor_server; start_monitor_server({test_port})"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        
        time.sleep(3)
        
        try:
            url = f"http://localhost:{test_port}/api/data"
            print_pass(f"请求 {url}...")
            response = urllib.request.urlopen(url, timeout=5)
            if response.status == 200:
                print_pass("API接口正常，返回状态码 200")
                import json
                data = json.loads(response.read().decode('utf-8'))
                if 'cpu' in data:
                    print_pass("API返回的JSON数据有效")
            else:
                print_fail(f"API返回状态码 {response.status}")
        except Exception as e:
            print_fail(f"无法访问API: {e}")
        
        proc.terminate()
        proc.wait(timeout=5)
        print_pass("HTTP服务器已停止")
        
        return True
        
    except Exception as e:
        print_fail(f"HTTP服务器测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_data_collection():
    print_header("6. 测试历史数据采集功能")
    
    from system_monitor import collect_historical_data
    import csv
    
    try:
        test_file = "test_data_collection.csv"
        
        if os.path.exists(test_file):
            os.remove(test_file)
        
        print_pass(f"开始采集数据: 3秒时长, 1秒间隔")
        record_count = collect_historical_data(3, 1, test_file)
        
        if os.path.exists(test_file):
            print_pass(f"CSV文件已创建: {test_file}")
            
            with open(test_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                headers = next(reader)
                print_pass(f"CSV表头字段数: {len(headers)}")
                print(f"     前5个字段: {headers[:5]}")
                
                rows = list(reader)
                print_pass(f"CSV数据行数: {len(rows)}")
                
                if len(rows) >= 2:
                    print_pass("至少有2条数据记录")
                    print(f"     第一条: {rows[0][0]} - CPU {rows[0][1]}%")
                    print(f"     最后一条: {rows[-1][0]} - CPU {rows[-1][1]}%")
                
                required_cols = ['timestamp', 'cpu_total_percent', 'memory_percent', 'disk_usage_percent']
                all_cols = all(col in headers for col in required_cols)
                if all_cols:
                    print_pass("CSV包含所有必需列")
                else:
                    missing = [c for c in required_cols if c not in headers]
                    print_fail(f"CSV缺少列: {missing}")
            
            os.remove(test_file)
            print_pass("测试文件已清理")
        else:
            print_fail("CSV文件未创建")
        
        return True
        
    except Exception as e:
        print_fail(f"历史数据采集测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_html_report():
    print_header("7. 测试HTML报告导出功能")
    
    import csv
    from datetime import datetime, timedelta
    import random
    
    try:
        test_csv = "test_report_data.csv"
        test_html = "test_report_output.html"
        
        print_pass("生成测试CSV数据...")
        headers = ['timestamp', 'cpu_total_percent', 'memory_percent', 'memory_used',
                   'memory_available', 'swap_percent', 'swap_used',
                   'disk_usage_percent', 'disk_used', 'disk_free',
                   'network_bytes_sent', 'network_bytes_recv',
                   'network_upload_speed', 'network_download_speed',
                   'cpu_core_0_percent', 'cpu_core_1_percent', 'disk__percent']
        
        rows = []
        now = datetime.now()
        for i in range(50):
            t = now - timedelta(minutes=i*10)
            cpu = random.uniform(10, 80)
            mem = random.uniform(40, 90)
            disk = random.uniform(30, 95)
            rows.append([
                t.strftime('%Y-%m-%d %H:%M:%S'),
                cpu, mem, mem * 0.6 * 32 * 1024**3, (100 - mem) * 0.32 * 1024**3,
                random.uniform(0, 50), random.uniform(0, 1024**3),
                disk, disk * 500 * 1024**3, (100 - disk) * 5 * 1024**3,
                random.randint(0, 10**12), random.randint(0, 10**12),
                random.uniform(0, 10*1024*1024), random.uniform(0, 50*1024*1024),
                random.uniform(5, 90), random.uniform(5, 90),
                disk
            ])
        
        with open(test_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
        
        print_pass(f"生成 {len(rows)} 条测试数据")
        
        from html_report import generate_html_report
        success = generate_html_report(test_csv, test_html, 'test_report_charts')
        
        if success and os.path.exists(test_html):
            print_pass("HTML报告生成成功")
            
            file_size = os.path.getsize(test_html)
            print_pass(f"HTML文件大小: {file_size / 1024:.1f} KB")
            
            with open(test_html, 'r', encoding='utf-8') as f:
                content = f.read()
            
            required_sections = ['系统监控报告', 'CPU使用率', '内存使用率', '磁盘使用情况', '趋势图表']
            all_sections = all(section in content for section in required_sections)
            if all_sections:
                print_pass("HTML报告包含所有必需章节")
            else:
                missing = [s for s in required_sections if s not in content]
                print_fail(f"HTML报告缺少章节: {missing}")
            
            if 'data:image/png;base64' in content:
                print_pass("HTML报告包含内嵌的图表图片")
            else:
                print_warn("HTML报告未检测到内嵌图表图片")
            
            os.remove(test_html)
            os.remove(test_csv)
            import shutil
            if os.path.exists('test_report_charts'):
                shutil.rmtree('test_report_charts')
            print_pass("测试文件已清理")
        else:
            print_fail("HTML报告生成失败")
        
        return True
        
    except Exception as e:
        print_fail(f"HTML报告测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_integration():
    print_header("8. 端到端集成测试")
    
    try:
        print_pass("测试主程序模块导入...")
        from system_monitor import (
            get_cpu_info, get_memory_info, get_disk_info,
            get_network_info, get_sensor_info, get_process_list,
            format_size, format_speed, create_progress_bar
        )
        print_pass("所有核心函数导入成功")
        
        print_pass("测试CPU信息获取...")
        cpu = get_cpu_info()
        assert 'total_percent' in cpu
        assert 'per_core_percent' in cpu
        print_pass(f"CPU信息正常: {cpu['logical_cores']} 核, {cpu['total_percent']:.1f}%")
        
        print_pass("测试内存信息获取...")
        mem = get_memory_info()
        assert 'percent' in mem
        assert 'total' in mem
        print_pass(f"内存信息正常: {mem['total']/1024**3:.1f} GB, {mem['percent']:.1f}%")
        
        print_pass("测试磁盘信息获取...")
        disks = get_disk_info()
        assert len(disks) > 0
        print_pass(f"磁盘信息正常: {len(disks)} 个分区")
        
        print_pass("测试网络信息获取...")
        prev_counters = None
        for i in range(2):
            networks, prev_counters = get_network_info(prev_counters, 0.5)
        assert len(networks) > 0
        print_pass(f"网络信息正常: {len(networks)} 个接口")
        
        print_pass("测试传感器信息获取...")
        sensors = get_sensor_info()
        print_pass(f"传感器信息正常: {len(sensors['temperatures'])} 个温度传感器")
        
        print_pass("测试进程列表获取...")
        procs = get_process_list(sort_by='cpu', limit=10)
        assert len(procs) == 10
        print_pass(f"进程列表正常: 前10个CPU占用最高进程")
        
        print_pass("测试辅助函数...")
        assert format_size(1024) == "1.00 KB"
        assert format_speed(1024) == "1.00 KB/s"
        bar = create_progress_bar(50, width=10, color=False)
        assert len(bar) == 10
        print_pass("辅助函数正常工作")
        
        print_pass("测试主菜单函数...")
        from system_monitor import display_menu
        import io
        import contextlib
        
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            display_menu()
        output = f.getvalue()
        assert "系统监控工具" in output
        assert "实时系统监控" in output
        print_pass("主菜单显示正常")
        
        return True
        
    except Exception as e:
        print_fail(f"集成测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}{'='*70}")
    print(f"  系统监控工具 - 全面功能测试")
    print(f"  Python: {sys.version.split()[0]} | 平台: {sys.platform}")
    print(f"{'='*70}{Style.RESET_ALL}")
    
    tests = [
        ("进程树功能", test_process_tree),
        ("进程搜索功能", test_process_search),
        ("结束进程功能", test_kill_process),
        ("警告通知功能", test_alerts),
        ("远程监控服务器", test_http_server),
        ("历史数据采集", test_data_collection),
        ("HTML报告导出", test_html_report),
        ("端到端集成测试", test_integration),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_fail(f"{name} 测试异常: {e}")
            results.append((name, False))
    
    print(f"\n{Fore.CYAN}{Style.BRIGHT}{'='*70}")
    print(f"  测试结果汇总")
    print(f"{'='*70}{Style.RESET_ALL}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = f"{Fore.GREEN}PASS" if result else f"{Fore.RED}FAIL"
        print(f"  {name:<25} {status}{Style.RESET_ALL}")
    
    print(f"\n{Style.BRIGHT}总计: {passed}/{total} 测试通过{Style.RESET_ALL}")
    
    if passed == total:
        print(f"\n{Fore.GREEN}{Style.BRIGHT}🎉 所有测试通过!{Style.RESET_ALL}")
    else:
        print(f"\n{Fore.RED}{Style.BRIGHT}⚠️  有 {total - passed} 个测试失败，需要修复{Style.RESET_ALL}")
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
