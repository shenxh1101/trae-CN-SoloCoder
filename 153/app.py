import os
import re
import ssl
import uuid
import base64
import smtplib
import zipfile
import ipaddress
import json
import logging
from io import BytesIO
from datetime import datetime
from collections import deque
from email.message import EmailMessage
from urllib.parse import urlparse

from flask import (
    Flask, render_template, request, jsonify,
    send_file, send_from_directory
)
from PIL import Image
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytesseract

from config import Config

app = Flask(__name__)
app.config.from_object(Config)

os.makedirs(app.config['SCREENSHOT_DIR'], exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()
scheduler.start()


class ScreenshotEngine:
    def __init__(self):
        self.playwright = None
        self.browser = None

    def __enter__(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security'
            ]
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()

    def _validate_url(self, url):
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            raise ValueError('Invalid URL scheme')

        try:
            hostname = parsed.hostname
            if hostname:
                try:
                    ip = ipaddress.ip_address(hostname)
                    if ip.is_private or ip.is_loopback or ip.is_link_local:
                        raise ValueError('Internal IP addresses are not allowed')
                except ValueError:
                    pass

            if hostname in ('localhost', '127.0.0.1', '::1'):
                raise ValueError('Localhost addresses are not allowed')
        except Exception as e:
            if isinstance(e, ValueError) and str(e).startswith(('Internal', 'Localhost')):
                raise
            pass

        return url

    def _setup_context(self, params):
        device = params.get('device', 'desktop')
        preset = Config.DEVICE_PRESETS.get(device, Config.DEVICE_PRESETS['desktop'])

        width = params.get('width', preset['width'])
        height = params.get('height', preset['height'])

        if params.get('keep_aspect_ratio') and params.get('_original_aspect'):
            orig_w, orig_h = params['_original_aspect']
            if params.get('width') and not params.get('height'):
                height = int(width * orig_h / orig_w)
            elif params.get('height') and not params.get('width'):
                width = int(height * orig_w / orig_h)

        context = self.browser.new_context(
            viewport={'width': width, 'height': height},
            user_agent=preset['user_agent'],
            device_scale_factor=preset['device_scale_factor'],
            has_touch=preset['has_touch'],
            color_scheme='dark' if params.get('dark_mode') else 'light',
            locale='zh-CN',
            timezone_id='Asia/Shanghai'
        )
        return context, width, height

    def _inject_css(self, page, css):
        if css and css.strip():
            dangerous_patterns = [
                r'expression\s*\(',
                r'javascript\s*:',
                r'<script',
                r'on\w+\s*=',
                r'url\s*\(\s*["\']?javascript:'
            ]
            for pattern in dangerous_patterns:
                if re.search(pattern, css, re.IGNORECASE):
                    raise ValueError('Custom CSS contains potentially dangerous content')

            page.add_style_tag(content=css)

    def _get_full_page_height(self, page):
        return page.evaluate('''() => {
            return Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight,
                document.body.clientHeight,
                document.documentElement.clientHeight
            );
        }''')

    def _capture_full_page(self, page, width, height):
        total_height = self._get_full_page_height(page)
        if total_height <= height:
            return page.screenshot(type='png', full_page=False), total_height

        images = []
        current_y = 0

        while current_y < total_height:
            page.evaluate(f'window.scrollTo(0, {current_y})')
            page.wait_for_timeout(500)

            remaining = total_height - current_y
            clip_height = min(height, remaining)

            screenshot_bytes = page.screenshot(
                type='png',
                full_page=False,
                clip={'x': 0, 'y': current_y, 'width': width, 'height': clip_height}
            )
            images.append(Image.open(BytesIO(screenshot_bytes)))
            current_y += height

        if len(images) == 1:
            buf = BytesIO()
            images[0].save(buf, format='PNG')
            buf.seek(0)
            return buf.getvalue(), images[0].height

        final_width = images[0].width
        final_height = sum(img.height for img in images)
        final_image = Image.new('RGB', (final_width, final_height))
        y_offset = 0
        for img in images:
            final_image.paste(img, (0, y_offset))
            y_offset += img.height

        buf = BytesIO()
        final_image.save(buf, format='PNG')
        buf.seek(0)
        return buf.getvalue(), final_image.height

    def _compress_image(self, image, params):
        quality = params.get('quality', 80)
        fmt = params.get('format', 'png').lower()
        output = BytesIO()

        if fmt == 'jpg' or fmt == 'jpeg':
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image.save(output, format='JPEG', quality=quality, optimize=True)
        elif fmt == 'webp':
            image.save(output, format='WEBP', quality=quality)
        else:
            image.save(output, format='PNG', optimize=True)

        output.seek(0)
        return output, fmt

    def _ocr_extract(self, image):
        try:
            text = pytesseract.image_to_string(image, lang='eng+chi_sim')
            text = re.sub(r'\s+', ' ', text).strip()
            if len(text) > 1000:
                text = text[:997] + '...'
            return text
        except Exception as e:
            return f'OCR not available: {str(e)}'

    def _to_base64(self, image_bytes, fmt):
        encoded = base64.b64encode(image_bytes).decode('utf-8')
        mime_type = f'image/{fmt.replace("jpg", "jpeg")}'
        return f'data:{mime_type};base64,{encoded}'

    def capture(self, params):
        url = self._validate_url(params['url'])

        context, width, height = self._setup_context(params)
        page = context.new_page()

        try:
            page.goto(url, wait_until='networkidle', timeout=30000)

            if params.get('custom_css'):
                self._inject_css(page, params['custom_css'])

            delay = params.get('delay', 0)
            if delay > 0:
                page.wait_for_timeout(delay * 1000)

            if params.get('full_page'):
                screenshot_bytes, actual_height = self._capture_full_page(page, width, height)
                image = Image.open(BytesIO(screenshot_bytes))
            else:
                screenshot_bytes = page.screenshot(type='png', full_page=False)
                image = Image.open(BytesIO(screenshot_bytes))

            compressed_io, fmt = self._compress_image(image, params)
            compressed_bytes = compressed_io.getvalue()

            result = {
                'success': True,
                'width': image.width,
                'height': image.height,
                'format': fmt,
                'file_size': len(compressed_bytes)
            }

            if params.get('ocr'):
                result['ocr_text'] = self._ocr_extract(image)

            if params.get('base64'):
                result['base64'] = self._to_base64(compressed_bytes, fmt)

            filename = f"screenshot_{uuid.uuid4().hex[:12]}.{fmt}"
            filepath = os.path.join(app.config['SCREENSHOT_DIR'], filename)

            with open(filepath, 'wb') as f:
                f.write(compressed_bytes)

            result['filename'] = filename
            result['download_url'] = f'/download/{filename}'
            result['_filepath'] = filepath

            return result

        except PlaywrightTimeoutError:
            raise TimeoutError('Page loading timed out')
        finally:
            context.close()


class HistoryManager:
    def __init__(self, maxlen=10):
        self.records = deque(maxlen=maxlen)

    def add(self, params, result):
        record = {
            'id': uuid.uuid4().hex[:8],
            'timestamp': datetime.now().isoformat(),
            'params': {k: v for k, v in params.items() if k != 'custom_css' or v},
            'result': {
                'filename': result.get('filename'),
                'download_url': result.get('download_url'),
                'width': result.get('width'),
                'height': result.get('height'),
                'format': result.get('format'),
                'file_size': result.get('file_size')
            }
        }
        self.records.appendleft(record)
        return record

    def get_all(self):
        return [dict(r, timestamp=datetime.fromisoformat(r['timestamp']).strftime('%Y-%m-%d %H:%M:%S'))
                for r in self.records]

    def get(self, record_id):
        for r in self.records:
            if r['id'] == record_id:
                return r
        return None


class ScheduledTaskManager:
    def __init__(self):
        self.tasks = {}

    def add_task(self, cron_expr, url, email, params):
        task_id = uuid.uuid4().hex[:8]

        def execute_task():
            try:
                with ScreenshotEngine() as engine:
                    task_params = dict(params)
                    task_params['url'] = url
                    result = engine.capture(task_params)

                if email and result.get('filename'):
                    self._send_email(email, url, result)
            except Exception as e:
                app.logger.error(f'Scheduled task {task_id} failed: {e}')

        try:
            trigger = CronTrigger.from_crontab(cron_expr)
        except Exception as e:
            raise ValueError(f'Invalid cron expression: {e}')

        job = scheduler.add_job(execute_task, trigger, id=task_id)

        self.tasks[task_id] = {
            'id': task_id,
            'cron_expr': cron_expr,
            'url': url,
            'email': email,
            'params': params,
            'created_at': datetime.now().isoformat(),
            'job_id': job.id
        }
        return self.tasks[task_id]

    def _send_email(self, to_email, url, result):
        body_text = (f'Scheduled screenshot for {url}\n\n'
                     f'Dimensions: {result["width"]}x{result["height"]}\n'
                     f'Format: {result["format"]}\n'
                     f'Size: {result["file_size"]} bytes')

        msg = EmailMessage()
        msg['Subject'] = f'Scheduled Screenshot - {url}'
        msg['From'] = app.config.get('SMTP_FROM', app.config.get('SMTP_USER', 'webshot@localhost'))
        msg['To'] = to_email
        msg.set_content(body_text)

        filepath = os.path.join(app.config['SCREENSHOT_DIR'], result['filename'])
        with open(filepath, 'rb') as f:
            img_data = f.read()

        msg.add_attachment(
            img_data,
            maintype='image',
            subtype=result['format'].replace('jpg', 'jpeg'),
            filename=result['filename']
        )

        smtp_host = app.config.get('SMTP_HOST')
        if not smtp_host:
            logger.info('[EMAIL MOCK] Would send email to: %s', to_email)
            logger.info('[EMAIL MOCK] From: %s', msg['From'])
            logger.info('[EMAIL MOCK] Subject: %s', msg['Subject'])
            logger.info('[EMAIL MOCK] Body:\n%s', body_text)
            logger.info('[EMAIL MOCK] Attachment: %s (%d bytes)', result['filename'], len(img_data))
            return

        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, app.config['SMTP_PORT']) as server:
            if app.config.get('SMTP_USE_TLS'):
                server.starttls(context=context)
            if app.config.get('SMTP_USER'):
                server.login(app.config['SMTP_USER'], app.config['SMTP_PASSWORD'])
            server.send_message(msg)
            logger.info('Email sent successfully to %s for URL: %s', to_email, url)

    def list_tasks(self):
        return [{
            'id': t['id'],
            'cron_expr': t['cron_expr'],
            'url': t['url'],
            'email': t['email'],
            'created_at': datetime.fromisoformat(t['created_at']).strftime('%Y-%m-%d %H:%M:%S')
        } for t in self.tasks.values()]

    def delete_task(self, task_id):
        if task_id in self.tasks:
            scheduler.remove_job(self.tasks[task_id]['job_id'])
            del self.tasks[task_id]
            return True
        return False


history_manager = HistoryManager(maxlen=Config.HISTORY_LIMIT)
task_manager = ScheduledTaskManager()


def cleanup_old_files():
    now = datetime.now().timestamp()
    for filename in os.listdir(app.config['SCREENSHOT_DIR']):
        filepath = os.path.join(app.config['SCREENSHOT_DIR'], filename)
        if os.path.isfile(filepath):
            age = now - os.path.getmtime(filepath)
            if age > 3600:
                try:
                    os.remove(filepath)
                except:
                    pass


scheduler.add_job(cleanup_old_files, 'interval', seconds=Config.CLEANUP_INTERVAL)


def parse_params_from_request():
    params = {
        'url': request.form.get('url', '').strip(),
        'device': request.form.get('device', 'desktop'),
        'delay': float(request.form.get('delay', 0)),
        'full_page': request.form.get('full_page') == 'on',
        'custom_css': request.form.get('custom_css', ''),
        'dark_mode': request.form.get('dark_mode') == 'on',
        'quality': int(request.form.get('quality', 80)),
        'format': request.form.get('format', 'png'),
        'ocr': request.form.get('ocr') == 'on',
        'base64': request.form.get('base64') == 'on',
        'keep_aspect_ratio': request.form.get('keep_aspect_ratio') == 'on'
    }

    width = request.form.get('width')
    height = request.form.get('height')

    preset = Config.DEVICE_PRESETS.get(params['device'], Config.DEVICE_PRESETS['desktop'])
    params['_original_aspect'] = (preset['width'], preset['height'])

    if width:
        params['width'] = int(width)
    if height:
        params['height'] = int(height)

    params['delay'] = max(0, min(params['delay'], 10))
    params['quality'] = max(1, min(params['quality'], 100))

    return params


@app.route('/')
def index():
    return render_template('index.html',
                           device_presets=Config.DEVICE_PRESETS,
                           default_device=Config.DEFAULT_DEVICE,
                           default_quality=Config.DEFAULT_QUALITY,
                           default_delay=Config.DEFAULT_DELAY)


@app.route('/screenshot', methods=['POST'])
def screenshot():
    try:
        params = parse_params_from_request()

        if not params['url']:
            return jsonify({'success': False, 'error': 'URL is required'}), 400

        with ScreenshotEngine() as engine:
            result = engine.capture(params)

        history_manager.add(params, result)
        result.pop('_filepath', None)
        return jsonify(result)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/batch', methods=['POST'])
def batch_screenshot():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        content = file.read().decode('utf-8')
        urls = [line.strip() for line in content.split('\n')
                if line.strip() and not line.strip().startswith('#')]
        urls = urls[:Config.MAX_BATCH_URLS]

        if not urls:
            return jsonify({'success': False, 'error': 'No valid URLs found'}), 400

        params = parse_params_from_request()
        results = []
        zip_files = []

        with ScreenshotEngine() as engine:
            for i, url in enumerate(urls):
                try:
                    url_params = dict(params)
                    url_params['url'] = url

                    result = engine.capture(url_params)

                    filepath = result['_filepath']
                    arcname = f'{i+1:02d}_{urlparse(url).netloc}_{result["filename"]}'
                    zip_files.append((filepath, arcname))

                    results.append({'url': url, 'success': True, 'filename': result['filename']})
                    history_manager.add(url_params, result)
                    logger.info('Batch [%d/%d] captured: %s', i + 1, len(urls), url)
                except Exception as e:
                    error_text = f'Failed to capture {url}\nError: {str(e)}'
                    error_arcname = f'{i+1:02d}_{urlparse(url).netloc}_ERROR.txt'
                    error_path = os.path.join(app.config['SCREENSHOT_DIR'], f'_error_{uuid.uuid4().hex[:8]}.txt')
                    with open(error_path, 'w') as ef:
                        ef.write(error_text)
                    zip_files.append((error_path, error_arcname))
                    results.append({'url': url, 'success': False, 'error': str(e)})
                    logger.warning('Batch [%d/%d] failed: %s - %s', i + 1, len(urls), url, e)

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for filepath, arcname in zip_files:
                if os.path.exists(filepath):
                    zipf.write(filepath, arcname)

            summary_arcname = '_summary.json'
            summary_data = {
                'total': len(urls),
                'success': sum(1 for r in results if r['success']),
                'failed': sum(1 for r in results if not r['success']),
                'results': results
            }
            zipf.writestr(summary_arcname, json.dumps(summary_data, indent=2, ensure_ascii=False))

        zip_buffer.seek(0)
        zip_filename = f'batch_screenshots_{uuid.uuid4().hex[:8]}.zip'

        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=zip_filename
        )

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/screenshot', methods=['POST'])
def api_screenshot():
    try:
        data = request.get_json() or {}
        params = {
            'url': data.get('url', ''),
            'device': data.get('device', 'desktop'),
            'delay': float(data.get('delay', 0)),
            'full_page': data.get('full_page', False),
            'custom_css': data.get('custom_css', ''),
            'dark_mode': data.get('dark_mode', False),
            'quality': int(data.get('quality', 80)),
            'format': data.get('format', 'png'),
            'ocr': data.get('ocr', False),
            'base64': True,
            'keep_aspect_ratio': data.get('keep_aspect_ratio', False)
        }

        if data.get('width'):
            params['width'] = int(data['width'])
        if data.get('height'):
            params['height'] = int(data['height'])

        if not params['url']:
            return jsonify({'success': False, 'error': 'URL is required'}), 400

        with ScreenshotEngine() as engine:
            result = engine.capture(params)

        history_manager.add(params, result)
        result.pop('_filepath', None)
        return jsonify(result)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/download/<filename>')
def download(filename):
    return send_from_directory(app.config['SCREENSHOT_DIR'], filename, as_attachment=True)


@app.route('/history')
def get_history():
    return jsonify(history_manager.get_all())


@app.route('/history/regen/<record_id>', methods=['POST'])
def regen_history(record_id):
    record = history_manager.get(record_id)
    if not record:
        return jsonify({'success': False, 'error': 'Record not found'}), 404

    try:
        params = record['params']
        with ScreenshotEngine() as engine:
            result = engine.capture(params)

        history_manager.add(params, result)
        result.pop('_filepath', None)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/schedule/add', methods=['POST'])
def add_schedule():
    try:
        data = request.get_json() or request.form
        cron_expr = data.get('cron_expr', '').strip()
        url = data.get('url', '').strip()
        email = data.get('email', '').strip()

        if not cron_expr or not url:
            return jsonify({'success': False, 'error': 'Cron expression and URL are required'}), 400

        params = {
            'device': data.get('device', 'desktop'),
            'delay': float(data.get('delay', 0)),
            'full_page': data.get('full_page', False),
            'custom_css': data.get('custom_css', ''),
            'dark_mode': data.get('dark_mode', False),
            'quality': int(data.get('quality', 80)),
            'format': data.get('format', 'png'),
            'ocr': data.get('ocr', False),
            'keep_aspect_ratio': data.get('keep_aspect_ratio', False)
        }

        if data.get('width'):
            params['width'] = int(data['width'])
        if data.get('height'):
            params['height'] = int(data['height'])

        task = task_manager.add_task(cron_expr, url, email, params)
        return jsonify({'success': True, 'task': task})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/schedule/list')
def list_schedules():
    return jsonify(task_manager.list_tasks())


@app.route('/schedule/delete/<task_id>', methods=['POST'])
def delete_schedule(task_id):
    if task_manager.delete_task(task_id):
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Task not found'}), 404


@app.errorhandler(413)
def too_large(e):
    return jsonify({'success': False, 'error': 'File too large (max 100MB)'}), 413


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003, debug=True)
