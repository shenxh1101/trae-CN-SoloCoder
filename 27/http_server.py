#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import socket
import platform
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

import psutil


def get_system_info_json():
    cpu_count = psutil.cpu_count(logical=False)
    cpu_count_logical = psutil.cpu_count(logical=True)
    cpu_percent = psutil.cpu_percent(interval=0.5)
    cpu_percent_per_core = psutil.cpu_percent(interval=0.5, percpu=True)
    cpu_freq = psutil.cpu_freq()
    
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
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
    
    if_addrs = psutil.net_if_addrs()
    if_stats = psutil.net_if_stats()
    net_counters = psutil.net_io_counters(pernic=True)
    
    networks = []
    for iface, addrs in if_addrs.items():
        ip_address = None
        mac_address = None
        for addr in addrs:
            if addr.family == 2:
                ip_address = addr.address
            elif addr.family == 17:
                mac_address = addr.address
        
        counters = net_counters.get(iface)
        if counters:
            networks.append({
                'interface': iface,
                'ip': ip_address,
                'mac': mac_address,
                'bytes_sent': counters.bytes_sent,
                'bytes_recv': counters.bytes_recv,
                'packets_sent': counters.packets_sent,
                'packets_recv': counters.packets_recv,
                'is_up': if_stats[iface].isup if iface in if_stats else False
            })
    
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
    
    processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
    top_processes = processes[:15]
    
    sensors = {'temperatures': {}, 'fans': {}, 'battery': None}
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
    
    return {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'cpu': {
            'physical_cores': cpu_count,
            'logical_cores': cpu_count_logical,
            'percent': cpu_percent,
            'per_core_percent': cpu_percent_per_core,
            'freq_current': cpu_freq.current if cpu_freq else 0,
            'freq_max': cpu_freq.max if cpu_freq else 0
        },
        'memory': {
            'total': mem.total,
            'available': mem.available,
            'used': mem.used,
            'free': mem.free,
            'percent': mem.percent,
            'swap_total': swap.total,
            'swap_used': swap.used,
            'swap_percent': swap.percent
        },
        'disks': disks,
        'networks': networks,
        'processes': top_processes,
        'sensors': sensors,
        'system': {
            'hostname': socket.gethostname(),
            'platform': platform.system(),
            'kernel_version': platform.release(),
            'uptime': int(datetime.now().timestamp() - psutil.boot_time())
        }
    }


HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>系统监控 - 远程监控</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e4e4e7;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .header h1 { color: #60a5fa; margin-bottom: 10px; }
        .update-time { color: #9ca3af; font-size: 14px; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }
        .card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .card h2 {
            color: #60a5fa;
            margin-bottom: 15px;
            font-size: 18px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            overflow: hidden;
            margin: 5px 0;
        }
        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 10px;
        }
        .progress-green { background: linear-gradient(90deg, #22c55e, #4ade80); }
        .progress-yellow { background: linear-gradient(90deg, #eab308, #facc15); }
        .progress-red { background: linear-gradient(90deg, #ef4444, #f87171); }
        .progress-blue { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .stat-label { color: #9ca3af; }
        .stat-value { font-weight: 600; }
        .core-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        .core-item {
            background: rgba(255, 255, 255, 0.03);
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
        }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        th { color: #60a5fa; font-weight: 600; }
        tr:hover { background: rgba(255, 255, 255, 0.05); }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .badge-yellow { background: rgba(234, 179, 8, 0.2); color: #facc15; }
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #3b82f6, #60a5fa);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 50px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
            transition: transform 0.2s;
        }
        .refresh-btn:hover { transform: scale(1.05); }
        .warning-highlight {
            background: rgba(239, 68, 68, 0.2) !important;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖥️  系统监控面板</h1>
            <p class="update-time">最后更新: <span id="updateTime">--</span></p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h2>💻 CPU 信息</h2>
                <div id="cpuInfo"></div>
            </div>
            
            <div class="card">
                <h2>🧠 内存信息</h2>
                <div id="memoryInfo"></div>
            </div>
            
            <div class="card">
                <h2>💾 磁盘信息</h2>
                <div id="diskInfo"></div>
            </div>
            
            <div class="card">
                <h2>🌐 网络信息</h2>
                <div id="networkInfo"></div>
            </div>
            
            <div class="card">
                <h2>🌡️  传感器信息</h2>
                <div id="sensorInfo"></div>
            </div>
            
            <div class="card">
                <h2>⚡ 进程列表 (Top 15)</h2>
                <div id="processInfo"></div>
            </div>
        </div>
    </div>
    
    <button class="refresh-btn" onclick="refreshData()">🔄 刷新数据</button>
    
    <script>
        function formatSize(bytes) {
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let size = bytes;
            for (let unit of units) {
                if (size < 1024) return size.toFixed(2) + ' ' + unit;
                size /= 1024;
            }
            return size.toFixed(2) + ' PB';
        }
        
        function getProgressClass(percent) {
            if (percent >= 90) return 'progress-red';
            if (percent >= 70) return 'progress-yellow';
            if (percent >= 50) return 'progress-blue';
            return 'progress-green';
        }
        
        function getBadgeClass(percent) {
            if (percent >= 90) return 'badge-red';
            if (percent >= 70) return 'badge-yellow';
            return 'badge-green';
        }
        
        function renderCpu(data) {
            let html = `
                <div class="stat-row">
                    <span class="stat-label">物理核心</span>
                    <span class="stat-value">${data.physical_cores} 核</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">逻辑核心</span>
                    <span class="stat-value">${data.logical_cores} 核</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">当前频率</span>
                    <span class="stat-value">${data.freq_current.toFixed(2)} MHz</span>
                </div>
                <div style="margin-top: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>总使用率</span>
                        <span class="badge ${getBadgeClass(data.percent)}">${data.percent.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getProgressClass(data.percent)}" style="width: ${data.percent}%"></div>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <strong>各核心使用率:</strong>
                    <div class="core-grid">
                        ${data.per_core_percent.map((p, i) => `
                            <div class="core-item">
                                <div style="display: flex; justify-content: space-between;">
                                    <span>Core ${i}</span>
                                    <span>${p.toFixed(1)}%</span>
                                </div>
                                <div class="progress-bar" style="height: 8px; margin-top: 5px;">
                                    <div class="progress-fill ${getProgressClass(p)}" style="width: ${p}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            document.getElementById('cpuInfo').innerHTML = html;
        }
        
        function renderMemory(data) {
            let html = `
                <div class="stat-row">
                    <span class="stat-label">总内存</span>
                    <span class="stat-value">${formatSize(data.total)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">已用内存</span>
                    <span class="stat-value">${formatSize(data.used)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">可用内存</span>
                    <span class="stat-value">${formatSize(data.available)}</span>
                </div>
                <div style="margin-top: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>内存使用率</span>
                        <span class="badge ${getBadgeClass(data.percent)}">${data.percent.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getProgressClass(data.percent)}" style="width: ${data.percent}%"></div>
                    </div>
                </div>
                ${data.swap_total > 0 ? `
                <div style="margin-top: 15px;">
                    <strong>交换分区:</strong>
                    <div class="stat-row">
                        <span class="stat-label">总大小</span>
                        <span class="stat-value">${formatSize(data.swap_total)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>使用率</span>
                        <span class="badge ${getBadgeClass(data.swap_percent)}">${data.swap_percent.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getProgressClass(data.swap_percent)}" style="width: ${data.swap_percent}%"></div>
                    </div>
                </div>
                ` : ''}
            `;
            document.getElementById('memoryInfo').innerHTML = html;
        }
        
        function renderDisk(disks) {
            let html = '<table><thead><tr><th>挂载点</th><th>类型</th><th>总容量</th><th>使用率</th></tr></thead><tbody>';
            for (let disk of disks) {
                const warningClass = disk.percent >= 90 ? 'warning-highlight' : '';
                html += `
                    <tr class="${warningClass}">
                        <td>${disk.mountpoint}</td>
                        <td>${disk.fstype}</td>
                        <td>${formatSize(disk.total)}</td>
                        <td>
                            <span class="badge ${getBadgeClass(disk.percent)}">${disk.percent.toFixed(1)}%</span>
                        </td>
                    </tr>
                `;
            }
            html += '</tbody></table>';
            
            html += '<div style="margin-top: 15px;">';
            for (let disk of disks) {
                html += `
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px;">
                            <span>${disk.mountpoint}</span>
                            <span>${formatSize(disk.used)} / ${formatSize(disk.total)}</span>
                        </div>
                        <div class="progress-bar" style="height: 12px;">
                            <div class="progress-fill ${getProgressClass(disk.percent)}" style="width: ${disk.percent}%"></div>
                        </div>
                    </div>
                `;
            }
            html += '</div>';
            
            document.getElementById('diskInfo').innerHTML = html;
        }
        
        function renderNetwork(networks) {
            let html = '';
            for (let net of networks) {
                const statusBadge = net.is_up ? 
                    '<span class="badge badge-green">● 运行中</span>' : 
                    '<span class="badge badge-red">● 已停止</span>';
                
                html += `
                    <div style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong>${net.interface}</strong>
                            ${statusBadge}
                        </div>
                        ${net.ip ? `<div class="stat-row"><span class="stat-label">IP地址</span><span class="stat-value">${net.ip}</span></div>` : ''}
                        ${net.mac ? `<div class="stat-row"><span class="stat-label">MAC地址</span><span class="stat-value" style="font-family: monospace;">${net.mac}</span></div>` : ''}
                        <div class="stat-row">
                            <span class="stat-label">↑ 发送</span>
                            <span class="stat-value">${formatSize(net.bytes_sent)} (${net.packets_sent.toLocaleString()} 包)</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">↓ 接收</span>
                            <span class="stat-value">${formatSize(net.bytes_recv)} (${net.packets_recv.toLocaleString()} 包)</span>
                        </div>
                    </div>
                `;
            }
            document.getElementById('networkInfo').innerHTML = html;
        }
        
        function renderSensors(sensors) {
            let html = '';
            
            if (Object.keys(sensors.temperatures).length > 0) {
                html += '<div style="margin-bottom: 15px;"><strong>🌡️ 温度传感器:</strong><div style="margin-top: 10px;">';
                for (let name in sensors.temperatures) {
                    for (let entry of sensors.temperatures[name]) {
                        const temp = entry.current;
                        let tempClass = 'badge-green';
                        if (temp >= 80) tempClass = 'badge-red';
                        else if (temp >= 60) tempClass = 'badge-yellow';
                        
                        html += `
                            <div class="stat-row">
                                <span class="stat-label">${entry.label}</span>
                                <span class="badge ${tempClass}">${temp.toFixed(1)}°C</span>
                            </div>
                        `;
                    }
                }
                html += '</div></div>';
            }
            
            if (Object.keys(sensors.fans).length > 0) {
                html += '<div style="margin-bottom: 15px;"><strong>🌀 风扇转速:</strong><div style="margin-top: 10px;">';
                for (let name in sensors.fans) {
                    for (let entry of sensors.fans[name]) {
                        html += `
                            <div class="stat-row">
                                <span class="stat-label">${entry.label}</span>
                                <span class="stat-value">${entry.current.toFixed(0)} RPM</span>
                            </div>
                        `;
                    }
                }
                html += '</div></div>';
            }
            
            if (sensors.battery) {
                const batt = sensors.battery;
                const plugStatus = batt.power_plugged ? 
                    '<span class="badge badge-green">⚡ 充电中</span>' : 
                    '<span class="badge badge-yellow">🔋 使用电池</span>';
                
                html += `
                    <div>
                        <strong>🔋 电池信息:</strong> ${plugStatus}
                        <div style="margin-top: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>电量</span>
                                <span class="badge ${getBadgeClass(batt.percent)}">${batt.percent.toFixed(1)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${getProgressClass(batt.percent)}" style="width: ${batt.percent}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            if (!html) {
                html = '<p style="color: #9ca3af;">未检测到传感器信息</p>';
            }
            
            document.getElementById('sensorInfo').innerHTML = html;
        }
        
        function renderProcesses(processes) {
            let html = '<table><thead><tr><th>PID</th><th>名称</th><th>CPU%</th><th>内存%</th></tr></thead><tbody>';
            for (let proc of processes) {
                const cpuClass = proc.cpu_percent > 50 ? 'badge-red' : (proc.cpu_percent > 20 ? 'badge-yellow' : 'badge-green');
                const memClass = proc.memory_percent > 20 ? 'badge-red' : (proc.memory_percent > 10 ? 'badge-yellow' : 'badge-green');
                
                html += `
                    <tr>
                        <td>${proc.pid}</td>
                        <td>${proc.name.substring(0, 20)}</td>
                        <td><span class="badge ${cpuClass}">${proc.cpu_percent.toFixed(1)}%</span></td>
                        <td><span class="badge ${memClass}">${proc.memory_percent.toFixed(1)}%</span></td>
                    </tr>
                `;
            }
            html += '</tbody></table>';
            document.getElementById('processInfo').innerHTML = html;
        }
        
        function refreshData() {
            fetch('/api/data')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('updateTime').textContent = data.timestamp;
                    renderCpu(data.cpu);
                    renderMemory(data.memory);
                    renderDisk(data.disks);
                    renderNetwork(data.networks);
                    renderSensors(data.sensors);
                    renderProcesses(data.processes);
                })
                .catch(error => console.error('获取数据失败:', error));
        }
        
        refreshData();
        setInterval(refreshData, 3000);
    </script>
</body>
</html>
"""


class MonitorHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode('utf-8'))
        elif self.path == '/api/data':
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            data = get_system_info_json()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass


def start_monitor_server(port=5000):
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        
        print(f"{Fore.GREEN}服务器已启动!{Style.RESET_ALL}")
        print(f"本地访问: http://localhost:{port}")
        print(f"局域网访问: http://{local_ip}:{port}")
        print(f"按 Ctrl+C 停止服务器\n")
        
        server = HTTPServer(('0.0.0.0', port), MonitorHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n正在关闭服务器...")
        server.shutdown()
        raise
    except Exception as e:
        print(f"启动服务器失败: {e}")
        raise


if __name__ == '__main__':
    from colorama import init, Fore, Style
    init(autoreset=True)
    start_monitor_server(5000)
