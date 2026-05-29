import os
import json
import threading
import time
import smtplib
import csv
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from io import StringIO
from flask import Flask, render_template, request, jsonify, make_response
from flask_sqlalchemy import SQLAlchemy
from ping3 import ping
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///monitor.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

CONFIG_FILE = 'config.json'

class MonitorData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    host = db.Column(db.String(255), nullable=False)
    latency = db.Column(db.Float)
    packet_loss = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Alert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    host = db.Column(db.String(255), nullable=False)
    alert_type = db.Column(db.String(50))
    message = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    acknowledged = db.Column(db.Boolean, default=False)

def load_config():
    default_config = {
        'smtp_server': 'smtp.gmail.com',
        'smtp_port': 587,
        'smtp_username': '',
        'smtp_password': '',
        'smtp_from_email': '',
        'targets': [
            {
                'id': 1,
                'name': 'Google DNS',
                'host': '8.8.8.8',
                'group': 'default',
                'paused': False,
                'threshold_latency': 200,
                'threshold_packet_loss': 3,
                'email_enabled': False,
                'email_recipient': ''
            },
            {
                'id': 2,
                'name': 'Cloudflare DNS',
                'host': '1.1.1.1',
                'group': 'default',
                'paused': False,
                'threshold_latency': 200,
                'threshold_packet_loss': 3,
                'email_enabled': False,
                'email_recipient': ''
            },
            {
                'id': 3,
                'name': 'Localhost',
                'host': '127.0.0.1',
                'group': 'default',
                'paused': False,
                'threshold_latency': 200,
                'threshold_packet_loss': 3,
                'email_enabled': False,
                'email_recipient': ''
            }
        ]
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                loaded = json.load(f)
                if 'targets' not in loaded:
                    loaded['targets'] = default_config['targets']
                default_config.update(loaded)
        except:
            pass
    else:
        save_config(default_config)
    return default_config

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

def get_targets():
    config = load_config()
    return config.get('targets', [])

def save_targets(targets):
    config = load_config()
    config['targets'] = targets
    save_config(config)

def get_target_by_id(target_id):
    targets = get_targets()
    for t in targets:
        if t['id'] == target_id:
            return t
    return None

def get_target_by_host(host):
    targets = get_targets()
    for t in targets:
        if t['host'] == host:
            return t
    return None

def get_next_target_id():
    targets = get_targets()
    if not targets:
        return 1
    return max(t['id'] for t in targets) + 1

def send_email(to_email, subject, body):
    config = load_config()
    if not config.get('smtp_username') or not config.get('smtp_password'):
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = config.get('smtp_from_email', config['smtp_username'])
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(config['smtp_server'], config['smtp_port'])
        server.starttls()
        server.login(config['smtp_username'], config['smtp_password'])
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False

def ping_worker():
    while True:
        with app.app_context():
            targets = [t for t in get_targets() if not t.get('paused', False)]
            for target in targets:
                try:
                    latency = ping(target['host'], timeout=2)
                    packet_loss = 1 if latency is None else 0
                    if latency is None:
                        latency = 0
                    else:
                        latency = latency * 1000
                    
                    data = MonitorData(
                        host=target['host'],
                        latency=round(latency, 2),
                        packet_loss=packet_loss
                    )
                    db.session.add(data)
                    db.session.commit()
                    
                    check_alerts(target, latency, packet_loss)
                    
                except Exception as e:
                    print(f"Ping error for {target['host']}: {e}")
                
                time.sleep(5 / max(len(targets), 1))
        
        time.sleep(1)

def check_alerts(target, latency, packet_loss):
    threshold = target.get('threshold_packet_loss', 3)
    recent_data = MonitorData.query.filter_by(host=target['host'])\
        .order_by(MonitorData.timestamp.desc())\
        .limit(threshold).all()
    
    consecutive_loss = sum(1 for d in recent_data if d.packet_loss == 1)
    
    if packet_loss == 1 and consecutive_loss >= threshold:
        existing_alert = Alert.query.filter_by(
            host=target['host'],
            alert_type='packet_loss',
            acknowledged=False
        ).first()
        
        if not existing_alert:
            alert = Alert(
                host=target['host'],
                alert_type='packet_loss',
                message=f'连续丢包 {consecutive_loss} 次'
            )
            db.session.add(alert)
            db.session.commit()
            
            if target.get('email_enabled') and target.get('email_recipient'):
                send_email(
                    target['email_recipient'],
                    f'告警: {target["name"]} 网络异常',
                    f'{target["name"]} ({target["host"]}) 连续丢包 {consecutive_loss} 次，请检查网络。'
                )
    
    threshold_latency = target.get('threshold_latency', 200)
    if latency > threshold_latency and latency > 0:
        existing_alert = Alert.query.filter_by(
            host=target['host'],
            alert_type='latency',
            acknowledged=False
        ).first()
        
        if not existing_alert:
            alert = Alert(
                host=target['host'],
                alert_type='latency',
                message=f'延迟超过阈值: {round(latency, 2)}ms'
            )
            db.session.add(alert)
            db.session.commit()
            
            if target.get('email_enabled') and target.get('email_recipient'):
                send_email(
                    target['email_recipient'],
                    f'告警: {target["name"]} 延迟过高',
                    f'{target["name"]} ({target["host"]}) 延迟 {round(latency, 2)}ms 超过阈值 {threshold_latency}ms。'
                )

def calculate_availability(host, start_time):
    total = MonitorData.query.filter(
        MonitorData.host == host,
        MonitorData.timestamp >= start_time
    ).count()
    
    if total == 0:
        return 100.0
    
    lost = MonitorData.query.filter(
        MonitorData.host == host,
        MonitorData.timestamp >= start_time,
        MonitorData.packet_loss == 1
    ).count()
    
    return round((1 - lost / total) * 100, 2)

@app.route('/')
def index():
    group = request.args.get('group', 'default')
    return render_template('index.html', group=group)

@app.route('/api/targets', methods=['GET'])
def get_targets_api():
    group = request.args.get('group', 'default')
    targets = [t for t in get_targets() if t.get('group', 'default') == group]
    result = []
    
    for target in targets:
        recent_data = MonitorData.query.filter_by(host=target['host'])\
            .order_by(MonitorData.timestamp.desc())\
            .limit(60).all()
        
        avg_latency = 0
        if recent_data:
            valid_latencies = [d.latency for d in recent_data if d.latency > 0]
            if valid_latencies:
                avg_latency = round(sum(valid_latencies) / len(valid_latencies), 2)
        
        last_loss = recent_data[0].packet_loss if recent_data else 0
        
        now = datetime.utcnow()
        availability = {
            'daily': calculate_availability(target['host'], now - timedelta(days=1)),
            'weekly': calculate_availability(target['host'], now - timedelta(days=7)),
            'monthly': calculate_availability(target['host'], now - timedelta(days=30))
        }
        
        trend_data = []
        for d in recent_data[::-1]:
            trend_data.append({
                'timestamp': d.timestamp.isoformat(),
                'latency': d.latency,
                'packet_loss': d.packet_loss
            })
        
        alerts = Alert.query.filter_by(host=target['host'], acknowledged=False).count()
        
        result.append({
            'id': target['id'],
            'name': target['name'],
            'host': target['host'],
            'paused': target.get('paused', False),
            'threshold_latency': target.get('threshold_latency', 200),
            'threshold_packet_loss': target.get('threshold_packet_loss', 3),
            'email_enabled': target.get('email_enabled', False),
            'email_recipient': target.get('email_recipient', ''),
            'avg_latency': avg_latency,
            'last_loss': last_loss,
            'availability': availability,
            'trend_data': trend_data,
            'alerts': alerts
        })
    
    return jsonify(result)

@app.route('/api/targets', methods=['POST'])
def add_target():
    data = request.json
    targets = get_targets()
    new_id = get_next_target_id()
    
    new_target = {
        'id': new_id,
        'name': data['name'],
        'host': data['host'],
        'group': data.get('group', 'default'),
        'paused': False,
        'threshold_latency': data.get('threshold_latency', 200),
        'threshold_packet_loss': data.get('threshold_packet_loss', 3),
        'email_enabled': data.get('email_enabled', False),
        'email_recipient': data.get('email_recipient', '')
    }
    
    targets.append(new_target)
    save_targets(targets)
    
    return jsonify({'success': True, 'id': new_id})

@app.route('/api/targets/<int:target_id>', methods=['PUT'])
def update_target(target_id):
    targets = get_targets()
    target = None
    for t in targets:
        if t['id'] == target_id:
            target = t
            break
    
    if not target:
        return jsonify({'success': False, 'error': 'Target not found'}), 404
    
    data = request.json
    target['name'] = data.get('name', target['name'])
    target['host'] = data.get('host', target['host'])
    target['threshold_latency'] = data.get('threshold_latency', target.get('threshold_latency', 200))
    target['threshold_packet_loss'] = data.get('threshold_packet_loss', target.get('threshold_packet_loss', 3))
    target['email_enabled'] = data.get('email_enabled', target.get('email_enabled', False))
    target['email_recipient'] = data.get('email_recipient', target.get('email_recipient', ''))
    
    save_targets(targets)
    return jsonify({'success': True})

@app.route('/api/targets/<int:target_id>', methods=['DELETE'])
def delete_target(target_id):
    targets = get_targets()
    target = get_target_by_id(target_id)
    
    if not target:
        return jsonify({'success': False, 'error': 'Target not found'}), 404
    
    host = target['host']
    
    targets = [t for t in targets if t['id'] != target_id]
    save_targets(targets)
    
    MonitorData.query.filter_by(host=host).delete()
    Alert.query.filter_by(host=host).delete()
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/targets/<int:target_id>/toggle', methods=['POST'])
def toggle_target(target_id):
    targets = get_targets()
    target = None
    for t in targets:
        if t['id'] == target_id:
            target = t
            break
    
    if not target:
        return jsonify({'success': False, 'error': 'Target not found'}), 404
    
    target['paused'] = not target.get('paused', False)
    save_targets(targets)
    
    return jsonify({'success': True, 'paused': target['paused']})

@app.route('/api/data/<int:target_id>')
def get_data(target_id):
    target = get_target_by_id(target_id)
    if not target:
        return jsonify({'success': False, 'error': 'Target not found'}), 404
    
    period = request.args.get('period', '1h')
    now = datetime.utcnow()
    
    if period == '1h':
        start = now - timedelta(hours=1)
    elif period == '24h':
        start = now - timedelta(hours=24)
    elif period == '7d':
        start = now - timedelta(days=7)
    else:
        start = now - timedelta(hours=1)
    
    data = MonitorData.query.filter(
        MonitorData.host == target['host'],
        MonitorData.timestamp >= start
    ).order_by(MonitorData.timestamp).all()
    
    result = []
    for d in data:
        result.append({
            'timestamp': d.timestamp.isoformat(),
            'latency': d.latency,
            'packet_loss': d.packet_loss
        })
    
    return jsonify(result)

@app.route('/api/export/<int:target_id>')
def export_data(target_id):
    target = get_target_by_id(target_id)
    if not target:
        return jsonify({'success': False, 'error': 'Target not found'}), 404
    
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    
    query = MonitorData.query.filter_by(host=target['host'])
    if start_str:
        query = query.filter(MonitorData.timestamp >= datetime.fromisoformat(start_str))
    if end_str:
        query = query.filter(MonitorData.timestamp <= datetime.fromisoformat(end_str))
    
    data = query.order_by(MonitorData.timestamp).all()
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Timestamp', 'Latency (ms)', 'Packet Loss'])
    for d in data:
        writer.writerow([d.timestamp.isoformat(), d.latency, d.packet_loss])
    
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = f'attachment; filename="{target["name"]}_data.csv"'
    return response

@app.route('/api/alerts')
def get_alerts():
    alerts = Alert.query.filter_by(acknowledged=False).order_by(Alert.timestamp.desc()).all()
    result = []
    for alert in alerts:
        target = get_target_by_host(alert.host)
        result.append({
            'id': alert.id,
            'target_name': target['name'] if target else 'Unknown',
            'alert_type': alert.alert_type,
            'message': alert.message,
            'timestamp': alert.timestamp.isoformat()
        })
    return jsonify(result)

@app.route('/api/alerts/<int:alert_id>/acknowledge', methods=['POST'])
def acknowledge_alert(alert_id):
    alert = Alert.query.get_or_404(alert_id)
    alert.acknowledged = True
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/config', methods=['GET', 'POST'])
def email_config():
    if request.method == 'POST':
        data = request.json
        config = load_config()
        config['smtp_server'] = data.get('smtp_server', config.get('smtp_server'))
        config['smtp_port'] = data.get('smtp_port', config.get('smtp_port'))
        config['smtp_from_email'] = data.get('smtp_from_email', config.get('smtp_from_email'))
        config['smtp_username'] = data.get('smtp_username', config.get('smtp_username'))
        config['smtp_password'] = data.get('smtp_password', config.get('smtp_password'))
        save_config(config)
        return jsonify({'success': True})
    
    config = load_config()
    return jsonify({
        'smtp_server': config.get('smtp_server'),
        'smtp_port': config.get('smtp_port'),
        'smtp_from_email': config.get('smtp_from_email'),
        'smtp_username': config.get('smtp_username'),
        'smtp_password': config.get('smtp_password')
    })

@app.route('/api/groups')
def get_groups():
    targets = get_targets()
    groups = list(set(t.get('group', 'default') for t in targets))
    return jsonify(groups)

def init_db():
    with app.app_context():
        db.create_all()
        load_config()

if __name__ == '__main__':
    init_db()
    worker_thread = threading.Thread(target=ping_worker, daemon=True)
    worker_thread.start()
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
