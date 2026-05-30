import os
import time
import json
import socket
import csv
from datetime import datetime, timedelta
from collections import deque
from flask import Flask, render_template, request, jsonify, send_file
from flask_socketio import SocketIO, emit
from apscheduler.schedulers.background import BackgroundScheduler
from io import StringIO, BytesIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'port-tester-secret-key'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
TEST_LOG_FILE = os.path.join(LOG_DIR, 'test_results.log')
HISTORY_FILE = os.path.join(LOG_DIR, 'test_history.json')
SCHEDULED_JOBS_FILE = os.path.join(LOG_DIR, 'scheduled_jobs.json')

MAX_HISTORY_SIZE = 1000
RECENT_HISTORY_COUNT = 20

test_history = deque(maxlen=MAX_HISTORY_SIZE)
scheduled_jobs = {}
consecutive_failures = {}
scheduler = None

def ensure_log_dir():
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

def load_history():
    global test_history
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                data = json.load(f)
                test_history.extend(data)
        except:
            pass

def save_history():
    with open(HISTORY_FILE, 'w') as f:
        f.write(json.dumps(list(test_history)))

def load_scheduled_jobs():
    global scheduled_jobs
    if os.path.exists(SCHEDULED_JOBS_FILE):
        try:
            with open(SCHEDULED_JOBS_FILE, 'r') as f:
                scheduled_jobs = json.load(f)
        except:
            pass

def save_scheduled_jobs():
    with open(SCHEDULED_JOBS_FILE, 'w') as f:
        f.write(json.dumps(scheduled_jobs))

def tcp_port_test(target, port, timeout=3):
    start_time = time.time()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((target, port))
        sock.close()
        elapsed = (time.time() - start_time) * 1000
        success = result == 0
        return {
            'success': success,
            'target': target,
            'port': port,
            'latency_ms': round(elapsed, 2) if success else None,
            'error': None if success else 'Connection failed'
        }
    except socket.gaierror:
        return {
            'success': False,
            'target': target,
            'port': port,
            'latency_ms': None,
            'error': 'Invalid hostname or IP address'
        }
    except socket.timeout:
        return {
            'success': False,
            'target': target,
            'port': port,
            'latency_ms': None,
            'error': f'Connection timed out'
        }
    except Exception as e:
        return {
            'success': False,
            'target': target,
            'port': port,
            'latency_ms': None,
            'error': str(e)
        }

def parse_ports(ports_str):
    ports = []
    for p in ports_str.split(','):
        p = p.strip()
        if p:
            try:
                ports.append(int(p))
            except ValueError:
                pass
    return ports

def add_to_history(test_result):
    timestamp = datetime.now().isoformat()
    record = {
        'timestamp': timestamp,
        **test_result
    }
    test_history.appendleft(record)
    save_history()
    return record

def log_result(test_result):
    ensure_log_dir()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    status = 'SUCCESS' if test_result['success'] else 'FAILED'
    latency = f"{test_result['latency_ms']}ms" if test_result['latency_ms'] else 'N/A'
    log_line = f"[{timestamp}] {status} - {test_result['target']}:{test_result['port']} - {latency}\n"
    with open(TEST_LOG_FILE, 'a') as f:
        f.write(log_line)

def check_consecutive_failures(target, port, success):
    key = f"{target}:{port}"
    if success:
        consecutive_failures[key] = 0
    else:
        consecutive_failures[key] = consecutive_failures.get(key, 0) + 1
    
    if consecutive_failures[key] >= 3:
        alert_data = {
            'target': target,
            'port': port,
            'fail_count': consecutive_failures[key],
            'timestamp': datetime.now().isoformat()
        }
        socketio.emit('port_alert', alert_data)
        send_email_alert(target, port, consecutive_failures[key])

def send_email_alert(target, port, fail_count):
    pass

def run_scheduled_test(job_id, target, ports, timeout=3):
    results = []
    for port in ports:
        result = tcp_port_test(target, port, timeout)
        results.append(result)
        add_to_history(result)
        log_result(result)
        check_consecutive_failures(target, port, result['success'])
    return results

@app.route('/')
def index():
    recent = list(test_history)[:RECENT_HISTORY_COUNT]
    for item in recent:
        if 'timestamp' in item:
            try:
                dt = datetime.fromisoformat(item['timestamp'])
                item['formatted_time'] = dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                item['formatted_time'] = item['timestamp']
    return render_template('index.html', history=recent, jobs=scheduled_jobs)

@app.route('/test', methods=['POST'])
def test_port():
    target = request.form.get('target', '').strip()
    ports_str = request.form.get('ports', '').strip()
    timeout = int(request.form.get('timeout', 3))
    
    if not target or not ports_str:
        return jsonify({'error': 'Target and ports are required'}), 400
    
    ports = parse_ports(ports_str)
    if not ports:
        return jsonify({'error': 'Invalid ports'}), 400
    
    results = []
    for port in ports:
        result = tcp_port_test(target, port, timeout)
        results.append(result)
        add_to_history(result)
        log_result(result)
        check_consecutive_failures(target, port, result['success'])
    
    return jsonify({'results': results})

@app.route('/api/test', methods=['POST'])
def api_test():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400
    
    target = data.get('target', '').strip()
    ports_str = data.get('ports', '').strip()
    timeout = int(data.get('timeout', 3))
    
    if not target or not ports_str:
        return jsonify({'error': 'Target and ports are required'}), 400
    
    ports = parse_ports(ports_str)
    if not ports:
        return jsonify({'error': 'Invalid ports'}), 400
    
    results = []
    for port in ports:
        result = tcp_port_test(target, port, timeout)
        results.append(result)
        add_to_history(result)
        log_result(result)
        check_consecutive_failures(target, port, result['success'])
    
    return jsonify({'results': results})

@app.route('/batch', methods=['POST'])
def batch_test():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    timeout = int(request.form.get('timeout', 3))
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    content = file.read().decode('utf-8')
    lines = content.strip().split('\n')
    
    results = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        
        if ':' in line:
            parts = line.rsplit(':', 1)
            target = parts[0].strip()
            try:
                port = int(parts[1].strip())
            except ValueError:
                results.append({
                    'success': False,
                    'target': line,
                    'port': None,
                    'latency_ms': None,
                    'error': 'Invalid format'
                })
                continue
            
            result = tcp_port_test(target, port, timeout)
            results.append(result)
            add_to_history(result)
            log_result(result)
            check_consecutive_failures(target, port, result['success'])
    
    return jsonify({'results': results})

@app.route('/export/csv')
def export_csv():
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Timestamp', 'Target', 'Port', 'Success', 'Latency (ms)', 'Error'])
    
    for item in list(test_history)[:100]:
        writer.writerow([
            item.get('timestamp', ''),
            item.get('target', ''),
            item.get('port', ''),
            item.get('success', False),
            item.get('latency_ms', ''),
            item.get('error', '')
        ])
    
    output.seek(0)
    bytes_io = BytesIO(output.getvalue().encode('utf-8'))
    return send_file(
        bytes_io,
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'test_results_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )

@app.route('/history')
def get_history():
    recent = list(test_history)[:RECENT_HISTORY_COUNT]
    return jsonify({'history': recent})

@app.route('/trend')
def get_trend():
    target = request.args.get('target')
    port = request.args.get('port')
    
    now = datetime.now()
    day_ago = now - timedelta(hours=24)
    
    relevant = []
    for item in test_history:
        try:
            item_time = datetime.fromisoformat(item['timestamp'])
            if item_time >= day_ago:
                if target and port:
                    if item['target'] == target and item['port'] == int(port):
                        relevant.append(item)
                else:
                    relevant.append(item)
        except:
            pass

    success_count = sum(1 for r in relevant if r['success']) if relevant else 0
    success_rate = (success_count / len(relevant)) * 100 if relevant else 0

    return jsonify({
        'success_rate': round(success_rate, 2),
        'total_tests': len(relevant),
        'successful_tests': success_count,
        'period_hours': 24
    })

@app.route('/chart/data')
def get_chart_data():
    target = request.args.get('target')
    port_str = request.args.get('port')
    port = int(port_str) if port_str and port_str.isdigit() else None
    hours = int(request.args.get('hours', 24))
    
    now = datetime.now()
    time_ago = now - timedelta(hours=hours)
    
    data_points = []
    for item in test_history:
        try:
            item_time = datetime.fromisoformat(item['timestamp'])
            if item_time >= time_ago:
                if target and port:
                    if item['target'] == target and item['port'] == port:
                        data_points.append({
                            'time': item['timestamp'],
                            'latency': item['latency_ms'] if item['success'] else None,
                            'success': item['success']
                        })
        except:
            pass
    
    return jsonify({'data': data_points})

@app.route('/scheduled', methods=['GET'])
def list_scheduled_jobs():
    return jsonify({'jobs': scheduled_jobs})

@app.route('/scheduled/add', methods=['POST'])
def add_scheduled_job():
    global scheduled_jobs
    data = request.get_json(silent=True) or request.form
    
    job_id = data.get('job_id', '').strip()
    target = data.get('target', '').strip()
    ports_str = data.get('ports', '').strip()
    cron_expr = data.get('cron', '').strip()
    timeout = int(data.get('timeout', 3))
    
    if not job_id or not target or not ports_str or not cron_expr:
        return jsonify({'error': 'All fields are required'}), 400
    
    ports = parse_ports(ports_str)
    if not ports:
        return jsonify({'error': 'Invalid ports'}), 400
    
    try:
        cron_parts = cron_expr.split()
        if len(cron_parts) != 5:
            return jsonify({'error': 'Invalid cron expression (5 fields required)'}), 400
    except Exception as e:
        return jsonify({'error': f'Invalid cron expression: {str(e)}'}), 400
    
    if job_id in scheduled_jobs:
        return jsonify({'error': 'Job ID already exists'}), 400
    
    scheduled_jobs[job_id] = {
        'job_id': job_id,
        'target': target,
        'ports': ports,
        'cron': cron_expr,
        'timeout': timeout,
        'created_at': datetime.now().isoformat()
    }
    
    save_scheduled_jobs()
    _add_job_to_scheduler(job_id)
    
    return jsonify({'status': 'success', 'job': scheduled_jobs[job_id]})

@app.route('/scheduled/remove/<job_id>', methods=['DELETE'])
def remove_scheduled_job(job_id):
    global scheduled_jobs
    if job_id not in scheduled_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    if scheduler and scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    del scheduled_jobs[job_id]
    save_scheduled_jobs()
    
    return jsonify({'status': 'success'})

def _add_job_to_scheduler(job_id):
    if not scheduler:
        return
    
    job_config = scheduled_jobs.get(job_id)
    if not job_config:
        return
    
    try:
        cron_parts = job_config['cron'].split()
        scheduler.add_job(
            run_scheduled_test,
            'cron',
            id=job_id,
            minute=cron_parts[0],
            hour=cron_parts[1],
            day=cron_parts[2],
            month=cron_parts[3],
            day_of_week=cron_parts[4],
            args=[job_id, job_config['target'], job_config['ports'], job_config['timeout']]
        )
    except Exception as e:
        print(f"Error adding job {job_id}: {e}")

@socketio.on('connect')
def handle_connect():
    emit('connected', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    pass

def init_scheduler():
    global scheduler
    scheduler = BackgroundScheduler()
    
    for job_id in scheduled_jobs:
        _add_job_to_scheduler(job_id)
    
    scheduler.start()

def init_app():
    ensure_log_dir()
    load_history()
    load_scheduled_jobs()
    init_scheduler()

if __name__ == '__main__':
    init_app()
    socketio.run(app, host='127.0.0.1', port=5001, debug=True)
