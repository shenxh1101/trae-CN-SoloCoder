#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import base64
import platform
from datetime import datetime

try:
    from visualizer import generate_trend_charts, generate_summary_statistics
except ImportError:
    generate_trend_charts = None
    generate_summary_statistics = None


def image_to_base64(image_path):
    if not os.path.exists(image_path):
        return None
    try:
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception:
        return None


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


def get_current_system_info():
    import psutil
    
    cpu_count = psutil.cpu_count(logical=False)
    cpu_count_logical = psutil.cpu_count(logical=True)
    cpu_percent = psutil.cpu_percent(interval=0.5)
    cpu_freq = psutil.cpu_freq()
    
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    disks = []
    for partition in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            disks.append({
                'mountpoint': partition.mountpoint,
                'fstype': partition.fstype,
                'total': usage.total,
                'used': usage.used,
                'free': usage.free,
                'percent': usage.percent
            })
        except (PermissionError, OSError):
            continue
    
    sensors = {'temperatures': {}, 'fans': {}, 'battery': None}
    try:
        temps = psutil.sensors_temperatures()
        for name, entries in temps.items():
            sensors['temperatures'][name] = []
            for entry in entries:
                sensors['temperatures'][name].append({
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
                'power_plugged': battery.power_plugged
            }
    except Exception:
        pass
    
    return {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'system': {
            'hostname': platform.node(),
            'platform': platform.system(),
            'platform_version': platform.release(),
            'python_version': platform.python_version(),
            'architecture': platform.machine(),
            'uptime': int(datetime.now().timestamp() - psutil.boot_time())
        },
        'cpu': {
            'physical_cores': cpu_count,
            'logical_cores': cpu_count_logical,
            'percent': cpu_percent,
            'freq_current': cpu_freq.current if cpu_freq else 0,
            'freq_max': cpu_freq.max if cpu_freq else 0
        },
        'memory': {
            'total': mem.total,
            'used': mem.used,
            'available': mem.available,
            'percent': mem.percent,
            'swap_total': swap.total,
            'swap_used': swap.used,
            'swap_percent': swap.percent
        },
        'disks': disks,
        'sensors': sensors
    }


def generate_html_report(csv_file, output_file, chart_dir='charts'):
    print(f"\n{'='*60}")
    print("📄 生成HTML系统报告")
    print(f"{'='*60}\n")
    
    if generate_trend_charts:
        print("📊 生成图表...")
        chart_files = generate_trend_charts(csv_file, chart_dir)
    else:
        chart_files = []
        print("⚠️  visualizer模块不可用，跳过图表生成")
    
    summary_stats = None
    if generate_summary_statistics:
        print("📋 计算统计数据...")
        summary_stats = generate_summary_statistics(csv_file)
    
    print("💻 获取当前系统信息...")
    current_info = get_current_system_info()
    
    print("🏗️  构建HTML报告...")
    
    chart_images = {}
    if chart_files:
        for f in chart_files:
            name = os.path.basename(f)
            b64 = image_to_base64(f)
            if b64:
                chart_images[name] = b64
    
    uptime_seconds = current_info['system']['uptime']
    uptime_days = uptime_seconds // 86400
    uptime_hours = (uptime_seconds % 86400) // 3600
    uptime_minutes = (uptime_seconds % 3600) // 60
    uptime_str = f"{uptime_days}天 {uptime_hours}小时 {uptime_minutes}分钟"
    
    def get_status_color(value, thresholds=None):
        if thresholds is None:
            thresholds = [70, 90]
        if value >= thresholds[1]:
            return '#ef4444'
        elif value >= thresholds[0]:
            return '#f59e0b'
        return '#22c55e'
    
    def get_progress_bar(percent, color=None):
        if color is None:
            color = get_status_color(percent)
        return f'''
            <div style="width: 100%; height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden;">
                <div style="width: {min(percent, 100)}%; height: 100%; background: {color}; border-radius: 10px; 
                     transition: width 0.3s ease;"></div>
            </div>
        '''
    
    html = f'''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>系统监控报告 - {current_info['system']['hostname']}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #1f2937;
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        .header {{
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}
        .header h1 {{
            color: #6366f1;
            font-size: 32px;
            margin-bottom: 10px;
        }}
        .header .subtitle {{
            color: #6b7280;
            font-size: 16px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}
        .card {{
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }}
        .card h2 {{
            color: #4f46e5;
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e7ff;
        }}
        .card h3 {{
            color: #6366f1;
            font-size: 16px;
            margin: 15px 0 10px 0;
        }}
        .stat-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
        }}
        .stat-row:last-child {{
            border-bottom: none;
        }}
        .stat-label {{
            color: #6b7280;
            font-weight: 500;
        }}
        .stat-value {{
            font-weight: 600;
            color: #1f2937;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
        }}
        .badge-green {{ background: #dcfce7; color: #166534; }}
        .badge-yellow {{ background: #fef3c7; color: #92400e; }}
        .badge-red {{ background: #fee2e2; color: #991b1b; }}
        .badge-blue {{ background: #dbeafe; color: #1e40af; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }}
        th, td {{
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
        }}
        th {{
            color: #4f46e5;
            font-weight: 600;
            background: #f5f3ff;
        }}
        tr:hover {{
            background: #fafafa;
        }}
        .chart-container {{
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }}
        .chart-container h2 {{
            color: #4f46e5;
            font-size: 20px;
            margin-bottom: 20px;
        }}
        .chart-container img {{
            width: 100%;
            height: auto;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
        .chart-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }}
        .highlight-warning {{
            background: #fef3c7 !important;
        }}
        .highlight-danger {{
            background: #fee2e2 !important;
        }}
        .footer {{
            text-align: center;
            color: white;
            padding: 20px;
            font-size: 14px;
            opacity: 0.9;
        }}
        .timestamp {{
            color: #9ca3af;
            font-size: 14px;
            margin-top: 5px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖥️  系统监控报告</h1>
            <p class="subtitle">主机: {current_info['system']['hostname']} | 报告生成时间: {current_info['timestamp']}</p>
            <p class="timestamp">
                系统: {current_info['system']['platform']} {current_info['system']['platform_version']} | 
                架构: {current_info['system']['architecture']} | 
                运行时间: {uptime_str}
            </p>
        </div>
'''
    
    if summary_stats:
        html += f'''
        <div class="card">
            <h2>📊 历史数据统计 (过去24小时)</h2>
            <div class="grid">
        '''
        
        if 'cpu' in summary_stats:
            cpu = summary_stats['cpu']
            cpu_color = get_status_color(cpu['avg'])
            html += f'''
                <div>
                    <h3>💻 CPU使用率</h3>
                    <div class="stat-row"><span class="stat-label">平均值</span><span class="stat-value" style="color: {cpu_color}">{cpu['avg']:.1f}%</span></div>
                    <div class="stat-row"><span class="stat-label">最大值</span><span class="stat-value">{cpu['max']:.1f}%</span></div>
                    <div class="stat-row"><span class="stat-label">最小值</span><span class="stat-value">{cpu['min']:.1f}%</span></div>
                    {get_progress_bar(cpu['avg'], cpu_color)}
                </div>
            '''
        
        if 'memory' in summary_stats:
            mem = summary_stats['memory']
            mem_color = get_status_color(mem['avg'])
            html += f'''
                <div>
                    <h3>🧠 内存使用率</h3>
                    <div class="stat-row"><span class="stat-label">平均值</span><span class="stat-value" style="color: {mem_color}">{mem['avg']:.1f}%</span></div>
                    <div class="stat-row"><span class="stat-label">最大值</span><span class="stat-value">{mem['max']:.1f}%</span></div>
                    <div class="stat-row"><span class="stat-label">最小值</span><span class="stat-value">{mem['min']:.1f}%</span></div>
                    {get_progress_bar(mem['avg'], mem_color)}
                </div>
            '''
        
        if 'network' in summary_stats:
            net = summary_stats['network']
            html += f'''
                <div>
                    <h3>🌐 网络流量</h3>
                    <div class="stat-row"><span class="stat-label">平均下载</span><span class="stat-value">{format_speed(net['avg_download'])}</span></div>
                    <div class="stat-row"><span class="stat-label">峰值下载</span><span class="stat-value">{format_speed(net['max_download'])}</span></div>
                    <div class="stat-row"><span class="stat-label">平均上传</span><span class="stat-value">{format_speed(net['avg_upload'])}</span></div>
                    <div class="stat-row"><span class="stat-label">峰值上传</span><span class="stat-value">{format_speed(net['max_upload'])}</span></div>
                </div>
            '''
        
        if 'disks' in summary_stats and summary_stats['disks']:
            html += '<div><h3>💾 磁盘使用率</h3>'
            for mount, disk_stat in summary_stats['disks'].items():
                disk_color = get_status_color(disk_stat['avg'])
                html += f'''
                    <div style="margin-bottom: 10px;">
                        <div class="stat-row">
                            <span class="stat-label">{mount}</span>
                            <span class="stat-value" style="color: {disk_color}">{disk_stat['avg']:.1f}%</span>
                        </div>
                        {get_progress_bar(disk_stat['avg'], disk_color)}
                    </div>
                '''
            html += '</div>'
        
        html += '''
            </div>
        </div>
        '''
    
    html += f'''
        <div class="grid">
            <div class="card">
                <h2>💻 当前CPU状态</h2>
                <div class="stat-row">
                    <span class="stat-label">物理核心</span>
                    <span class="stat-value">{current_info['cpu']['physical_cores']} 核</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">逻辑核心</span>
                    <span class="stat-value">{current_info['cpu']['logical_cores']} 核</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">当前频率</span>
                    <span class="stat-value">{current_info['cpu']['freq_current']:.2f} MHz</span>
                </div>
                <div style="margin-top: 15px;">
                    <div class="stat-row">
                        <span class="stat-label">当前使用率</span>
                        <span class="badge badge-{('red' if current_info['cpu']['percent'] >= 90 else ('yellow' if current_info['cpu']['percent'] >= 70 else 'green'))}">
                            {current_info['cpu']['percent']:.1f}%
                        </span>
                    </div>
                    {get_progress_bar(current_info['cpu']['percent'])}
                </div>
            </div>
            
            <div class="card">
                <h2>🧠 当前内存状态</h2>
                <div class="stat-row">
                    <span class="stat-label">总内存</span>
                    <span class="stat-value">{format_size(current_info['memory']['total'])}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">已使用</span>
                    <span class="stat-value">{format_size(current_info['memory']['used'])}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">可用</span>
                    <span class="stat-value">{format_size(current_info['memory']['available'])}</span>
                </div>
                <div style="margin-top: 15px;">
                    <div class="stat-row">
                        <span class="stat-label">使用率</span>
                        <span class="badge badge-{('red' if current_info['memory']['percent'] >= 90 else ('yellow' if current_info['memory']['percent'] >= 70 else 'green'))}">
                            {current_info['memory']['percent']:.1f}%
                        </span>
                    </div>
                    {get_progress_bar(current_info['memory']['percent'])}
                </div>
                {f'''
                <div style="margin-top: 15px;">
                    <h3>交换分区</h3>
                    <div class="stat-row">
                        <span class="stat-label">总大小</span>
                        <span class="stat-value">{format_size(current_info['memory']['swap_total'])}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">使用率</span>
                        <span class="stat-value">{current_info['memory']['swap_percent']:.1f}%</span>
                    </div>
                    {get_progress_bar(current_info['memory']['swap_percent'])}
                </div>
                ''' if current_info['memory']['swap_total'] > 0 else ''}
            </div>
        </div>
        
        <div class="card">
            <h2>💾 磁盘使用情况</h2>
            <table>
                <thead>
                    <tr>
                        <th>挂载点</th>
                        <th>文件系统</th>
                        <th>总容量</th>
                        <th>已用</th>
                        <th>可用</th>
                        <th>使用率</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
    '''
    
    for disk in current_info['disks']:
        row_class = ''
        badge_class = 'badge-green'
        if disk['percent'] >= 90:
            row_class = 'highlight-danger'
            badge_class = 'badge-red'
        elif disk['percent'] >= 80:
            row_class = 'highlight-warning'
            badge_class = 'badge-yellow'
        
        html += f'''
                    <tr class="{row_class}">
                        <td>{disk['mountpoint']}</td>
                        <td>{disk['fstype']}</td>
                        <td>{format_size(disk['total'])}</td>
                        <td>{format_size(disk['used'])}</td>
                        <td>{format_size(disk['free'])}</td>
                        <td>{disk['percent']:.1f}%</td>
                        <td><span class="badge {badge_class}">{disk['percent']:.1f}%</span></td>
                    </tr>
        '''
    
    html += '''
                </tbody>
            </table>
        </div>
    '''
    
    sensors = current_info['sensors']
    if sensors['temperatures'] or sensors['battery'] or sensors['fans']:
        html += '''
        <div class="card">
            <h2>🌡️  传感器信息</h2>
            <div class="grid">
        '''
        
        if sensors['temperatures']:
            html += '<div><h3>温度传感器</h3>'
            for name, entries in sensors['temperatures'].items():
                for entry in entries:
                    temp = entry['current']
                    temp_color = get_status_color(temp, [70, 80])
                    temp_badge = 'badge-red' if temp >= 80 else ('badge-yellow' if temp >= 60 else 'badge-green')
                    html += f'''
                        <div class="stat-row">
                            <span class="stat-label">{entry['label']}</span>
                            <span class="badge {temp_badge}">{temp:.1f}°C</span>
                        </div>
                    '''
            html += '</div>'
        
        if sensors['battery']:
            batt = sensors['battery']
            batt_color = get_status_color(batt['percent'], [30, 20])
            batt_badge = 'badge-red' if batt['percent'] <= 20 else ('badge-yellow' if batt['percent'] <= 30 else 'badge-green')
            plug_status = '⚡ 充电中' if batt['power_plugged'] else '🔋 使用电池'
            
            html += f'''
                <div>
                    <h3>电池信息</h3>
                    <div class="stat-row">
                        <span class="stat-label">状态</span>
                        <span class="badge {'badge-green' if batt['power_plugged'] else 'badge-yellow'}">{plug_status}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">电量</span>
                        <span class="badge {batt_badge}">{batt['percent']:.1f}%</span>
                    </div>
                    {get_progress_bar(batt['percent'], batt_color)}
                </div>
            '''
        
        html += '''
            </div>
        </div>
        '''
    
    if chart_images:
        html += f'''
        <div class="chart-container">
            <h2>📈 趋势图表 (过去24小时)</h2>
        '''
        
        if 'overview_trends.png' in chart_images:
            html += f'''
            <img src="data:image/png;base64,{chart_images['overview_trends.png']}" alt="系统资源总览">
            '''
        
        html += '<div class="chart-grid">'
        
        for name, b64 in chart_images.items():
            if name == 'overview_trends.png':
                continue
            html += f'''
                <img src="data:image/png;base64,{b64}" alt="{name}">
            '''
        
        html += '''
            </div>
        </div>
        '''
    
    html += f'''
        <div class="footer">
            <p>📋 系统监控报告 v1.0 | 生成时间: {current_info['timestamp']}</p>
            <p>Python {current_info['system']['python_version']} | psutil</p>
        </div>
    </div>
</body>
</html>
    '''
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"\n{'='*60}")
        print(f"✅ HTML报告生成完成!")
        print(f"📄 输出文件: {os.path.abspath(output_file)}")
        print(f"{'='*60}\n")
        
        return True
    except Exception as e:
        print(f"❌ 生成HTML报告失败: {e}")
        return False


if __name__ == '__main__':
    import sys
    csv_file = sys.argv[1] if len(sys.argv) > 1 else 'system_monitor_log.csv'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'system_report.html'
    generate_html_report(csv_file, output_file)
