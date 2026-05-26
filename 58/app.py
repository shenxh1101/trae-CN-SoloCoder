import os
import json
import uuid
import time
import csv
import smtplib
import requests
import threading
import ssl
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from collections import deque, defaultdict
from flask import Flask, render_template, request, redirect, url_for, jsonify, Response, flash
from apscheduler.schedulers.background import BackgroundScheduler
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

urls_lock = threading.Lock()
results_lock = threading.Lock()
notification_lock = threading.Lock()
scheduler = BackgroundScheduler(timezone='Asia/Shanghai')
check_results = defaultdict(lambda: deque(maxlen=Config.MAX_RECORDS_PER_URL))
consecutive_failures = defaultdict(int)
last_notification_time = defaultdict(lambda: 0)
scheduled_jobs = {}
notification_log = deque(maxlen=100)
smtp_config = {}


def load_smtp_config():
    global smtp_config
    config_path = os.path.join(Config.BASE_DIR, 'data', 'smtp_config.json')
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            smtp_config = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        smtp_config = {
            'host': Config.SMTP_HOST,
            'port': Config.SMTP_PORT,
            'username': Config.SMTP_USERNAME,
            'password': Config.SMTP_PASSWORD,
            'use_tls': Config.SMTP_USE_TLS,
            'from_email': Config.SMTP_FROM_EMAIL
        }
        save_smtp_config(smtp_config)
    return smtp_config


def save_smtp_config(config):
    global smtp_config
    smtp_config = config
    config_path = os.path.join(Config.BASE_DIR, 'data', 'smtp_config.json')
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def load_urls():
    try:
        with open(app.config['JSON_CONFIG_PATH'], 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('urls', [])
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_urls(urls):
    os.makedirs(os.path.dirname(app.config['JSON_CONFIG_PATH']), exist_ok=True)
    with open(app.config['JSON_CONFIG_PATH'], 'w', encoding='utf-8') as f:
        json.dump({'urls': urls}, f, ensure_ascii=False, indent=2)


def get_url_by_id(url_id):
    urls = load_urls()
    return next((u for u in urls if u['id'] == url_id), None)


def add_notification_log(notification_type, target, subject, status, error=None):
    log_entry = {
        'id': str(uuid.uuid4()),
        'timestamp': datetime.now().isoformat(),
        'type': notification_type,
        'target': target,
        'subject': subject,
        'status': status,
        'error': error
    }
    with notification_lock:
        notification_log.appendleft(log_entry)
    return log_entry


def test_smtp_connection(config):
    try:
        if config.get('use_tls', True):
            context = ssl.create_default_context()
            with smtplib.SMTP(config['host'], config['port'], timeout=10) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                if config.get('username'):
                    server.login(config['username'], config['password'])
        else:
            with smtplib.SMTP(config['host'], config['port'], timeout=10) as server:
                server.ehlo()
                if config.get('username'):
                    server.login(config['username'], config['password'])
        return True, 'SMTP连接成功'
    except smtplib.SMTPAuthenticationError as e:
        return False, f'SMTP认证失败: {str(e)}'
    except smtplib.SMTPException as e:
        return False, f'SMTP错误: {str(e)}'
    except Exception as e:
        return False, f'连接失败: {str(e)}'


def send_email(to_email, subject, body, html_body=None):
    config = load_smtp_config()
    if not config.get('username'):
        add_notification_log('email', to_email, subject, 'skipped', 'SMTP未配置')
        return False, 'SMTP未配置'

    if not to_email:
        add_notification_log('email', to_email, subject, 'skipped', '收件人邮箱为空')
        return False, '收件人邮箱为空'

    msg = MIMEMultipart('alternative')
    msg['From'] = config.get('from_email', config['username'])
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    if html_body:
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    retry_count = 0
    max_retries = 2
    last_error = None

    while retry_count <= max_retries:
        try:
            if config.get('use_tls', True):
                context = ssl.create_default_context()
                with smtplib.SMTP(config['host'], config['port'], timeout=15) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(config['username'], config['password'])
                    server.send_message(msg)
            else:
                with smtplib.SMTP(config['host'], config['port'], timeout=15) as server:
                    server.ehlo()
                    server.login(config['username'], config['password'])
                    server.send_message(msg)

            add_notification_log('email', to_email, subject, 'success')
            return True, '邮件发送成功'
        except Exception as e:
            last_error = str(e)
            retry_count += 1
            if retry_count <= max_retries:
                time.sleep(2)

    add_notification_log('email', to_email, subject, 'failed', last_error)
    app.logger.error(f'邮件发送失败（已重试{max_retries}次）: {last_error}')
    return False, last_error


def send_webhook(webhook_url, payload):
    if not webhook_url:
        add_notification_log('webhook', webhook_url, payload.get('subject', ''), 'skipped', 'Webhook URL为空')
        return False, 'Webhook URL为空'

    retry_count = 0
    max_retries = 2
    last_error = None

    while retry_count <= max_retries:
        try:
            resp = requests.post(webhook_url, json=payload, timeout=10)
            if resp.status_code >= 200 and resp.status_code < 300:
                add_notification_log('webhook', webhook_url, payload.get('subject', ''), 'success')
                return True, 'Webhook发送成功'
            else:
                last_error = f'HTTP {resp.status_code}: {resp.text[:200]}'
        except requests.exceptions.Timeout:
            last_error = '请求超时'
        except requests.exceptions.ConnectionError:
            last_error = '连接失败'
        except Exception as e:
            last_error = str(e)

        retry_count += 1
        if retry_count <= max_retries:
            time.sleep(2)

    add_notification_log('webhook', webhook_url, payload.get('subject', ''), 'failed', last_error)
    app.logger.error(f'Webhook发送失败（已重试{max_retries}次）: {last_error}')
    return False, last_error


def send_notification(url_config, last_result):
    email_config = url_config.get('notification_email', '')
    webhook_url = url_config.get('notification_webhook', '')

    subject = f'[URL监控告警] {url_config["name"]} 连续失败'
    message = f"""URL监控告警通知

URL名称: {url_config['name']}
URL地址: {url_config['url']}
连续失败次数: {Config.CONSECUTIVE_FAILURES_FOR_NOTIFICATION}
最近错误: {last_result.get('error', '未知错误')}
检查时间: {last_result.get('timestamp', datetime.now().isoformat())}
HTTP状态码: {last_result.get('status_code', 'N/A')}
响应时间: {last_result.get('response_time', 'N/A')}ms

告警时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

此邮件由URL健康检查服务自动发送，请勿直接回复。
"""

    html_message = f"""
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="background: #dc2626; color: white; padding: 16px 24px;">
            <h2 style="margin: 0;">⚠️ URL监控告警</h2>
        </div>
        <div style="padding: 24px;">
            <p style="font-size: 16px; color: #374151;">
                <strong>{url_config['name']}</strong> 已连续失败 {Config.CONSECUTIVE_FAILURES_FOR_NOTIFICATION} 次
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 120px;">URL地址</td>
                    <td style="padding: 8px 0; color: #111827;">{url_config['url']}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">错误信息</td>
                    <td style="padding: 8px 0; color: #dc2626;">{last_result.get('error', '未知错误')}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">HTTP状态码</td>
                    <td style="padding: 8px 0; color: #111827;">{last_result.get('status_code', 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">响应时间</td>
                    <td style="padding: 8px 0; color: #111827;">{last_result.get('response_time', 'N/A')}ms</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">告警时间</td>
                    <td style="padding: 8px 0; color: #111827;">{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td>
                </tr>
            </table>
        </div>
        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; color: #6b7280; font-size: 12px;">
            此邮件由URL健康检查服务自动发送
        </div>
    </div>
</body>
</html>
"""

    webhook_payload = {
        'type': 'alert',
        'alert_type': 'url_monitor',
        'subject': subject,
        'message': message,
        'level': 'critical',
        'timestamp': datetime.now().isoformat(),
        'url_config': {
            'id': url_config.get('id'),
            'name': url_config.get('name'),
            'url': url_config.get('url'),
            'method': url_config.get('method'),
            'interval': url_config.get('interval'),
            'expected_status': url_config.get('expected_status')
        },
        'last_result': last_result,
        'consecutive_failures': Config.CONSECUTIVE_FAILURES_FOR_NOTIFICATION
    }

    if email_config:
        send_email(email_config, subject, message, html_message)

    if webhook_url:
        send_webhook(webhook_url, webhook_payload)


def check_url(url_config):
    url_id = url_config['id']
    url = url_config['url']
    method = url_config.get('method', 'GET')
    timeout = url_config.get('timeout', Config.DEFAULT_TIMEOUT)
    expected_status = url_config.get('expected_status', Config.DEFAULT_EXPECTED_STATUS)
    request_body = url_config.get('body', '')
    headers = url_config.get('headers', {})
    keyword = url_config.get('keyword', '')

    if isinstance(headers, str):
        try:
            headers = json.loads(headers) if headers else {}
        except json.JSONDecodeError:
            headers = {}

    result = {
        'timestamp': datetime.now().isoformat(),
        'success': False,
        'status_code': None,
        'response_time': None,
        'error': None,
        'anomaly': False
    }

    try:
        start_time = time.time()
        if method.upper() == 'POST':
            resp = requests.post(url, data=request_body, headers=headers, timeout=timeout)
        else:
            resp = requests.get(url, headers=headers, timeout=timeout)
        elapsed = (time.time() - start_time) * 1000

        result['status_code'] = resp.status_code
        result['response_time'] = round(elapsed, 2)

        expected_codes = [int(s.strip()) for s in str(expected_status).split(',') if s.strip().isdigit()]
        status_ok = resp.status_code in expected_codes if expected_codes else True

        keyword_ok = True
        if keyword:
            keyword_ok = keyword in resp.text

        result['success'] = status_ok and keyword_ok

        if not status_ok:
            result['error'] = f'状态码不匹配: 期望 {expected_status}, 实际 {resp.status_code}'
        elif not keyword_ok:
            result['error'] = f'关键字不匹配: 未找到 "{keyword}"'

    except requests.exceptions.Timeout:
        result['error'] = '请求超时'
    except requests.exceptions.ConnectionError:
        result['error'] = '连接失败'
    except Exception as e:
        result['error'] = str(e)

    with results_lock:
        check_results[url_id].append(result)
        if result['success']:
            consecutive_failures[url_id] = 0
        else:
            consecutive_failures[url_id] += 1

        if consecutive_failures[url_id] >= Config.CONSECUTIVE_FAILURES_FOR_NOTIFICATION:
            now = time.time()
            if now - last_notification_time[url_id] > Config.NOTIFICATION_COOLDOWN_SECONDS:
                try:
                    send_notification(url_config, result)
                except Exception as e:
                    app.logger.error(f'发送通知异常: {e}')
                last_notification_time[url_id] = now

        history = [r['response_time'] for r in check_results[url_id] if r['response_time'] is not None]
        if len(history) >= 5 and result['response_time'] is not None:
            avg = sum(history[:-1]) / len(history[:-1])
            if result['response_time'] > avg * Config.ANOMALY_THRESHOLD_MULTIPLIER:
                result['anomaly'] = True


def schedule_job(url_config):
    if url_config.get('paused', False):
        return
    job = scheduler.add_job(
        check_url,
        'interval',
        seconds=url_config.get('interval', Config.DEFAULT_INTERVAL),
        args=[url_config],
        id=url_config['id'],
        replace_existing=True
    )
    scheduled_jobs[url_config['id']] = job


def init_scheduler():
    urls = load_urls()
    for url_config in urls:
        if not url_config.get('paused', False):
            schedule_job(url_config)
    scheduler.start()


def get_url_stats(url_config):
    url_id = url_config['id']
    with results_lock:
        records = list(check_results.get(url_id, []))

    if not records:
        return {
            'total': 0,
            'success': 0,
            'availability': 0,
            'avg_response_time': 0,
            'max_response_time': 0,
            'last_24h_success': 0,
            'last_24h_total': 0,
            'last_24h_rate': 0,
            'recent_failures': consecutive_failures.get(url_id, 0),
            'last_result': None
        }

    success_count = sum(1 for r in records if r['success'])
    availability = round((success_count / len(records)) * 100, 2)

    response_times = [r['response_time'] for r in records if r['response_time'] is not None]
    avg_rt = round(sum(response_times) / len(response_times), 2) if response_times else 0
    max_rt = round(max(response_times), 2) if response_times else 0

    now = datetime.now()
    last_24h = [r for r in records if now - datetime.fromisoformat(r['timestamp']) < timedelta(hours=24)]
    last_24h_success = sum(1 for r in last_24h if r['success'])
    last_24h_rate = round((last_24h_success / len(last_24h)) * 100, 2) if last_24h else 0

    return {
        'total': len(records),
        'success': success_count,
        'availability': availability,
        'avg_response_time': avg_rt,
        'max_response_time': max_rt,
        'last_24h_success': last_24h_success,
        'last_24h_total': len(last_24h),
        'last_24h_rate': last_24h_rate,
        'recent_failures': consecutive_failures.get(url_id, 0),
        'last_result': records[-1] if records else None
    }


@app.route('/')
def index():
    urls = load_urls()
    url_data = []
    for url_config in urls:
        stats = get_url_stats(url_config)
        url_data.append({**url_config, **stats})
    return render_template('index.html', urls=url_data)


@app.route('/add', methods=['GET', 'POST'])
def add_url():
    if request.method == 'POST':
        url_data = {
            'id': str(uuid.uuid4()),
            'name': request.form['name'],
            'url': request.form['url'],
            'method': request.form.get('method', 'GET'),
            'interval': int(request.form.get('interval', Config.DEFAULT_INTERVAL)),
            'timeout': int(request.form.get('timeout', Config.DEFAULT_TIMEOUT)),
            'expected_status': request.form.get('expected_status', Config.DEFAULT_EXPECTED_STATUS),
            'body': request.form.get('body', ''),
            'headers': request.form.get('headers', ''),
            'keyword': request.form.get('keyword', ''),
            'notification_email': request.form.get('notification_email', ''),
            'notification_webhook': request.form.get('notification_webhook', ''),
            'created_at': datetime.now().isoformat(),
            'paused': False
        }
        with urls_lock:
            urls = load_urls()
            urls.append(url_data)
            save_urls(urls)
        schedule_job(url_data)
        flash('URL添加成功', 'success')
        return redirect(url_for('index'))
    return render_template('add.html')


@app.route('/edit/<url_id>', methods=['GET', 'POST'])
def edit_url(url_id):
    url_config = get_url_by_id(url_id)
    if not url_config:
        flash('URL不存在', 'error')
        return redirect(url_for('index'))

    if request.method == 'POST':
        url_config.update({
            'name': request.form['name'],
            'url': request.form['url'],
            'method': request.form.get('method', 'GET'),
            'interval': int(request.form.get('interval', Config.DEFAULT_INTERVAL)),
            'timeout': int(request.form.get('timeout', Config.DEFAULT_TIMEOUT)),
            'expected_status': request.form.get('expected_status', Config.DEFAULT_EXPECTED_STATUS),
            'body': request.form.get('body', ''),
            'headers': request.form.get('headers', ''),
            'keyword': request.form.get('keyword', ''),
            'notification_email': request.form.get('notification_email', ''),
            'notification_webhook': request.form.get('notification_webhook', ''),
            'updated_at': datetime.now().isoformat()
        })
        with urls_lock:
            urls = load_urls()
            for i, u in enumerate(urls):
                if u['id'] == url_id:
                    urls[i] = url_config
                    break
            save_urls(urls)

        if url_id in scheduled_jobs:
            scheduled_jobs[url_id].remove()
        if not url_config.get('paused', False):
            schedule_job(url_config)

        flash('URL更新成功', 'success')
        return redirect(url_for('index'))
    return render_template('add.html', url=url_config, is_edit=True)


@app.route('/delete/<url_id>')
def delete_url(url_id):
    with urls_lock:
        urls = load_urls()
        urls = [u for u in urls if u['id'] != url_id]
        save_urls(urls)
    if url_id in scheduled_jobs:
        scheduled_jobs[url_id].remove()
        del scheduled_jobs[url_id]
    with results_lock:
        if url_id in check_results:
            del check_results[url_id]
        if url_id in consecutive_failures:
            del consecutive_failures[url_id]
    flash('URL删除成功', 'success')
    return redirect(url_for('index'))


@app.route('/pause/<url_id>')
def pause_url(url_id):
    with urls_lock:
        urls = load_urls()
        for u in urls:
            if u['id'] == url_id:
                u['paused'] = True
                break
        save_urls(urls)
    if url_id in scheduled_jobs:
        scheduled_jobs[url_id].remove()
    flash('监控已暂停', 'info')
    return redirect(url_for('index'))


@app.route('/resume/<url_id>')
def resume_url(url_id):
    url_config = get_url_by_id(url_id)
    with urls_lock:
        urls = load_urls()
        for u in urls:
            if u['id'] == url_id:
                u['paused'] = False
                break
        save_urls(urls)
    if url_config:
        schedule_job(url_config)
    flash('监控已恢复', 'info')
    return redirect(url_for('index'))


@app.route('/detail/<url_id>')
def detail(url_id):
    url_config = get_url_by_id(url_id)
    if not url_config:
        flash('URL不存在', 'error')
        return redirect(url_for('index'))
    stats = get_url_stats(url_config)
    with results_lock:
        records = list(check_results.get(url_id, []))
    return render_template('detail.html', url=url_config, stats=stats, records=list(reversed(records)))


@app.route('/check/<url_id>')
def manual_check(url_id):
    url_config = get_url_by_id(url_id)
    if url_config:
        check_url(url_config)
        flash('手动检查完成', 'info')
    return redirect(url_for('detail', url_id=url_id))


@app.route('/export/<format_type>')
def export_report(format_type):
    urls = load_urls()
    report = []
    for url_config in urls:
        stats = get_url_stats(url_config)
        report.append({
            **{k: v for k, v in url_config.items() if k not in ['headers', 'body']},
            **stats
        })

    if format_type == 'json':
        return Response(
            json.dumps(report, ensure_ascii=False, indent=2),
            mimetype='application/json',
            headers={'Content-Disposition': 'attachment; filename=report.json'}
        )
    elif format_type == 'html':
        return render_template('report.html', report=report, now=datetime.now())
    else:
        flash('不支持的导出格式', 'error')
        return redirect(url_for('index'))


@app.route('/import', methods=['GET', 'POST'])
def import_urls():
    if request.method == 'POST':
        if 'csv_file' not in request.files:
            flash('请选择CSV文件', 'error')
            return redirect(url_for('import_urls'))
        file = request.files['csv_file']
        if file.filename == '':
            flash('请选择CSV文件', 'error')
            return redirect(url_for('import_urls'))

        try:
            content = file.read().decode('utf-8')
            reader = csv.DictReader(content.splitlines())
            imported_count = 0

            with urls_lock:
                urls = load_urls()
                for row in reader:
                    url_data = {
                        'id': str(uuid.uuid4()),
                        'name': row.get('name', '未命名'),
                        'url': row['url'],
                        'method': row.get('method', 'GET'),
                        'interval': int(row.get('interval', Config.DEFAULT_INTERVAL)),
                        'timeout': int(row.get('timeout', Config.DEFAULT_TIMEOUT)),
                        'expected_status': row.get('expected_status', Config.DEFAULT_EXPECTED_STATUS),
                        'body': row.get('body', ''),
                        'headers': row.get('headers', ''),
                        'keyword': row.get('keyword', ''),
                        'notification_email': row.get('notification_email', ''),
                        'notification_webhook': row.get('notification_webhook', ''),
                        'created_at': datetime.now().isoformat(),
                        'paused': False
                    }
                    urls.append(url_data)
                    schedule_job(url_data)
                    imported_count += 1
                save_urls(urls)
            flash(f'成功导入 {imported_count} 个URL', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            flash(f'导入失败: {str(e)}', 'error')
    return render_template('import.html')


@app.route('/settings', methods=['GET', 'POST'])
def settings():
    config = load_smtp_config()
    if request.method == 'POST':
        new_config = {
            'host': request.form.get('smtp_host', ''),
            'port': int(request.form.get('smtp_port', 587)),
            'username': request.form.get('smtp_username', ''),
            'password': request.form.get('smtp_password', config.get('password', '')),
            'use_tls': request.form.get('smtp_use_tls') == 'on',
            'from_email': request.form.get('smtp_from_email', '')
        }
        if not request.form.get('smtp_password') and config.get('password'):
            new_config['password'] = config['password']
        save_smtp_config(new_config)
        flash('SMTP配置已保存', 'success')
        return redirect(url_for('settings'))
    return render_template('settings.html', config=config)


@app.route('/settings/test-smtp', methods=['POST'])
def test_smtp():
    test_email = request.form.get('test_email', '')
    if not test_email:
        flash('请输入测试邮箱地址', 'error')
        return redirect(url_for('settings'))

    config = load_smtp_config()
    success, message = test_smtp_connection(config)
    if success:
        subject = '[URL健康检查] SMTP配置测试邮件'
        body = f"""这是一封测试邮件。

SMTP配置测试成功！
测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

如果您收到了这封邮件，说明您的SMTP配置工作正常。
"""
        send_success, send_message = send_email(test_email, subject, body)
        if send_success:
            flash(f'SMTP连接成功，测试邮件已发送至 {test_email}', 'success')
        else:
            flash(f'SMTP连接成功，但发送邮件失败: {send_message}', 'error')
    else:
        flash(f'SMTP连接失败: {message}', 'error')
    return redirect(url_for('settings'))


@app.route('/test-notification/<url_id>')
def test_notification(url_id):
    url_config = get_url_by_id(url_id)
    if not url_config:
        flash('URL不存在', 'error')
        return redirect(url_for('index'))

    test_result = {
        'timestamp': datetime.now().isoformat(),
        'success': False,
        'status_code': 500,
        'response_time': 123.45,
        'error': '测试告警 - 这是一条测试通知',
        'anomaly': False
    }

    email_sent = False
    webhook_sent = False
    email_msg = ''
    webhook_msg = ''

    if url_config.get('notification_email'):
        subject = f'[测试] [URL监控告警] {url_config["name"]}'
        message = f"""这是一封测试告警邮件。

URL名称: {url_config['name']}
URL地址: {url_config['url']}
测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

如果您收到了这封邮件，说明邮件通知功能配置正确。
"""
        html_message = f"""
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="background: #3b82f6; color: white; padding: 16px 24px;">
            <h2 style="margin: 0;">📧 测试通知邮件</h2>
        </div>
        <div style="padding: 24px;">
            <p style="font-size: 16px; color: #374151;">
                这是 <strong>{url_config['name']}</strong> 的测试告警通知
            </p>
            <p style="color: #6b7280;">如果您收到了这封邮件，说明邮件通知功能配置正确。</p>
            <p style="color: #6b7280;">测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>
"""
        success, email_msg = send_email(url_config['notification_email'], subject, message, html_message)
        email_sent = success

    if url_config.get('notification_webhook'):
        webhook_payload = {
            'type': 'test',
            'alert_type': 'url_monitor',
            'subject': f'[测试] [URL监控告警] {url_config["name"]}',
            'message': '这是一条测试Webhook通知',
            'level': 'info',
            'timestamp': datetime.now().isoformat(),
            'url_config': {
                'name': url_config['name'],
                'url': url_config['url']
            },
            'test': True
        }
        success, webhook_msg = send_webhook(url_config['notification_webhook'], webhook_payload)
        webhook_sent = success

    messages = []
    if url_config.get('notification_email'):
        messages.append(f'邮件通知: {"成功" if email_sent else "失败"} - {email_msg}')
    if url_config.get('notification_webhook'):
        messages.append(f'Webhook通知: {"成功" if webhook_sent else "失败"} - {webhook_msg}')

    if not url_config.get('notification_email') and not url_config.get('notification_webhook'):
        flash('该URL未配置任何通知方式', 'warning')
    else:
        flash(' | '.join(messages), 'info' if (email_sent or webhook_sent) else 'error')

    return redirect(url_for('detail', url_id=url_id))


@app.route('/notifications')
def notifications():
    with notification_lock:
        logs = list(notification_log)
    return render_template('notifications.html', logs=logs)


@app.route('/api/notifications')
def api_notifications():
    with notification_lock:
        logs = list(notification_log)
    return jsonify(logs)


@app.route('/api/status')
def api_status():
    urls = load_urls()
    result = []
    for url_config in urls:
        stats = get_url_stats(url_config)
        result.append({
            'id': url_config['id'],
            'name': url_config['name'],
            'url': url_config['url'],
            'paused': url_config.get('paused', False),
            'availability': stats['availability'],
            'last_24h_rate': stats['last_24h_rate'],
            'avg_response_time': stats['avg_response_time'],
            'recent_failures': stats['recent_failures'],
            'last_result': stats['last_result']
        })
    return jsonify(result)


@app.route('/api/status/<url_id>')
def api_url_status(url_id):
    url_config = get_url_by_id(url_id)
    if not url_config:
        return jsonify({'error': 'URL not found'}), 404
    stats = get_url_stats(url_config)
    with results_lock:
        records = list(check_results.get(url_id, []))
    return jsonify({
        'config': url_config,
        'stats': stats,
        'recent_records': list(reversed(records))
    })


@app.route('/api/chart/<url_id>/response_time')
def api_chart_response_time(url_id):
    with results_lock:
        records = list(check_results.get(url_id, []))
    data = []
    for r in records:
        data.append({
            'time': r['timestamp'],
            'value': r['response_time'] or 0,
            'success': r['success']
        })
    return jsonify(data)


@app.route('/api/chart/<url_id>/availability')
def api_chart_availability(url_id):
    with results_lock:
        records = list(check_results.get(url_id, []))
    by_date = defaultdict(lambda: {'success': 0, 'total': 0})
    for r in records:
        d = datetime.fromisoformat(r['timestamp']).strftime('%Y-%m-%d')
        by_date[d]['total'] += 1
        if r['success']:
            by_date[d]['success'] += 1
    result = []
    for date, data in sorted(by_date.items()):
        result.append({
            'date': date,
            'rate': round((data['success'] / data['total']) * 100, 2) if data['total'] > 0 else 0
        })
    return jsonify(result)


@app.route('/api/test-email', methods=['POST'])
def api_test_email():
    data = request.get_json() or {}
    to_email = data.get('to_email', '')
    subject = data.get('subject', '[URL健康检查] API测试邮件')
    body = data.get('body', '这是一封通过API发送的测试邮件。')

    if not to_email:
        return jsonify({'success': False, 'error': '收件人邮箱不能为空'}), 400

    success, message = send_email(to_email, subject, body)
    return jsonify({
        'success': success,
        'message': message
    })


@app.route('/api/test-webhook', methods=['POST'])
def api_test_webhook():
    data = request.get_json() or {}
    webhook_url = data.get('webhook_url', '')
    payload = data.get('payload', {'test': True, 'message': 'Webhook测试'})

    if not webhook_url:
        return jsonify({'success': False, 'error': 'Webhook URL不能为空'}), 400

    success, message = send_webhook(webhook_url, payload)
    return jsonify({
        'success': success,
        'message': message
    })


@app.context_processor
def inject_globals():
    return {'now': datetime.now()}


if __name__ == '__main__':
    load_smtp_config()
    init_scheduler()
    app.run(host='0.0.0.0', port=5001, debug=False)
