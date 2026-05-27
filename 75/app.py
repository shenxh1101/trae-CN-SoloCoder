import os
import json
import random
import string
import hashlib
import threading
import time
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify, abort, Response

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

SNIPPETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'snippets')
os.makedirs(SNIPPETS_DIR, exist_ok=True)

LANGUAGES = ['python', 'javascript', 'html', 'css', 'java', 'cpp', 'c', 'go', 'rust', 'php', 'ruby', 'swift', 'typescript', 'sql', 'bash', 'json', 'xml', 'markdown', 'text']

CLEANUP_INTERVAL = 300

def generate_short_code(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def get_code_path(short_code):
    return os.path.join(SNIPPETS_DIR, f'{short_code}.txt')

def get_meta_path(short_code):
    return os.path.join(SNIPPETS_DIR, f'{short_code}.meta.json')

def save_snippet(title, language, code, password=None, expire_days=None):
    while True:
        short_code = generate_short_code()
        code_path = get_code_path(short_code)
        meta_path = get_meta_path(short_code)
        if not os.path.exists(code_path):
            break

    delete_code = generate_short_code(12)

    expire_at = None
    if expire_days:
        expire_at = (datetime.now() + timedelta(days=int(expire_days))).isoformat()

    meta_data = {
        'title': title,
        'language': language,
        'password': hashlib.sha256(password.encode()).hexdigest() if password else None,
        'created_at': datetime.now().isoformat(),
        'expire_at': expire_at,
        'delete_code': delete_code,
        'views': 0
    }

    with open(code_path, 'w', encoding='utf-8') as f:
        f.write(code)

    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta_data, f, ensure_ascii=False, indent=2)

    return short_code, delete_code

def load_snippet(short_code):
    code_path = get_code_path(short_code)
    meta_path = get_meta_path(short_code)

    if not os.path.exists(code_path) or not os.path.exists(meta_path):
        cleanup_files(short_code)
        return None

    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)

        if meta.get('expire_at'):
            expire_at = datetime.fromisoformat(meta['expire_at'])
            if datetime.now() > expire_at:
                cleanup_files(short_code)
                return None

        with open(code_path, 'r', encoding='utf-8') as f:
            code = f.read()

        meta['code'] = code
        return meta
    except (json.JSONDecodeError, IOError):
        cleanup_files(short_code)
        return None

def cleanup_files(short_code):
    for ext in ['.txt', '.meta.json']:
        path = os.path.join(SNIPPETS_DIR, f'{short_code}{ext}')
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

def increment_views(short_code):
    meta_path = get_meta_path(short_code)
    if os.path.exists(meta_path):
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            meta['views'] = meta.get('views', 0) + 1
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(meta, f, ensure_ascii=False, indent=2)
        except (json.JSONDecodeError, IOError):
            pass

def delete_snippet(short_code):
    code_path = get_code_path(short_code)
    meta_path = get_meta_path(short_code)
    deleted = False
    if os.path.exists(code_path):
        os.remove(code_path)
        deleted = True
    if os.path.exists(meta_path):
        os.remove(meta_path)
        deleted = True
    return deleted

def is_expired(meta_path):
    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)
        if meta.get('expire_at'):
            expire_at = datetime.fromisoformat(meta['expire_at'])
            if datetime.now() > expire_at:
                return True
    except (json.JSONDecodeError, IOError):
        return True
    return False

def cleanup_expired_snippets():
    if not os.path.exists(SNIPPETS_DIR):
        return
    for filename in os.listdir(SNIPPETS_DIR):
        if filename.endswith('.meta.json'):
            short_code = filename[:-10]
            meta_path = os.path.join(SNIPPETS_DIR, filename)
            code_path = get_code_path(short_code)

            if not os.path.exists(code_path):
                if os.path.exists(meta_path):
                    os.remove(meta_path)
                continue

            if is_expired(meta_path):
                cleanup_files(short_code)
                print(f'[Cleanup] Removed expired snippet: {short_code}')

def cleanup_loop():
    while True:
        try:
            cleanup_expired_snippets()
        except Exception as e:
            print(f'[Cleanup] Error: {e}')
        time.sleep(CLEANUP_INTERVAL)

def start_cleanup_thread():
    thread = threading.Thread(target=cleanup_loop, daemon=True)
    thread.start()

def get_recent_snippets(limit=10, language=None, search=None):
    snippets = []
    if not os.path.exists(SNIPPETS_DIR):
        return snippets

    for filename in os.listdir(SNIPPETS_DIR):
        if filename.endswith('.meta.json'):
            short_code = filename[:-10]
            code_path = get_code_path(short_code)
            if not os.path.exists(code_path):
                continue

            try:
                with open(os.path.join(SNIPPETS_DIR, filename), 'r', encoding='utf-8') as f:
                    meta = json.load(f)

                if meta.get('expire_at'):
                    expire_at = datetime.fromisoformat(meta['expire_at'])
                    if datetime.now() > expire_at:
                        cleanup_files(short_code)
                        continue

                with open(code_path, 'r', encoding='utf-8') as f:
                    code = f.read()

                meta['short_code'] = short_code
                meta['code'] = code
                snippets.append(meta)
            except (json.JSONDecodeError, IOError):
                cleanup_files(short_code)

    snippets.sort(key=lambda x: x['created_at'], reverse=True)

    if language:
        snippets = [s for s in snippets if s['language'].lower() == language.lower()]

    if search:
        search_lower = search.lower()
        snippets = [s for s in snippets if search_lower in s['title'].lower() or search_lower in s['code'].lower()]

    return snippets[:limit]

def get_available_languages():
    languages = set()
    if not os.path.exists(SNIPPETS_DIR):
        return sorted(languages)

    for filename in os.listdir(SNIPPETS_DIR):
        if filename.endswith('.meta.json'):
            short_code = filename[:-10]
            code_path = get_code_path(short_code)
            if not os.path.exists(code_path):
                continue
            try:
                with open(os.path.join(SNIPPETS_DIR, filename), 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                if meta.get('expire_at'):
                    expire_at = datetime.fromisoformat(meta['expire_at'])
                    if datetime.now() > expire_at:
                        continue
                languages.add(meta['language'])
            except (json.JSONDecodeError, IOError):
                pass
    return sorted(languages)

@app.route('/')
def index():
    language_filter = request.args.get('language', '')
    search_query = request.args.get('search', '')
    recent_snippets = get_recent_snippets(limit=10, language=language_filter, search=search_query)
    available_languages = get_available_languages()

    return render_template('index.html',
                         languages=LANGUAGES,
                         recent_snippets=recent_snippets,
                         available_languages=available_languages,
                         selected_language=language_filter,
                         search_query=search_query)

@app.route('/create', methods=['POST'])
def create():
    title = request.form.get('title', '').strip()
    language = request.form.get('language', 'text').strip()
    code = request.form.get('code', '')
    password = request.form.get('password', '').strip()
    expire_days = request.form.get('expire', '')

    if not code:
        return redirect(url_for('index'))

    short_code, delete_code = save_snippet(
        title=title or 'Untitled',
        language=language,
        code=code,
        password=password if password else None,
        expire_days=expire_days if expire_days else None
    )

    return render_template('created.html',
                         short_code=short_code,
                         delete_code=delete_code,
                         snippet_url=url_for('view', short_code=short_code, _external=True),
                         delete_url=url_for('delete', short_code=short_code, delete_code=delete_code, _external=True))

@app.route('/s/<short_code>')
def view(short_code):
    snippet = load_snippet(short_code)
    if not snippet:
        abort(404)

    if snippet.get('password'):
        session_pw = request.cookies.get(f'pw_{short_code}')
        if not session_pw or session_pw != snippet['password']:
            return redirect(url_for('password_prompt', short_code=short_code))

    increment_views(short_code)
    snippet['views'] = snippet.get('views', 0) + 1

    return render_template('snippet.html',
                         snippet=snippet,
                         short_code=short_code)

@app.route('/s/<short_code>/password', methods=['GET', 'POST'])
def password_prompt(short_code):
    snippet = load_snippet(short_code)
    if not snippet:
        abort(404)

    if not snippet.get('password'):
        return redirect(url_for('view', short_code=short_code))

    error = None
    if request.method == 'POST':
        password = request.form.get('password', '')
        if hashlib.sha256(password.encode()).hexdigest() == snippet['password']:
            resp = redirect(url_for('view', short_code=short_code))
            resp.set_cookie(f'pw_{short_code}', snippet['password'], max_age=86400)
            return resp
        error = '密码错误'

    return render_template('password.html', short_code=short_code, error=error)

@app.route('/s/<short_code>/raw')
def raw(short_code):
    snippet = load_snippet(short_code)
    if not snippet:
        abort(404)

    if snippet.get('password'):
        session_pw = request.cookies.get(f'pw_{short_code}')
        if not session_pw or session_pw != snippet['password']:
            return redirect(url_for('password_prompt', short_code=short_code))

    return Response(snippet['code'], mimetype='text/plain')

@app.route('/s/<short_code>/download')
def download(short_code):
    code_path = get_code_path(short_code)
    meta_path = get_meta_path(short_code)

    if not os.path.exists(code_path) or not os.path.exists(meta_path):
        abort(404)

    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)
    except (json.JSONDecodeError, IOError):
        abort(404)

    if meta.get('password'):
        session_pw = request.cookies.get(f'pw_{short_code}')
        if not session_pw or session_pw != meta['password']:
            return redirect(url_for('password_prompt', short_code=short_code))

    if meta.get('expire_at'):
        expire_at = datetime.fromisoformat(meta['expire_at'])
        if datetime.now() > expire_at:
            cleanup_files(short_code)
            abort(404)

    return send_file(code_path, as_attachment=True, download_name=f'{short_code}.txt')

@app.route('/delete/<short_code>/<delete_code>')
def delete(short_code, delete_code):
    meta_path = get_meta_path(short_code)
    if not os.path.exists(meta_path):
        return render_template('message.html', message='片段不存在或已被删除')

    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)
    except (json.JSONDecodeError, IOError):
        return render_template('message.html', message='片段不存在或已被删除')

    if meta['delete_code'] == delete_code:
        delete_snippet(short_code)
        return render_template('message.html', message='片段已成功删除')

    return render_template('message.html', message='删除链接无效')

@app.route('/api/create', methods=['POST'])
def api_create():
    data = request.get_json() or request.form

    title = data.get('title', 'Untitled')
    language = data.get('language', 'text')
    code = data.get('code', '')
    password = data.get('password', '')
    expire_days = data.get('expire', '')

    if not code:
        return jsonify({'error': 'Code is required'}), 400

    short_code, delete_code = save_snippet(
        title=title,
        language=language,
        code=code,
        password=password if password else None,
        expire_days=expire_days if expire_days else None
    )

    return jsonify({
        'short_code': short_code,
        'url': url_for('view', short_code=short_code, _external=True),
        'raw_url': url_for('raw', short_code=short_code, _external=True),
        'delete_url': url_for('delete', short_code=short_code, delete_code=delete_code, _external=True),
        'delete_code': delete_code
    })

@app.errorhandler(404)
def page_not_found(e):
    return render_template('message.html', message='页面不存在'), 404

if __name__ == '__main__':
    start_cleanup_thread()
    app.run(debug=True, host='0.0.0.0', port=5001)
