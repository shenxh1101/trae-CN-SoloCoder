#!/usr/bin/env python3

import argparse
import csv
import ipaddress
import json
import os
import platform
import socket
import struct
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from html import escape

COMMON_SERVICES = {
    20: "FTP-Data", 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
    53: "DNS", 67: "DHCP-Server", 68: "DHCP-Client", 69: "TFTP", 80: "HTTP",
    110: "POP3", 111: "RPCBind", 119: "NNTP", 123: "NTP", 135: "MSRPC",
    137: "NetBIOS-NS", 138: "NetBIOS-DGM", 139: "NetBIOS-SSN", 143: "IMAP",
    161: "SNMP", 162: "SNMP-Trap", 179: "BGP", 194: "IRC", 389: "LDAP",
    443: "HTTPS", 445: "SMB", 465: "SMTPS", 514: "Syslog", 515: "LPD",
    520: "RIP", 523: "IBM-DB2", 530: "RPC", 543: "Klogin", 544: "Kshell",
    548: "AFP", 554: "RTSP", 587: "SMTP-Submit", 631: "IPP", 636: "LDAPS",
    873: "Rsync", 902: "VMware-Auth", 993: "IMAPS", 995: "POP3S",
    1080: "SOCKS", 1433: "MSSQL", 1434: "MSSQL-UDP", 1521: "Oracle-DB",
    1723: "PPTP", 2049: "NFS", 2082: "cPanel", 2083: "cPanel-SSL",
    2181: "ZooKeeper", 2222: "SSH-Alt", 2375: "Docker", 2376: "Docker-TLS",
    3306: "MySQL", 3389: "RDP", 3690: "SVN", 4369: "EPMD", 5432: "PostgreSQL",
    5672: "AMQP", 5900: "VNC", 5984: "CouchDB", 6379: "Redis", 6443: "K8s-API",
    7001: "WebLogic", 8000: "HTTP-Alt", 8080: "HTTP-Proxy", 8443: "HTTPS-Alt",
    8888: "HTTP-Alt2", 9090: "Prometheus", 9200: "Elasticsearch", 9300: "ES-Transport",
    11211: "Memcached", 15672: "RabbitMQ-Mgmt", 27017: "MongoDB", 27018: "MongoDB",
    27019: "MongoDB", 28017: "MongoDB-Web", 50000: "SAP"
}

PORT_CVES = {
    21: [("CVE-2021-3629", "vsftpd 2.3.4 后门漏洞，允许攻击者获取root shell"),
         ("CVE-2020-35448", "ProFTPD SQL注入漏洞，可导致远程代码执行")],
    22: [("CVE-2023-38408", "OpenSSH ssh-agent 信号处理缺陷导致远程代码执行"),
         ("CVE-2020-15778", "OpenSSH scp命令注入漏洞")],
    23: [("CVE-2022-40898", "Telnet服务缓冲区溢出漏洞"),
         ("CVE-2020-11939", "Telnet凭据泄露漏洞")],
    25: [("CVE-2020-28025", "Exim邮件服务器越界写入漏洞"),
         ("CVE-2019-15846", "Exim TLS握手中使用未初始化值导致RCE")],
    53: [("CVE-2023-2828", "BIND 9 DNS服务器远程代码执行漏洞"),
         ("CVE-2020-8617", "BIND 9 DNS TSIG处理漏洞导致DoS")],
    80: [("CVE-2021-41773", "Apache HTTP Server 路径穿越漏洞"),
         ("CVE-2017-5638", "Apache Struts2 远程代码执行漏洞"),
         ("CVE-2021-44228", "Log4j2 JNDI远程代码执行漏洞 (Log4Shell)")],
    110: [("CVE-2018-19518", "uw-imap POP3 IMAP命令注入漏洞")],
    135: [("CVE-2023-21554", "Windows Message Queuing 远程代码执行漏洞"),
          ("CVE-2022-26926", "Windows RPC服务提权漏洞")],
    139: [("CVE-2017-0144", "EternalBlue SMB漏洞 (WannaCry利用)"),
          ("CVE-2020-0796", "SMBv3压缩功能远程代码执行漏洞 (SMBleed)")],
    143: [("CVE-2020-7796", "Courier IMAP越界读取漏洞")],
    443: [("CVE-2014-0160", "OpenSSL Heartbleed信息泄露漏洞"),
          ("CVE-2023-3817", "OpenSSL DH密钥检查漏洞"),
          ("CVE-2016-0800", "OpenSSL DROWN攻击漏洞")],
    445: [("CVE-2017-0144", "EternalBlue SMB漏洞 (WannaCry利用)"),
          ("CVE-2020-0796", "SMBv3压缩功能远程代码执行漏洞")],
    1433: [("CVE-2023-36884", "MSSQL OLE DB提供程序远程代码执行漏洞"),
           ("CVE-2020-0618", "MSSQL Reporting Services RCE")],
    1521: [("CVE-2023-21839", "Oracle WebLogic Server 远程代码执行漏洞"),
           ("CVE-2020-2551", "Oracle WebLogic IIOP反序列化漏洞")],
    3306: [("CVE-2023-22555", "MySQL安全绕过漏洞"),
           ("CVE-2022-3784", "MySQL sha256_password认证漏洞")],
    3389: [("CVE-2019-0708", "Windows RDP BlueKeep远程代码执行漏洞"),
           ("CVE-2020-0609", "Windows RDP网关远程代码执行漏洞")],
    5432: [("CVE-2023-2454", "PostgreSQL 视图定义替换导致权限提升"),
           ("CVE-2022-1552", "PostgreSQL CREATE FUNCTION权限提升")],
    6379: [("CVE-2023-41053", "Redis Lua脚本沙箱逃逸漏洞"),
           ("CVE-2022-35977", "Redis AUTH命令整数溢出漏洞")],
    8080: [("CVE-2023-44487", "HTTP/2 Rapid Reset DDoS攻击漏洞"),
           ("CVE-2021-25281", "SaltStack API未授权访问RCE")],
    9200: [("CVE-2023-46673", "Elasticsearch fine-grained权限绕过"),
           ("CVE-2021-22145", "Elasticsearch信息泄露漏洞")],
    27017: [("CVE-2023-49464", "MongoDB ServerShell未授权访问"),
            ("CVE-2022-38590", "MongoDB Compass原型污染漏洞")]
}

PORT_SUGGESTIONS = {
    21: "FTP服务，建议使用SFTP替代，禁用匿名登录，限制访问IP",
    22: "SSH服务，建议禁用密码登录仅使用密钥认证，修改默认端口",
    23: "Telnet服务，明文传输极度不安全，建议立即禁用并使用SSH替代",
    25: "SMTP邮件服务，建议配置SPF/DKIM/DMARC，启用TLS加密",
    53: "DNS服务，建议禁用递归查询对外服务，限制区域传输",
    80: "HTTP服务，建议重定向至HTTPS，配置安全响应头",
    110: "POP3服务，建议使用POP3S或IMAPS加密替代",
    135: "Windows RPC服务，建议配置防火墙限制外部访问",
    139: "NetBIOS/SMB服务，建议禁用SMBv1，限制外部访问",
    143: "IMAP服务，建议使用IMAPS加密替代",
    443: "HTTPS服务，建议使用TLS 1.3，配置HSTS，定期更新证书",
    445: "SMB文件共享服务，建议禁用SMBv1，限制外部访问，配置签名",
    1433: "MSSQL数据库，建议限制外部访问，启用加密连接，使用强密码",
    1521: "Oracle数据库，建议限制外部访问，启用加密，及时安装补丁",
    3306: "MySQL数据库，建议限制外部访问，禁用远程root登录，启用TLS",
    3389: "RDP远程桌面，建议使用VPN限制访问，启用NLA认证，修改端口",
    5432: "PostgreSQL数据库，建议限制外部访问，配置SSL，使用强认证",
    6379: "Redis缓存，建议设置密码认证，禁用危险命令，限制外部访问",
    8080: "HTTP代理/备用端口，建议配置认证，限制访问来源",
    9200: "Elasticsearch，建议启用安全模块X-Pack，限制外部访问",
    27017: "MongoDB数据库，建议启用认证，限制外部访问，启用TLS"
}

progress_lock = threading.Lock()
scanned_count = 0


def get_service_name(port):
    return COMMON_SERVICES.get(port, "Unknown")


def get_cves(port):
    return PORT_CVES.get(port, [])


def get_suggestion(port):
    return PORT_SUGGESTIONS.get(port, "建议限制访问来源，定期更新服务版本")


def resolve_target(target):
    try:
        ipaddress.ip_address(target)
        return target
    except ValueError:
        pass
    try:
        return socket.gethostbyname(target)
    except socket.gaierror:
        return None


def ping_check(host, timeout=2):
    system = platform.system().lower()
    ip = resolve_target(host)
    if not ip:
        return False
    if system == "windows":
        cmd = ["ping", "-n", "1", "-w", str(timeout * 1000), ip]
    else:
        cmd = ["ping", "-c", "1", "-W", str(timeout), ip]
    try:
        result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=timeout + 2)
        return result.returncode == 0
    except (subprocess.TimeoutExpired, Exception):
        return False


def tcp_connect_scan(ip, port, timeout_ms):
    timeout_s = timeout_ms / 1000.0
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout_s)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def syn_scan(ip, port, timeout_ms):
    if os.getuid() != 0:
        print("[!] SYN扫描需要root/管理员权限，回退到TCP Connect扫描")
        return tcp_connect_scan(ip, port, timeout_ms)

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_TCP)
        s.settimeout(timeout_ms / 1000.0)
    except PermissionError:
        print("[!] 无权限创建原始套接字，回退到TCP Connect扫描")
        return tcp_connect_scan(ip, port, timeout_ms)

    src_port = 50000 + (port % 10000)
    seq_num = 100000 + port
    tcp_header = struct.pack("!HHIIBBHHH",
                             src_port, port, seq_num, 0,
                             80, 2, 8192, 0, 0)

    def checksum(data):
        if len(data) % 2:
            data += b"\x00"
        total = 0
        for i in range(0, len(data), 2):
            total += (data[i] << 8) + data[i + 1]
        while total >> 16:
            total = (total & 0xFFFF) + (total >> 16)
        return ~total & 0xFFFF

    pseudo = socket.inet_aton("0.0.0.0") + socket.inet_aton(ip) + struct.pack("!BBH", 0, 6, len(tcp_header))
    cs = checksum(pseudo + tcp_header)
    tcp_header = struct.pack("!HHIIBBHHH",
                             src_port, port, seq_num, 0,
                             80, 2, 8192, cs, 0)

    try:
        s.sendto(tcp_header, (ip, 0))
        s.settimeout(timeout_ms / 1000.0)
        while True:
            try:
                data = s.recv(1024)
                if len(data) < 20 + 20:
                    continue
                ip_header_len = (data[0] & 0x0F) * 4
                tcp_resp = data[ip_header_len:]
                if len(tcp_resp) < 14:
                    continue
                resp_src_port = struct.unpack("!H", tcp_resp[0:2])[0]
                flags = tcp_resp[13]
                if resp_src_port == port:
                    syn_ack = (flags & 0x12) == 0x12
                    rst = (flags & 0x04) == 0x04
                    s.close()
                    if syn_ack:
                        rst_header = struct.pack("!HHIIBBHHH",
                                                 src_port, port, seq_num + 1, 0,
                                                 80, 0x14, 8192, 0, 0)
                        pseudo2 = socket.inet_aton("0.0.0.0") + socket.inet_aton(ip) + struct.pack("!BBH", 0, 6, len(rst_header))
                        cs2 = checksum(pseudo2 + rst_header)
                        rst_header = struct.pack("!HHIIBBHHH",
                                                 src_port, port, seq_num + 1, 0,
                                                 80, 0x14, 8192, cs2, 0)
                        try:
                            rs = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_TCP)
                            rs.sendto(rst_header, (ip, 0))
                            rs.close()
                        except Exception:
                            pass
                    return syn_ack
            except socket.timeout:
                s.close()
                return False
    except Exception:
        s.close()
        return False


def load_targets_from_file(filepath):
    targets = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if line and not line.startswith("#"):
                    targets.append(line)
        print(f"[+] 从文件加载了 {len(targets)} 个目标")
    except FileNotFoundError:
        print(f"[!] 文件未找到: {filepath}")
        sys.exit(1)
    except UnicodeDecodeError:
        print(f"[!] 文件编码错误，请使用UTF-8编码")
        sys.exit(1)
    return targets


class RateLimiter:
    def __init__(self, rate):
        self.rate = rate
        self.lock = threading.Lock()
        self.last_time = 0.0
        self.interval = 1.0 / rate if rate > 0 else 0

    def wait(self):
        if self.rate <= 0:
            return
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_time
            if elapsed < self.interval:
                time.sleep(self.interval - elapsed)
            self.last_time = time.monotonic()


def scan_port(ip, port, timeout_ms, scan_func, rate_limiter, total_ports):
    global scanned_count
    rate_limiter.wait()
    is_open = scan_func(ip, port, timeout_ms)
    with progress_lock:
        scanned_count += 1
        progress = scanned_count / total_ports * 100
        sys.stdout.write(f"\r[*] 扫描进度: {scanned_count}/{total_ports} ({progress:.1f}%)")
        sys.stdout.flush()
    return port, is_open


def scan_target(target, ports, args, scan_func):
    global scanned_count
    scanned_count = 0
    ip = resolve_target(target)
    if not ip:
        print(f"\n[!] 无法解析目标: {target}")
        return {"target": target, "ip": None, "alive": False, "ports": []}

    display = f"{target} ({ip})" if target != ip else ip
    print(f"\n{'='*60}")
    print(f"[*] 扫描目标: {display}")

    if args.ping:
        print(f"[*] Ping存活检测中...")
        if not ping_check(ip, timeout=3):
            print(f"[!] 主机 {display} 不在线，跳过端口扫描")
            return {"target": target, "ip": ip, "alive": False, "ports": []}
        print(f"[+] 主机 {display} 在线")

    rate_limiter = RateLimiter(args.rate) if args.rate > 0 else RateLimiter(0)
    total_ports = len(ports)
    results = []

    print(f"[*] 开始扫描 {total_ports} 个端口 (线程数: {args.threads}, 超时: {args.timeout}ms)")

    with ThreadPoolExecutor(max_workers=args.threads) as executor:
        futures = {
            executor.submit(scan_port, ip, port, args.timeout, scan_func, rate_limiter, total_ports): port
            for port in ports
        }
        for future in as_completed(futures):
            port, is_open = future.result()
            if is_open:
                service = get_service_name(port)
                results.append({"port": port, "state": "open", "service": service})

    results.sort(key=lambda x: x["port"])

    print(f"\n\n[+] 扫描完成 - {display}")
    if not results:
        print(f"[-] 未发现开放端口")
    elif args.open_only:
        print(f"[+] 开放端口:")
        for r in results:
            print(f"    {r['port']}/{r['service']}")
    else:
        print(f"[+] 端口扫描结果:")
        print(f"    {'端口':<8} {'状态':<10} {'服务':<20}")
        print(f"    {'-'*8} {'-'*10} {'-'*20}")
        for r in results:
            print(f"    {r['port']:<8} {'open':<10} {r['service']:<20}")

    if args.cve and results:
        print(f"\n{'='*60}")
        print(f"[+] 漏洞CVE查询结果")
        print(f"{'='*60}")
        found_cve = False
        for r in results:
            cves = get_cves(r["port"])
            if cves:
                found_cve = True
                print(f"\n  ┌──────────────────────────────────────────────────────────")
                print(f"  │ 端口: {r['port']:<6}  服务: {r['service']}")
                print(f"  ├──────────────────────────────────────────────────────────")
                for idx, (cve_id, desc) in enumerate(cves, 1):
                    print(f"  │ 【{cve_id}】")
                    print(f"  │   {desc}")
                    if idx < len(cves):
                        print(f"  │")
                print(f"  └──────────────────────────────────────────────────────────")
        if not found_cve:
            print(f"\n  [i] 未发现已知CVE漏洞")
        print(f"\n{'='*60}")

    return {"target": target, "ip": ip, "alive": True, "ports": results}


def parse_port_range(port_str):
    ports = set()
    for part in port_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            start, end = int(start.strip()), int(end.strip())
            if start > end:
                start, end = end, start
            ports.update(range(start, end + 1))
        else:
            ports.add(int(part))
    return sorted(ports)


def save_json(all_results, filepath):
    output = {
        "scan_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "results": []
    }
    for r in all_results:
        entry = {
            "target": r["target"],
            "ip": r["ip"],
            "alive": r["alive"],
            "open_ports": []
        }
        for p in r["ports"]:
            entry["open_ports"].append({
                "port": p["port"],
                "state": p["state"],
                "service": p["service"],
                "suggestion": get_suggestion(p["port"]),
                "cves": [{"id": c[0], "description": c[1]} for c in get_cves(p["port"])]
            })
        output["results"].append(entry)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"[+] 结果已保存为JSON: {filepath}")


def save_csv(all_results, filepath):
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["目标", "IP地址", "存活状态", "端口", "状态", "服务", "安全建议"])
        for r in all_results:
            if not r["ports"]:
                writer.writerow([
                    r["target"], r["ip"] or "N/A", "在线" if r["alive"] else "离线",
                    "", "", "", ""
                ])
            for p in r["ports"]:
                writer.writerow([
                    r["target"], r["ip"] or "N/A", "在线" if r["alive"] else "离线",
                    p["port"], p["state"], p["service"],
                    get_suggestion(p["port"])
                ])
    print(f"[+] 结果已保存为CSV: {filepath}")


def save_html(all_results, filepath):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>端口扫描报告 - {escape(now_str)}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }}
  .container {{ max-width: 1200px; margin: 0 auto; }}
  h1 {{ font-size: 1.8rem; color: #38bdf8; margin-bottom: 0.5rem; }}
  .subtitle {{ color: #94a3b8; margin-bottom: 2rem; font-size: 0.9rem; }}
  .summary {{ display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; width: 100%; }}
  .stat-card {{ background: #1e293b; border-radius: 12px; padding: 1.2rem 1.5rem; flex: 1 1 180px; min-width: 180px; max-width: 280px; border: 1px solid #334155; display: flex; flex-direction: column; }}
  .stat-card .label {{ font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }}
  .stat-card .value {{ font-size: 2rem; font-weight: 700; color: #38bdf8; line-height: 1; }}
  .target-section {{ background: #1e293b; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #334155; overflow: hidden; }}
  .target-header {{ padding: 1rem 1.5rem; background: #334155; display: flex; justify-content: space-between; align-items: center; }}
  .target-header h2 {{ font-size: 1.1rem; color: #e2e8f0; }}
  .target-header .ip {{ color: #94a3b8; font-size: 0.85rem; }}
  .badge {{ display: inline-block; padding: 0.15rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }}
  .badge-alive {{ background: #065f46; color: #6ee7b7; }}
  .badge-offline {{ background: #7f1d1d; color: #fca5a5; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ text-align: left; padding: 0.75rem 1.5rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; border-bottom: 1px solid #334155; }}
  td {{ padding: 0.75rem 1.5rem; border-bottom: 1px solid #1e293b; font-size: 0.9rem; }}
  tr:hover {{ background: #334155; }}
  .port {{ font-weight: 600; color: #38bdf8; }}
  .service {{ color: #a78bfa; }}
  .state-open {{ color: #34d399; }}
  .suggestion {{ color: #fbbf24; font-size: 0.82rem; max-width: 400px; }}
  .cve-section {{ background: #1e293b; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #334155; padding: 1.5rem; }}
  .cve-section h3 {{ color: #f87171; margin-bottom: 1rem; font-size: 1rem; }}
  .cve-item {{ padding: 0.5rem 0; border-bottom: 1px solid #334155; }}
  .cve-item:last-child {{ border-bottom: none; }}
  .cve-id {{ color: #fb923c; font-weight: 600; font-size: 0.85rem; }}
  .cve-desc {{ color: #cbd5e1; font-size: 0.82rem; margin-top: 0.15rem; }}
  .footer {{ text-align: center; margin-top: 2rem; color: #475569; font-size: 0.8rem; }}
</style>
</head>
<body>
<div class="container">
<h1>🔍 端口扫描报告</h1>
<p class="subtitle">生成时间: {escape(now_str)}</p>
<div class="summary">
"""

    total_targets = len(all_results)
    total_open = sum(len(r["ports"]) for r in all_results)
    alive_count = sum(1 for r in all_results if r["alive"])

    html += f"""<div class="stat-card"><div class="label">扫描目标</div><div class="value">{total_targets}</div></div>
<div class="stat-card"><div class="label">在线主机</div><div class="value">{alive_count}</div></div>
<div class="stat-card"><div class="label">开放端口</div><div class="value">{total_open}</div></div>
</div>
"""

    for r in all_results:
        status_badge = '<span class="badge badge-alive">在线</span>' if r["alive"] else '<span class="badge badge-offline">离线</span>'
        html += f"""<div class="target-section">
<div class="target-header">
<h2>{escape(r['target'])} {status_badge}</h2>
<span class="ip">{escape(r['ip'] or 'N/A')}</span>
</div>
"""
        if r["ports"]:
            html += """<table><thead><tr><th>端口</th><th>状态</th><th>服务</th><th>安全建议</th></tr></thead><tbody>"""
            for p in r["ports"]:
                suggestion = get_suggestion(p["port"])
                html += f"""<tr>
<td class="port">{p['port']}</td>
<td class="state-open">开放</td>
<td class="service">{escape(p['service'])}</td>
<td class="suggestion">{escape(suggestion)}</td>
</tr>"""
            html += "</tbody></table>"
        else:
            html += '<div style="padding:1.5rem;color:#94a3b8;">未发现开放端口</div>'
        html += "</div>"

        cve_entries = []
        for p in r["ports"]:
            for cve_id, desc in get_cves(p["port"]):
                cve_entries.append((p["port"], p["service"], cve_id, desc))
        if cve_entries:
            html += f"""<div class="cve-section"><h3>⚠️ 潜在漏洞 - {escape(r['target'])}</h3>"""
            for port, service, cve_id, desc in cve_entries:
                html += f"""<div class="cve-item"><span class="cve-id">{escape(cve_id)}</span> (端口 {port} / {escape(service)})<div class="cve-desc">{escape(desc)}</div></div>"""
            html += "</div>"

    html += """<div class="footer">端口扫描报告 - 仅供安全研究使用</div></div></body></html>"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"[+] 结果已保存为HTML: {filepath}")


def build_parser():
    parser = argparse.ArgumentParser(
        description="端口扫描工具 - 支持TCP/SYN扫描、多线程、CVE查询、多种报告输出",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""示例用法:
  %(prog)s -t 192.168.1.1 -p 1-1000
  %(prog)s -t example.com -p 22,80,443,8080 --threads 50
  %(prog)s -t 10.0.0.1 -p 1-65535 --syn --timeout 500
  %(prog)s -f targets.txt -p 1-1024 --ping -o results.json
  %(prog)s -t 192.168.1.1 -p 1-1000 --rate 100 --cve --html report.html"""
    )
    target_group = parser.add_mutually_exclusive_group(required=True)
    target_group.add_argument("-t", "--target", help="目标IP地址或域名")
    target_group.add_argument("-f", "--file", help="从文件读取目标列表（每行一个）")

    parser.add_argument("-p", "--ports", default="1-1024", help="端口范围，如 1-1000 或 22,80,443 (默认: 1-1024)")
    parser.add_argument("--threads", type=int, default=50, help="并发线程数 (默认: 50)")
    parser.add_argument("--timeout", type=int, default=1000, help="连接超时毫秒数 (默认: 1000)")
    parser.add_argument("--syn", action="store_true", help="使用SYN半开扫描 (需要root/管理员权限)")
    parser.add_argument("--ping", action="store_true", help="扫描前进行Ping存活检测")
    parser.add_argument("--rate", type=int, default=0, help="每秒最大扫描数 (0=不限, 默认: 0)")
    parser.add_argument("--open-only", action="store_true", help="仅显示开放端口")
    parser.add_argument("--cve", action="store_true", help="查询常见端口CVE漏洞")

    output_group = parser.add_mutually_exclusive_group()
    output_group.add_argument("-o", "--output", help="保存结果为JSON文件")
    output_group.add_argument("--csv", help="保存结果为CSV文件")
    output_group.add_argument("--html", help="保存结果为HTML报告")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    print("=" * 60)
    print("  端口扫描工具 v1.0")
    print("  仅供授权安全测试使用，未经授权扫描他人网络属于违法行为")
    print("=" * 60)

    ports = parse_port_range(args.ports)
    for p in ports:
        if p < 1 or p > 65535:
            print(f"[!] 端口 {p} 超出有效范围 (1-65535)")
            sys.exit(1)

    scan_func = syn_scan if args.syn else tcp_connect_scan
    if args.syn and os.getuid() != 0:
        print("[!] SYN扫描需要root权限，将回退到TCP Connect扫描")

    targets = []
    if args.target:
        targets.append(args.target)
    else:
        targets = load_targets_from_file(args.file)

    if not targets:
        print("[!] 未指定扫描目标")
        sys.exit(1)

    print(f"[*] 目标数量: {len(targets)}")
    print(f"[*] 端口范围: {args.ports} (共 {len(ports)} 个端口)")
    print(f"[*] 扫描模式: {'SYN半开扫描' if args.syn else 'TCP Connect扫描'}")
    print(f"[*] 线程数: {args.threads}, 超时: {args.timeout}ms")
    if args.rate > 0:
        print(f"[*] 速率限制: {args.rate} 次/秒")
    if args.ping:
        print(f"[*] Ping存活检测: 已启用")

    all_results = []
    start_time = time.time()
    for target in targets:
        result = scan_target(target, ports, args, scan_func)
        all_results.append(result)

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"[*] 全部扫描完成，耗时: {elapsed:.2f} 秒")

    total_open = sum(len(r["ports"]) for r in all_results)
    print(f"[*] 共发现 {total_open} 个开放端口")

    if args.output:
        save_json(all_results, args.output)
    elif args.csv:
        save_csv(all_results, args.csv)
    elif args.html:
        save_html(all_results, args.html)


if __name__ == "__main__":
    main()
