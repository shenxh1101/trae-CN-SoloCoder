import json
import os
import random
import csv
import io
import uuid
import logging
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, make_response, flash

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'secret_key_for_session'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')
MESSAGES_PATH = os.path.join(BASE_DIR, 'messages.json')
SENSITIVE_WORDS_PATH = os.path.join(BASE_DIR, 'sensitive_words.txt')

EMOJIS = [
    {'key': 'smile', 'url': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFD93D"/><circle cx="8.5" cy="10" r="1.5" fill="%23333"/><circle cx="15.5" cy="10" r="1.5" fill="%23333"/><path d="M8 14 Q12 18 16 14" stroke="%23333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'},
    {'key': 'laugh', 'url': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFD93D"/><path d="M8.5 9 Q9.5 10 10.5 9" stroke="%23333" stroke-width="1.5" fill="none"/><path d="M13.5 9 Q14.5 10 15.5 9" stroke="%23333" stroke-width="1.5" fill="none"/><path d="M7 14 Q12 19 17 14" stroke="%23333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'},
    {'key': 'sad', 'url': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFD93D"/><circle cx="8.5" cy="10" r="1.5" fill="%23333"/><circle cx="15.5" cy="10" r="1.5" fill="%23333"/><path d="M8 16 Q12 13 16 16" stroke="%23333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'},
    {'key': 'angry', 'url': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FF6B6B"/><path d="M7 9 L10 10.5" stroke="%23333" stroke-width="2" stroke-linecap="round"/><path d="M17 9 L14 10.5" stroke="%23333" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="11" r="1" fill="%23333"/><circle cx="15" cy="11" r="1" fill="%23333"/><path d="M8 16 Q12 14 16 16" stroke="%23333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'},
    {'key': 'love', 'url': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFD93D"/><path d="M8 10 Q6 8 8 6 Q10 5 12 8 Q14 5 16 6 Q18 8 16 10 Q15 11.5 12 14 Q9 11.5 8 10 Z" fill="%23FF6B6B"/></svg>'},
    {'key': 'cool', 'url': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFD93D"/><rect x="6" y="8.5" width="5" height="3" rx="0.5" fill="%23333"/><rect x="13" y="8.5" width="5" height="3" rx="0.5" fill="%23333"/><path d="M7 14 Q12 17 17 14" stroke="%23333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'},
    {'key': 'surprise', 'url': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFD93D"/><circle cx="8.5" cy="10" r="1.5" fill="%23333"/><circle cx="15.5" cy="10" r="1.5" fill="%23333"/><ellipse cx="12" cy="15" rx="1.5" ry="2.5" fill="%23333"/></svg>'},
    {'key': 'cry', 'url': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFD93D"/><circle cx="8.5" cy="10" r="1.5" fill="%23333"/><circle cx="15.5" cy="10" r="1.5" fill="%23333"/><ellipse cx="7" cy="13" rx="1" ry="2" fill="%234DA6FF"/><ellipse cx="17" cy="13" rx="1" ry="2" fill="%234DA6FF"/><path d="M8 16 Q12 14 16 16" stroke="%23333" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'},
]


def load_config():
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, IOError) as e:
        logger.error(f"Failed to load config: {e}")
        return {
            'admin_password': 'admin123',
            'page_size': 10,
            'captcha_ttl': 300,
        }


def save_config(config):
    try:
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=4)
    except IOError as e:
        logger.error(f"Failed to save config: {e}")


def load_messages():
    try:
        if not os.path.exists(MESSAGES_PATH):
            return []
        with open(MESSAGES_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            return data
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Failed to load messages: {e}")
        return []


def save_messages(messages):
    try:
        with open(MESSAGES_PATH, 'w', encoding='utf-8') as f:
            json.dump(messages, f, ensure_ascii=False, indent=4)
    except IOError as e:
        logger.error(f"Failed to save messages: {e}")
        raise


def load_sensitive_words():
    try:
        if not os.path.exists(SENSITIVE_WORDS_PATH):
            return []
        with open(SENSITIVE_WORDS_PATH, 'r', encoding='utf-8') as f:
            return [line.strip() for line in f if line.strip()]
    except IOError as e:
        logger.error(f"Failed to load sensitive words: {e}")
        return []


def filter_sensitive(text):
    if not text:
        return text
    words = load_sensitive_words()
    for word in words:
        if word:
            text = text.replace(word, '*' * len(word))
    return text


def generate_captcha():
    a = random.randint(1, 20)
    b = random.randint(1, 20)
    op = random.choice(['+', '-', '*'])
    if op == '+':
        answer = a + b
    elif op == '-':
        a, b = max(a, b), min(a, b)
        answer = a - b
    else:
        a = random.randint(1, 9)
        b = random.randint(1, 9)
        answer = a * b
    question = f'{a} {op} {b} = ?'
    captcha_id = str(uuid.uuid4())
    session['captcha_answer'] = answer
    session['captcha_time'] = datetime.now().isoformat()
    session['captcha_id'] = captcha_id
    session['captcha_used'] = False
    return question


def verify_captcha(user_answer):
    config = load_config()
    captcha_ttl = config.get('captcha_ttl', 300)
    if not user_answer:
        return False
    if session.get('captcha_used', False):
        return False
    if 'captcha_answer' not in session or 'captcha_time' not in session:
        return False
    captcha_time = datetime.fromisoformat(session['captcha_time'])
    if datetime.now() - captcha_time > timedelta(seconds=captcha_ttl):
        return False
    try:
        result = int(user_answer) == int(session['captcha_answer'])
        if result:
            session['captcha_used'] = True
        return result
    except (ValueError, TypeError):
        return False


def invalidate_captcha():
    session.pop('captcha_answer', None)
    session.pop('captcha_time', None)
    session.pop('captcha_id', None)
    session.pop('captcha_used', None)


def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr or '127.0.0.1'


def get_today_count(messages):
    today = datetime.now().date()
    count = 0
    for m in messages:
        try:
            if datetime.fromisoformat(m['time']).date() == today:
                count += 1
        except (KeyError, ValueError):
            continue
    return count


def can_like(message, ip):
    likes = message.get('likes', [])
    for like in likes:
        if like.get('ip') == ip:
            try:
                last_like = datetime.fromisoformat(like['time'])
                if datetime.now() - last_like < timedelta(hours=24):
                    return False
            except (KeyError, ValueError):
                continue
    return True


def add_like(message, ip):
    likes = message.get('likes', [])
    found = False
    for like in likes:
        if like.get('ip') == ip:
            like['time'] = datetime.now().isoformat()
            found = True
            break
    if not found:
        likes.append({'ip': ip, 'time': datetime.now().isoformat()})
    message['likes'] = likes
    message['like_count'] = len(likes)


def paginate_messages(messages, page, page_size):
    total = len(messages)
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))
    start = (page - 1) * page_size
    end = start + page_size
    page_messages = messages[start:end]

    page_numbers = []
    if total_pages <= 7:
        page_numbers = list(range(1, total_pages + 1))
    else:
        page_numbers.append(1)
        if page > 3:
            page_numbers.append('...')
        start_p = max(2, page - 1)
        end_p = min(total_pages - 1, page + 1)
        for p in range(start_p, end_p + 1):
            page_numbers.append(p)
        if page < total_pages - 2:
            page_numbers.append('...')
        page_numbers.append(total_pages)

    return page_messages, page, total_pages, page_numbers


def validate_nickname(nickname):
    nickname = (nickname or '').strip()
    if not nickname:
        return False, '昵称不能为空'
    if len(nickname) > 20:
        return False, '昵称不能超过20个字符'
    return True, ''


def validate_content(content):
    content = (content or '').strip()
    if not content:
        return False, '内容不能为空'
    if len(content) > 500:
        return False, '内容不能超过500个字符'
    return True, ''


@app.route('/')
def index():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '').strip()
    error = request.args.get('error', '')
    config = load_config()
    page_size = config.get('page_size', 10)

    messages = load_messages()

    if search:
        messages = [m for m in messages
                    if search.lower() in m.get('nickname', '').lower()
                    or search.lower() in m.get('content', '').lower()
                    or search.lower() in m.get('filtered_content', '').lower()]

    pinned = [m for m in messages if m.get('pinned')]
    unpinned = [m for m in messages if not m.get('pinned')]

    unpinned.sort(key=lambda m: m.get('time', ''), reverse=True)
    pinned.sort(key=lambda m: m.get('time', ''), reverse=True)

    sorted_messages = pinned + unpinned

    page_messages, page, total_pages, page_numbers = paginate_messages(
        sorted_messages, page, page_size)

    today_count = get_today_count(load_messages())

    if not session.get('captcha_answer') or session.get('captcha_used', False):
        captcha_question = generate_captcha()
    else:
        a = random.randint(1, 20)
        b = random.randint(1, 20)
        op = random.choice(['+', '-'])
        a, b = max(a, b), min(a, b)
        captcha_question = f'{a} {op} {b} = ?'

    return render_template('index.html',
                           messages=page_messages,
                           page=page,
                           total_pages=total_pages,
                           page_numbers=page_numbers,
                           search=search,
                           error=error,
                           today_count=today_count,
                           captcha_question=captcha_question,
                           emojis=EMOJIS,
                           is_admin=session.get('is_admin', False),
                           now=datetime.now())


@app.route('/post', methods=['POST'])
def post_message():
    nickname = request.form.get('nickname', '').strip()
    content = request.form.get('content', '').strip()
    captcha = request.form.get('captcha', '').strip()
    emoji = request.form.get('emoji', '')

    valid, msg = validate_nickname(nickname)
    if not valid:
        return redirect(url_for('index', error='empty'))

    valid, msg = validate_content(content)
    if not valid:
        return redirect(url_for('index', error='empty'))

    if not verify_captcha(captcha):
        return redirect(url_for('index', error='captcha'))

    filtered = filter_sensitive(content)

    messages = load_messages()
    new_msg = {
        'id': str(uuid.uuid4()),
        'nickname': nickname,
        'content': content,
        'filtered_content': filtered,
        'time': datetime.now().isoformat(),
        'ip': get_client_ip(),
        'emoji': emoji,
        'likes': [],
        'like_count': 0,
        'replies': [],
        'pinned': False,
    }
    messages.append(new_msg)
    try:
        save_messages(messages)
    except IOError:
        return redirect(url_for('index', error='save'))

    invalidate_captcha()
    generate_captcha()

    return redirect(url_for('index'))


@app.route('/reply/<msg_id>', methods=['POST'])
def reply_message(msg_id):
    nickname = request.form.get('reply_nickname', '').strip()
    content = request.form.get('reply_content', '').strip()

    valid, msg = validate_nickname(nickname)
    if not valid:
        return redirect(url_for('index', error='empty'))

    valid, msg = validate_content(content)
    if not valid:
        return redirect(url_for('index', error='empty'))

    filtered = filter_sensitive(content)

    messages = load_messages()
    found = False
    for msg_item in messages:
        if msg_item.get('id') == msg_id:
            reply = {
                'id': str(uuid.uuid4()),
                'nickname': nickname,
                'content': content,
                'filtered_content': filtered,
                'time': datetime.now().isoformat(),
                'ip': get_client_ip(),
            }
            msg_item.setdefault('replies', []).append(reply)
            try:
                save_messages(messages)
            except IOError:
                return redirect(url_for('index', error='save'))
            found = True
            break

    if not found:
        return redirect(url_for('index', error='notfound'))

    return redirect(url_for('index'))


@app.route('/delete/<msg_id>', methods=['POST'])
def delete_message(msg_id):
    password = request.form.get('password', '')
    config = load_config()
    if password != config.get('admin_password'):
        return redirect(url_for('index', error='password'))

    messages = load_messages()
    messages = [m for m in messages if m.get('id') != msg_id]
    try:
        save_messages(messages)
    except IOError:
        return redirect(url_for('index', error='save'))
    return redirect(url_for('index'))


@app.route('/like/<msg_id>', methods=['POST'])
def like_message(msg_id):
    ip = get_client_ip()
    messages = load_messages()
    for msg in messages:
        if msg.get('id') == msg_id:
            if can_like(msg, ip):
                add_like(msg, ip)
                try:
                    save_messages(messages)
                except IOError:
                    return redirect(url_for('index', error='save'))
            break
    return redirect(url_for('index'))


@app.route('/like-ajax/<msg_id>', methods=['POST'])
def like_message_ajax(msg_id):
    ip = get_client_ip()
    messages = load_messages()
    for msg in messages:
        if msg.get('id') == msg_id:
            if can_like(msg, ip):
                add_like(msg, ip)
                try:
                    save_messages(messages)
                except IOError:
                    return jsonify({'success': False, 'error': '保存失败'}), 500
                return jsonify({'success': True, 'like_count': msg['like_count']})
            else:
                return jsonify({'success': False, 'error': '24小时内已点赞过', 'like_count': msg.get('like_count', 0)})
    return jsonify({'success': False, 'error': '留言不存在'}), 404


@app.route('/pin/<msg_id>', methods=['POST'])
def pin_message(msg_id):
    password = request.form.get('pin_password', '')
    config = load_config()
    if password != config.get('admin_password'):
        return redirect(url_for('index', error='password'))

    messages = load_messages()
    for msg in messages:
        if msg.get('id') == msg_id:
            msg['pinned'] = not msg.get('pinned', False)
            try:
                save_messages(messages)
            except IOError:
                return redirect(url_for('index', error='save'))
            break
    return redirect(url_for('index'))


@app.route('/login', methods=['POST'])
def admin_login():
    password = request.form.get('admin_password', '')
    config = load_config()
    if password == config.get('admin_password'):
        session['is_admin'] = True
    return redirect(url_for('index'))


@app.route('/logout')
def admin_logout():
    session.pop('is_admin', None)
    return redirect(url_for('index'))


@app.route('/export')
def export_messages():
    fmt = request.args.get('format', 'txt')
    messages = load_messages()

    if fmt == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', '昵称', '内容', '时间', 'IP', '点赞数', '置顶'])
        for msg in messages:
            writer.writerow([
                msg.get('id', ''),
                msg.get('nickname', ''),
                msg.get('filtered_content', msg.get('content', '')),
                msg.get('time', ''),
                msg.get('ip', ''),
                msg.get('like_count', 0),
                '是' if msg.get('pinned') else '否',
            ])
        content = output.getvalue()
        filename = f'messages_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        mimetype = 'text/csv'
    else:
        lines = []
        for msg in messages:
            lines.append("--- 留言 ---\n")
            lines.append(f"昵称: {msg.get('nickname', '')}\n")
            lines.append(f"内容: {msg.get('filtered_content', msg.get('content', ''))}\n")
            lines.append(f"时间: {msg.get('time', '')}\n")
            lines.append(f"IP: {msg.get('ip', '')}\n")
            lines.append(f"点赞: {msg.get('like_count', 0)}\n")
            if msg.get('pinned'):
                lines.append("置顶: 是\n")
            if msg.get('replies'):
                lines.append("回复:\n")
                for r in msg['replies']:
                    lines.append(f"  [{r.get('nickname', '')}]: {r.get('filtered_content', r.get('content', ''))}\n")
            lines.append("\n")
        content = ''.join(lines)
        filename = f'messages_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
        mimetype = 'text/plain'

    response = make_response(content)
    response.headers['Content-Type'] = mimetype
    response.headers['Content-Disposition'] = f'attachment; filename={filename}'
    return response


@app.route('/captcha_check')
def captcha_check():
    return jsonify({'question': generate_captcha()})


@app.route('/captcha_refresh')
def captcha_refresh():
    question = generate_captcha()
    return jsonify({'question': question})


if __name__ == '__main__':
    app.run(debug=True, port=5000)