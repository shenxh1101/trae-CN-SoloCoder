import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_file, send_from_directory, render_template, Response, abort, url_for

from config import (
    UPLOAD_DIR,
    TEMP_DIR,
    MAX_FILE_SIZE,
    ALLOWED_EXTENSIONS,
    PREVIEWABLE_EXTENSIONS
)
from utils import (
    generate_short_code,
    generate_manage_key,
    hash_password,
    load_metadata,
    save_metadata,
    delete_file,
    delete_metadata,
    check_ip_limit,
    is_expired,
    get_expiry_timestamp,
    format_file_size,
    get_remaining_time,
    start_cleanup_thread,
    get_files_by_manage_key
)
from mail_qr import (
    generate_qr_code_base64,
    send_download_link_email,
    send_batch_share_email
)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE * 2


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def previewable_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in PREVIEWABLE_EXTENSIONS


def get_client_ip():
    return request.headers.get('X-Forwarded-For', request.remote_addr)


@app.route('/')
def index():
    return render_template('index.html', max_file_size=format_file_size(MAX_FILE_SIZE))


@app.route('/api/upload/chunk', methods=['POST'])
def upload_chunk():
    file_id = request.form.get('file_id')
    chunk_index = int(request.form.get('chunk_index', 0))
    total_chunks = int(request.form.get('total_chunks', 1))
    filename = request.form.get('filename', '')
    if not file_id or 'chunk' not in request.files:
        return jsonify({'error': '参数错误'}), 400
    if not allowed_file(filename):
        return jsonify({'error': '不支持的文件类型'}), 400
    chunk = request.files['chunk']
    temp_dir = os.path.join(TEMP_DIR, file_id)
    os.makedirs(temp_dir, exist_ok=True)
    chunk_path = os.path.join(temp_dir, f'chunk_{chunk_index}')
    chunk.save(chunk_path)
    return jsonify({'success': True, 'chunk_index': chunk_index})


@app.route('/api/upload/complete', methods=['POST'])
def upload_complete():
    data = request.json
    file_id = data.get('file_id')
    filename = data.get('filename')
    file_size = int(data.get('file_size', 0))
    expiry = data.get('expiry', '1d')
    max_downloads = data.get('max_downloads')
    password = data.get('password')
    email = data.get('email')
    batch_id = data.get('batch_id')
    if not file_id or not filename:
        return jsonify({'error': '参数错误'}), 400
    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': f'文件大小超过限制 ({format_file_size(MAX_FILE_SIZE)})'}), 400
    if not allowed_file(filename):
        return jsonify({'error': '不支持的文件类型'}), 400
    if not check_ip_limit(get_client_ip()):
        return jsonify({'error': '上传频率超限，请稍后重试'}), 429
    temp_dir = os.path.join(TEMP_DIR, file_id)
    if not os.path.exists(temp_dir):
        return jsonify({'error': '上传会话不存在'}), 404
    short_code = generate_short_code()
    manage_key = generate_manage_key()
    storage_filename = f'{short_code}_{uuid.uuid4().hex}'
    file_path = os.path.join(UPLOAD_DIR, storage_filename)
    chunk_files = sorted(
        [f for f in os.listdir(temp_dir) if f.startswith('chunk_')],
        key=lambda x: int(x.split('_')[1])
    )
    with open(file_path, 'wb') as outfile:
        for chunk_file in chunk_files:
            chunk_path = os.path.join(temp_dir, chunk_file)
            with open(chunk_path, 'rb') as infile:
                outfile.write(infile.read())
    for chunk_file in os.listdir(temp_dir):
        os.remove(os.path.join(temp_dir, chunk_file))
    try:
        os.rmdir(temp_dir)
    except OSError:
        pass
    actual_size = os.path.getsize(file_path)
    if actual_size > MAX_FILE_SIZE:
        os.remove(file_path)
        return jsonify({'error': f'文件大小超过限制 ({format_file_size(MAX_FILE_SIZE)})'}), 400
    metadata = {
        'short_code': short_code,
        'original_filename': filename,
        'storage_filename': storage_filename,
        'file_size': actual_size,
        'content_type': data.get('content_type', 'application/octet-stream'),
        'uploaded_at': datetime.now().timestamp(),
        'uploader_ip': get_client_ip(),
        'expires_at': get_expiry_timestamp(expiry),
        'max_downloads': int(max_downloads) if max_downloads else None,
        'download_count': 0,
        'password_hash': hash_password(password) if password else None,
        'manage_key': manage_key,
        'batch_id': batch_id,
        'is_previewable': previewable_file(filename)
    }
    save_metadata(short_code, metadata)
    download_url = url_for('download_file', short_code=short_code, _external=True)
    delete_url = url_for('delete_file_api', short_code=short_code, manage_key=manage_key, _external=True)
    if email:
        expiry_info = ''
        if metadata['expires_at']:
            expiry_info = f'有效期: {get_remaining_time(metadata["expires_at"])}'
        send_download_link_email(email, download_url, filename, expiry_info)
    return jsonify({
        'success': True,
        'short_code': short_code,
        'download_url': download_url,
        'delete_url': delete_url,
        'manage_key': manage_key,
        'filename': filename,
        'file_size': file_size,
        'formatted_size': format_file_size(file_size)
    })


@app.route('/api/upload/single', methods=['POST'])
def upload_single():
    if 'file' not in request.files:
        return jsonify({'error': '未选择文件'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    filename = file.filename
    if not allowed_file(filename):
        return jsonify({'error': '不支持的文件类型'}), 400
    if not check_ip_limit(get_client_ip()):
        return jsonify({'error': '上传频率超限，请稍后重试'}), 429
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': f'文件大小超过限制 ({format_file_size(MAX_FILE_SIZE)})'}), 400
    expiry = request.form.get('expiry', '1d')
    max_downloads = request.form.get('max_downloads')
    password = request.form.get('password')
    email = request.form.get('email')
    short_code = generate_short_code()
    manage_key = generate_manage_key()
    storage_filename = f'{short_code}_{uuid.uuid4().hex}'
    file_path = os.path.join(UPLOAD_DIR, storage_filename)
    file.save(file_path)
    metadata = {
        'short_code': short_code,
        'original_filename': filename,
        'storage_filename': storage_filename,
        'file_size': file_size,
        'content_type': file.content_type or 'application/octet-stream',
        'uploaded_at': datetime.now().timestamp(),
        'uploader_ip': get_client_ip(),
        'expires_at': get_expiry_timestamp(expiry),
        'max_downloads': int(max_downloads) if max_downloads else None,
        'download_count': 0,
        'password_hash': hash_password(password) if password else None,
        'manage_key': manage_key,
        'batch_id': None,
        'is_previewable': previewable_file(filename)
    }
    save_metadata(short_code, metadata)
    download_url = url_for('download_file', short_code=short_code, _external=True)
    delete_url = url_for('delete_file_api', short_code=short_code, manage_key=manage_key, _external=True)
    if email:
        expiry_info = ''
        if metadata['expires_at']:
            expiry_info = f'有效期: {get_remaining_time(metadata["expires_at"])}'
        send_download_link_email(email, download_url, filename, expiry_info)
    return jsonify({
        'success': True,
        'short_code': short_code,
        'download_url': download_url,
        'delete_url': delete_url,
        'manage_key': manage_key,
        'filename': filename,
        'file_size': file_size,
        'formatted_size': format_file_size(file_size)
    })


@app.route('/api/upload/batch/complete', methods=['POST'])
def batch_complete():
    data = request.json
    batch_id = data.get('batch_id')
    short_codes = data.get('short_codes', [])
    email = data.get('email')
    expiry = data.get('expiry', '1d')
    if not batch_id or not short_codes:
        return jsonify({'error': '参数错误'}), 400
    batch_code = generate_short_code()
    batch_metadata = {
        'batch_code': batch_code,
        'short_codes': short_codes,
        'created_at': datetime.now().timestamp(),
        'expires_at': get_expiry_timestamp(expiry),
        'manage_key': generate_manage_key()
    }
    save_metadata(f'batch_{batch_code}', batch_metadata)
    share_url = url_for('batch_share', batch_code=batch_code, _external=True)
    if email:
        expiry_info = ''
        if batch_metadata['expires_at']:
            expiry_info = f'有效期: {get_remaining_time(batch_metadata["expires_at"])}'
        send_batch_share_email(email, share_url, len(short_codes), expiry_info)
    return jsonify({
        'success': True,
        'batch_code': batch_code,
        'share_url': share_url,
        'manage_key': batch_metadata['manage_key']
    })


@app.route('/s/<short_code>')
def download_file(short_code):
    metadata = load_metadata(short_code)
    if not metadata:
        abort(404)
    if is_expired(metadata):
        delete_file(short_code)
        abort(404)
    if metadata.get('max_downloads') and metadata['download_count'] >= metadata['max_downloads']:
        delete_file(short_code)
        abort(404)
    if metadata.get('password_hash'):
        password = request.args.get('password', '')
        if hash_password(password) != metadata['password_hash']:
            return render_template('password_prompt.html', short_code=short_code, is_preview=False)
    file_path = os.path.join(UPLOAD_DIR, metadata['storage_filename'])
    if not os.path.exists(file_path):
        delete_metadata(short_code)
        abort(404)
    metadata['download_count'] += 1
    save_metadata(short_code, metadata)
    file_size = metadata['file_size']
    range_header = request.headers.get('Range', None)
    if range_header:
        byte1, byte2 = 0, None
        m = range_header.replace('bytes=', '').split('-')
        try:
            byte1 = int(m[0])
            if m[1]:
                byte2 = int(m[1])
        except ValueError:
            return Response(status=416)
        length = file_size
        if byte2 is None:
            byte2 = length - 1
        if byte1 >= length or byte2 >= length:
            return Response(status=416)
        new_length = byte2 - byte1 + 1
        with open(file_path, 'rb') as f:
            f.seek(byte1)
            data = f.read(new_length)
        rv = Response(
            data,
            206,
            mimetype=metadata['content_type'],
            direct_passthrough=True
        )
        rv.headers.add('Content-Range', f'bytes {byte1}-{byte2}/{length}')
        rv.headers.add('Accept-Ranges', 'bytes')
        rv.headers.add('Content-Length', str(new_length))
        rv.headers.add('Content-Disposition', f"attachment; filename*=UTF-8''{metadata['original_filename']}")
        return rv
    else:
        rv = send_file(
            file_path,
            mimetype=metadata['content_type'],
            as_attachment=True,
            download_name=metadata['original_filename']
        )
        rv.headers.add('Accept-Ranges', 'bytes')
        rv.headers.add('Content-Disposition', f"attachment; filename*=UTF-8''{metadata['original_filename']}")
        return rv


@app.route('/p/<short_code>')
def preview_file(short_code):
    metadata = load_metadata(short_code)
    if not metadata:
        abort(404)
    if is_expired(metadata):
        delete_file(short_code)
        abort(404)
    if metadata.get('max_downloads') and metadata['download_count'] >= metadata['max_downloads']:
        delete_file(short_code)
        abort(404)
    if not metadata.get('is_previewable'):
        return jsonify({'error': '该文件类型不支持预览'}), 400
    if metadata.get('password_hash'):
        password = request.args.get('password', '')
        if hash_password(password) != metadata['password_hash']:
            return render_template('password_prompt.html', short_code=short_code, is_preview=True)
    file_path = os.path.join(UPLOAD_DIR, metadata['storage_filename'])
    if not os.path.exists(file_path):
        delete_metadata(short_code)
        abort(404)
    metadata['download_count'] += 1
    save_metadata(short_code, metadata)
    ext = metadata['original_filename'].rsplit('.', 1)[1].lower()
    if ext in {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'}:
        return send_file(file_path, mimetype=metadata['content_type'])
    elif ext == 'pdf':
        return send_file(file_path, mimetype='application/pdf')
    else:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='gbk') as f:
                    content = f.read()
            except UnicodeDecodeError:
                with open(file_path, 'rb') as f:
                    content = f.read().decode('utf-8', errors='replace')
        return render_template('text_preview.html', content=content, filename=metadata['original_filename'])


@app.route('/f/<short_code>')
def file_detail(short_code):
    metadata = load_metadata(short_code)
    if not metadata:
        abort(404)
    if is_expired(metadata):
        delete_file(short_code)
        abort(404)
    download_url = url_for('download_file', short_code=short_code, _external=True)
    preview_url = url_for('preview_file', short_code=short_code, _external=True) if metadata.get('is_previewable') else None
    qr_code = generate_qr_code_base64(download_url)
    return render_template('file_detail.html',
        metadata=metadata,
        download_url=download_url,
        preview_url=preview_url,
        qr_code=qr_code,
        formatted_size=format_file_size(metadata['file_size']),
        remaining_time=get_remaining_time(metadata.get('expires_at')),
        is_expired=is_expired(metadata)
    )


@app.route('/b/<batch_code>')
def batch_share(batch_code):
    batch_metadata = load_metadata(f'batch_{batch_code}')
    if not batch_metadata:
        abort(404)
    if batch_metadata.get('expires_at') and datetime.now().timestamp() > batch_metadata['expires_at']:
        delete_metadata(f'batch_{batch_code}')
        abort(404)
    files = []
    for short_code in batch_metadata['short_codes']:
        metadata = load_metadata(short_code)
        if metadata and not is_expired(metadata):
            files.append({
                'short_code': short_code,
                'filename': metadata['original_filename'],
                'file_size': metadata['file_size'],
                'formatted_size': format_file_size(metadata['file_size']),
                'download_url': url_for('download_file', short_code=short_code, _external=True),
                'detail_url': url_for('file_detail', short_code=short_code, _external=True),
                'is_previewable': metadata.get('is_previewable', False)
            })
    share_url = url_for('batch_share', batch_code=batch_code, _external=True)
    qr_code = generate_qr_code_base64(share_url)
    return render_template('batch_share.html',
        batch_code=batch_code,
        files=files,
        share_url=share_url,
        qr_code=qr_code,
        remaining_time=get_remaining_time(batch_metadata.get('expires_at'))
    )


@app.route('/manage')
def manage_files():
    manage_key = request.args.get('key', '')
    if not manage_key:
        return render_template('manage_login.html')
    files = get_files_by_manage_key(manage_key)
    for f in files:
        f['formatted_size'] = format_file_size(f['file_size'])
        f['remaining_time'] = get_remaining_time(f.get('expires_at'))
        f['download_url'] = url_for('download_file', short_code=f['short_code'], _external=True)
        f['detail_url'] = url_for('file_detail', short_code=f['short_code'], _external=True)
    return render_template('manage_files.html', files=files, manage_key=manage_key)


@app.route('/api/delete/<short_code>/<manage_key>', methods=['POST', 'GET'])
def delete_file_api(short_code, manage_key):
    metadata = load_metadata(short_code)
    if not metadata:
        return jsonify({'error': '文件不存在'}), 404
    if metadata.get('manage_key') != manage_key:
        return jsonify({'error': '管理密钥错误'}), 403
    delete_file(short_code)
    if request.method == 'GET':
        return render_template('delete_success.html')
    return jsonify({'success': True, 'message': '文件已删除'})


@app.route('/api/verify-password/<short_code>', methods=['POST'])
def verify_password(short_code):
    data = request.json
    password = data.get('password', '')
    metadata = load_metadata(short_code)
    if not metadata:
        return jsonify({'error': '文件不存在'}), 404
    if not metadata.get('password_hash'):
        return jsonify({'success': True})
    if hash_password(password) == metadata['password_hash']:
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': '密码错误'})


@app.route('/api/check-chunks/<file_id>', methods=['GET'])
def check_chunks(file_id):
    temp_dir = os.path.join(TEMP_DIR, file_id)
    if not os.path.exists(temp_dir):
        return jsonify({'chunks': []})
    chunks = sorted(
        [int(f.split('_')[1]) for f in os.listdir(temp_dir) if f.startswith('chunk_')]
    )
    return jsonify({'chunks': chunks})


@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': f'文件大小超过限制 ({format_file_size(MAX_FILE_SIZE)})'}), 413


@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404


if __name__ == '__main__':
    start_cleanup_thread()
    app.run(host='0.0.0.0', port=5001, debug=True)
