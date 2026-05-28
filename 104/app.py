#!/usr/bin/env python3
from flask import Flask, render_template, request, jsonify, session, send_file, make_response
import io
import datetime
import socket
from password_utils import (
    generate_password,
    generate_passphrase,
    generate_wifi_qr_string,
    check_password_strength,
    batch_check_passwords,
    encrypt_csv
)

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-in-production'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024


def find_available_port(start_port=5000, max_port=5100):
    for port in range(start_port, max_port + 1):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('127.0.0.1', port))
            sock.close()
            if result != 0:
                return port
        except:
            continue
    return start_port


def get_password_history():
    if 'password_history' not in session:
        session['password_history'] = []
    return session['password_history']


def add_to_history(password, ptype='generated'):
    history = get_password_history()
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    history.insert(0, {
        'password': password,
        'type': ptype,
        'timestamp': timestamp,
        'length': len(password)
    })
    if len(history) > 10:
        history = history[:10]
    session['password_history'] = history
    return history


@app.route('/')
def index():
    history = get_password_history()
    return render_template('index.html', history=history)


@app.route('/generate', methods=['POST'])
def generate():
    try:
        length = int(request.form.get('length', 12))
        include_upper = request.form.get('include_upper') == 'on'
        include_lower = request.form.get('include_lower') == 'on'
        include_digits = request.form.get('include_digits') == 'on'
        include_special = request.form.get('include_special') == 'on'
        exclude_confusing = request.form.get('exclude_confusing') == 'on'
        count = int(request.form.get('count', 1))

        if length < 4 or length > 64:
            return jsonify({'error': '密码长度必须在4-64之间'}), 400
        if count < 1 or count > 10:
            return jsonify({'error': '生成数量必须在1-10之间'}), 400

        passwords = generate_password(
            length=length,
            include_upper=include_upper,
            include_lower=include_lower,
            include_digits=include_digits,
            include_special=include_special,
            exclude_confusing=exclude_confusing,
            count=count
        )

        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        for pwd in passwords:
            add_to_history(pwd, 'generated')

        return jsonify({
            'passwords': passwords,
            'count': len(passwords),
            'timestamp': timestamp
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@app.route('/generate_passphrase', methods=['POST'])
def generate_pp():
    try:
        num_words = int(request.form.get('num_words', 4))
        include_number = request.form.get('include_number') == 'on'

        if num_words < 2 or num_words > 8:
            return jsonify({'error': '单词数量必须在2-8之间'}), 400

        passphrase = generate_passphrase(num_words, include_number)
        add_to_history(passphrase, 'passphrase')

        return jsonify({
            'passphrase': passphrase,
            'length': len(passphrase)
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@app.route('/generate_wifi', methods=['POST'])
def generate_wifi():
    try:
        ssid = request.form.get('ssid', '').strip()
        encryption = request.form.get('encryption', 'WPA')
        custom_password = request.form.get('wifi_password', '').strip()

        if not ssid:
            return jsonify({'error': '请输入WiFi名称(SSID)'}), 400

        password = custom_password if custom_password else None
        qr_string, wifi_password = generate_wifi_qr_string(ssid, password, encryption)

        if not custom_password:
            add_to_history(wifi_password, 'wifi')

        return jsonify({
            'ssid': ssid,
            'password': wifi_password,
            'encryption': encryption,
            'qr_string': qr_string
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@app.route('/check_strength', methods=['POST'])
def check_strength():
    password = request.form.get('password', '')
    if not password:
        return jsonify({'error': '请输入密码'}), 400

    analysis = check_password_strength(password)
    return jsonify(analysis)


@app.route('/batch_check', methods=['POST'])
def batch_check():
    if 'file' not in request.files:
        return jsonify({'error': '请上传文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '请选择文件'}), 400

    if not file.filename.endswith('.txt'):
        return jsonify({'error': '只支持TXT文件'}), 400

    try:
        content = file.read().decode('utf-8')
        password_list = content.split('\n')
        results = batch_check_passwords(password_list)
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': f'文件处理失败: {str(e)}'}), 500


@app.route('/export_csv', methods=['POST'])
def export_csv():
    encryption_password = request.form.get('encryption_password', '')
    if not encryption_password or len(encryption_password) < 6:
        return jsonify({'error': '加密密码至少6位'}), 400

    history = get_password_history()
    if not history:
        return jsonify({'error': '没有可导出的密码'}), 400

    try:
        encrypted_data = encrypt_csv(history, encryption_password)
        output = io.BytesIO(encrypted_data)

        response = make_response(send_file(
            output,
            mimetype='application/zip',
            as_attachment=True,
            download_name='passwords_encrypted.zip'
        ))
        response.headers['Content-Disposition'] = 'attachment; filename=passwords_encrypted.zip'
        return response
    except Exception as e:
        return jsonify({'error': f'导出失败: {str(e)}'}), 500


@app.route('/clear_history', methods=['POST'])
def clear_history():
    session['password_history'] = []
    return jsonify({'success': True})


@app.route('/api/generate', methods=['POST'])
def api_generate():
    data = request.get_json() or {}
    try:
        length = int(data.get('length', 12))
        include_upper = data.get('include_upper', True)
        include_lower = data.get('include_lower', True)
        include_digits = data.get('include_digits', True)
        include_special = data.get('include_special', True)
        exclude_confusing = data.get('exclude_confusing', True)
        count = int(data.get('count', 1))

        if length < 4 or length > 64:
            return jsonify({'error': '密码长度必须在4-64之间'}), 400
        if count < 1 or count > 10:
            return jsonify({'error': '生成数量必须在1-10之间'}), 400

        passwords = generate_password(
            length=length,
            include_upper=include_upper,
            include_lower=include_lower,
            include_digits=include_digits,
            include_special=include_special,
            exclude_confusing=exclude_confusing,
            count=count
        )

        return jsonify({
            'success': True,
            'passwords': passwords,
            'count': len(passwords)
        })
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/check_strength', methods=['POST'])
def api_check_strength():
    data = request.get_json() or {}
    password = data.get('password', '')
    if not password:
        return jsonify({'success': False, 'error': '请输入密码'}), 400

    analysis = check_password_strength(password)
    return jsonify({
        'success': True,
        'analysis': analysis
    })


@app.route('/api/batch_check', methods=['POST'])
def api_batch_check():
    data = request.get_json() or {}
    password_list = data.get('passwords', [])
    if not password_list:
        return jsonify({'success': False, 'error': '请提供密码列表'}), 400

    results = batch_check_passwords(password_list)
    return jsonify({
        'success': True,
        'results': results
    })


if __name__ == '__main__':
    port = find_available_port()
    print(f"Starting server on port {port}...")
    app.run(debug=False, host='0.0.0.0', port=port)
