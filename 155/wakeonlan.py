#!/usr/bin/env python3
"""
网络唤醒工具 (Wake-on-LAN)
功能完整的命令行WOL工具，支持设备管理、批量唤醒、定时唤醒等
"""

import argparse
import json
import csv
import socket
import struct
import time
import os
import sys
import logging
import ipaddress
import subprocess
import threading
from datetime import datetime, timedelta
from pathlib import Path


CONFIG_FILE = Path.home() / ".wakeonlan_devices.json"
LOG_FILE = Path.home() / ".wakeonlan_logs.log"


def setup_logger():
    """配置日志记录器"""
    logger = logging.getLogger("wakeonlan")
    logger.setLevel(logging.INFO)
    
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.INFO)
    
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s',
                                  datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    return logger


logger = setup_logger()


class WOLManager:
    """网络唤醒核心管理器"""
    
    def __init__(self):
        self.devices = self._load_devices()
    
    def _load_devices(self):
        """从JSON文件加载设备配置"""
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"加载配置文件失败: {e}")
                return {}
        return {}
    
    def _save_devices(self):
        """保存设备配置到JSON文件"""
        try:
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.devices, f, indent=4, ensure_ascii=False)
            logger.info("设备配置已保存")
            return True
        except IOError as e:
            logger.error(f"保存配置文件失败: {e}")
            return False
    
    def _validate_mac(self, mac):
        """验证并格式化MAC地址"""
        mac = mac.upper()
        if ':' in mac:
            parts = mac.split(':')
        elif '-' in mac:
            parts = mac.split('-')
        else:
            if len(mac) == 12:
                parts = [mac[i:i+2] for i in range(0, 12, 2)]
            else:
                return None
        
        if len(parts) != 6:
            return None
        
        for part in parts:
            if len(part) != 2 or not all(c in '0123456789ABCDEF' for c in part):
                return None
        
        return ':'.join(parts)
    
    def _create_magic_packet(self, mac):
        """创建WOL魔术包"""
        mac_bytes = bytes.fromhex(mac.replace(':', ''))
        packet = b'\xff' * 6 + mac_bytes * 16
        return packet
    
    def calculate_broadcast(self, ip, subnet_mask):
        """根据IP和子网掩码计算广播地址"""
        try:
            network = ipaddress.IPv4Network(f"{ip}/{subnet_mask}", strict=False)
            return str(network.broadcast_address)
        except (ValueError, ipaddress.AddressValueError):
            return None
    
    def send_wol_packet(self, mac, ip='255.255.255.255', port=9, 
                       count=3, interval=1, subnet_mask=None, gateway=None):
        """
        发送WOL魔术包
        
        Args:
            mac: 目标MAC地址
            ip: 目标IP或广播地址
            port: 目标端口 (默认9)
            count: 发送次数
            interval: 发送间隔(秒)
            subnet_mask: 子网掩码(用于跨网段)
            gateway: 网关地址(用于跨网段)
        
        Returns:
            bool: 发送是否成功
        """
        mac_formatted = self._validate_mac(mac)
        if not mac_formatted:
            logger.error(f"无效的MAC地址: {mac}")
            return False
        
        target_ip = ip
        if subnet_mask:
            broadcast = self.calculate_broadcast(ip, subnet_mask)
            if broadcast:
                target_ip = broadcast
                logger.info(f"计算得到广播地址: {broadcast}")
            else:
                logger.warning(f"无法计算广播地址，使用原IP: {ip}")
        
        if gateway:
            logger.info(f"使用网关: {gateway}")
        
        try:
            packet = self._create_magic_packet(mac_formatted)
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            
            for i in range(count):
                sock.sendto(packet, (target_ip, port))
                logger.info(f"发送魔术包到 {mac_formatted} @ {target_ip}:{port} (第{i+1}/{count}次)")
                if i < count - 1:
                    time.sleep(interval)
            
            sock.close()
            return True
            
        except socket.error as e:
            logger.error(f"发送魔术包失败: {e}")
            return False
    
    def ping_device(self, ip, timeout=2):
        """Ping检测设备是否在线"""
        try:
            if os.name == 'nt':
                cmd = ['ping', '-n', '1', '-w', str(timeout * 1000), ip]
            else:
                cmd = ['ping', '-c', '1', '-W', str(timeout), ip]
            
            result = subprocess.run(cmd, stdout=subprocess.PIPE, 
                                  stderr=subprocess.PIPE, text=True)
            return result.returncode == 0
        except Exception as e:
            logger.error(f"Ping {ip} 失败: {e}")
            return False
    
    def get_arp_table(self):
        """获取ARP表"""
        arp_dict = {}
        try:
            if os.name == 'nt':
                result = subprocess.run(['arp', '-a'], stdout=subprocess.PIPE, text=True)
                lines = result.stdout.split('\n')
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 2:
                        ip = parts[0]
                        mac = parts[1]
                        if self._validate_mac(mac):
                            arp_dict[ip] = mac.upper()
            else:
                result = subprocess.run(['arp', '-n'], stdout=subprocess.PIPE, text=True)
                lines = result.stdout.split('\n')
                for line in lines[1:]:
                    parts = line.split()
                    if len(parts) >= 3:
                        ip = parts[0]
                        mac = parts[2]
                        if self._validate_mac(mac):
                            arp_dict[ip] = mac.upper()
        except Exception as e:
            logger.error(f"获取ARP表失败: {e}")
        
        return arp_dict
    
    def scan_network(self, network, timeout=1):
        """扫描局域网内的在线设备"""
        print(f"正在扫描网络 {network} ...")
        try:
            net = ipaddress.IPv4Network(network, strict=False)
        except ValueError as e:
            logger.error(f"无效的网络地址: {e}")
            return []
        
        online_hosts = []
        ips = [str(ip) for ip in net.hosts()]
        
        def ping_worker(ip):
            if self.ping_device(ip, timeout):
                online_hosts.append(ip)
        
        threads = []
        for ip in ips:
            t = threading.Thread(target=ping_worker, args=(ip,))
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        arp_table = self.get_arp_table()
        results = []
        for ip in sorted(online_hosts, key=lambda x: ipaddress.IPv4Address(x)):
            mac = arp_table.get(ip, '未知')
            results.append({'ip': ip, 'mac': mac})
        
        return results
    
    def add_device(self, name, mac, ip='255.255.255.255'):
        """添加设备"""
        mac_formatted = self._validate_mac(mac)
        if not mac_formatted:
            logger.error(f"无效的MAC地址: {mac}")
            return False
        
        if name in self.devices:
            logger.warning(f"设备 {name} 已存在，将被覆盖")
        
        self.devices[name] = {
            'name': name,
            'mac': mac_formatted,
            'ip': ip,
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return self._save_devices()
    
    def remove_device(self, name):
        """删除设备"""
        if name in self.devices:
            del self.devices[name]
            return self._save_devices()
        logger.warning(f"设备 {name} 不存在")
        return False
    
    def list_devices(self):
        """列出所有设备"""
        return sorted(self.devices.items(), key=lambda x: x[0])
    
    def get_device(self, name):
        """获取指定设备"""
        return self.devices.get(name)
    
    def wake_device(self, name, **kwargs):
        """按名称唤醒设备"""
        device = self.get_device(name)
        if not device:
            logger.error(f"设备 {name} 不存在")
            return False
        
        skip_online = kwargs.pop('skip_online', False)
        if skip_online and device['ip'] != '255.255.255.255':
            if self.ping_device(device['ip']):
                logger.info(f"设备 {name} ({device['ip']}) 已在线，跳过唤醒")
                print(f"[跳过] 设备 {name} 已在线")
                return True
        
        success = self.send_wol_packet(
            mac=device['mac'],
            ip=device['ip'],
            **kwargs
        )
        
        if success:
            logger.info(f"成功唤醒设备: {name} ({device['mac']})")
        else:
            logger.error(f"唤醒设备失败: {name}")
        
        return success
    
    def wake_mac(self, mac, ip='255.255.255.255', **kwargs):
        """直接通过MAC地址唤醒"""
        skip_online = kwargs.pop('skip_online', False)
        if skip_online and ip != '255.255.255.255':
            if self.ping_device(ip):
                logger.info(f"设备 ({ip}) 已在线，跳过唤醒")
                print(f"[跳过] 设备 {ip} 已在线")
                return True
        
        success = self.send_wol_packet(mac=mac, ip=ip, **kwargs)
        if success:
            logger.info(f"成功唤醒MAC: {mac}")
        return success
    
    def bulk_wake(self, names=None, all_devices=False, **kwargs):
        """批量唤醒设备"""
        if all_devices:
            names = list(self.devices.keys())
        elif not names:
            logger.error("未指定要唤醒的设备")
            return False
        
        results = {}
        for name in names:
            success = self.wake_device(name, **kwargs)
            results[name] = success
            time.sleep(0.5)
        
        return results
    
    def import_csv(self, csv_path):
        """从CSV文件导入设备"""
        if not Path(csv_path).exists():
            logger.error(f"CSV文件不存在: {csv_path}")
            return False
        
        imported = 0
        failed = 0
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row.get('name') or row.get('名称')
                    mac = row.get('mac') or row.get('MAC') or row.get('mac地址')
                    ip = row.get('ip') or row.get('IP') or row.get('ip地址') or '255.255.255.255'
                    
                    if not name or not mac:
                        logger.warning(f"跳过无效行: {row}")
                        failed += 1
                        continue
                    
                    if self.add_device(name, mac, ip):
                        imported += 1
                    else:
                        failed += 1
            
            logger.info(f"CSV导入完成: 成功{imported}个，失败{failed}个")
            return True
            
        except Exception as e:
            logger.error(f"CSV导入失败: {e}")
            return False
    
    def export_json(self, export_path):
        """导出设备配置为JSON"""
        try:
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(self.devices, f, indent=4, ensure_ascii=False)
            logger.info(f"配置已导出到: {export_path}")
            return True
        except IOError as e:
            logger.error(f"导出失败: {e}")
            return False
    
    def schedule_wake(self, name, wake_time, **kwargs):
        """定时唤醒设备"""
        try:
            if isinstance(wake_time, str):
                wake_time = datetime.strptime(wake_time, '%Y-%m-%d %H:%M:%S')
        except ValueError as e:
            logger.error(f"无效的时间格式: {e}")
            return False
        
        now = datetime.now()
        if wake_time <= now:
            logger.error("唤醒时间必须晚于当前时间")
            return False
        
        delay = (wake_time - now).total_seconds()
        logger.info(f"定时唤醒设置: {name} 将在 {wake_time} 被唤醒 (等待 {delay:.0f} 秒)")
        print(f"定时唤醒已设置: {name} 将在 {wake_time.strftime('%Y-%m-%d %H:%M:%S')} 被唤醒")
        
        def scheduled_task():
            time.sleep(delay)
            print(f"\n[定时唤醒] 正在唤醒 {name} ...")
            success = self.wake_device(name, **kwargs)
            if success:
                print(f"[定时唤醒] {name} 唤醒成功")
            else:
                print(f"[定时唤醒] {name} 唤醒失败")
        
        thread = threading.Thread(target=scheduled_task, daemon=True)
        thread.start()
        
        return True


def main():
    parser = argparse.ArgumentParser(
        description='网络唤醒工具 (Wake-on-LAN)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 直接通过MAC唤醒
  python wakeonlan.py wake --mac 00:11:22:33:44:55
  
  # 添加设备
  python wakeonlan.py add --name MyPC --mac 00:11:22:33:44:55 --ip 192.168.1.255
  
  # 列出所有设备
  python wakeonlan.py list
  
  # 按名称唤醒
  python wakeonlan.py wake --name MyPC
  
  # 批量唤醒
  python wakeonlan.py wake --names MyPC,MyServer --count 5 --interval 2
  
  # 唤醒全部
  python wakeonlan.py wake --all
  
  # 扫描局域网
  python wakeonlan.py scan --network 192.168.1.0/24
  
  # 定时唤醒
  python wakeonlan.py schedule --name MyPC --time "2026-05-30 08:00:00"
  
  # 导入CSV
  python wakeonlan.py import --file devices.csv
  
  # 导出配置
  python wakeonlan.py export --file backup.json
  
  # 跨网段唤醒
  python wakeonlan.py wake --mac 00:11:22:33:44:55 --ip 192.168.2.100 --mask 255.255.255.0
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    # wake 命令
    wake_parser = subparsers.add_parser('wake', help='唤醒设备')
    wake_parser.add_argument('--mac', help='目标MAC地址')
    wake_parser.add_argument('--name', help='设备名称')
    wake_parser.add_argument('--names', help='多个设备名称，逗号分隔')
    wake_parser.add_argument('--all', action='store_true', help='唤醒所有设备')
    wake_parser.add_argument('--ip', default='255.255.255.255', help='目标IP或广播地址')
    wake_parser.add_argument('--port', type=int, default=9, help='目标端口')
    wake_parser.add_argument('--count', type=int, default=3, help='发送次数')
    wake_parser.add_argument('--interval', type=float, default=1.0, help='发送间隔(秒)')
    wake_parser.add_argument('--mask', help='子网掩码(跨网段)')
    wake_parser.add_argument('--gateway', help='网关地址')
    wake_parser.add_argument('--skip-online', action='store_true', 
                            help='在线则跳过唤醒')
    
    # add 命令
    add_parser = subparsers.add_parser('add', help='添加设备')
    add_parser.add_argument('--name', required=True, help='设备名称')
    add_parser.add_argument('--mac', required=True, help='MAC地址')
    add_parser.add_argument('--ip', default='255.255.255.255', help='IP或广播地址')
    
    # remove 命令
    remove_parser = subparsers.add_parser('remove', help='删除设备')
    remove_parser.add_argument('--name', required=True, help='设备名称')
    
    # list 命令
    subparsers.add_parser('list', help='列出所有设备')
    
    # scan 命令
    scan_parser = subparsers.add_parser('scan', help='扫描局域网')
    scan_parser.add_argument('--network', default='192.168.1.0/24', 
                            help='网络地址 (如 192.168.1.0/24)')
    scan_parser.add_argument('--timeout', type=float, default=1.0, 
                            help='Ping超时时间(秒)')
    
    # import 命令
    import_parser = subparsers.add_parser('import', help='导入CSV')
    import_parser.add_argument('--file', required=True, help='CSV文件路径')
    
    # export 命令
    export_parser = subparsers.add_parser('export', help='导出配置')
    export_parser.add_argument('--file', required=True, help='导出文件路径')
    
    # schedule 命令
    schedule_parser = subparsers.add_parser('schedule', help='定时唤醒')
    schedule_parser.add_argument('--name', required=True, help='设备名称')
    schedule_parser.add_argument('--time', required=True, 
                                help='唤醒时间 (格式: YYYY-MM-DD HH:MM:SS)')
    schedule_parser.add_argument('--count', type=int, default=3, help='发送次数')
    schedule_parser.add_argument('--interval', type=float, default=1.0, help='发送间隔')
    schedule_parser.add_argument('--skip-online', action='store_true', 
                                help='在线则跳过')
    
    # logs 命令
    logs_parser = subparsers.add_parser('logs', help='查看日志')
    logs_parser.add_argument('--lines', type=int, default=20, help='显示最近N行')
    
    args = parser.parse_args()
    
    wol = WOLManager()
    
    if args.command == 'wake':
        kwargs = {
            'port': args.port,
            'count': args.count,
            'interval': args.interval,
            'subnet_mask': args.mask,
            'gateway': args.gateway,
            'skip_online': args.skip_online
        }
        
        if args.mac:
            print(f"正在唤醒 {args.mac} @ {args.ip} ...")
            success = wol.wake_mac(args.mac, args.ip, **kwargs)
            print("成功" if success else "失败")
        
        elif args.name:
            print(f"正在唤醒 {args.name} ...")
            success = wol.wake_device(args.name, **kwargs)
            print("成功" if success else "失败")
        
        elif args.names:
            names = [n.strip() for n in args.names.split(',')]
            print(f"正在批量唤醒: {names}")
            results = wol.bulk_wake(names, **kwargs)
            for name, success in results.items():
                print(f"  {name}: {'成功' if success else '失败'}")
        
        elif args.all:
            print("正在唤醒所有设备...")
            results = wol.bulk_wake(all_devices=True, **kwargs)
            for name, success in results.items():
                print(f"  {name}: {'成功' if success else '失败'}")
        
        else:
            print("错误: 必须指定 --mac, --name, --names 或 --all")
            sys.exit(1)
    
    elif args.command == 'add':
        print(f"添加设备: {args.name}")
        success = wol.add_device(args.name, args.mac, args.ip)
        if success:
            print("成功")
        else:
            print("失败")
    
    elif args.command == 'remove':
        print(f"删除设备: {args.name}")
        success = wol.remove_device(args.name)
        if success:
            print("成功")
        else:
            print("失败")
    
    elif args.command == 'list':
        devices = wol.list_devices()
        if not devices:
            print("暂无保存的设备")
        else:
            print(f"{'名称':<20} {'MAC地址':<20} {'IP地址':<20} {'创建时间'}")
            print("-" * 80)
            for name, info in devices:
                created = info.get('created_at', '-')
                print(f"{name:<20} {info['mac']:<20} {info['ip']:<20} {created}")
    
    elif args.command == 'scan':
        results = wol.scan_network(args.network, args.timeout)
        if not results:
            print("未发现在线设备")
        else:
            print(f"发现 {len(results)} 个在线设备:")
            print(f"{'IP地址':<20} {'MAC地址'}")
            print("-" * 50)
            for r in results:
                print(f"{r['ip']:<20} {r['mac']}")
    
    elif args.command == 'import':
        print(f"导入设备从 {args.file} ...")
        success = wol.import_csv(args.file)
        print("成功" if success else "失败")
    
    elif args.command == 'export':
        print(f"导出配置到 {args.file} ...")
        success = wol.export_json(args.file)
        print("成功" if success else "失败")
    
    elif args.command == 'schedule':
        kwargs = {
            'count': args.count,
            'interval': args.interval,
            'skip_online': args.skip_online
        }
        success = wol.schedule_wake(args.name, args.time, **kwargs)
        if not success:
            print("设置定时唤醒失败")
        else:
            print("程序继续运行中，按 Ctrl+C 退出...")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n已退出")
    
    elif args.command == 'logs':
        if LOG_FILE.exists():
            with open(LOG_FILE, 'r') as f:
                lines = f.readlines()
                for line in lines[-args.lines:]:
                    print(line, end='')
        else:
            print("暂无日志")


if __name__ == '__main__':
    main()
