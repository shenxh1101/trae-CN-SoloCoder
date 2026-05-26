import os
import json
import time
import random
import string
import secrets
import hashlib
import threading
import ipaddress
from datetime import datetime, timedelta
from collections import defaultdict, deque
from functools import wraps

from flask import (
    Flask, request, redirect, render_template, jsonify,
    abort, send_file, make_response, session
)
from io import StringIO
import csv
import io

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
BACKUP_FILE = os.path.join(DATA_DIR, 'shortlinks.json')
QR_DIR = os.path.join(DATA_DIR, 'qrcodes')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(QR_DIR, exist_ok=True)

try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False

HAS_IP2REGION = False
HAS_GEOIP2 = False
HAS_PRO_IP_LOOKUP = False

try:
    from ip2region import Ip2Region
    HAS_IP2REGION = True
    HAS_PRO_IP_LOOKUP = True
except ImportError:
    pass

try:
    import geoip2.database
    HAS_GEOIP2 = True
    HAS_PRO_IP_LOOKUP = True
except ImportError:
    pass

IP2REGION_DB_PATH = os.path.join(DATA_DIR, 'ip2region.xdb')
GEOIP2_CITY_DB_PATH = os.path.join(DATA_DIR, 'GeoLite2-City.mmdb')

_ip2region_obj = None
_geoip2_reader = None

def init_ip_lookup():
    global _ip2region_obj, _geoip2_reader
    if HAS_IP2REGION and os.path.exists(IP2REGION_DB_PATH):
        try:
            _ip2region_obj = Ip2Region()
            _ip2region_obj.setDbFile(IP2REGION_DB_PATH)
            print(f"✓ ip2region 已加载: {IP2REGION_DB_PATH}")
            return
        except Exception as e:
            print(f"! ip2region 加载失败: {e}")
    
    if HAS_GEOIP2 and os.path.exists(GEOIP2_CITY_DB_PATH):
        try:
            _geoip2_reader = geoip2.database.Reader(GEOIP2_CITY_DB_PATH)
            print(f"✓ GeoIP2 已加载: {GEOIP2_CITY_DB_PATH}")
            return
        except Exception as e:
            print(f"! GeoIP2 加载失败: {e}")
    
    print("! 未检测到专业IP库，使用内置IP段映射表")

def pro_ip_lookup(ip):
    if ':' in ip:
        return None
    
    if _ip2region_obj is not None:
        try:
            result = _ip2region_obj.memorySearch(ip)
            if result and 'region' in result:
                region_str = result['region']
                parts = region_str.split('|')
                if len(parts) >= 3:
                    country = parts[0]
                    province = parts[2]
                    if country == '中国':
                        if province in ['北京', '天津', '河北', '山西', '内蒙古']:
                            return '华北地区'
                        elif province in ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东']:
                            return '华东地区'
                        elif province in ['河南', '湖北', '湖南']:
                            return '华中地区'
                        elif province in ['广东', '广西', '海南']:
                            return '华南地区'
                        elif province in ['重庆', '四川', '贵州', '云南', '西藏']:
                            return '西南地区'
                        elif province in ['陕西', '甘肃', '青海', '宁夏', '新疆']:
                            return '西北地区'
                        elif province in ['辽宁', '吉林', '黑龙江']:
                            return '东北地区'
                        else:
                            return f'中国-{province}'
                    else:
                        return country
        except Exception:
            pass
    
    if _geoip2_reader is not None:
        try:
            response = _geoip2_reader.city(ip)
            country = response.country.name if response.country.name else ''
            city = response.city.name if response.city.name else ''
            if country == 'China':
                subdiv = response.subdivisions.most_specific.name if response.subdivisions else ''
                if subdiv in ['Beijing', 'Tianjin', 'Hebei', 'Shanxi', 'Inner Mongolia']:
                    return '华北地区'
                elif subdiv in ['Shanghai', 'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian', 'Jiangxi', 'Shandong']:
                    return '华东地区'
                elif subdiv in ['Henan', 'Hubei', 'Hunan']:
                    return '华中地区'
                elif subdiv in ['Guangdong', 'Guangxi', 'Hainan']:
                    return '华南地区'
                else:
                    return f'中国-{subdiv}' if subdiv else '中国'
            else:
                return country if country else None
        except Exception:
            pass
    
    return None

IP_REGION_MAP = [
    ('1.0.0.0', '1.127.255.255', '华北地区'),
    ('1.128.0.0', '1.255.255.255', '华东地区'),
    ('2.0.0.0', '2.127.255.255', '华南地区'),
    ('2.128.0.0', '3.255.255.255', '其他地区'),
    ('4.0.0.0', '7.255.255.255', '华北地区'),
    ('8.0.0.0', '11.255.255.255', '华东地区'),
    ('12.0.0.0', '15.255.255.255', '华南地区'),
    ('16.0.0.0', '23.255.255.255', '其他地区'),
    ('24.0.0.0', '27.255.255.255', '华北地区'),
    ('28.0.0.0', '31.255.255.255', '华东地区'),
    ('32.0.0.0', '39.255.255.255', '华南地区'),
    ('40.0.0.0', '47.255.255.255', '其他地区'),
    ('48.0.0.0', '55.255.255.255', '华北地区'),
    ('56.0.0.0', '63.255.255.255', '华东地区'),
    ('64.0.0.0', '71.255.255.255', '华南地区'),
    ('72.0.0.0', '79.255.255.255', '其他地区'),
    ('80.0.0.0', '87.255.255.255', '华北地区'),
    ('88.0.0.0', '95.255.255.255', '华东地区'),
    ('96.0.0.0', '103.255.255.255', '华南地区'),
    ('104.0.0.0', '111.255.255.255', '其他地区'),
    ('112.0.0.0', '119.255.255.255', '华北地区'),
    ('120.0.0.0', '127.255.255.255', '华东地区'),
]

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

SHORT_CODE_LENGTH = 6
CHARSET = string.ascii_letters + string.digits
MAX_CREATE_PER_MINUTE = 10

short_links = {}
ip_request_log = defaultdict(deque)
file_lock = threading.Lock()
links_lock = threading.Lock()


def load_data():
    global short_links
    if os.path.exists(BACKUP_FILE):
        with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
            short_links = json.load(f)


def convert_entry(entry):
    result = dict(entry)
    if isinstance(result.get('hourly_stats'), defaultdict):
        result['hourly_stats'] = dict(result['hourly_stats'])
    if isinstance(result.get('region_stats'), defaultdict):
        result['region_stats'] = dict(result['region_stats'])
    return result


def save_single_entry(code, entry):
    with file_lock:
        data = {}
        if os.path.exists(BACKUP_FILE):
            with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
        data[code] = convert_entry(entry)
        with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


def save_all():
    with file_lock:
        converted = {k: convert_entry(v) for k, v in short_links.items()}
        with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
            json.dump(converted, f, indent=2, ensure_ascii=False)


def remove_entry(code):
    with file_lock:
        data = {}
        if os.path.exists(BACKUP_FILE):
            with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
        if code in data:
            del data[code]
        with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


def generate_short_code(length=SHORT_CODE_LENGTH):
    while True:
        code = ''.join(random.choices(CHARSET, k=length))
        if code not in short_links:
            return code


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password, hashed):
    return hash_password(password) == hashed


def anonymize_ip(ip):
    try:
        if ':' in ip:
            if ip == '::1' or ip == '::':
                return '0:0:0:0'
            parts = ip.split(':')
            if '' in parts:
                empty_idx = parts.index('')
                left = parts[:empty_idx]
                right = parts[empty_idx+1:]
                while len(left) + len(right) < 8:
                    left.append('0')
                full_parts = left + right
            else:
                full_parts = parts
            if len(full_parts) >= 4:
                result = ':'.join(full_parts[:4])
                if '' in parts:
                    short_parts = ip.split(':')[:4]
                    if len(short_parts) == 4 and '' not in short_parts:
                        return ':'.join(short_parts)
                    return result
                return result
            return ip[:15] if len(ip) > 15 else ip
        else:
            parts = ip.split('.')
            if len(parts) >= 3:
                return '.'.join(parts[:3])
            return ip
    except Exception:
        return ip[:15] if len(ip) > 15 else ip


def estimate_region(ip_prefix):
    if ':' in ip_prefix:
        return '海外地区'
    
    full_ip = ip_prefix + '.0' if ip_prefix.count('.') == 2 else ip_prefix
    
    if HAS_PRO_IP_LOOKUP:
        pro_result = pro_ip_lookup(full_ip)
        if pro_result:
            return pro_result
    
    try:
        parts = ip_prefix.split('.')
        if len(parts) >= 2:
            first = int(parts[0])
            second = int(parts[1])
            
            for start_ip, end_ip, region in IP_REGION_MAP:
                try:
                    start = int(start_ip.split('.')[0]) * 256 + int(start_ip.split('.')[1])
                    end = int(end_ip.split('.')[0]) * 256 + int(end_ip.split('.')[1])
                    current = first * 256 + second
                    if start <= current <= end:
                        return region
                except (ValueError, IndexError):
                    continue
            
            if 1 <= first <= 54:
                return '华北地区'
            elif 55 <= first <= 110:
                return '华东地区'
            elif 111 <= first <= 170:
                return '华南地区'
            elif 171 <= first <= 223:
                return '其他地区'
    except (ValueError, IndexError):
        pass
    return '未知地区'


def check_rate_limit(ip):
    now = time.time()
    log = ip_request_log[ip]
    while log and now - log[0] > 60:
        log.popleft()
    if len(log) >= MAX_CREATE_PER_MINUTE:
        return False
    log.append(now)
    return True


def is_expired(entry):
    expiry = entry.get('expiry')
    if expiry is None:
        return False
    return datetime.now().timestamp() > expiry


def cleanup_expired():
    expired_codes = []
    now = datetime.now()
    for code, entry in short_links.items():
        if entry.get('expiry') and now.timestamp() > entry['expiry']:
            expired_codes.append(code)
    if expired_codes:
        for code in expired_codes:
            del short_links[code]
            remove_entry(code)
            qr_path = os.path.join(QR_DIR, f'{code}.png')
            if os.path.exists(qr_path):
                os.remove(qr_path)
        print(f"[{now}] Cleaned up {len(expired_codes)} expired links")


def scheduled_cleanup():
    while True:
        cleanup_expired()
        time.sleep(3600)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/create', methods=['POST'])
def create_short_link():
    ip = request.remote_addr or '127.0.0.1'
    if not check_rate_limit(ip):
        return jsonify({'error': '请求过于频繁，请稍后再试'}), 429

    long_url = request.form.get('long_url', '').strip()
    custom_code = request.form.get('custom_code', '').strip()
    password = request.form.get('password', '').strip()
    expiry_type = request.form.get('expiry_type', 'permanent')
    expiry_value = request.form.get('expiry_value', '24')

    if not long_url:
        return jsonify({'error': '请输入长网址'}), 400

    if custom_code:
        if len(custom_code) < 3 or len(custom_code) > 20:
            return jsonify({'error': '自定义短码长度需在3-20字符之间'}), 400
        if custom_code in short_links:
            return jsonify({'error': '该短码已被使用'}), 400
        code = custom_code
    else:
        code = generate_short_code()

    expiry = None
    if expiry_type == 'hours':
        try:
            hours = int(expiry_value)
            expiry = (datetime.now() + timedelta(hours=hours)).timestamp()
        except ValueError:
            return jsonify({'error': '有效期数值无效'}), 400
    elif expiry_type == 'days':
        try:
            days = int(expiry_value)
            expiry = (datetime.now() + timedelta(days=days)).timestamp()
        except ValueError:
            return jsonify({'error': '有效期数值无效'}), 400

    admin_key = secrets.token_urlsafe(16)

    entry = {
        'long_url': long_url,
        'created_at': datetime.now().isoformat(),
        'expiry': expiry,
        'password': hash_password(password) if password else None,
        'admin_key': admin_key,
        'clicks': 0,
        'last_access': None,
        'access_log': [],
        'hourly_stats': defaultdict(int),
        'region_stats': defaultdict(int),
    }

    with links_lock:
        short_links[code] = entry

    save_single_entry(code, entry)

    short_url = f"{request.host_url}{code}"

    return jsonify({
        'short_url': short_url,
        'short_code': code,
        'admin_key': admin_key,
        'expiry': datetime.fromtimestamp(expiry).isoformat() if expiry else None
    })


@app.route('/api/create', methods=['POST'])
def api_create():
    ip = request.remote_addr or '127.0.0.1'
    if not check_rate_limit(ip):
        return jsonify({'error': '请求过于频繁，请稍后再试'}), 429

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': '无效的JSON数据'}), 400

    long_url = data.get('long_url', '').strip()
    custom_code = data.get('custom_code', '').strip()
    password = data.get('password', '').strip()
    expiry_type = data.get('expiry_type', 'permanent')
    expiry_value = data.get('expiry_value', '24')

    if not long_url:
        return jsonify({'error': '请输入长网址'}), 400

    if custom_code:
        if len(custom_code) < 3 or len(custom_code) > 20:
            return jsonify({'error': '自定义短码长度需在3-20字符之间'}), 400
        if custom_code in short_links:
            return jsonify({'error': '该短码已被使用'}), 400
        code = custom_code
    else:
        code = generate_short_code()

    expiry = None
    if expiry_type == 'hours':
        try:
            hours = int(expiry_value)
            expiry = (datetime.now() + timedelta(hours=hours)).timestamp()
        except ValueError:
            return jsonify({'error': '有效期数值无效'}), 400
    elif expiry_type == 'days':
        try:
            days = int(expiry_value)
            expiry = (datetime.now() + timedelta(days=days)).timestamp()
        except ValueError:
            return jsonify({'error': '有效期数值无效'}), 400

    admin_key = secrets.token_urlsafe(16)

    entry = {
        'long_url': long_url,
        'created_at': datetime.now().isoformat(),
        'expiry': expiry,
        'password': hash_password(password) if password else None,
        'admin_key': admin_key,
        'clicks': 0,
        'last_access': None,
        'access_log': [],
        'hourly_stats': {},
        'region_stats': {},
    }

    with links_lock:
        short_links[code] = entry

    save_single_entry(code, entry)

    short_url = f"{request.host_url}{code}"

    return jsonify({
        'success': True,
        'short_url': short_url,
        'short_code': code,
        'admin_key': admin_key,
        'long_url': long_url,
        'expiry': datetime.fromtimestamp(expiry).isoformat() if expiry else None,
        'created_at': entry['created_at']
    })


@app.route('/<code>')
def redirect_to_url(code):
    entry = short_links.get(code)
    if not entry:
        abort(404)

    if is_expired(entry):
        del short_links[code]
        remove_entry(code)
        abort(404)

    if entry.get('password'):
        session['pending_redirect'] = code
        return redirect(f'/password/{code}')

    ip = request.remote_addr or '127.0.0.1'
    ip_prefix = anonymize_ip(ip)
    now = datetime.now()

    entry['clicks'] += 1
    entry['last_access'] = now.isoformat()
    hour_key = now.strftime('%Y-%m-%d %H:00')
    if 'hourly_stats' not in entry:
        entry['hourly_stats'] = {}
    entry['hourly_stats'][hour_key] = entry['hourly_stats'].get(hour_key, 0) + 1

    region = estimate_region(ip_prefix)
    if 'region_stats' not in entry:
        entry['region_stats'] = {}
    entry['region_stats'][region] = entry['region_stats'].get(region, 0) + 1

    if len(entry.get('access_log', [])) > 1000:
        entry['access_log'] = entry['access_log'][-500:]
    entry.setdefault('access_log', []).append({
        'time': now.isoformat(),
        'ip_prefix': ip_prefix
    })

    save_single_entry(code, entry)

    return redirect(entry['long_url'])


@app.route('/password/<code>', methods=['GET', 'POST'])
def password_protect(code):
    entry = short_links.get(code)
    if not entry or is_expired(entry):
        abort(404)

    if request.method == 'POST':
        password = request.form.get('password', '')
        if entry.get('password') and verify_password(password, entry['password']):
            session.pop('pending_redirect', None)

            ip = request.remote_addr or '127.0.0.1'
            ip_prefix = anonymize_ip(ip)
            now = datetime.now()

            entry['clicks'] += 1
            entry['last_access'] = now.isoformat()
            hour_key = now.strftime('%Y-%m-%d %H:00')
            if 'hourly_stats' not in entry:
                entry['hourly_stats'] = {}
            entry['hourly_stats'][hour_key] = entry['hourly_stats'].get(hour_key, 0) + 1

            region = estimate_region(ip_prefix)
            if 'region_stats' not in entry:
                entry['region_stats'] = {}
            entry['region_stats'][region] = entry['region_stats'].get(region, 0) + 1

            if len(entry.get('access_log', [])) > 1000:
                entry['access_log'] = entry['access_log'][-500:]
            entry.setdefault('access_log', []).append({
                'time': now.isoformat(),
                'ip_prefix': ip_prefix
            })

            save_single_entry(code, entry)

            return redirect(entry['long_url'])
        else:
            return render_template('password.html', code=code, error='密码错误')

    return render_template('password.html', code=code)


@app.route('/stats/<code>')
def stats(code):
    entry = short_links.get(code)
    if not entry:
        abort(404)

    now = datetime.now()
    last_24h = now - timedelta(hours=24)

    hourly_data = []
    for i in range(24):
        hour = (now - timedelta(hours=i)).strftime('%Y-%m-%d %H:00')
        count = entry.get('hourly_stats', {}).get(hour, 0)
        hourly_data.append({
            'hour': (now - timedelta(hours=i)).strftime('%H:00'),
            'count': count
        })
    hourly_data.reverse()

    region_data = dict(entry.get('region_stats', {}))

    return render_template('stats.html',
                         code=code,
                         entry=entry,
                         hourly_data=hourly_data,
                         region_data=region_data,
                         short_url=f"{request.host_url}{code}")


@app.route('/manage/<code>', methods=['GET', 'POST'])
def manage(code):
    entry = short_links.get(code)
    if not entry:
        abort(404)

    if request.method == 'POST':
        admin_key = request.form.get('admin_key', '').strip()
        if admin_key != entry.get('admin_key'):
            return render_template('manage.html', code=code, error='管理密钥错误')
        return redirect(f'/admin/{code}?key={admin_key}')

    return render_template('manage.html', code=code)


@app.route('/admin/<code>', methods=['GET', 'POST'])
def admin(code):
    entry = short_links.get(code)
    if not entry:
        abort(404)

    admin_key = request.args.get('key', '') or request.form.get('admin_key', '')
    if admin_key != entry.get('admin_key'):
        return redirect(f'/manage/{code}')

    if request.method == 'POST':
        action = request.form.get('action', '')

        if action == 'update_url':
            new_url = request.form.get('new_url', '').strip()
            if new_url:
                entry['long_url'] = new_url
                save_single_entry(code, entry)

        elif action == 'extend_expiry':
            expiry_type = request.form.get('expiry_type', 'hours')
            expiry_value = request.form.get('expiry_value', '24')
            base_time = datetime.now()
            if entry.get('expiry') and datetime.now().timestamp() < entry['expiry']:
                base_time = datetime.fromtimestamp(entry['expiry'])
            try:
                if expiry_type == 'hours':
                    entry['expiry'] = (base_time + timedelta(hours=int(expiry_value))).timestamp()
                elif expiry_type == 'days':
                    entry['expiry'] = (base_time + timedelta(days=int(expiry_value))).timestamp()
                elif expiry_type == 'permanent':
                    entry['expiry'] = None
                save_single_entry(code, entry)
            except ValueError:
                pass

        elif action == 'reset_password':
            new_password = request.form.get('new_password', '').strip()
            if new_password:
                entry['password'] = hash_password(new_password)
            else:
                entry['password'] = None
            save_single_entry(code, entry)

        elif action == 'delete':
            del short_links[code]
            remove_entry(code)
            qr_path = os.path.join(QR_DIR, f'{code}.png')
            if os.path.exists(qr_path):
                os.remove(qr_path)
            return render_template('deleted.html')

    return render_template('admin.html',
                         code=code,
                         entry=entry,
                         admin_key=admin_key,
                         short_url=f"{request.host_url}{code}")


@app.route('/batch', methods=['GET', 'POST'])
def batch_create():
    if request.method == 'POST':
        if 'file' not in request.files:
            return render_template('batch.html', error='请上传CSV文件')

        file = request.files['file']
        if file.filename == '':
            return render_template('batch.html', error='请选择文件')

        if not file.filename.endswith('.csv'):
            return render_template('batch.html', error='仅支持CSV文件')

        ip = request.remote_addr or '127.0.0.1'
        stream = StringIO(file.stream.read().decode('utf-8'))
        reader = csv.reader(stream)
        results = []

        for row in reader:
            if not row:
                continue
            long_url = row[0].strip() if len(row) > 0 else ''
            custom_code = row[1].strip() if len(row) > 1 else ''
            password = row[2].strip() if len(row) > 2 else ''

            if not long_url or not long_url.startswith(('http://', 'https://')):
                results.append({'long_url': long_url, 'short_url': '', 'error': '无效的URL'})
                continue

            if not check_rate_limit(ip):
                results.append({'long_url': long_url, 'short_url': '', 'error': '请求过于频繁'})
                continue

            if custom_code:
                if custom_code in short_links:
                    results.append({'long_url': long_url, 'short_url': '', 'error': '短码已存在'})
                    continue
                code = custom_code
            else:
                code = generate_short_code()

            admin_key = secrets.token_urlsafe(16)
            entry = {
                'long_url': long_url,
                'created_at': datetime.now().isoformat(),
                'expiry': None,
                'password': hash_password(password) if password else None,
                'admin_key': admin_key,
                'clicks': 0,
                'last_access': None,
                'access_log': [],
                'hourly_stats': {},
                'region_stats': {},
            }

            with links_lock:
                short_links[code] = entry
            save_single_entry(code, entry)

            results.append({
                'long_url': long_url,
                'short_url': f"{request.host_url}{code}",
                'short_code': code,
                'admin_key': admin_key
            })

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['长网址', '短链接', '短码', '管理密钥', '备注'])
        for r in results:
            writer.writerow([r.get('long_url', ''), r.get('short_url', ''),
                           r.get('short_code', ''), r.get('admin_key', ''), r.get('error', '')])

        output.seek(0)
        csv_content = output.getvalue()

        output_io = io.BytesIO(csv_content.encode('utf-8'))
        output_io.seek(0)

        return send_file(
            output_io,
            mimetype='text/csv',
            as_attachment=True,
            download_name='shortlinks_result.csv'
        )

    return render_template('batch.html')


@app.route('/qrcode/<code>')
def generate_qrcode(code):
    entry = short_links.get(code)
    if not entry:
        abort(404)

    qr_path = os.path.join(QR_DIR, f'{code}.png')
    short_url = f"{request.host_url}{code}"

    if not os.path.exists(qr_path) and HAS_QRCODE:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(short_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(qr_path)

    if os.path.exists(qr_path):
        return send_file(qr_path, mimetype='image/png')
    else:
        abort(404)


@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404


@app.template_filter('datetime')
def format_datetime(timestamp):
    if timestamp is None:
        return '永久有效'
    try:
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, OSError):
        return str(timestamp)


@app.context_processor
def inject_now():
    return {'now': datetime.now()}


if __name__ == '__main__':
    load_data()
    init_ip_lookup()
    cleanup_thread = threading.Thread(target=scheduled_cleanup, daemon=True)
    cleanup_thread.start()
    app.run(debug=True, host='0.0.0.0', port=5000)