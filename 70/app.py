#!/usr/bin/env python3
import os
import json
import time
import string
import random
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from io import BytesIO
from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify, abort
from pygments import highlight
from pygments.lexers import get_lexer_for_filename, guess_lexer, get_all_lexers
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound
import qrcode
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024

STORAGE_FILE = 'pastes.json'
pastes = {}

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri="memory://",
)

def load_pastes():
    global pastes
    if os.path.exists(STORAGE_FILE):
        try:
            with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
                pastes = json.load(f)
        except:
            pastes = {}
    cleanup_expired()

def save_pastes():
    with open(STORAGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(pastes, f, ensure_ascii=False, indent=2)

def generate_code():
    chars = string.ascii_lowercase + string.digits
    while True:
        code = ''.join(random.choice(chars) for _ in range(6))
        if code not in pastes:
            return code

def generate_delete_key():
    return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(16))

def cleanup_expired():
    now = time.time()
    expired = [code for code, data in pastes.items() 
               if data.get('expires_at') and data['expires_at'] < now]
    for code in expired:
        del pastes[code]
    if expired:
        save_pastes()

def get_expiration_options():
    return [
        ('3600', '1小时'),
        ('86400', '1天'),
        ('604800', '1周'),
        ('0', '永不过期'),
    ]

def detect_language(content):
    try:
        lexer = guess_lexer(content)
        return lexer.name
    except ClassNotFound:
        return None

def highlight_code(content, language=None):
    try:
        if language:
            lexer = None
            for name, aliases, _, _ in get_all_lexers():
                if language.lower() in [a.lower() for a in aliases] or language.lower() == name.lower():
                    lexer = get_lexer_for_filename('dummy.' + aliases[0])
                    break
            if not lexer:
                lexer = guess_lexer(content)
        else:
            lexer = guess_lexer(content)
        formatter = HtmlFormatter(style='monokai', linenos=True, cssclass='codehilite')
        return highlight(content, lexer, formatter), lexer.name
    except:
        return None, None

@app.template_filter('datetime_format')
def datetime_format(ts):
    return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')

@app.template_filter('time_remaining')
def time_remaining(ts):
    if not ts:
        return '永不过期'
    remaining = ts - time.time()
    if remaining <= 0:
        return '已过期'
    hours = int(remaining // 3600)
    minutes = int((remaining % 3600) // 60)
    if hours > 24:
        days = hours // 24
        hours = hours % 24
        return f'{days}天{hours}小时'
    return f'{hours}小时{minutes}分钟'

@app.route('/')
def index():
    cleanup_expired()
    return render_template('index.html', 
                         expiration_options=get_expiration_options())

@app.route('/submit', methods=['POST'])
@limiter.limit("5 per minute")
def submit():
    content = request.form.get('content', '').strip()
    password = request.form.get('password', '').strip()
    expiration = int(request.form.get('expiration', 0))
    one_time = request.form.get('one_time') == 'on'
    
    if not content:
        flash('请输入文本内容', 'error')
        return redirect(url_for('index'))
    
    if len(content.encode('utf-8')) > 100 * 1024:
        flash('文本大小不能超过100KB', 'error')
        return redirect(url_for('index'))
    
    code = generate_code()
    delete_key = generate_delete_key()
    now = time.time()
    
    expires_at = None
    if expiration > 0:
        expires_at = now + expiration
    
    pastes[code] = {
        'content': content,
        'password': hashlib.sha256(password.encode()).hexdigest() if password else None,
        'expires_at': expires_at,
        'one_time': one_time,
        'created_at': now,
        'views': 0,
        'delete_key': delete_key,
        'ip': request.remote_addr,
    }
    
    save_pastes()
    
    return render_template('result.html', 
                         code=code, 
                         delete_key=delete_key,
                         base_url=request.host_url.rstrip('/'))

@app.route('/api/submit', methods=['POST'])
@limiter.limit("5 per minute")
def api_submit():
    data = request.get_json() or request.form
    content = data.get('content', '').strip()
    password = data.get('password', '').strip()
    expiration = int(data.get('expiration', 0))
    one_time = data.get('one_time', False)
    
    if not content:
        return jsonify({'error': '请输入文本内容'}), 400
    
    if len(content.encode('utf-8')) > 100 * 1024:
        return jsonify({'error': '文本大小不能超过100KB'}), 400
    
    code = generate_code()
    delete_key = generate_delete_key()
    now = time.time()
    
    expires_at = None
    if expiration > 0:
        expires_at = now + expiration
    
    pastes[code] = {
        'content': content,
        'password': hashlib.sha256(password.encode()).hexdigest() if password else None,
        'expires_at': expires_at,
        'one_time': one_time,
        'created_at': now,
        'views': 0,
        'delete_key': delete_key,
        'ip': request.remote_addr,
    }
    
    save_pastes()
    
    return jsonify({
        'code': code,
        'delete_key': delete_key,
        'url': f"{request.host_url.rstrip('/')}/s/{code}"
    })

@app.route('/s/<code>', methods=['GET', 'POST'])
def view(code):
    cleanup_expired()
    
    if code not in pastes:
        abort(404)
    
    paste = pastes[code]
    
    if paste.get('password'):
        if request.method == 'POST':
            input_password = request.form.get('password', '')
            if hashlib.sha256(input_password.encode()).hexdigest() != paste['password']:
                flash('密码错误', 'error')
                return render_template('password.html', code=code)
        else:
            return render_template('password.html', code=code)
    
    paste['views'] += 1
    save_pastes()
    
    content = paste['content']
    views = paste['views']
    created_at = paste['created_at']
    expires_at = paste.get('expires_at')
    one_time = paste.get('one_time', False)
    
    language = detect_language(content)
    highlighted = None
    if language:
        highlighted, detected_lang = highlight_code(content)
    
    if one_time:
        del pastes[code]
        save_pastes()
    
    return render_template('view.html',
                         code=code,
                         content=content,
                         highlighted=highlighted,
                         language=language,
                         views=views,
                         created_at=created_at,
                         expires_at=expires_at,
                         one_time=one_time,
                         base_url=request.host_url.rstrip('/'))

@app.route('/s/<code>/raw')
def view_raw(code):
    cleanup_expired()
    
    if code not in pastes:
        abort(404)
    
    paste = pastes[code]
    
    if paste.get('password'):
        abort(403)
    
    paste['views'] += 1
    save_pastes()
    
    return paste['content'], 200, {'Content-Type': 'text/plain; charset=utf-8'}

@app.route('/s/<code>/download')
def download(code):
    cleanup_expired()
    
    if code not in pastes:
        abort(404)
    
    paste = pastes[code]
    
    if paste.get('password'):
        flash('请先输入密码', 'error')
        return redirect(url_for('view', code=code))
    
    return send_file(
        BytesIO(paste['content'].encode('utf-8')),
        mimetype='text/plain',
        as_attachment=True,
        download_name=f'{code}.txt'
    )

@app.route('/api/qrcode')
def qrcode_view():
    code = request.args.get('code', '').strip()
    
    cleanup_expired()
    
    if not code or code not in pastes:
        abort(404)
    
    url = f"{request.host_url.rstrip('/')}/s/{code}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, 'PNG')
    buffer.seek(0)
    
    return send_file(buffer, mimetype='image/png')

@app.route('/list')
def list_pastes():
    cleanup_expired()
    active_pastes = [
        {
            'code': code,
            'created_at': data['created_at'],
            'expires_at': data.get('expires_at'),
            'views': data['views'],
            'has_password': data.get('password') is not None,
            'one_time': data.get('one_time', False),
        }
        for code, data in pastes.items()
    ]
    active_pastes.sort(key=lambda x: x['created_at'], reverse=True)
    return render_template('list.html', pastes=active_pastes)

@app.route('/delete', methods=['GET', 'POST'])
def delete():
    if request.method == 'POST':
        code = request.form.get('code', '').strip()
        delete_key = request.form.get('delete_key', '').strip()
        
        if code not in pastes:
            flash('文本不存在', 'error')
            return render_template('delete.html')
        
        if pastes[code]['delete_key'] == delete_key:
            del pastes[code]
            save_pastes()
            flash('删除成功', 'success')
            return redirect(url_for('index'))
        else:
            flash('删除密钥错误', 'error')
    
    return render_template('delete.html')

@app.route('/api/delete', methods=['POST'])
def api_delete():
    data = request.get_json() or request.form
    code = data.get('code', '').strip()
    delete_key = data.get('delete_key', '').strip()
    
    if code not in pastes:
        return jsonify({'error': '文本不存在'}), 404
    
    if pastes[code]['delete_key'] == delete_key:
        del pastes[code]
        save_pastes()
        return jsonify({'success': True})
    else:
        return jsonify({'error': '删除密钥错误'}), 403

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(429)
def rate_limit(e):
    return jsonify({'error': '提交过于频繁，请稍后再试'}), 429

if __name__ == '__main__':
    load_pastes()
    app.run(debug=True, host='0.0.0.0', port=5001)
