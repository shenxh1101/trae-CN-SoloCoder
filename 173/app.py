import os
import io
import yaml
import time
import json
import queue
import smtplib
import functools
import threading
import subprocess
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import (
    Flask, render_template, request, redirect, url_for,
    jsonify, Response, send_file, abort
)
from flask_login import (
    LoginManager, UserMixin, login_user, login_required,
    logout_user, current_user
)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
SCRIPTS_DIR = os.path.join(BASE_DIR, 'scripts')

with open(os.path.join(BASE_DIR, 'config.yaml'), 'r', encoding='utf-8') as f:
    CONFIG = yaml.safe_load(f)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "commands.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

execution_queues = {}
execution_outputs = {}


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user')
    api_token = db.Column(db.String(64), unique=True)
    email = db.Column(db.String(120))
    command_groups = db.Column(db.Text, default='[]')

    def get_command_groups(self):
        return json.loads(self.command_groups)


class CommandHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    command_group = db.Column(db.String(80), nullable=False)
    command_group_name = db.Column(db.String(120))
    command = db.Column(db.Text, nullable=False)
    command_name = db.Column(db.String(120))
    status = db.Column(db.String(20), default='running')
    output = db.Column(db.Text, default='')
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    log_file = db.Column(db.String(255))
    require_approval = db.Column(db.Boolean, default=False)
    approved = db.Column(db.Boolean, default=False)
    approved_by = db.Column(db.String(80))
    approved_at = db.Column(db.DateTime)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': '缺少API Token'}), 401
        user = User.query.filter_by(api_token=token).first()
        if not user:
            return jsonify({'error': '无效的API Token'}), 401
        request.api_user = user
        return f(*args, **kwargs)
    return decorated


def send_email(subject, body, recipients):
    smtp_config = CONFIG.get('smtp', {})
    if not smtp_config.get('enabled', False):
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_config.get('from_addr')
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        server = smtplib.SMTP(smtp_config.get('host'), smtp_config.get('port'))
        if smtp_config.get('use_tls', True):
            server.starttls()
        server.login(smtp_config.get('username'), smtp_config.get('password'))
        server.sendmail(msg['From'], recipients, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        app.logger.error(f'邮件发送失败: {e}')
        return False


def run_command(command, history_id, timeout=60):
    q = execution_queues.get(history_id)
    if q is None:
        q = queue.Queue()
        execution_queues[history_id] = q
    output_lines = []

    q.put(f'$ {command}\n')

    try:
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        start_time = time.time()

        while True:
            if process.poll() is not None:
                break
            elapsed = time.time() - start_time
            if elapsed > timeout:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                q.put(f'\n[ERROR] 命令执行超时 ({timeout}秒)，已终止\n')
                output_lines.append(f'\n[ERROR] 命令执行超时 ({timeout}秒)，已终止\n')
                break

            line = process.stdout.readline()
            if line:
                q.put(line)
                output_lines.append(line)

        remaining = process.stdout.read()
        if remaining:
            q.put(remaining)
            output_lines.append(remaining)

        return_code = process.returncode
        q.put(f'\n[DONE] 命令执行完成，退出码: {return_code}\n')
        output_lines.append(f'\n[DONE] 命令执行完成，退出码: {return_code}\n')

        status = 'success' if return_code == 0 else 'failed'

    except Exception as e:
        error_msg = f'[ERROR] 命令执行异常: {str(e)}\n'
        q.put(error_msg)
        output_lines.append(error_msg)
        status = 'error'

    q.put('[END]')
    execution_outputs[history_id] = ''.join(output_lines)

    with app.app_context():
        cmd_history = CommandHistory.query.get(history_id)
        if cmd_history:
            cmd_history.status = status
            cmd_history.end_time = datetime.utcnow()
            cmd_history.output = execution_outputs[history_id]

            os.makedirs(LOGS_DIR, exist_ok=True)
            log_filename = f'{history_id}_{cmd_history.command_group}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
            log_path = os.path.join(LOGS_DIR, log_filename)
            with open(log_path, 'w', encoding='utf-8') as f:
                f.write(f'命令组: {cmd_history.command_group_name}\n')
                f.write(f'命令: {cmd_history.command_name}\n')
                f.write(f'执行用户: {cmd_history.username}\n')
                f.write(f'开始时间: {cmd_history.start_time}\n')
                f.write(f'结束时间: {cmd_history.end_time}\n')
                f.write(f'状态: {status}\n')
                f.write('=' * 50 + '\n')
                f.write(cmd_history.output)
            cmd_history.log_file = log_filename

            db.session.commit()

            group_config = CONFIG['command_groups'].get(cmd_history.command_group, {})
            if group_config.get('notify_email', False) and group_config.get('email_recipients'):
                subject = f'[{status.upper()}] 命令执行通知 - {cmd_history.command_group_name}'
                body = f'''
命令组: {cmd_history.command_group_name}
命令: {cmd_history.command_name}
执行用户: {cmd_history.username}
开始时间: {cmd_history.start_time}
结束时间: {cmd_history.end_time}
状态: {status}

命令:
{cmd_history.command}

输出:
{cmd_history.output}
'''
                send_email(subject, body, group_config['email_recipients'])


def generate_stream(history_id):
    q = execution_queues.get(history_id)
    if not q:
        yield 'data: [ERROR] 无效的执行ID\n\n'
        return

    while True:
        try:
            line = q.get(timeout=0.1)
            if line == '[END]':
                break
            yield f'data: {json.dumps({"line": line}, ensure_ascii=False)}\n\n'
        except queue.Empty:
            yield f'data: {json.dumps({"line": ""}, ensure_ascii=False)}\n\n'


def init_db():
    os.makedirs(LOGS_DIR, exist_ok=True)
    with app.app_context():
        db.create_all()
        for user_config in CONFIG.get('users', []):
            existing = User.query.filter_by(username=user_config['username']).first()
            if not existing:
                user = User(
                    username=user_config['username'],
                    password_hash=generate_password_hash(user_config['password']),
                    role=user_config.get('role', 'user'),
                    api_token=user_config.get('api_token', ''),
                    email=user_config.get('email', ''),
                    command_groups=json.dumps(user_config.get('command_groups', []))
                )
                db.session.add(user)
        db.session.commit()


def get_available_commands(user):
    user_groups = user.get_command_groups() if hasattr(user, 'get_command_groups') else []
    available = {}
    for group_id, group_config in CONFIG['command_groups'].items():
        if group_id in user_groups:
            available[group_id] = group_config
    return available


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('index'))

        return render_template('login.html', error='用户名或密码错误')

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


@app.route('/')
@login_required
def index():
    commands = get_available_commands(current_user)
    return render_template('index.html', commands=commands)


@app.route('/execute/<group_id>/<int:cmd_index>', methods=['POST'])
@login_required
def execute_command(group_id, cmd_index):
    user_groups = current_user.get_command_groups()
    if group_id not in user_groups:
        abort(403)

    group_config = CONFIG['command_groups'].get(group_id)
    if not group_config:
        abort(404)

    if cmd_index >= len(group_config['commands']):
        abort(404)

    cmd = group_config['commands'][cmd_index]

    cmd_record = CommandHistory(
        username=current_user.username,
        command_group=group_id,
        command_group_name=group_config['name'],
        command=cmd['command'],
        command_name=cmd['name'],
        require_approval=group_config.get('require_approval', False),
        approved=not group_config.get('require_approval', False)
    )
    db.session.add(cmd_record)
    db.session.commit()

    if group_config.get('require_approval', False):
        return jsonify({
            'success': True,
            'require_approval': True,
            'history_id': cmd_record.id,
            'message': '需要管理员审批'
        })

    execution_queues[cmd_record.id] = queue.Queue()

    thread = threading.Thread(
        target=run_command,
        args=(cmd['command'], cmd_record.id, CONFIG.get('command_timeout', 60))
    )
    thread.daemon = True
    thread.start()

    return jsonify({
        'success': True,
        'require_approval': False,
        'history_id': cmd_record.id
    })


@app.route('/stream/<int:history_id>')
@login_required
def stream(history_id):
    cmd_record = CommandHistory.query.get_or_404(history_id)
    if cmd_record.username != current_user.username and current_user.role != 'admin':
        abort(403)
    return Response(generate_stream(history_id), mimetype='text/event-stream')


@app.route('/output/<int:history_id>')
@login_required
def get_output(history_id):
    cmd_record = CommandHistory.query.get_or_404(history_id)
    if cmd_record.username != current_user.username and current_user.role != 'admin':
        abort(403)
    return jsonify({
        'output': execution_outputs.get(history_id, cmd_record.output or ''),
        'status': cmd_record.status
    })


@app.route('/approval')
@login_required
def approval_list():
    if current_user.role != 'admin':
        abort(403)
    pending = CommandHistory.query.filter_by(
        require_approval=True, approved=False, status='running'
    ).all()
    return render_template('approval.html', pending=pending)


@app.route('/approval/<int:history_id>/<action>', methods=['POST'])
@login_required
def approve_command(history_id, action):
    if current_user.role != 'admin':
        abort(403)

    cmd_record = CommandHistory.query.get_or_404(history_id)
    if not cmd_record.require_approval or cmd_record.approved:
        return jsonify({'success': False, 'message': '无效的审批请求'})

    if action == 'approve':
        cmd_record.approved = True
        cmd_record.approved_by = current_user.username
        cmd_record.approved_at = datetime.utcnow()
        db.session.commit()

        execution_queues[cmd_record.id] = queue.Queue()

        thread = threading.Thread(
            target=run_command,
            args=(cmd_record.command, cmd_record.id, CONFIG.get('command_timeout', 60))
        )
        thread.daemon = True
        thread.start()

        return jsonify({'success': True, 'message': '已批准执行'})
    elif action == 'reject':
        cmd_record.approved = False
        cmd_record.status = 'rejected'
        cmd_record.end_time = datetime.utcnow()
        cmd_record.approved_by = current_user.username
        cmd_record.approved_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True, 'message': '已拒绝执行'})

    return jsonify({'success': False, 'message': '无效操作'})


@app.route('/history')
@login_required
def history_page():
    if current_user.role == 'admin':
        histories = CommandHistory.query.order_by(CommandHistory.start_time.desc()).all()
    else:
        histories = CommandHistory.query.filter_by(
            username=current_user.username
        ).order_by(CommandHistory.start_time.desc()).all()
    return render_template('history.html', histories=histories)


@app.route('/download/<int:history_id>')
@login_required
def download_log(history_id):
    cmd_record = CommandHistory.query.get_or_404(history_id)
    if cmd_record.username != current_user.username and current_user.role != 'admin':
        abort(403)

    if not cmd_record.log_file:
        content = f'''命令组: {cmd_record.command_group_name}
命令: {cmd_record.command_name}
执行用户: {cmd_record.username}
开始时间: {cmd_record.start_time}
结束时间: {cmd_record.end_time}
状态: {cmd_record.status}
{"=" * 50}
{cmd_record.output}
'''
        buf = io.BytesIO(content.encode('utf-8'))
        buf.seek(0)
        filename = f'{cmd_record.id}_{cmd_record.command_group}.log'
        return send_file(buf, as_attachment=True, download_name=filename)

    log_path = os.path.join(LOGS_DIR, cmd_record.log_file)
    if os.path.exists(log_path):
        return send_file(log_path, as_attachment=True)

    abort(404)


@app.route('/api/commands', methods=['GET'])
@token_required
def api_get_commands():
    user = request.api_user
    commands = get_available_commands(user)
    return jsonify({
        'success': True,
        'commands': commands
    })


@app.route('/api/execute/<group_id>/<int:cmd_index>', methods=['POST'])
@token_required
def api_execute(group_id, cmd_index):
    user = request.api_user
    user_groups = user.get_command_groups()

    if group_id not in user_groups:
        return jsonify({'success': False, 'error': '无权限执行此命令组'}), 403

    group_config = CONFIG['command_groups'].get(group_id)
    if not group_config:
        return jsonify({'success': False, 'error': '命令组不存在'}), 404

    if cmd_index >= len(group_config['commands']):
        return jsonify({'success': False, 'error': '命令索引无效'}), 404

    if group_config.get('require_approval', False):
        return jsonify({
            'success': False,
            'error': '此命令需要管理员审批，请通过Web界面提交'
        }), 403

    cmd = group_config['commands'][cmd_index]

    cmd_record = CommandHistory(
        username=user.username,
        command_group=group_id,
        command_group_name=group_config['name'],
        command=cmd['command'],
        command_name=cmd['name'],
        require_approval=False,
        approved=True
    )
    db.session.add(cmd_record)
    db.session.commit()

    execution_queues[cmd_record.id] = queue.Queue()

    thread = threading.Thread(
        target=run_command,
        args=(cmd['command'], cmd_record.id, CONFIG.get('command_timeout', 60))
    )
    thread.daemon = True
    thread.start()

    timeout = CONFIG.get('command_timeout', 60)
    start = time.time()
    while True:
        db.session.refresh(cmd_record)
        if cmd_record.status != 'running':
            break
        if (time.time() - start) > timeout + 5:
            break
        time.sleep(0.5)

    return jsonify({
        'success': True,
        'history_id': cmd_record.id,
        'command': cmd['name'],
        'status': cmd_record.status,
        'output': cmd_record.output
    })


@app.route('/api/history', methods=['GET'])
@token_required
def api_history():
    user = request.api_user
    if user.role == 'admin':
        histories = CommandHistory.query.order_by(CommandHistory.start_time.desc()).limit(50).all()
    else:
        histories = CommandHistory.query.filter_by(
            username=user.username
        ).order_by(CommandHistory.start_time.desc()).limit(50).all()

    result = []
    for h in histories:
        result.append({
            'id': h.id,
            'username': h.username,
            'command_group': h.command_group,
            'command_group_name': h.command_group_name,
            'command_name': h.command_name,
            'status': h.status,
            'start_time': h.start_time.isoformat() if h.start_time else None,
            'end_time': h.end_time.isoformat() if h.end_time else None,
            'require_approval': h.require_approval,
            'approved': h.approved
        })
    return jsonify({'success': True, 'history': result})


@app.route('/api/output/<int:history_id>', methods=['GET'])
@token_required
def api_get_output(history_id):
    user = request.api_user
    cmd_record = CommandHistory.query.get_or_404(history_id)
    if cmd_record.username != user.username and user.role != 'admin':
        return jsonify({'success': False, 'error': '无权限'}), 403
    return jsonify({
        'success': True,
        'output': execution_outputs.get(history_id, cmd_record.output or ''),
        'status': cmd_record.status
    })


if __name__ == '__main__':
    init_db()
    server_config = CONFIG.get('server', {})
    app.run(
        host=server_config.get('host', '0.0.0.0'),
        port=server_config.get('port', 5000),
        debug=server_config.get('debug', False)
    )
