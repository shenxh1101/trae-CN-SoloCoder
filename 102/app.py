import os
import json
import string
import random
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify, session, abort
from werkzeug.security import generate_password_hash, check_password_hash
from pygments import highlight
from pygments.lexers import get_lexer_by_name, guess_lexer
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

SNIPPETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'snippets')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

LANGUAGES = [
    'python', 'javascript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby', 'php',
    'html', 'css', 'sql', 'bash', 'json', 'xml', 'yaml', 'markdown', 'text'
]

EXPIRE_OPTIONS = {
    '1h': timedelta(hours=1),
    '1d': timedelta(days=1),
    '7d': timedelta(days=7),
    'never': None
}

os.makedirs(SNIPPETS_DIR, exist_ok=True)


def generate_id(length=6):
    chars = string.ascii_lowercase + string.digits
    while True:
        snippet_id = ''.join(random.choice(chars) for _ in range(length))
        if not os.path.exists(os.path.join(SNIPPETS_DIR, f'{snippet_id}.json')):
            return snippet_id


def get_snippet_path(snippet_id):
    return os.path.join(SNIPPETS_DIR, f'{snippet_id}.txt')


def get_meta_path(snippet_id):
    return os.path.join(SNIPPETS_DIR, f'{snippet_id}.json')


def load_meta(snippet_id):
    meta_path = get_meta_path(snippet_id)
    if os.path.exists(meta_path):
        with open(meta_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def save_meta(snippet_id, meta):
    meta_path = get_meta_path(snippet_id)
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)


def is_expired(meta):
    if meta.get('expires_at'):
        expires_at = datetime.fromisoformat(meta['expires_at'])
        return datetime.now() > expires_at
    return False


def delete_snippet(snippet_id):
    snippet_path = get_snippet_path(snippet_id)
    meta_path = get_meta_path(snippet_id)
    if os.path.exists(snippet_path):
        os.remove(snippet_path)
    if os.path.exists(meta_path):
        os.remove(meta_path)


def check_expired(f):
    @wraps(f)
    def decorated_function(snippet_id, *args, **kwargs):
        meta = load_meta(snippet_id)
        if not meta:
            abort(404)
        if is_expired(meta):
            delete_snippet(snippet_id)
            return render_template('expired.html'), 410
        return f(snippet_id, meta, *args, **kwargs)
    return decorated_function


def highlight_code(code, language):
    try:
        lexer = get_lexer_by_name(language, stripall=False)
    except ClassNotFound:
        try:
            lexer = guess_lexer(code)
        except ClassNotFound:
            lexer = get_lexer_by_name('text')
    
    formatter = HtmlFormatter(
        linenos='table',
        style='monokai',
        cssclass='code-highlight',
        lineanchors='line',
        anchorlinenos=True,
    )
    return highlight(code, lexer, formatter)


def get_all_snippets():
    snippets = []
    for filename in os.listdir(SNIPPETS_DIR):
        if filename.endswith('.json'):
            snippet_id = filename[:-5]
            meta = load_meta(snippet_id)
            if meta and not is_expired(meta):
                snippets.append(meta)
    snippets.sort(key=lambda x: x['created_at'], reverse=True)
    return snippets


def get_reported_snippets():
    snippets = []
    for filename in os.listdir(SNIPPETS_DIR):
        if filename.endswith('.json'):
            snippet_id = filename[:-5]
            meta = load_meta(snippet_id)
            if meta and meta.get('reported'):
                snippets.append(meta)
    return snippets


@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        author = request.form.get('author', 'Anonymous').strip()
        language = request.form.get('language', 'text')
        content = request.form.get('content', '')
        expires = request.form.get('expires', 'never')
        password = request.form.get('password', '')

        if not content:
            return render_template('index.html', error='代码内容不能为空', languages=LANGUAGES,
                                   expire_options=list(EXPIRE_OPTIONS.keys()))

        snippet_id = generate_id()
        
        expires_at = None
        if expires in EXPIRE_OPTIONS and EXPIRE_OPTIONS[expires]:
            expires_at = (datetime.now() + EXPIRE_OPTIONS[expires]).isoformat()

        meta = {
            'id': snippet_id,
            'title': title or 'Untitled',
            'author': author or 'Anonymous',
            'language': language,
            'created_at': datetime.now().isoformat(),
            'expires_at': expires_at,
            'password_hash': generate_password_hash(password) if password else None,
            'views': 0,
            'reported': False,
            'report_reason': ''
        }

        with open(get_snippet_path(snippet_id), 'w', encoding='utf-8') as f:
            f.write(content)
        
        save_meta(snippet_id, meta)

        return redirect(url_for('view_snippet', snippet_id=snippet_id))

    search = request.args.get('search', '')
    lang_filter = request.args.get('lang', '')
    
    snippets = get_all_snippets()
    
    if search:
        snippets = [s for s in snippets if search.lower() in s['title'].lower()]
    
    if lang_filter:
        snippets = [s for s in snippets if s['language'] == lang_filter]

    used_languages = sorted(set(s['language'] for s in get_all_snippets()))

    return render_template('index.html',
                           snippets=snippets[:10],
                           languages=LANGUAGES,
                           used_languages=used_languages,
                           expire_options=list(EXPIRE_OPTIONS.keys()),
                           search=search,
                           lang_filter=lang_filter)


@app.route('/s/<snippet_id>')
@check_expired
def view_snippet(snippet_id, meta):
    if meta.get('password_hash'):
        if session.get(f'access_{snippet_id}') != True:
            return redirect(url_for('password_prompt', snippet_id=snippet_id))

    meta['views'] += 1
    save_meta(snippet_id, meta)

    with open(get_snippet_path(snippet_id), 'r', encoding='utf-8') as f:
        code = f.read()

    highlighted = highlight_code(code, meta['language'])
    embed_url = url_for('embed_snippet', snippet_id=snippet_id, _external=True)

    return render_template('snippet.html',
                           meta=meta,
                           code=code,
                           highlighted=highlighted,
                           embed_url=embed_url)


@app.route('/password/<snippet_id>', methods=['GET', 'POST'])
def password_prompt(snippet_id):
    meta = load_meta(snippet_id)
    if not meta or is_expired(meta):
        abort(404)
    
    if request.method == 'POST':
        password = request.form.get('password', '')
        if check_password_hash(meta['password_hash'], password):
            session[f'access_{snippet_id}'] = True
            return redirect(url_for('view_snippet', snippet_id=snippet_id))
        return render_template('password.html', error='密码错误', snippet_id=snippet_id)
    
    return render_template('password.html', snippet_id=snippet_id)


@app.route('/s/<snippet_id>/raw')
@check_expired
def raw_snippet(snippet_id, meta):
    snippet_path = get_snippet_path(snippet_id)
    return send_file(snippet_path, mimetype='text/plain', as_attachment=False)


@app.route('/s/<snippet_id>/download')
@check_expired
def download_snippet(snippet_id, meta):
    snippet_path = get_snippet_path(snippet_id)
    filename = f"{meta['title'].replace(' ', '_')}_{snippet_id}.txt"
    return send_file(snippet_path, mimetype='text/plain', as_attachment=True, download_name=filename)


@app.route('/s/<snippet_id>/embed')
@check_expired
def embed_snippet(snippet_id, meta):
    meta['views'] += 1
    save_meta(snippet_id, meta)

    with open(get_snippet_path(snippet_id), 'r', encoding='utf-8') as f:
        code = f.read()

    highlighted = highlight_code(code, meta['language'])
    return render_template('embed.html', meta=meta, highlighted=highlighted)


@app.route('/s/<snippet_id>/report', methods=['POST'])
@check_expired
def report_snippet(snippet_id, meta):
    reason = request.form.get('reason', '').strip()
    if reason:
        meta['reported'] = True
        meta['report_reason'] = reason
        save_meta(snippet_id, meta)
    return jsonify({'success': True})


@app.route('/api/snippets', methods=['POST'])
def api_create_snippet():
    data = request.get_json()
    
    if not data or 'content' not in data:
        return jsonify({'success': False, 'error': '缺少代码内容'}), 400
    
    title = data.get('title', 'Untitled')
    author = data.get('author', 'API')
    language = data.get('language', 'text')
    content = data['content']
    expires = data.get('expires', 'never')
    password = data.get('password', '')

    snippet_id = generate_id()
    
    expires_at = None
    if expires in EXPIRE_OPTIONS and EXPIRE_OPTIONS[expires]:
        expires_at = (datetime.now() + EXPIRE_OPTIONS[expires]).isoformat()

    meta = {
        'id': snippet_id,
        'title': title,
        'author': author,
        'language': language,
        'created_at': datetime.now().isoformat(),
        'expires_at': expires_at,
        'password_hash': generate_password_hash(password) if password else None,
        'views': 0,
        'reported': False,
        'report_reason': ''
    }

    with open(get_snippet_path(snippet_id), 'w', encoding='utf-8') as f:
        f.write(content)
    
    save_meta(snippet_id, meta)

    return jsonify({
        'success': True,
        'id': snippet_id,
        'url': url_for('view_snippet', snippet_id=snippet_id, _external=True),
        'expires_at': expires_at
    })


@app.route('/admin', methods=['GET', 'POST'])
def admin():
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == ADMIN_PASSWORD:
            session['admin'] = True
        else:
            return render_template('admin_login.html', error='密码错误')
    
    if not session.get('admin'):
        return render_template('admin_login.html')
    
    reported = get_reported_snippets()
    return render_template('admin.html', reported=reported)


@app.route('/admin/delete/<snippet_id>', methods=['POST'])
def admin_delete(snippet_id):
    if not session.get('admin'):
        abort(403)
    delete_snippet(snippet_id)
    return redirect(url_for('admin'))


@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return redirect(url_for('index'))


@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404


@app.context_processor
def inject_pygments_css():
    formatter = HtmlFormatter(style='monokai')
    return {'pygments_css': formatter.get_style_defs('.code-highlight')}


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
