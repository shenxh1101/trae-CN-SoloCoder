#!/usr/bin/env python3
import os
import time
import socket
import csv
import io
import json
from datetime import datetime, timedelta
from collections import deque

import requests
from flask import Flask, render_template, request, jsonify, Response, session

app = Flask(__name__)
app.secret_key = os.urandom(24)

CACHE_DURATION = 300
cache = {}
HISTORY_FILE = os.path.join(os.path.dirname(__file__), 'history.json')
MAX_HISTORY = 50

API_KEYS = {
    'abuseipdb': os.environ.get('ABUSEIPDB_API_KEY', ''),
    'ipqualityscore': os.environ.get('IPQUALITYSCORE_API_KEY', ''),
    'virus_total': os.environ.get('VIRUSTOTAL_API_KEY', ''),
}

COMMON_PROXY_PORTS = {
    'HTTP': [80, 8080, 3128, 8000, 8888, 8118, 9090, 3132, 8123, 8008],
    'SOCKS': [1080, 1081, 1082, 4145, 5108, 9050, 9150, 1090, 1091, 1092],
    'HTTPS': [443, 8443, 9443],
}

BLACKLIST_APIS = [
    {
        'name': 'AbuseIPDB',
        'url': 'https://api.abuseipdb.com/api/v2/check?ipAddress={ip}&maxAgeInDays=90',
        'headers': {'Key': API_KEYS['abuseipdb'], 'Accept': 'application/json'},
        'enabled': bool(API_KEYS['abuseipdb'])
    },
    {
        'name': 'IPQualityScore',
        'url': 'https://www.ipqualityscore.com/api/json/ip/{key}/{ip}?strictness=1',
        'headers': {},
        'enabled': bool(API_KEYS['ipqualityscore'])
    },
    {
        'name': 'VirusTotal',
        'url': 'https://www.virustotal.com/api/v3/ip_addresses/{ip}',
        'headers': {'x-apikey': API_KEYS['virus_total']},
        'enabled': bool(API_KEYS['virus_total'])
    },
    {
        'name': 'IPInfo',
        'url': 'https://ipinfo.io/{ip}/json',
        'headers': {},
        'enabled': True
    },
    {
        'name': 'IP-API',
        'url': 'http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting',
        'headers': {},
        'enabled': True
    },
    {
        'name': 'Shodan',
        'url': 'https://api.shodan.io/shodan/host/{ip}?key={key}',
        'headers': {},
        'enabled': False
    }
]

PROXY_TEST_URLS = [
    'https://api.ipify.org?format=json',
    'https://httpbin.org/ip',
    'https://ifconfig.me/all.json',
    'https://icanhazip.com'
]


def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return deque(data, maxlen=MAX_HISTORY)
        except:
            pass
    return deque(maxlen=MAX_HISTORY)


def save_history(history):
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(list(history), f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"保存历史记录失败: {e}")


history = load_history()


def get_cached_result(ip):
    cached = cache.get(ip)
    if cached and (time.time() - cached['timestamp']) < CACHE_DURATION:
        return cached['data']
    return None


def cache_result(ip, data):
    cache[ip] = {
        'data': data,
        'timestamp': time.time()
    }


def check_port(ip, port, timeout=2):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except:
        return False


def check_proxy_protocol(ip, port):
    protocols = []
    
    if check_http_proxy(ip, port):
        protocols.append('HTTP')
    
    if check_https_proxy(ip, port):
        protocols.append('HTTPS')
    
    if check_socks_proxy(ip, port):
        protocols.append('SOCKS')
    
    return protocols


def check_http_proxy(ip, port, timeout=5):
    try:
        proxy_dict = {
            'http': f'http://{ip}:{port}',
            'https': f'http://{ip}:{port}'
        }
        response = requests.get('http://httpbin.org/ip', 
                              proxies=proxy_dict, timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            if 'origin' in data:
                return True
    except:
        pass
    
    try:
        proxy_dict = {
            'http': f'http://{ip}:{port}',
            'https': f'http://{ip}:{port}'
        }
        response = requests.get('https://api.ipify.org?format=json', 
                              proxies=proxy_dict, timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            if 'ip' in data:
                return True
    except:
        pass
    
    return False


def check_https_proxy(ip, port, timeout=5):
    try:
        proxy_dict = {
            'http': f'http://{ip}:{port}',
            'https': f'http://{ip}:{port}'
        }
        response = requests.get('https://httpbin.org/ip', 
                              proxies=proxy_dict, timeout=timeout)
        if response.status_code == 200:
            return True
    except:
        pass
    return False


def check_socks_proxy(ip, port, timeout=5):
    try:
        proxy_dict = {
            'http': f'socks5://{ip}:{port}',
            'https': f'socks5://{ip}:{port}'
        }
        response = requests.get('https://api.ipify.org?format=json', 
                              proxies=proxy_dict, timeout=timeout)
        if response.status_code == 200:
            return True
    except:
        pass
    
    try:
        proxy_dict = {
            'http': f'socks4://{ip}:{port}',
            'https': f'socks4://{ip}:{port}'
        }
        response = requests.get('https://api.ipify.org?format=json', 
                              proxies=proxy_dict, timeout=timeout)
        if response.status_code == 200:
            return True
    except:
        pass
    
    return False


def detect_proxy_type(ip, ports_to_scan=None):
    if ports_to_scan is None:
        ports_to_scan = [port for ports in COMMON_PROXY_PORTS.values() for port in ports]
    
    detected_ports = []
    proxy_types = set()
    
    for proto, ports in COMMON_PROXY_PORTS.items():
        for port in ports:
            if port in ports_to_scan and check_port(ip, port, timeout=2):
                detected_ports.append(port)
                protocols = check_proxy_protocol(ip, port)
                for p in protocols:
                    proxy_types.add(p)
    
    return list(proxy_types), detected_ports


def query_blacklist_apis(ip):
    results = []
    
    for api_config in BLACKLIST_APIS:
        if not api_config.get('enabled', False):
            continue
            
        try:
            url = api_config['url'].format(
                ip=ip, 
                key=API_KEYS.get(api_config['name'].lower().replace(' ', '_'), '')
            )
            headers = api_config.get('headers', {})
            
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    results.append({
                        'api': api_config['name'],
                        'data': data,
                        'success': True,
                        'status_code': response.status_code
                    })
                except:
                    results.append({
                        'api': api_config['name'],
                        'success': False,
                        'error': 'JSON解析失败',
                        'status_code': response.status_code
                    })
            else:
                results.append({
                    'api': api_config['name'],
                    'success': False,
                    'error': f'HTTP {response.status_code}',
                    'status_code': response.status_code
                })
        except Exception as e:
            results.append({
                'api': api_config['name'],
                'success': False,
                'error': str(e)
            })
    
    return results


def parse_blacklist_results(blacklist_results):
    parsed = {
        'total_checked': len(blacklist_results),
        'success_count': sum(1 for r in blacklist_results if r.get('success')),
        'blacklisted_count': 0,
        'abuse_score': 0,
        'is_proxy': False,
        'is_vpn': False,
        'is_tor': False,
        'is_hosting': False,
        'malicious': False,
        'spam': False,
        'reports': 0,
        'sources': []
    }
    
    for result in blacklist_results:
        if not result.get('success'):
            continue
            
        api_name = result['api']
        data = result.get('data', {})
        
        parsed['sources'].append(api_name)
        
        if api_name == 'AbuseIPDB':
            abuse_data = data.get('data', {})
            parsed['abuse_score'] = max(parsed['abuse_score'], abuse_data.get('abuseConfidenceScore', 0))
            parsed['reports'] = max(parsed['reports'], abuse_data.get('totalReports', 0))
            if abuse_data.get('abuseConfidenceScore', 0) > 50:
                parsed['blacklisted_count'] += 1
            if abuse_data.get('isTor'):
                parsed['is_tor'] = True
            usage_type = abuse_data.get('usageType', '').lower()
            if 'hosting' in usage_type or 'datacenter' in usage_type:
                parsed['is_hosting'] = True
                
        elif api_name == 'IPQualityScore':
            parsed['is_proxy'] = parsed['is_proxy'] or data.get('proxy', False)
            parsed['is_vpn'] = parsed['is_vpn'] or data.get('vpn', False)
            parsed['is_tor'] = parsed['is_tor'] or data.get('tor', False)
            parsed['is_hosting'] = parsed['is_hosting'] or data.get('hosting', False)
            parsed['spam'] = parsed['spam'] or data.get('spam', False)
            if data.get('fraud_score', 0) > 70:
                parsed['blacklisted_count'] += 1
            if data.get('recent_abuse', False):
                parsed['blacklisted_count'] += 1
                
        elif api_name == 'VirusTotal':
            vt_data = data.get('data', {}).get('attributes', {})
            stats = vt_data.get('last_analysis_stats', {})
            malicious = stats.get('malicious', 0)
            suspicious = stats.get('suspicious', 0)
            if malicious > 0 or suspicious > 0:
                parsed['blacklisted_count'] += (malicious + suspicious)
            parsed['malicious'] = parsed['malicious'] or (malicious > 0)
            
        elif api_name == 'IPInfo':
            privacy = data.get('privacy', {})
            parsed['is_proxy'] = parsed['is_proxy'] or privacy.get('proxy', False)
            parsed['is_vpn'] = parsed['is_vpn'] or privacy.get('vpn', False)
            parsed['is_tor'] = parsed['is_tor'] or privacy.get('tor', False)
            parsed['is_hosting'] = parsed['is_hosting'] or privacy.get('hosting', False)
            if privacy.get('proxy') or privacy.get('vpn') or privacy.get('tor'):
                parsed['blacklisted_count'] += 1
                
        elif api_name == 'IP-API':
            parsed['is_proxy'] = parsed['is_proxy'] or data.get('proxy', False)
            parsed['is_hosting'] = parsed['is_hosting'] or data.get('hosting', False)
            if data.get('proxy') or data.get('hosting'):
                parsed['blacklisted_count'] += 1
    
    if parsed['is_proxy'] or parsed['is_vpn'] or parsed['is_tor']:
        parsed['blacklisted_count'] += 2
    
    return parsed


def get_geolocation(ip):
    geo = {
        'country': 'Unknown',
        'country_code': 'Unknown',
        'city': 'Unknown',
        'region': 'Unknown',
        'isp': 'Unknown',
        'org': 'Unknown',
        'as': 'Unknown',
        'timezone': 'Unknown',
        'latitude': None,
        'longitude': None
    }
    
    try:
        response = requests.get(f'http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as', timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                geo.update({
                    'country': data.get('country', 'Unknown'),
                    'country_code': data.get('countryCode', 'Unknown'),
                    'city': data.get('city', 'Unknown'),
                    'region': data.get('regionName', 'Unknown'),
                    'isp': data.get('isp', 'Unknown'),
                    'org': data.get('org', 'Unknown'),
                    'as': data.get('as', 'Unknown'),
                    'timezone': data.get('timezone', 'Unknown'),
                    'latitude': data.get('lat'),
                    'longitude': data.get('lon')
                })
                return geo
    except:
        pass
    
    try:
        response = requests.get(f'https://ipinfo.io/{ip}/json', timeout=3)
        if response.status_code == 200:
            data = response.json()
            loc = data.get('loc', ',').split(',')
            geo.update({
                'country': data.get('country', 'Unknown'),
                'country_code': data.get('country', 'Unknown'),
                'city': data.get('city', 'Unknown'),
                'region': data.get('region', 'Unknown'),
                'isp': data.get('org', 'Unknown'),
                'org': data.get('org', 'Unknown'),
                'as': data.get('asn', {}).get('asn', 'Unknown') if isinstance(data.get('asn'), dict) else data.get('asn', 'Unknown'),
                'timezone': data.get('timezone', 'Unknown'),
                'latitude': float(loc[0]) if len(loc) > 1 else None,
                'longitude': float(loc[1]) if len(loc) > 1 else None
            })
    except:
        pass
    
    return geo


def get_real_ip():
    try:
        response = requests.get('https://api.ipify.org?format=json', timeout=5)
        if response.status_code == 200:
            return response.json().get('ip', '')
    except:
        pass
    
    try:
        response = requests.get('https://httpbin.org/ip', timeout=5)
        if response.status_code == 200:
            return response.json().get('origin', '').split(',')[0].strip()
    except:
        pass
    
    return ''


def test_proxy_anonymity(ip, port, my_ip):
    results = []
    
    for test_url in PROXY_TEST_URLS[:3]:
        try:
            proxy_dict = {
                'http': f'http://{ip}:{port}',
                'https': f'http://{ip}:{port}'
            }
            
            response = requests.get(test_url, proxies=proxy_dict, timeout=8)
            if response.status_code == 200:
                try:
                    data = response.json()
                    returned_ip = data.get('ip', '') or data.get('origin', '') or data.get('ip_addr', '')
                    
                    if returned_ip:
                        results.append({
                            'url': test_url,
                            'returned_ip': returned_ip,
                            'success': True
                        })
                except:
                    text = response.text.strip()
                    if text and len(text) < 50:
                        results.append({
                            'url': test_url,
                            'returned_ip': text,
                            'success': True
                        })
        except Exception as e:
            results.append({
                'url': test_url,
                'error': str(e),
                'success': False
            })
    
    if not results:
        return '未知', results
    
    successful = [r for r in results if r.get('success')]
    if not successful:
        return '未知', results
    
    returned_ips = set(r['returned_ip'] for r in successful)
    
    if my_ip and my_ip in returned_ips:
        return '透明', results
    
    if ip in returned_ips:
        return '高匿', results
    
    if len(returned_ips) == 1 and my_ip and list(returned_ips)[0] != my_ip:
        return '匿名', results
    
    return '匿名', results


def check_anonymity_level(ip, detected_ports):
    if not detected_ports:
        return 'N/A', []
    
    my_ip = get_real_ip()
    
    all_results = []
    best_level = '未知'
    
    for port in detected_ports[:5]:
        level, test_results = test_proxy_anonymity(ip, port, my_ip)
        all_results.extend(test_results)
        
        level_priority = {'透明': 0, '匿名': 1, '高匿': 2, '未知': -1}
        if level_priority.get(level, -1) > level_priority.get(best_level, -1):
            best_level = level
    
    return best_level, all_results


def calculate_risk_score(proxy_types, detected_ports, blacklist_parsed, geolocation):
    score = 0
    
    if proxy_types:
        score += 35
    
    score += len(detected_ports) * 3
    
    if blacklist_parsed:
        score += min(blacklist_parsed.get('blacklisted_count', 0) * 10, 30)
        
        if blacklist_parsed.get('is_proxy'):
            score += 15
        if blacklist_parsed.get('is_vpn'):
            score += 15
        if blacklist_parsed.get('is_tor'):
            score += 25
        if blacklist_parsed.get('is_hosting'):
            score += 10
        if blacklist_parsed.get('malicious'):
            score += 25
        if blacklist_parsed.get('spam'):
            score += 15
        
        abuse_score = blacklist_parsed.get('abuse_score', 0)
        if abuse_score > 80:
            score += 20
        elif abuse_score > 50:
            score += 10
        
        reports = blacklist_parsed.get('reports', 0)
        if reports > 100:
            score += 15
        elif reports > 10:
            score += 5
    
    isp = str(geolocation.get('isp', '')).lower()
    org = str(geolocation.get('org', '')).lower()
    as_info = str(geolocation.get('as', '')).lower()
    
    hosting_keywords = ['hosting', 'vpn', 'proxy', 'datacenter', 'cloud', 'server', 'data center']
    if any(k in isp for k in hosting_keywords) or any(k in org for k in hosting_keywords) or any(k in as_info for k in hosting_keywords):
        score += 10
    
    return min(score, 100)


def get_threat_intel(ip, blacklist_results, blacklist_parsed):
    threats = []
    details = []
    
    if blacklist_parsed:
        if blacklist_parsed.get('is_proxy'):
            threats.append('检测为代理IP')
        if blacklist_parsed.get('is_vpn'):
            threats.append('VPN出口节点')
        if blacklist_parsed.get('is_tor'):
            threats.append('Tor网络节点')
        if blacklist_parsed.get('is_hosting'):
            threats.append('数据中心/托管IP')
        if blacklist_parsed.get('malicious'):
            threats.append('恶意IP')
        if blacklist_parsed.get('spam'):
            threats.append('垃圾邮件来源')
        
        if blacklist_parsed.get('abuse_score', 0) > 80:
            threats.append(f'高滥用评分: {blacklist_parsed["abuse_score"]}%')
        
        if blacklist_parsed.get('reports', 0) > 0:
            details.append(f'被报告 {blacklist_parsed["reports"]} 次')
        
        if blacklist_parsed.get('sources'):
            details.append(f'查询来源: {", ".join(blacklist_parsed["sources"])}')
    
    return {
        'blacklist_count': blacklist_parsed.get('blacklisted_count', 0) if blacklist_parsed else 0,
        'total_sources': blacklist_parsed.get('total_checked', 0) if blacklist_parsed else 0,
        'success_sources': blacklist_parsed.get('success_count', 0) if blacklist_parsed else 0,
        'threats': list(set(threats)),
        'details': details,
        'abuse_score': blacklist_parsed.get('abuse_score', 0) if blacklist_parsed else 0,
        'reports': blacklist_parsed.get('reports', 0) if blacklist_parsed else 0
    }


def detect_ip(ip, ports_to_scan=None):
    cached = get_cached_result(ip)
    if cached:
        cached['from_cache'] = True
        return cached
    
    proxy_types, detected_ports = detect_proxy_type(ip, ports_to_scan)
    blacklist_results = query_blacklist_apis(ip)
    blacklist_parsed = parse_blacklist_results(blacklist_results)
    geolocation = get_geolocation(ip)
    anonymity_level, anonymity_tests = check_anonymity_level(ip, detected_ports)
    risk_score = calculate_risk_score(proxy_types, detected_ports, blacklist_parsed, geolocation)
    threat_intel = get_threat_intel(ip, blacklist_results, blacklist_parsed)
    
    is_proxy = len(proxy_types) > 0 or blacklist_parsed.get('is_proxy', False) or blacklist_parsed.get('is_vpn', False) or blacklist_parsed.get('is_tor', False)
    
    result = {
        'ip': ip,
        'is_proxy': is_proxy,
        'proxy_types': proxy_types,
        'detected_ports': detected_ports,
        'anonymity_level': anonymity_level,
        'anonymity_tests': anonymity_tests,
        'risk_score': risk_score,
        'geolocation': geolocation,
        'threat_intel': threat_intel,
        'blacklist_parsed': blacklist_parsed,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'from_cache': False
    }
    
    cache_result(ip, result)
    return result


def add_to_history(result):
    clean_result = {
        'ip': result['ip'],
        'is_proxy': result['is_proxy'],
        'proxy_types': result['proxy_types'],
        'detected_ports': result['detected_ports'],
        'anonymity_level': result['anonymity_level'],
        'risk_score': result['risk_score'],
        'geolocation': result['geolocation'],
        'threat_intel': result['threat_intel'],
        'timestamp': result['timestamp']
    }
    
    for i, item in enumerate(history):
        if item.get('ip') == clean_result['ip']:
            del history[i]
            break
    history.appendleft(clean_result)
    save_history(history)


def get_risk_level(score):
    if score >= 70:
        return '高风险'
    elif score >= 40:
        return '中风险'
    else:
        return '低风险'


@app.route('/')
def index():
    return render_template('index.html', 
                         history=list(history),
                         common_ports=COMMON_PROXY_PORTS,
                         api_keys_configured={k: bool(v) for k, v in API_KEYS.items()})


@app.route('/detect', methods=['GET', 'POST'])
def detect():
    if request.method == 'GET':
        ip = request.args.get('ip', '')
        selected_ports = request.args.getlist('ports')
    else:
        ip = request.form.get('ip', '')
        selected_ports = request.form.getlist('ports')
    
    if not ip:
        return render_template('index.html', 
                             error='请输入IP地址',
                             history=list(history),
                             common_ports=COMMON_PROXY_PORTS,
                             api_keys_configured={k: bool(v) for k, v in API_KEYS.items()})
    
    ports_to_scan = None
    if selected_ports:
        try:
            ports_to_scan = [int(p) for p in selected_ports]
        except:
            pass
    
    try:
        socket.inet_aton(ip)
    except:
        return render_template('index.html', 
                             error=f'无效的IP地址: {ip}',
                             history=list(history),
                             common_ports=COMMON_PROXY_PORTS,
                             api_keys_configured={k: bool(v) for k, v in API_KEYS.items()})
    
    result = detect_ip(ip, ports_to_scan)
    add_to_history(result)
    risk_level = get_risk_level(result['risk_score'])
    
    return render_template('result.html', 
                         result=result, 
                         risk_level=risk_level,
                         history=list(history))


@app.route('/batch', methods=['GET', 'POST'])
def batch_detect():
    if request.method == 'GET':
        return render_template('batch.html', history=list(history))
    
    if 'file' not in request.files:
        return render_template('batch.html', 
                             error='请上传文件',
                             history=list(history))
    
    file = request.files['file']
    if file.filename == '':
        return render_template('batch.html', 
                             error='请选择文件',
                             history=list(history))
    
    if not file.filename.endswith('.txt'):
        return render_template('batch.html', 
                             error='请上传TXT格式文件',
                             history=list(history))
    
    content = file.read().decode('utf-8', errors='ignore')
    ips = [line.strip() for line in content.split('\n') if line.strip()]
    ips = list(set(ips))
    
    if len(ips) > 100:
        return render_template('batch.html', 
                             error='单次最多检测100个IP',
                             history=list(history))
    
    results = []
    for ip in ips:
        try:
            socket.inet_aton(ip)
            result = detect_ip(ip)
            add_to_history(result)
            result['risk_level'] = get_risk_level(result['risk_score'])
            results.append(result)
        except:
            results.append({
                'ip': ip,
                'is_proxy': False,
                'proxy_types': [],
                'detected_ports': [],
                'anonymity_level': 'N/A',
                'risk_score': 0,
                'geolocation': {'country': '无效IP', 'city': '-', 'isp': '-'},
                'threat_intel': {'blacklist_count': 0, 'threats': []},
                'risk_level': '无效',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'error': '无效的IP地址'
            })
    
    session['batch_results'] = results
    return render_template('batch_result.html', 
                         results=results,
                         history=list(history))


@app.route('/export/csv')
def export_csv():
    results = session.get('batch_results', [])
    
    if not results:
        return '没有可导出的数据', 404
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        'IP地址', '是否代理', '代理类型', '检测端口', '匿名级别',
        '风险评分', '风险等级', '国家', '城市', '运营商',
        '黑名单数量', '威胁标签', '检测时间'
    ])
    
    for r in results:
        geo = r.get('geolocation', {})
        threat = r.get('threat_intel', {})
        writer.writerow([
            r.get('ip', ''),
            '是' if r.get('is_proxy') else '否',
            '/'.join(r.get('proxy_types', [])),
            ','.join(map(str, r.get('detected_ports', []))),
            r.get('anonymity_level', ''),
            r.get('risk_score', 0),
            r.get('risk_level', ''),
            geo.get('country', ''),
            geo.get('city', ''),
            geo.get('isp', ''),
            threat.get('blacklist_count', 0),
            ';'.join(threat.get('threats', [])),
            r.get('timestamp', '')
        ])
    
    output.seek(0)
    return Response(
        output,
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=proxy_detection_results.csv'}
    )


@app.route('/history/<ip>')
def view_history(ip):
    for item in history:
        if item.get('ip') == ip:
            risk_level = get_risk_level(item['risk_score'])
            return render_template('result.html', 
                                 result=item, 
                                 risk_level=risk_level,
                                 history=list(history))
    return '未找到该IP的历史记录', 404


@app.route('/api/detect', methods=['GET', 'POST'])
def api_detect():
    if request.method == 'GET':
        ip = request.args.get('ip', '')
        selected_ports = request.args.getlist('ports')
    else:
        data = request.get_json(silent=True) or {}
        ip = data.get('ip', '')
        selected_ports = data.get('ports', [])
    
    if not ip:
        return jsonify({'error': '请提供IP地址'}), 400
    
    try:
        socket.inet_aton(ip)
    except:
        return jsonify({'error': '无效的IP地址'}), 400
    
    ports_to_scan = None
    if selected_ports:
        try:
            ports_to_scan = [int(p) for p in selected_ports]
        except:
            return jsonify({'error': '无效的端口列表'}), 400
    
    result = detect_ip(ip, ports_to_scan)
    add_to_history(result)
    result['risk_level'] = get_risk_level(result['risk_score'])
    
    return jsonify(result)


@app.route('/api/batch', methods=['POST'])
def api_batch():
    data = request.get_json(silent=True) or {}
    ips = data.get('ips', [])
    
    if not ips:
        return jsonify({'error': '请提供IP列表'}), 400
    
    if len(ips) > 100:
        return jsonify({'error': '单次最多检测100个IP'}), 400
    
    results = []
    for ip in ips:
        try:
            socket.inet_aton(ip)
            result = detect_ip(ip)
            add_to_history(result)
            result['risk_level'] = get_risk_level(result['risk_score'])
            results.append(result)
        except:
            results.append({
                'ip': ip,
                'error': '无效的IP地址'
            })
    
    return jsonify({'results': results})


@app.route('/api/history')
def api_history():
    return jsonify({'history': list(history)})


@app.route('/api/status')
def api_status():
    return jsonify({
        'status': 'running',
        'api_keys': {k: bool(v) for k, v in API_KEYS.items()},
        'history_count': len(history),
        'cache_count': len(cache)
    })


@app.template_filter('risk_color')
def risk_color(score):
    if score >= 70:
        return 'danger'
    elif score >= 40:
        return 'warning'
    else:
        return 'success'


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
