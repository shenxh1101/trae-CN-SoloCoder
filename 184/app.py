import os
import uuid
import requests
import csv
import threading
import time
from io import StringIO
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for, Response
from werkzeug.utils import secure_filename
from config import UPLOAD_FOLDER, TEMP_FOLDER, REPORTS_FOLDER, SECRET_KEY, MAX_CONTENT_LENGTH, ALLOWED_EXTENSIONS
from hash_utils import calculate_file_hash, verify_file_hash, generate_hash_manifest, verify_folder_from_manifest, hash_progress
from auth import is_admin, require_admin, login_admin, logout_admin

app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def calculate_hash_async(task_id, filepath, filename, algorithms):
    try:
        result = calculate_file_hash(filepath, algorithms, task_id=task_id)
        if os.path.exists(filepath):
            os.remove(filepath)
        hash_progress.set_result(task_id, {
            'success': True,
            'filename': filename,
            'hashes': result
        })
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        hash_progress.set_error(task_id, str(e))

def batch_hash_async(task_id, file_paths, algorithms):
    results = []
    total_files = len(file_paths)
    
    for idx, file_path in enumerate(file_paths):
        overall_progress = (idx / total_files) * 100 if total_files > 0 else 0
        hash_progress.update(task_id, round(overall_progress), 'processing')
        
        if os.path.exists(file_path):
            hashes = calculate_file_hash(file_path, algorithms)
            results.append({
                'file_path': file_path,
                'filename': os.path.basename(file_path),
                'hashes': hashes,
                'status': '成功'
            })
        else:
            results.append({
                'file_path': file_path,
                'filename': os.path.basename(file_path),
                'status': '文件不存在'
            })
    
    hash_progress.set_result(task_id, {'success': True, 'results': results})

@app.route('/')
def index():
    return render_template('index.html', is_admin=is_admin())

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password', '')
        if login_admin(password):
            return redirect(url_for('index'))
        return render_template('login.html', error='密码错误')
    return render_template('login.html')

@app.route('/logout')
def logout():
    logout_admin()
    return redirect(url_for('index'))

@app.route('/upload/async', methods=['POST'])
def upload_file_async():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    task_id = str(uuid.uuid4())
    filename = secure_filename(file.filename)
    filepath = os.path.join(TEMP_FOLDER, f"{task_id}_{filename}")
    file.save(filepath)
    
    algorithms = request.form.getlist('algorithms') or ['md5', 'sha1', 'sha256']
    
    hash_progress.update(task_id, 0, 'pending')
    
    thread = threading.Thread(
        target=calculate_hash_async,
        args=(task_id, filepath, filename, algorithms)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({'task_id': task_id})

@app.route('/progress/stream/<task_id>')
def progress_stream(task_id):
    def generate():
        last_progress = -1
        while True:
            progress = hash_progress.get(task_id) or 0
            status = hash_progress.get_status(task_id) or 'pending'
            
            if progress != last_progress:
                yield f"data: {{\"progress\": {progress}, \"status\": \"{status}\"}}\n\n"
                last_progress = progress
            
            if status == 'completed' or status == 'error':
                result = hash_progress.get_result(task_id)
                import json
                yield f"data: {{\"progress\": 100, \"status\": \"{status}\", \"result\": {json.dumps(result, ensure_ascii=False)}}}\n\n"
                break
            
            time.sleep(0.1)
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/task/result/<task_id>')
def get_task_result(task_id):
    result = hash_progress.get_result(task_id)
    status = hash_progress.get_status(task_id)
    
    if result:
        return jsonify({
            'status': status,
            'result': result
        })
    else:
        return jsonify({
            'status': status or 'pending',
            'progress': hash_progress.get(task_id) or 0
        }), 202

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    task_id = str(uuid.uuid4())
    filename = secure_filename(file.filename)
    filepath = os.path.join(TEMP_FOLDER, f"{task_id}_{filename}")
    file.save(filepath)
    
    try:
        algorithms = request.form.getlist('algorithms') or ['md5', 'sha1', 'sha256']
        result = calculate_file_hash(filepath, algorithms, task_id=task_id)
        os.remove(filepath)
        return jsonify({
            'filename': filename,
            'hashes': result
        })
    except Exception as e:
        os.remove(filepath) if os.path.exists(filepath) else None
        return jsonify({'error': str(e)}), 500

@app.route('/progress/<task_id>')
def get_progress(task_id):
    progress = hash_progress.get(task_id) or 0
    status = hash_progress.get_status(task_id) or 'pending'
    return jsonify({'progress': progress, 'status': status})

@app.route('/verify', methods=['POST'])
def verify():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    expected_hash = request.form.get('expected_hash', '').strip()
    
    if not expected_hash:
        return jsonify({'error': '请输入预期哈希值'}), 400
    
    task_id = str(uuid.uuid4())
    filename = secure_filename(file.filename)
    filepath = os.path.join(TEMP_FOLDER, f"{task_id}_{filename}")
    file.save(filepath)
    
    try:
        result = verify_file_hash(filepath, expected_hash)
        os.remove(filepath)
        result['filename'] = filename
        return jsonify(result)
    except Exception as e:
        os.remove(filepath) if os.path.exists(filepath) else None
        return jsonify({'error': str(e)}), 500

@app.route('/api/url-hash', methods=['POST'])
def url_hash():
    data = request.get_json()
    url = data.get('url', '') if data else ''
    if not url:
        return jsonify({'error': '请提供文件URL'}), 400
    
    task_id = str(uuid.uuid4())
    filepath = os.path.join(TEMP_FOLDER, task_id)
    
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    progress = (downloaded / total_size) * 50
                    hash_progress.update(task_id, round(progress))
        
        algorithms = data.get('algorithms', ['md5', 'sha1', 'sha256']) if data else ['md5', 'sha1', 'sha256']
        result = calculate_file_hash(filepath, algorithms, task_id=task_id)
        os.remove(filepath)
        
        return jsonify({
            'url': url,
            'hashes': result
        })
    except Exception as e:
        os.remove(filepath) if os.path.exists(filepath) else None
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch-hash', methods=['POST'])
@require_admin
def batch_hash():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件列表'}), 400
    
    file = request.files['file']
    if not allowed_file(file.filename):
        return jsonify({'error': '只支持txt格式的文件列表'}), 400
    
    content = file.read().decode('utf-8')
    file_paths = [line.strip() for line in content.splitlines() if line.strip()]
    
    if not file_paths:
        return jsonify({'error': '文件列表为空'}), 400
    
    algorithms = request.form.getlist('algorithms') or ['md5', 'sha1', 'sha256']
    
    task_id = str(uuid.uuid4())
    hash_progress.update(task_id, 0, 'pending')
    
    thread = threading.Thread(
        target=batch_hash_async,
        args=(task_id, file_paths, algorithms)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({'task_id': task_id, 'total_files': len(file_paths)})

@app.route('/api/batch-hash/sync', methods=['POST'])
@require_admin
def batch_hash_sync():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件列表'}), 400
    
    file = request.files['file']
    if not allowed_file(file.filename):
        return jsonify({'error': '只支持txt格式的文件列表'}), 400
    
    content = file.read().decode('utf-8')
    file_paths = [line.strip() for line in content.splitlines() if line.strip()]
    
    results = []
    algorithms = request.form.getlist('algorithms') or ['md5', 'sha1', 'sha256']
    
    for file_path in file_paths:
        if os.path.exists(file_path):
            hashes = calculate_file_hash(file_path, algorithms)
            results.append({
                'file_path': file_path,
                'filename': os.path.basename(file_path),
                'hashes': hashes,
                'status': '成功'
            })
        else:
            results.append({
                'file_path': file_path,
                'filename': os.path.basename(file_path),
                'status': '文件不存在'
            })
    
    return jsonify({'results': results})

@app.route('/api/generate-manifest', methods=['POST'])
@require_admin
def generate_manifest():
    data = request.get_json()
    file_paths = data.get('file_paths', []) if data else []
    algorithm = data.get('algorithm', 'md5') if data else 'md5'
    
    if not file_paths:
        return jsonify({'error': '请提供文件路径列表'}), 400
    
    manifest_content = generate_hash_manifest(file_paths, algorithm)
    manifest_id = str(uuid.uuid4())
    manifest_path = os.path.join(TEMP_FOLDER, f"{manifest_id}.{algorithm}")
    
    with open(manifest_path, 'w') as f:
        f.write(manifest_content)
    
    return jsonify({
        'manifest_id': manifest_id,
        'algorithm': algorithm,
        'content': manifest_content
    })

@app.route('/api/verify-folder', methods=['POST'])
@require_admin
def verify_folder():
    if 'manifest' not in request.files:
        return jsonify({'error': '没有上传哈希清单文件'}), 400
    
    manifest_file = request.files['manifest']
    folder_path = request.form.get('folder_path', '').strip()
    
    if not folder_path or not os.path.isdir(folder_path):
        return jsonify({'error': '请提供有效的文件夹路径'}), 400
    
    manifest_content = manifest_file.read().decode('utf-8')
    results = verify_folder_from_manifest(folder_path, manifest_content)
    
    return jsonify({'results': results})

@app.route('/api/export-csv', methods=['POST'])
def export_csv():
    data = request.get_json()
    results = data.get('results', []) if data else []
    
    if not results:
        return jsonify({'error': '没有数据可导出'}), 400
    
    output = StringIO()
    writer = csv.writer(output)
    
    first_row = results[0]
    headers = list(first_row.keys())
    writer.writerow(headers)
    
    for result in results:
        writer.writerow([result.get(h, '') for h in headers])
    
    output.seek(0)
    csv_id = str(uuid.uuid4())
    csv_path = os.path.join(TEMP_FOLDER, f"{csv_id}.csv")
    
    with open(csv_path, 'w') as f:
        f.write(output.getvalue())
    
    return jsonify({'csv_id': csv_id})

@app.route('/download/<file_type>/<file_id>')
def download_file(file_type, file_id):
    if file_type == 'manifest':
        for ext in ['md5', 'sha1', 'sha256', 'sha512']:
            filepath = os.path.join(TEMP_FOLDER, f"{file_id}.{ext}")
            if os.path.exists(filepath):
                return send_file(filepath, as_attachment=True, download_name=f"hash.{ext}")
    elif file_type == 'csv':
        filepath = os.path.join(TEMP_FOLDER, f"{file_id}.csv")
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True, download_name="hash_results.csv")
    elif file_type == 'report':
        filepath = os.path.join(REPORTS_FOLDER, f"{file_id}.html")
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True, download_name="verification_report.html")
    
    return jsonify({'error': '文件不存在'}), 404

@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    data = request.get_json()
    results = data.get('results', []) if data else []
    
    if not results:
        return jsonify({'error': '没有数据可生成报告'}), 400
    
    report_id = str(uuid.uuid4())
    report_path = os.path.join(REPORTS_FOLDER, f"{report_id}.html")
    
    html_content = render_template('report.html', results=results, generated_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return jsonify({'report_id': report_id})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=9000, threaded=True)
