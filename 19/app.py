import os
import json
import uuid
import shutil
import hashlib
from functools import wraps
from datetime import datetime
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
from flask import Flask, request, jsonify, render_template, send_file, send_from_directory, redirect, url_for, abort, session, flash

from config import Config
from storage import file_storage, api_token_storage, admin_key_storage, locked_links_storage
from utils import (
    human_readable_size, get_file_preview, calculate_expiration,
    is_file_expired, parse_tags, get_storage_stats, format_datetime,
    get_remaining_time, merge_chunks, get_uploaded_chunks, safe_filename,
    create_unique_folder, zip_directory, get_directory_size, get_file_extension,
    get_preview_type, get_file_type_category
)

app = Flask(__name__)
app.config.from_object(Config)
app.jinja_env.filters['human_size'] = human_readable_size
app.jinja_env.filters['format_datetime'] = format_datetime
app.jinja_env.filters['remaining_time'] = get_remaining_time

def require_api_auth(permission=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Missing or invalid authorization header'}), 401
            
            token = auth_header[7:]
            token_info = api_token_storage.validate_token(token, permission)
            if not token_info:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            api_token_storage.update_last_used(token)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_admin_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'POST':
            admin_key = request.form.get('admin_key') or request.json.get('admin_key')
        else:
            admin_key = request.args.get('admin_key') or session.get('admin_key')
        
        if not admin_key:
            return jsonify({'error': 'Admin key required'}), 401
        
        admin_info = admin_key_storage.validate_admin_key(admin_key)
        if not admin_info:
            return jsonify({'error': 'Invalid admin key'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

@app.errorhandler(RequestEntityTooLarge)
def handle_large_file(e):
    return jsonify({
        'error': f'File too large. Maximum size is {human_readable_size(Config.MAX_SINGLE_FILE_SIZE)}'
    }), 413

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    file_info = None
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    original_filename = safe_filename(file.filename)
    description = request.form.get('description', '')
    tags = parse_tags(request.form.get('tags', ''))
    expiration = request.form.get('expiration', '7d')
    max_downloads = request.form.get('max_downloads', type=int)
    
    if file.content_length and file.content_length > Config.MAX_SINGLE_FILE_SIZE:
        return jsonify({
            'error': f'File too large. Maximum size is {human_readable_size(Config.MAX_SINGLE_FILE_SIZE)}'
        }), 413
    
    storage_subdir = create_unique_folder(Config.UPLOAD_FOLDER)
    storage_path = os.path.join(storage_subdir, original_filename)
    file.save(storage_path)
    
    file_size = os.path.getsize(storage_path)
    
    expires_at = calculate_expiration(expiration)
    
    file_data = {
        'original_name': original_filename,
        'storage_path': os.path.relpath(storage_path, Config.UPLOAD_FOLDER),
        'size': file_size,
        'description': description,
        'tags': tags,
        'expiration_option': expiration,
        'expires_at': expires_at,
        'max_downloads': max_downloads,
        'is_folder': False,
        'file_type': get_file_type_category(original_filename),
        'preview_type': get_preview_type(original_filename)
    }
    
    file_info = file_storage.add_file(file_data)
    
    response_data = {
        'success': True,
        'short_code': file_info['short_code'],
        'extract_code': file_info['extract_code'],
        'admin_key': file_info['admin_key'],
        'download_url': url_for('download_page', short_code=file_info['short_code'], _external=True),
        'preview_url': url_for('preview_page', short_code=file_info['short_code'], _external=True)
    }
    
    return jsonify(response_data)

@app.route('/upload/chunk/init', methods=['POST'])
def init_chunk_upload():
    data = request.json or request.form
    filename = safe_filename(data.get('filename', ''))
    total_size = data.get('total_size', type=int)
    total_chunks = data.get('total_chunks', type=int)
    
    if not filename or not total_size or not total_chunks:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    if total_size > Config.MAX_SINGLE_FILE_SIZE:
        return jsonify({
            'error': f'File too large. Maximum size is {human_readable_size(Config.MAX_SINGLE_FILE_SIZE)}'
        }), 413
    
    upload_id = str(uuid.uuid4())
    chunk_dir = os.path.join(Config.CHUNK_FOLDER, upload_id)
    os.makedirs(chunk_dir, exist_ok=True)
    
    session[f'chunk_upload_{upload_id}'] = {
        'filename': filename,
        'total_size': total_size,
        'total_chunks': total_chunks,
        'created_at': datetime.now().isoformat()
    }
    
    return jsonify({
        'upload_id': upload_id,
        'chunk_size': Config.CHUNK_SIZE,
        'uploaded_chunks': []
    })

@app.route('/upload/chunk', methods=['POST'])
def upload_chunk():
    upload_id = request.form.get('upload_id')
    chunk_index = request.form.get('chunk_index', type=int)
    total_chunks = request.form.get('total_chunks', type=int)
    filename = request.form.get('filename')
    
    if not upload_id or chunk_index is None:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    if 'chunk' not in request.files:
        return jsonify({'error': 'No chunk data'}), 400
    
    chunk = request.files['chunk']
    chunk_dir = os.path.join(Config.CHUNK_FOLDER, upload_id)
    
    if not os.path.exists(chunk_dir):
        os.makedirs(chunk_dir, exist_ok=True)
    
    chunk_filename = f'chunk_{chunk_index}'
    chunk_path = os.path.join(chunk_dir, chunk_filename)
    chunk.save(chunk_path)
    
    uploaded_chunks = get_uploaded_chunks(upload_id)
    
    if len(uploaded_chunks) == total_chunks:
        return jsonify({
            'success': True,
            'chunk_received': True,
            'all_chunks_uploaded': True,
            'uploaded_chunks': uploaded_chunks
        })
    
    return jsonify({
        'success': True,
        'chunk_received': True,
        'all_chunks_uploaded': False,
        'uploaded_chunks': uploaded_chunks
    })

@app.route('/upload/chunk/complete', methods=['POST'])
def complete_chunk_upload():
    data = request.json or request.form
    upload_id = data.get('upload_id')
    description = data.get('description', '')
    tags = parse_tags(data.get('tags', ''))
    expiration = data.get('expiration', '7d')
    max_downloads = data.get('max_downloads', type=int)
    
    if not upload_id:
        return jsonify({'error': 'Missing upload_id'}), 400
    
    chunk_dir = os.path.join(Config.CHUNK_FOLDER, upload_id)
    if not os.path.exists(chunk_dir):
        return jsonify({'error': 'Upload session not found'}), 404
    
    upload_info = session.get(f'chunk_upload_{upload_id}')
    if not upload_info:
        upload_info = {'filename': os.listdir(chunk_dir)[0] if os.listdir(chunk_dir) else 'unknown'}
    
    filename = safe_filename(upload_info.get('filename', 'uploaded_file'))
    storage_subdir = create_unique_folder(Config.UPLOAD_FOLDER)
    storage_path = os.path.join(storage_subdir, filename)
    
    total_size = upload_info.get('total_size')
    if not merge_chunks(chunk_dir, storage_path, total_size):
        return jsonify({'error': 'Failed to merge chunks'}), 500
    
    file_size = os.path.getsize(storage_path)
    expires_at = calculate_expiration(expiration)
    
    file_data = {
        'original_name': filename,
        'storage_path': os.path.relpath(storage_path, Config.UPLOAD_FOLDER),
        'size': file_size,
        'description': description,
        'tags': tags,
        'expiration_option': expiration,
        'expires_at': expires_at,
        'max_downloads': max_downloads,
        'is_folder': False,
        'file_type': get_file_type_category(filename),
        'preview_type': get_preview_type(filename)
    }
    
    file_info = file_storage.add_file(file_data)
    
    if f'chunk_upload_{upload_id}' in session:
        del session[f'chunk_upload_{upload_id}']
    
    return jsonify({
        'success': True,
        'short_code': file_info['short_code'],
        'extract_code': file_info['extract_code'],
        'admin_key': file_info['admin_key'],
        'download_url': url_for('download_page', short_code=file_info['short_code'], _external=True),
        'preview_url': url_for('preview_page', short_code=file_info['short_code'], _external=True)
    })

@app.route('/upload/chunk/resume', methods=['POST'])
def resume_chunk_upload():
    data = request.json or request.form
    upload_id = data.get('upload_id')
    
    if not upload_id:
        return jsonify({'error': 'Missing upload_id'}), 400
    
    uploaded_chunks = get_uploaded_chunks(upload_id)
    upload_info = session.get(f'chunk_upload_{upload_id}')
    
    if not upload_info and not uploaded_chunks:
        return jsonify({'error': 'Upload session not found'}), 404
    
    return jsonify({
        'upload_id': upload_id,
        'uploaded_chunks': uploaded_chunks,
        'chunk_size': Config.CHUNK_SIZE,
        'upload_info': upload_info
    })

@app.route('/upload/folder', methods=['POST'])
def upload_folder():
    description = request.form.get('description', '')
    tags = parse_tags(request.form.get('tags', ''))
    expiration = request.form.get('expiration', '7d')
    max_downloads = request.form.get('max_downloads', type=int)
    folder_name = request.form.get('folder_name', 'folder')
    
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files selected'}), 400
    
    storage_subdir = create_unique_folder(Config.UPLOAD_FOLDER)
    folder_path = os.path.join(storage_subdir, safe_filename(folder_name))
    os.makedirs(folder_path, exist_ok=True)
    
    total_size = 0
    
    for file in files:
        if file.filename:
            relative_path = file.filename
            file_dir = os.path.dirname(relative_path)
            safe_dir = os.path.normpath(file_dir).lstrip('/\\')
            target_dir = os.path.join(folder_path, safe_dir)
            os.makedirs(target_dir, exist_ok=True)
            
            safe_name = safe_filename(os.path.basename(relative_path))
            target_path = os.path.join(target_dir, safe_name)
            file.save(target_path)
            total_size += os.path.getsize(target_path)
    
    zip_name = f'{safe_filename(folder_name)}.zip'
    zip_path = os.path.join(storage_subdir, zip_name)
    zip_directory(folder_path, zip_path)
    
    expires_at = calculate_expiration(expiration)
    
    file_data = {
        'original_name': zip_name,
        'storage_path': os.path.relpath(zip_path, Config.UPLOAD_FOLDER),
        'size': os.path.getsize(zip_path),
        'original_folder_name': folder_name,
        'original_folder_path': os.path.relpath(folder_path, Config.UPLOAD_FOLDER),
        'description': description,
        'tags': tags,
        'expiration_option': expiration,
        'expires_at': expires_at,
        'max_downloads': max_downloads,
        'is_folder': True,
        'file_count': len(files),
        'file_type': 'archive'
    }
    
    file_info = file_storage.add_file(file_data)
    
    return jsonify({
        'success': True,
        'short_code': file_info['short_code'],
        'extract_code': file_info['extract_code'],
        'admin_key': file_info['admin_key'],
        'download_url': url_for('download_page', short_code=file_info['short_code'], _external=True),
        'file_count': len(files)
    })

@app.route('/s/<short_code>')
def download_page(short_code):
    file_info = file_storage.get_file(short_code)
    
    if not file_info:
        return render_template('error.html', error='分享链接不存在或已过期'), 404
    
    if is_file_expired(file_info):
        file_storage.delete_file(short_code)
        return render_template('error.html', error='分享链接已过期'), 410
    
    if locked_links_storage.is_locked(short_code):
        return render_template('error.html', error='链接已被临时锁定，请稍后再试'), 423
    
    if file_info.get('locked_until'):
        try:
            from datetime import datetime
            locked_until = datetime.fromisoformat(file_info['locked_until'])
            if datetime.now() < locked_until:
                return render_template('error.html', error='链接已被临时锁定，请稍后再试'), 423
        except (ValueError, TypeError):
            pass
    
    return render_template('download.html', file_info=file_info, short_code=short_code)

@app.route('/s/<short_code>/verify', methods=['POST'])
def verify_extract_code(short_code):
    file_info = file_storage.get_file(short_code)
    
    if not file_info:
        return jsonify({'success': False, 'error': '分享链接不存在或已过期'}), 404
    
    if is_file_expired(file_info):
        file_storage.delete_file(short_code)
        return jsonify({'success': False, 'error': '分享链接已过期'}), 410
    
    if locked_links_storage.is_locked(short_code):
        return jsonify({'success': False, 'error': '链接已被临时锁定，请10分钟后再试'}), 423
    
    extract_code = request.json.get('extract_code') if request.is_json else request.form.get('extract_code')
    
    if extract_code == file_info['extract_code']:
        file_storage.check_and_update_failed_attempt(short_code, True)
        session[f'verified_{short_code}'] = True
        return jsonify({'success': True})
    else:
        updated = file_storage.check_and_update_failed_attempt(short_code, False)
        remaining = Config.MAX_RETRY_ATTEMPTS - updated.get('failed_attempts', 1)
        if remaining <= 0:
            locked_links_storage.lock_link(short_code)
            return jsonify({
                'success': False,
                'error': '提取码错误次数过多，链接已被临时锁定10分钟'
            }), 423
        return jsonify({
            'success': False,
            'error': f'提取码错误，还剩 {remaining} 次尝试机会'
        }), 401

@app.route('/s/<short_code>/download')
def download_file(short_code):
    file_info = file_storage.get_file(short_code)
    
    if not file_info:
        return render_template('error.html', error='分享链接不存在或已过期'), 404
    
    if is_file_expired(file_info):
        file_storage.delete_file(short_code)
        return render_template('error.html', error='分享链接已过期'), 410
    
    if not session.get(f'verified_{short_code}'):
        return redirect(url_for('download_page', short_code=short_code))
    
    file_path = os.path.join(Config.UPLOAD_FOLDER, file_info['storage_path'])
    
    if not os.path.exists(file_path):
        return render_template('error.html', error='文件不存在'), 404
    
    updated = file_storage.increment_download(short_code)
    
    if file_info.get('max_downloads') and updated.get('download_count', 0) >= file_info['max_downloads']:
        pass
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=file_info['original_name']
    )

@app.route('/preview/<short_code>')
def preview_page(short_code):
    file_info = file_storage.get_file(short_code)
    
    if not file_info:
        return render_template('error.html', error='分享链接不存在或已过期'), 404
    
    if is_file_expired(file_info):
        file_storage.delete_file(short_code)
        return render_template('error.html', error='分享链接已过期'), 410
    
    if not file_info.get('preview_type'):
        return render_template('preview.html', 
                             file_info=file_info, 
                             short_code=short_code,
                             preview_data=None,
                             preview_available=False)
    
    file_path = os.path.join(Config.UPLOAD_FOLDER, file_info['storage_path'])
    
    if not os.path.exists(file_path):
        return render_template('error.html', error='文件不存在'), 404
    
    preview_data = get_file_preview(file_path, file_info['original_name'])
    
    return render_template('preview.html',
                         file_info=file_info,
                         short_code=short_code,
                         preview_data=preview_data,
                         preview_available=True)

@app.route('/preview/<short_code>/raw')
def preview_raw(short_code):
    file_info = file_storage.get_file(short_code)
    
    if not file_info:
        return 'File not found', 404
    
    if not file_info.get('preview_type') in ['image', 'pdf']:
        return 'Preview not available', 400
    
    file_path = os.path.join(Config.UPLOAD_FOLDER, file_info['storage_path'])
    
    if not os.path.exists(file_path):
        return 'File not found', 404
    
    return send_file(file_path)

@app.route('/manage')
def manage_files_page():
    admin_key = request.args.get('admin_key')
    if not admin_key:
        return render_template('manage_login.html')
    
    files = file_storage.get_files_by_admin_key(admin_key)
    return render_template('manage.html', files=files, admin_key=admin_key)

@app.route('/manage/delete/<short_code>', methods=['POST'])
def delete_file_manage(short_code):
    data = request.json or request.form
    admin_key = data.get('admin_key')
    
    if not admin_key:
        return jsonify({'success': False, 'error': 'Admin key required'}), 401
    
    file_info = file_storage.get_file(short_code)
    if not file_info:
        return jsonify({'success': False, 'error': 'File not found'}), 404
    
    if file_info['admin_key'] != admin_key:
        return jsonify({'success': False, 'error': 'Permission denied'}), 403
    
    success = file_storage.delete_file(short_code)
    return jsonify({'success': success})

@app.route('/search')
def search_page():
    return render_template('search.html')

@app.route('/api/search')
def search_api():
    tags_str = request.args.get('tags', '')
    tags = parse_tags(tags_str)
    
    if not tags:
        return jsonify({'files': []})
    
    files = file_storage.search_by_tags(tags)
    
    result = []
    for f in files:
        if not is_file_expired(f):
            result.append({
                'short_code': f['short_code'],
                'original_name': f['original_name'],
                'size': f['size'],
                'size_human': human_readable_size(f['size']),
                'description': f.get('description', ''),
                'tags': f.get('tags', []),
                'file_type': f.get('file_type', 'other'),
                'created_at': f.get('created_at'),
                'download_count': f.get('download_count', 0),
                'expires_at': f.get('expires_at')
            })
    
    return jsonify({'files': result, 'count': len(result)})

@app.route('/admin')
def admin_page():
    admin_key = request.args.get('admin_key') or session.get('admin_key')
    
    if not admin_key:
        return render_template('admin_login.html')
    
    admin_info = admin_key_storage.validate_admin_key(admin_key)
    if not admin_info:
        return render_template('admin_login.html', error='Invalid admin key')
    
    session['admin_key'] = admin_key
    session['admin_info'] = admin_info
    
    all_files = file_storage.get_all_files()
    active_files = [f for f in all_files if not is_file_expired(f)]
    stats = get_storage_stats(all_files)
    
    return render_template('admin.html',
                         admin_info=admin_info,
                         admin_key=admin_key,
                         stats=stats,
                         files=all_files,
                         active_files=active_files,
                         api_tokens=api_token_storage.list_tokens(),
                         admin_keys=admin_key_storage.list_admin_keys())

@app.route('/admin/cleanup', methods=['POST'])
@require_admin_auth
def admin_cleanup():
    count = file_storage.cleanup_expired_files()
    return jsonify({'success': True, 'cleaned_count': count})

@app.route('/admin/stats')
@require_admin_auth
def admin_stats():
    all_files = file_storage.get_all_files()
    stats = get_storage_stats(all_files)
    return jsonify(stats)

@app.route('/admin/api-tokens', methods=['POST'])
@require_admin_auth
def create_api_token():
    data = request.json
    name = data.get('name', 'API Token')
    permissions = data.get('permissions', ['upload', 'download'])
    
    token_info = api_token_storage.create_token(name, permissions)
    return jsonify({'success': True, 'token': token_info})

@app.route('/admin/api-tokens/revoke', methods=['POST'])
@require_admin_auth
def revoke_api_token():
    data = request.json
    token = data.get('token')
    
    success = api_token_storage.revoke_token(token)
    return jsonify({'success': success})

@app.route('/admin/admin-keys', methods=['POST'])
@require_admin_auth
def create_admin_key():
    data = request.json
    name = data.get('name', 'Admin')
    super_admin = data.get('super_admin', False)
    
    admin_info = admin_key_storage.add_admin_key(name, super_admin)
    return jsonify({'success': True, 'admin_key': admin_info})

@app.route('/admin/admin-keys/remove', methods=['POST'])
@require_admin_auth
def remove_admin_key():
    data = request.json
    key = data.get('key')
    
    success = admin_key_storage.remove_admin_key(key)
    return jsonify({'success': success})

@app.route('/api/upload', methods=['POST'])
@require_api_auth('upload')
def api_upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    original_filename = safe_filename(file.filename)
    description = request.form.get('description', '')
    tags = parse_tags(request.form.get('tags', ''))
    expiration = request.form.get('expiration', '7d')
    max_downloads = request.form.get('max_downloads', type=int)
    
    if file.content_length and file.content_length > Config.MAX_SINGLE_FILE_SIZE:
        return jsonify({'error': 'File too large'}), 413
    
    storage_subdir = create_unique_folder(Config.UPLOAD_FOLDER)
    storage_path = os.path.join(storage_subdir, original_filename)
    file.save(storage_path)
    
    file_size = os.path.getsize(storage_path)
    expires_at = calculate_expiration(expiration)
    
    file_data = {
        'original_name': original_filename,
        'storage_path': os.path.relpath(storage_path, Config.UPLOAD_FOLDER),
        'size': file_size,
        'description': description,
        'tags': tags,
        'expiration_option': expiration,
        'expires_at': expires_at,
        'max_downloads': max_downloads,
        'is_folder': False,
        'file_type': get_file_type_category(original_filename),
        'preview_type': get_preview_type(original_filename)
    }
    
    file_info = file_storage.add_file(file_data)
    
    return jsonify({
        'success': True,
        'short_code': file_info['short_code'],
        'extract_code': file_info['extract_code'],
        'download_url': url_for('download_page', short_code=file_info['short_code'], _external=True),
        'admin_key': file_info['admin_key']
    })

@app.route('/api/download/<short_code>', methods=['POST'])
@require_api_auth('download')
def api_download(short_code):
    file_info = file_storage.get_file(short_code)
    
    if not file_info:
        return jsonify({'error': 'File not found'}), 404
    
    if is_file_expired(file_info):
        file_storage.delete_file(short_code)
        return jsonify({'error': 'File has expired'}), 410
    
    data = request.json
    extract_code = data.get('extract_code')
    
    if extract_code != file_info['extract_code']:
        return jsonify({'error': 'Invalid extract code'}), 401
    
    file_path = os.path.join(Config.UPLOAD_FOLDER, file_info['storage_path'])
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    
    file_storage.increment_download(short_code)
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=file_info['original_name']
    )

@app.route('/api/file/<short_code>')
@require_api_auth('download')
def api_file_info(short_code):
    file_info = file_storage.get_file(short_code)
    
    if not file_info:
        return jsonify({'error': 'File not found'}), 404
    
    if is_file_expired(file_info):
        return jsonify({'error': 'File has expired'}), 410
    
    return jsonify({
        'short_code': file_info['short_code'],
        'original_name': file_info['original_name'],
        'size': file_info['size'],
        'size_human': human_readable_size(file_info['size']),
        'description': file_info.get('description', ''),
        'tags': file_info.get('tags', []),
        'file_type': file_info.get('file_type', 'other'),
        'preview_type': file_info.get('preview_type'),
        'download_count': file_info.get('download_count', 0),
        'max_downloads': file_info.get('max_downloads'),
        'expires_at': file_info.get('expires_at'),
        'created_at': file_info.get('created_at'),
        'is_folder': file_info.get('is_folder', False)
    })

@app.route('/api/list')
@require_api_auth('download')
def api_list_files():
    admin_key = request.args.get('admin_key')
    if not admin_key:
        return jsonify({'error': 'admin_key required'}), 401
    
    files = file_storage.get_files_by_admin_key(admin_key)
    result = []
    
    for f in files:
        result.append({
            'short_code': f['short_code'],
            'original_name': f['original_name'],
            'size': f['size'],
            'size_human': human_readable_size(f['size']),
            'download_count': f.get('download_count', 0),
            'expires_at': f.get('expires_at'),
            'created_at': f.get('created_at'),
            'is_expired': is_file_expired(f)
        })
    
    return jsonify({'files': result, 'count': len(result)})

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'max_upload_size': human_readable_size(Config.MAX_SINGLE_FILE_SIZE)
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
