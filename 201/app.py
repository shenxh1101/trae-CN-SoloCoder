import os
import io
import csv
import uuid
import random
import string
import struct
import secrets
from datetime import datetime, timedelta
from functools import wraps
from collections import defaultdict

import validators
import qrcode
from flask import (
    Flask, render_template, request, redirect, url_for,
    jsonify, send_file, abort, Response, session, flash
)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///shorturls.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

db = SQLAlchemy(app)

SHORTCODE_CHARS = string.ascii_letters + string.digits
SHORTCODE_LENGTH = 6


class ShortURL(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    short_code = db.Column(db.String(10), unique=True, nullable=False, index=True)
    original_url = db.Column(db.String(2048), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    password_hash = db.Column(db.String(256))
    admin_key = db.Column(db.String(64), unique=True, nullable=False)
    click_count = db.Column(db.Integer, default=0)
    visits = db.relationship('VisitLog', backref='short_url', cascade='all, delete-orphan', lazy='dynamic')


class VisitLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    short_url_id = db.Column(db.Integer, db.ForeignKey('short_url.id'), nullable=False)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(512))
    province = db.Column(db.String(64))
    accessed_at = db.Column(db.DateTime, default=datetime.utcnow)


class IP2Region:
    def __init__(self, db_path):
        self.db_path = db_path
        self._db_file = None
        self._header = None
        self._vector_index = None
        self.load_db()

    def load_db(self):
        try:
            with open(self.db_path, 'rb') as f:
                self._db_file = f.read()
            self._header = struct.unpack('<QQQ', self._db_file[:24])
            vector_index_len = self._header[1] - self._header[0]
            self._vector_index = self._db_file[self._header[0]:self._header[1]]
        except Exception as e:
            print(f"IP2Region init failed: {e}")
            self._db_file = None

    def _ip2long(self, ip):
        parts = ip.split('.')
        return (int(parts[0]) << 24) | (int(parts[1]) << 16) | (int(parts[2]) << 8) | int(parts[3])

    def search(self, ip):
        if not self._db_file or not ip or ':' in ip:
            return '未知'
        try:
            ip_long = self._ip2long(ip)
            idx = (ip_long >> 16) * 8
            if idx + 8 > len(self._vector_index):
                return '未知'
            s_ptr, e_ptr = struct.unpack('<II', self._vector_index[idx:idx + 8])
            data_len = 0
            data_ptr = 0
            l = 0
            h = (e_ptr - s_ptr) // 12
            while l <= h:
                m = (l + h) >> 1
                p = s_ptr + m * 12
                sip = struct.unpack('<I', self._db_file[p:p + 4])[0]
                if ip_long < sip:
                    h = m - 1
                else:
                    eip = struct.unpack('<I', self._db_file[p + 4:p + 8])[0]
                    if ip_long > eip:
                        l = m + 1
                    else:
                        data_ptr = struct.unpack('<I', self._db_file[p + 8:p + 12])[0]
                        data_len = (data_ptr >> 24) & 0xFF
                        data_ptr &= 0x00FFFFFF
                        break
            if data_ptr == 0:
                return '未知'
            region = self._db_file[data_ptr + 4:data_ptr + data_len].decode('utf-8', errors='ignore')
            parts = region.split('|')
            if len(parts) >= 3 and parts[2] != '0':
                return parts[2].replace('省', '').replace('市', '')
            if len(parts) >= 2 and parts[1] != '0':
                return parts[1].replace('省', '').replace('市', '')
            return '未知'
        except Exception:
            return '未知'


xdb_path = os.path.join(os.path.dirname(__file__), 'data', 'ip2region.xdb')
ip_searcher = IP2Region(xdb_path)


def generate_short_code():
    for _ in range(5):
        code = ''.join(random.choices(SHORTCODE_CHARS, k=SHORTCODE_LENGTH))
        if not ShortURL.query.filter_by(short_code=code).first():
            return code
    code = ''.join(random.choices(SHORTCODE_CHARS, k=8))
    return code


def validate_url(url):
    if not url:
        return False
    url = url.strip()
    if validators.url(url, public=True):
        return True
    if validators.url(url):
        return True
    return False


def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    if request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    return request.remote_addr


def get_hourly_stats(short_url_id):
    now = datetime.utcnow()
    hourly = [0] * 24
    visits = VisitLog.query.filter(
        VisitLog.short_url_id == short_url_id,
        VisitLog.accessed_at >= now - timedelta(hours=24)
    ).all()
    for visit in visits:
        hour = 23 - int((now - visit.accessed_at).total_seconds() // 3600)
        if 0 <= hour < 24:
            hourly[hour] += 1
    return hourly


def get_province_stats(short_url_id):
    visits = VisitLog.query.filter_by(short_url_id=short_url_id).all()
    province_counts = defaultdict(int)
    for visit in visits:
        province = visit.province or '未知'
        province_counts[province] += 1
    return dict(province_counts)


def to_dict(short_url):
    data = {
        'short_code': short_url.short_code,
        'original_url': short_url.original_url,
        'short_url': request.host_url + short_url.short_code,
        'created_at': short_url.created_at.isoformat(),
        'click_count': short_url.click_count,
        'has_password': short_url.password_hash is not None,
        'admin_key': short_url.admin_key,
    }
    if short_url.expires_at:
        data['expires_at'] = short_url.expires_at.isoformat()
        data['is_expired'] = datetime.utcnow() > short_url.expires_at
    else:
        data['expires_at'] = None
        data['is_expired'] = False
    return data


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/create', methods=['POST'])
def create_short_url():
    original_url = request.form.get('url', '').strip()
    custom_code = request.form.get('custom_code', '').strip()
    expire_days = request.form.get('expire_days', '0')
    password = request.form.get('password', '')

    if not validate_url(original_url):
        return jsonify({'success': False, 'error': '请输入有效的URL地址'}), 400

    if custom_code:
        if len(custom_code) < 3 or len(custom_code) > 10:
            return jsonify({'success': False, 'error': '自定义短码长度需在3-10位之间'}), 400
        if not all(c in SHORTCODE_CHARS for c in custom_code):
            return jsonify({'success': False, 'error': '自定义短码只能包含字母和数字'}), 400
        if ShortURL.query.filter_by(short_code=custom_code).first():
            return jsonify({'success': False, 'error': '该短码已被使用'}), 400
        short_code = custom_code
    else:
        short_code = generate_short_code()

    expires_at = None
    try:
        days = int(expire_days)
        if days > 0:
            expires_at = datetime.utcnow() + timedelta(days=days)
    except (ValueError, TypeError):
        pass

    password_hash = None
    if password:
        password_hash = generate_password_hash(password)

    admin_key = secrets.token_urlsafe(16)

    short_url = ShortURL(
        short_code=short_code,
        original_url=original_url,
        expires_at=expires_at,
        password_hash=password_hash,
        admin_key=admin_key
    )

    db.session.add(short_url)
    db.session.commit()

    return jsonify({
        'success': True,
        'short_code': short_code,
        'short_url': request.host_url + short_code,
        'admin_key': admin_key,
        'expires_at': expires_at.isoformat() if expires_at else None,
        'has_password': password_hash is not None
    })


@app.route('/<short_code>')
def redirect_to_url(short_code):
    short_url = ShortURL.query.filter_by(short_code=short_code).first()

    if not short_url:
        abort(404)

    if short_url.expires_at and datetime.utcnow() > short_url.expires_at:
        return render_template('expired.html'), 410

    if short_url.password_hash:
        if session.get('authenticated_' + short_code) != True:
            return redirect(url_for('password_prompt', short_code=short_code))

    ip = get_client_ip()
    user_agent = request.user_agent.string[:512]
    province = ip_searcher.search(ip)

    visit = VisitLog(
        short_url_id=short_url.id,
        ip_address=ip,
        user_agent=user_agent,
        province=province
    )
    short_url.click_count += 1
    db.session.add(visit)
    db.session.commit()

    return redirect(short_url.original_url, code=302)


@app.route('/<short_code>/password', methods=['GET', 'POST'])
def password_prompt(short_code):
    short_url = ShortURL.query.filter_by(short_code=short_code).first()

    if not short_url:
        abort(404)

    if short_url.expires_at and datetime.utcnow() > short_url.expires_at:
        return render_template('expired.html'), 410

    if request.method == 'POST':
        password = request.form.get('password', '')
        if check_password_hash(short_url.password_hash, password):
            session['authenticated_' + short_code] = True
            return redirect(url_for('redirect_to_url', short_code=short_code))
        return render_template('password.html', short_code=short_code, error='密码错误')

    return render_template('password.html', short_code=short_code)


@app.route('/<short_code>/qr')
def generate_qr(short_code):
    short_url = ShortURL.query.filter_by(short_code=short_code).first()
    if not short_url:
        abort(404)

    short_url_full = request.host_url + short_code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(short_url_full)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)

    return send_file(img_io, mimetype='image/png')


@app.route('/<short_code>/stats')
def view_stats(short_code):
    short_url = ShortURL.query.filter_by(short_code=short_code).first()
    if not short_url:
        abort(404)

    hourly = get_hourly_stats(short_url.id)
    provinces = get_province_stats(short_url.id)

    return render_template('stats.html',
                           short_url=short_url,
                           hourly=hourly,
                           provinces=provinces,
                           short_url_full=request.host_url + short_code)


@app.route('/<short_code>/delete', methods=['POST'])
def delete_short_url(short_code):
    admin_key = request.form.get('admin_key', '')
    short_url = ShortURL.query.filter_by(short_code=short_code).first()

    if not short_url:
        return jsonify({'success': False, 'error': '短网址不存在'}), 404

    if admin_key != short_url.admin_key:
        return jsonify({'success': False, 'error': '管理密钥错误'}), 403

    db.session.delete(short_url)
    db.session.commit()

    return jsonify({'success': True, 'message': '删除成功'})


@app.route('/admin')
def admin_page():
    return render_template('admin.html')


@app.route('/admin/check', methods=['POST'])
def admin_check():
    short_code = request.form.get('short_code', '')
    admin_key = request.form.get('admin_key', '')

    short_url = ShortURL.query.filter_by(short_code=short_code).first()
    if not short_url:
        return jsonify({'success': False, 'error': '短网址不存在'}), 404

    if admin_key != short_url.admin_key:
        return jsonify({'success': False, 'error': '管理密钥错误'}), 403

    hourly = get_hourly_stats(short_url.id)
    provinces = get_province_stats(short_url.id)

    visits = VisitLog.query.filter_by(short_url_id=short_url.id).order_by(VisitLog.accessed_at.desc()).limit(50).all()
    visit_list = [{
        'ip': v.ip_address,
        'province': v.province or '未知',
        'user_agent': v.user_agent,
        'time': v.accessed_at.strftime('%Y-%m-%d %H:%M:%S')
    } for v in visits]

    return jsonify({
        'success': True,
        'short_code': short_url.short_code,
        'original_url': short_url.original_url,
        'click_count': short_url.click_count,
        'created_at': short_url.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'expires_at': short_url.expires_at.strftime('%Y-%m-%d %H:%M:%S') if short_url.expires_at else '永不过期',
        'hourly': hourly,
        'provinces': provinces,
        'visits': visit_list
    })


@app.route('/logs/stream')
def logs_stream():
    import json
    def generate():
        last_id = 0
        while True:
            visits = VisitLog.query.filter(VisitLog.id > last_id).order_by(VisitLog.id).limit(100).all()
            for visit in visits:
                short_url = ShortURL.query.get(visit.short_url_id)
                if short_url:
                    data = {
                        'id': visit.id,
                        'short_code': short_url.short_code,
                        'original_url': short_url.original_url,
                        'ip': visit.ip_address,
                        'province': visit.province or '未知',
                        'user_agent': visit.user_agent,
                        'time': visit.accessed_at.strftime('%Y-%m-%d %H:%M:%S')
                    }
                    yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                last_id = visit.id
            import time
            time.sleep(1)

    return Response(generate(), mimetype='text/event-stream')


@app.route('/batch', methods=['GET', 'POST'])
def batch_create():
    if request.method == 'GET':
        return render_template('batch.html')

    if 'csv_file' not in request.files:
        return jsonify({'success': False, 'error': '请上传CSV文件'}), 400

    file = request.files['csv_file']
    if file.filename == '':
        return jsonify({'success': False, 'error': '请上传CSV文件'}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({'success': False, 'error': '请上传CSV格式文件'}), 400

    stream = io.StringIO(file.stream.read().decode('UTF-8'), newline=None)
    reader = csv.reader(stream)

    results = []
    for row in reader:
        if not row:
            continue
        original_url = row[0].strip()
        if not validate_url(original_url):
            results.append({'original_url': original_url, 'error': '无效URL'})
            continue

        short_code = generate_short_code()
        admin_key = secrets.token_urlsafe(16)

        short_url = ShortURL(
            short_code=short_code,
            original_url=original_url,
            admin_key=admin_key
        )
        db.session.add(short_url)
        results.append({
            'original_url': original_url,
            'short_code': short_code,
            'short_url': request.host_url + short_code,
            'admin_key': admin_key
        })

    db.session.commit()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['原始URL', '短码', '短网址', '管理密钥'])
    for r in results:
        if 'error' in r:
            writer.writerow([r['original_url'], '', '', r['error']])
        else:
            writer.writerow([r['original_url'], r['short_code'], r['short_url'], r['admin_key']])

    output.seek(0)
    return Response(
        output,
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename="shorturls.csv"'}
    )


@app.route('/export')
def export_stats():
    short_urls = ShortURL.query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['短码', '原始URL', '短网址', '创建时间', '过期时间', '点击量', '管理密钥'])

    for su in short_urls:
        writer.writerow([
            su.short_code,
            su.original_url,
            request.host_url + su.short_code,
            su.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            su.expires_at.strftime('%Y-%m-%d %H:%M:%S') if su.expires_at else '永不过期',
            su.click_count,
            su.admin_key
        ])

    output.seek(0)
    return Response(
        output,
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename="all_shorturls.csv"'}
    )


@app.route('/api/shorten', methods=['POST'])
def api_shorten():
    data = request.get_json() or {}
    original_url = data.get('url', '').strip()
    custom_code = data.get('custom_code', '').strip()
    expire_days = data.get('expire_days', 0)
    password = data.get('password', '')

    if not validate_url(original_url):
        return jsonify({'success': False, 'error': '请输入有效的URL地址'}), 400

    if custom_code:
        if len(custom_code) < 3 or len(custom_code) > 10:
            return jsonify({'success': False, 'error': '自定义短码长度需在3-10位之间'}), 400
        if not all(c in SHORTCODE_CHARS for c in custom_code):
            return jsonify({'success': False, 'error': '自定义短码只能包含字母和数字'}), 400
        if ShortURL.query.filter_by(short_code=custom_code).first():
            return jsonify({'success': False, 'error': '该短码已被使用'}), 400
        short_code = custom_code
    else:
        short_code = generate_short_code()

    expires_at = None
    try:
        days = int(expire_days)
        if days > 0:
            expires_at = datetime.utcnow() + timedelta(days=days)
    except (ValueError, TypeError):
        pass

    password_hash = None
    if password:
        password_hash = generate_password_hash(password)

    admin_key = secrets.token_urlsafe(16)

    short_url = ShortURL(
        short_code=short_code,
        original_url=original_url,
        expires_at=expires_at,
        password_hash=password_hash,
        admin_key=admin_key
    )

    db.session.add(short_url)
    db.session.commit()

    return jsonify({
        'success': True,
        'data': to_dict(short_url)
    })


@app.route('/api/<short_code>/stats', methods=['GET'])
def api_stats(short_code):
    short_url = ShortURL.query.filter_by(short_code=short_code).first()
    if not short_url:
        return jsonify({'success': False, 'error': '短网址不存在'}), 404

    admin_key = request.headers.get('X-Admin-Key', '')
    if admin_key != short_url.admin_key:
        return jsonify({'success': False, 'error': '管理密钥错误'}), 403

    hourly = get_hourly_stats(short_url.id)
    provinces = get_province_stats(short_url.id)

    visits = VisitLog.query.filter_by(short_url_id=short_url.id).order_by(VisitLog.accessed_at.desc()).limit(100).all()
    visit_list = [{
        'ip': v.ip_address,
        'province': v.province or '未知',
        'user_agent': v.user_agent,
        'accessed_at': v.accessed_at.isoformat()
    } for v in visits]

    return jsonify({
        'success': True,
        'data': {
            **to_dict(short_url),
            'hourly_stats': hourly,
            'province_stats': provinces,
            'recent_visits': visit_list
        }
    })


@app.route('/api/<short_code>', methods=['DELETE'])
def api_delete(short_code):
    short_url = ShortURL.query.filter_by(short_code=short_code).first()
    if not short_url:
        return jsonify({'success': False, 'error': '短网址不存在'}), 404

    admin_key = request.headers.get('X-Admin-Key', '')
    if admin_key != short_url.admin_key:
        return jsonify({'success': False, 'error': '管理密钥错误'}), 403

    db.session.delete(short_url)
    db.session.commit()

    return jsonify({'success': True, 'message': '删除成功'})


@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404


@app.errorhandler(410)
def gone(e):
    return render_template('expired.html'), 410


def init_db():
    with app.app_context():
        db.create_all()
        print("Database initialized")


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001)
