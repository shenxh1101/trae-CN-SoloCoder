import os
import json
import uuid
import threading
import time
import requests
import shutil
from datetime import datetime
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file, Response, abort

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
BACKUP_DIR = os.path.join(DATA_DIR, 'backups')
BOOKMARKS_FILE = os.path.join(DATA_DIR, 'bookmarks.json')
CATEGORIES_FILE = os.path.join(DATA_DIR, 'categories.json')
SHARE_DIR = os.path.join(DATA_DIR, 'shares')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(SHARE_DIR, exist_ok=True)

def load_json(filepath, default):
    if not os.path.exists(filepath):
        return default
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_bookmarks():
    return load_json(BOOKMARKS_FILE, [])

def save_bookmarks(bookmarks):
    save_json(BOOKMARKS_FILE, bookmarks)

def load_categories():
    return load_json(CATEGORIES_FILE, [])

def save_categories(categories):
    save_json(CATEGORIES_FILE, categories)

def check_url_status(url, timeout=5):
    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        return response.status_code
    except Exception:
        try:
            response = requests.get(url, timeout=timeout, allow_redirects=True, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }, stream=True)
            return response.status_code
        except Exception:
            return 0

def check_all_bookmarks():
    while True:
        bookmarks = load_bookmarks()
        for bm in bookmarks:
            status_code = check_url_status(bm['url'])
            bm['status_code'] = status_code
            bm['last_checked'] = datetime.now().isoformat()
            bm['status'] = 'error' if status_code >= 400 or status_code == 0 else 'active'
        save_bookmarks(bookmarks)
        time.sleep(3600)

SHARE_CSS = '''
:root { --bg-primary: #ffffff; --bg-secondary: #f5f7fa; --text-primary: #1a1a2e; --text-secondary: #4a5568; --text-muted: #718096; --border-color: #e2e8f0; --accent: #4f46e5; --accent-hover: #4338ca; --danger: #ef4444; --success: #10b981; --warning: #f59e0b; --card-bg: #ffffff; --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; background-color: var(--bg-secondary); color: var(--text-primary); line-height: 1.6; }
.container { max-width: 900px; margin: 0 auto; padding: 20px; }
.header { text-align: center; padding: 30px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 30px; }
.header h1 { font-size: 2rem; margin-bottom: 8px; }
.share-subtitle { color: var(--text-muted); font-size: 1.1rem; }
.bookmark-item { background-color: var(--card-bg); border-radius: 12px; padding: 20px; margin-bottom: 12px; box-shadow: var(--shadow); transition: all 0.2s; border-left: 4px solid transparent; }
.bookmark-item:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
.bookmark-item.bookmark-error { border-left-color: var(--danger); background-color: #fef2f2; }
.bookmark-title { font-size: 1.15rem; font-weight: 600; margin-bottom: 6px; }
.bookmark-title a { color: var(--text-primary); text-decoration: none; transition: color 0.2s; }
.bookmark-title a:hover { color: var(--accent); }
.bookmark-url { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 10px; word-break: break-all; }
.bookmark-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-secondary); }
.bookmark-category { display: inline-flex; align-items: center; gap: 4px; }
.bookmark-tags { display: inline-flex; gap: 4px; flex-wrap: wrap; }
.tag-item { background-color: var(--bg-secondary); color: var(--text-secondary); padding: 3px 8px; border-radius: 10px; font-size: 0.75rem; }
.share-footer { text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.9rem; border-top: 1px solid var(--border-color); margin-top: 40px; }
.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
@media (max-width: 600px) { .container { padding: 10px; } }
'''

def generate_share_html(title, bookmarks, created_at):
    bookmarks_html = ''
    if bookmarks:
        for bm in bookmarks:
            error_class = 'bookmark-error' if bm.get('status') == 'error' else ''
            tags_html = ''.join([f'<span class="tag-item">#{escape_html(tag)}</span>' for tag in bm.get('tags', [])])
            bookmarks_html += f'''
            <div class="bookmark-item {error_class}">
                <h3 class="bookmark-title">
                    <a href="{escape_html(bm['url'])}" target="_blank" rel="noopener">{escape_html(bm['title'])}</a>
                </h3>
                <div class="bookmark-url">{escape_html(bm['url'])}</div>
                <div class="bookmark-meta">
                    <span class="bookmark-category">📁 {escape_html(bm.get('category', '未分类'))}</span>
                    <span class="bookmark-tags">{tags_html}</span>
                </div>
            </div>'''
    else:
        bookmarks_html = '<div class="empty-state"><p>暂无书签</p></div>'

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{escape_html(title)} - 书签分享</title>
<style>{SHARE_CSS}</style>
</head>
<body>
<div class="container">
    <header class="header">
        <h1>🔗 {escape_html(title)}</h1>
        <p class="share-subtitle">共 {len(bookmarks)} 个书签</p>
    </header>
    <main class="content">
        {bookmarks_html}
    </main>
    <footer class="share-footer">
        <p>生成于 {escape_html(created_at)}</p>
    </footer>
</div>
</body>
</html>'''
    return html

def escape_html(text):
    return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

def init_sample_data():
    if not os.path.exists(BOOKMARKS_FILE):
        sample_bookmarks = [
            {
                'id': str(uuid.uuid4()),
                'title': 'GitHub',
                'url': 'https://github.com',
                'category': '开发工具',
                'tags': ['code', 'git', '开源'],
                'clicks': 0,
                'status': 'pending',
                'status_code': None,
                'last_checked': None,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'title': 'Stack Overflow',
                'url': 'https://stackoverflow.com',
                'category': '开发工具',
                'tags': ['qa', 'code', '社区'],
                'clicks': 0,
                'status': 'pending',
                'status_code': None,
                'last_checked': None,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'title': 'MDN Web Docs',
                'url': 'https://developer.mozilla.org',
                'category': '文档',
                'tags': ['前端', '文档', 'web'],
                'clicks': 0,
                'status': 'pending',
                'status_code': None,
                'last_checked': None,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'title': '知乎',
                'url': 'https://www.zhihu.com',
                'category': '资讯',
                'tags': ['问答', '社区', '中文'],
                'clicks': 0,
                'status': 'pending',
                'status_code': None,
                'last_checked': None,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'title': 'Python 官方文档',
                'url': 'https://docs.python.org',
                'category': '文档',
                'tags': ['python', '文档', '官方'],
                'clicks': 0,
                'status': 'pending',
                'status_code': None,
                'last_checked': None,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
        ]
        save_bookmarks(sample_bookmarks)

        sample_categories = [
            {'id': str(uuid.uuid4()), 'name': '开发工具', 'created_at': datetime.now().isoformat()},
            {'id': str(uuid.uuid4()), 'name': '文档', 'created_at': datetime.now().isoformat()},
            {'id': str(uuid.uuid4()), 'name': '资讯', 'created_at': datetime.now().isoformat()}
        ]
        save_categories(sample_categories)

@app.route('/')
def index():
    bookmarks = load_bookmarks()
    categories = load_categories()
    all_tags = set()
    for bm in bookmarks:
        for tag in bm.get('tags', []):
            all_tags.add(tag)
    return render_template('index.html',
                         bookmarks=bookmarks,
                         categories=categories,
                         all_tags=sorted(all_tags))

@app.route('/api/bookmarks', methods=['GET'])
def get_bookmarks():
    bookmarks = load_bookmarks()
    category = request.args.get('category')
    tag = request.args.get('tag')
    search = request.args.get('search')
    sort_by = request.args.get('sort', 'created_at')
    sort_order = request.args.get('order', 'desc')

    if category:
        bookmarks = [b for b in bookmarks if b.get('category') == category]
    if tag:
        bookmarks = [b for b in bookmarks if tag in b.get('tags', [])]
    if search:
        search_lower = search.lower()
        bookmarks = [b for b in bookmarks if search_lower in b['title'].lower() or search_lower in b['url'].lower()]

    reverse = sort_order == 'desc'
    if sort_by == 'title':
        bookmarks.sort(key=lambda x: x['title'].lower(), reverse=reverse)
    elif sort_by == 'clicks':
        bookmarks.sort(key=lambda x: x.get('clicks', 0), reverse=reverse)
    elif sort_by == 'created_at':
        bookmarks.sort(key=lambda x: x.get('created_at', ''), reverse=reverse)

    return jsonify(bookmarks)

@app.route('/api/bookmarks', methods=['POST'])
def add_bookmark():
    data = request.json
    bookmarks = load_bookmarks()
    categories = load_categories()

    category_name = data.get('category', '未分类')
    if category_name and category_name not in [c['name'] for c in categories]:
        categories.append({
            'id': str(uuid.uuid4()),
            'name': category_name,
            'created_at': datetime.now().isoformat()
        })
        save_categories(categories)

    bookmark = {
        'id': str(uuid.uuid4()),
        'title': data['title'],
        'url': data['url'],
        'category': category_name,
        'tags': data.get('tags', []),
        'clicks': 0,
        'status': 'pending',
        'status_code': None,
        'last_checked': None,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }

    threading.Thread(target=lambda: check_and_update_bookmark_status(bookmark['id'])).start()
    bookmarks.append(bookmark)
    save_bookmarks(bookmarks)
    return jsonify(bookmark), 201

def check_and_update_bookmark_status(bookmark_id):
    bookmarks = load_bookmarks()
    for bm in bookmarks:
        if bm['id'] == bookmark_id:
            status_code = check_url_status(bm['url'])
            bm['status_code'] = status_code
            bm['last_checked'] = datetime.now().isoformat()
            bm['status'] = 'error' if status_code >= 400 or status_code == 0 else 'active'
            save_bookmarks(bookmarks)
            break

@app.route('/api/bookmarks/<bookmark_id>', methods=['PUT'])
def update_bookmark(bookmark_id):
    data = request.json
    bookmarks = load_bookmarks()
    categories = load_categories()

    for bm in bookmarks:
        if bm['id'] == bookmark_id:
            bm['title'] = data.get('title', bm['title'])
            bm['url'] = data.get('url', bm['url'])
            bm['category'] = data.get('category', bm['category'])
            bm['tags'] = data.get('tags', bm.get('tags', []))
            bm['updated_at'] = datetime.now().isoformat()

            category_name = bm['category']
            if category_name and category_name not in [c['name'] for c in categories]:
                categories.append({
                    'id': str(uuid.uuid4()),
                    'name': category_name,
                    'created_at': datetime.now().isoformat()
                })
                save_categories(categories)

            threading.Thread(target=lambda: check_and_update_bookmark_status(bookmark_id)).start()
            save_bookmarks(bookmarks)
            return jsonify(bm)
    return jsonify({'error': 'Bookmark not found'}), 404

@app.route('/api/bookmarks/<bookmark_id>', methods=['DELETE'])
def delete_bookmark(bookmark_id):
    bookmarks = load_bookmarks()
    new_bookmarks = [b for b in bookmarks if b['id'] != bookmark_id]
    if len(new_bookmarks) == len(bookmarks):
        return jsonify({'error': 'Bookmark not found'}), 404
    save_bookmarks(new_bookmarks)
    return jsonify({'message': 'Deleted'}), 200

@app.route('/api/bookmarks/<bookmark_id>/click', methods=['POST'])
def click_bookmark(bookmark_id):
    bookmarks = load_bookmarks()
    for bm in bookmarks:
        if bm['id'] == bookmark_id:
            bm['clicks'] = bm.get('clicks', 0) + 1
            save_bookmarks(bookmarks)
            return jsonify({'clicks': bm['clicks']})
    return jsonify({'error': 'Bookmark not found'}), 404

@app.route('/api/bookmarks/check', methods=['POST'])
def check_bookmarks_now():
    threading.Thread(target=check_all_bookmarks_run_once).start()
    return jsonify({'message': 'Checking started'})

def check_all_bookmarks_run_once():
    bookmarks = load_bookmarks()
    for bm in bookmarks:
        status_code = check_url_status(bm['url'])
        bm['status_code'] = status_code
        bm['last_checked'] = datetime.now().isoformat()
        bm['status'] = 'error' if status_code >= 400 or status_code == 0 else 'active'
    save_bookmarks(bookmarks)

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify(load_categories())

@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.json
    categories = load_categories()
    name = data.get('name', '').strip()
    if not name or name in [c['name'] for c in categories]:
        return jsonify({'error': 'Invalid or duplicate category name'}), 400
    category = {
        'id': str(uuid.uuid4()),
        'name': name,
        'created_at': datetime.now().isoformat()
    }
    categories.append(category)
    save_categories(categories)
    return jsonify(category), 201

@app.route('/api/categories/<category_id>', methods=['PUT'])
def update_category(category_id):
    data = request.json
    categories = load_categories()
    bookmarks = load_bookmarks()
    new_name = data.get('name', '').strip()

    for cat in categories:
        if cat['id'] == category_id:
            old_name = cat['name']
            if not new_name or (new_name != old_name and new_name in [c['name'] for c in categories]):
                return jsonify({'error': 'Invalid or duplicate category name'}), 400
            cat['name'] = new_name
            for bm in bookmarks:
                if bm.get('category') == old_name:
                    bm['category'] = new_name
            save_categories(categories)
            save_bookmarks(bookmarks)
            return jsonify(cat)
    return jsonify({'error': 'Category not found'}), 404

@app.route('/api/categories/<category_id>', methods=['DELETE'])
def delete_category(category_id):
    categories = load_categories()
    bookmarks = load_bookmarks()
    cat_name = None
    for cat in categories:
        if cat['id'] == category_id:
            cat_name = cat['name']
            break
    if not cat_name:
        return jsonify({'error': 'Category not found'}), 404
    categories = [c for c in categories if c['id'] != category_id]
    for bm in bookmarks:
        if bm.get('category') == cat_name:
            bm['category'] = '未分类'
    if '未分类' not in [c['name'] for c in categories]:
        categories.append({
            'id': str(uuid.uuid4()),
            'name': '未分类',
            'created_at': datetime.now().isoformat()
        })
    save_categories(categories)
    save_bookmarks(bookmarks)
    return jsonify({'message': 'Deleted'}), 200

@app.route('/api/export/html')
def export_html():
    bookmarks = load_bookmarks()
    categories = {}
    for bm in bookmarks:
        cat = bm.get('category', '未分类')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(bm)

    html_parts = [
        '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
        '<!-- This is an automatically generated file.',
        '     It will be read and overwritten.',
        '     DO NOT EDIT! -->',
        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
        '<TITLE>Bookmarks</TITLE>',
        '<H1>Bookmarks</H1>',
        '<DL><p>'
    ]

    for cat, bms in categories.items():
        html_parts.append(f'    <DT><H3>{cat}</H3>')
        html_parts.append('    <DL><p>')
        for bm in bms:
            add_date = int(datetime.fromisoformat(bm['created_at']).timestamp())
            tags = ','.join(bm.get('tags', []))
            html_parts.append(
                f'        <DT><A HREF="{bm["url"]}" ADD_DATE="{add_date}" TAGS="{tags}">{bm["title"]}</A>'
            )
        html_parts.append('    </DL><p>')

    html_parts.append('</DL><p>')
    html_content = '\n'.join(html_parts)

    return Response(
        html_content,
        mimetype='text/html',
        headers={'Content-disposition': 'attachment; filename=bookmarks.html'}
    )

@app.route('/api/import/html', methods=['POST'])
def import_html():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    content = file.read().decode('utf-8')
    soup = BeautifulSoup(content, 'html.parser')

    bookmarks = load_bookmarks()
    categories = load_categories()
    existing_urls = {b['url'] for b in bookmarks}
    imported_count = 0

    current_category = '未分类'

    all_a = soup.find_all('a')
    if not all_a:
        return jsonify({'imported': 0}), 200

    for a in all_a:
        url = a.get('href', '').strip()
        if not url:
            continue

        title = a.get_text().strip() or url
        tags_str = a.get('tags', '')
        tags = [t.strip() for t in tags_str.split(',') if t.strip()]

        category = '未分类'
        parent = a.parent
        while parent:
            found_h3 = None
            prev = parent.find_previous_sibling()
            while prev:
                h3 = prev.find('h3')
                if h3:
                    found_h3 = h3
                    break
                prev = prev.find_previous_sibling()
            if found_h3:
                category = found_h3.get_text().strip()
                break
            parent = parent.parent

        if url not in existing_urls:
            if category and category not in [c['name'] for c in categories]:
                categories.append({
                    'id': str(uuid.uuid4()),
                    'name': category,
                    'created_at': datetime.now().isoformat()
                })

            bookmark = {
                'id': str(uuid.uuid4()),
                'title': title,
                'url': url,
                'category': category,
                'tags': tags,
                'clicks': 0,
                'status': 'pending',
                'status_code': None,
                'last_checked': None,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            bookmarks.append(bookmark)
            existing_urls.add(url)
            imported_count += 1

    save_bookmarks(bookmarks)
    save_categories(categories)
    threading.Thread(target=check_all_bookmarks_run_once).start()
    return jsonify({'imported': imported_count})

@app.route('/api/backup')
def create_backup():
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f'backup_{timestamp}.json'
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    data = {
        'bookmarks': load_bookmarks(),
        'categories': load_categories(),
        'created_at': datetime.now().isoformat()
    }
    save_json(backup_path, data)
    return jsonify({'filename': backup_filename, 'path': backup_path})

@app.route('/api/backups')
def list_backups():
    backups = []
    for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if f.endswith('.json'):
            path = os.path.join(BACKUP_DIR, f)
            stat = os.stat(path)
            backups.append({
                'filename': f,
                'size': stat.st_size,
                'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat()
            })
    return jsonify(backups)

@app.route('/api/restore/<filename>', methods=['POST'])
def restore_backup(filename):
    backup_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(backup_path):
        return jsonify({'error': 'Backup not found'}), 404
    data = load_json(backup_path, None)
    if not data:
        return jsonify({'error': 'Invalid backup'}), 400
    save_bookmarks(data.get('bookmarks', []))
    save_categories(data.get('categories', []))
    return jsonify({'message': 'Restored'})

@app.route('/api/share', methods=['POST'])
def create_share():
    data = request.json
    share_type = data.get('type')  # 'category' or 'tag'
    share_value = data.get('value')

    bookmarks = load_bookmarks()
    if share_type == 'category':
        filtered = [b for b in bookmarks if b.get('category') == share_value]
        title = f'分类: {share_value}'
    elif share_type == 'tag':
        filtered = [b for b in bookmarks if share_value in b.get('tags', [])]
        title = f'标签: {share_value}'
    else:
        return jsonify({'error': 'Invalid type'}), 400

    share_id = str(uuid.uuid4())[:8]
    created_at = datetime.now().isoformat()

    html_content = generate_share_html(title, filtered, created_at)
    html_path = os.path.join(SHARE_DIR, f'{share_id}.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    share_info = {
        'id': share_id,
        'type': share_type,
        'value': share_value,
        'title': title,
        'created_at': created_at,
        'bookmark_count': len(filtered)
    }
    info_path = os.path.join(SHARE_DIR, f'{share_id}.json')
    save_json(info_path, share_info)

    return jsonify({
        'share_id': share_id,
        'url': f'/share/{share_id}',
        'file_path': html_path
    }), 201

@app.route('/share/<share_id>')
def view_share(share_id):
    share_path = os.path.join(SHARE_DIR, f'{share_id}.html')
    if not os.path.exists(share_path):
        abort(404)
    with open(share_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    return Response(html_content, mimetype='text/html')

@app.route('/api/tags')
def get_tags():
    bookmarks = load_bookmarks()
    all_tags = set()
    for bm in bookmarks:
        for tag in bm.get('tags', []):
            all_tags.add(tag)
    return jsonify(sorted(all_tags))

if __name__ == '__main__':
    init_sample_data()
    checker_thread = threading.Thread(target=check_all_bookmarks, daemon=True)
    checker_thread.start()
    app.run(host='0.0.0.0', port=5001, debug=True)
