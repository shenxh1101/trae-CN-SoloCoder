#!/usr/bin/env python3
import os
import sys

if sys.platform == 'darwin':
    homebrew_lib = '/opt/homebrew/lib'
    if os.path.exists(homebrew_lib):
        current_ld = os.environ.get('DYLD_LIBRARY_PATH', '')
        if homebrew_lib not in current_ld:
            os.environ['DYLD_LIBRARY_PATH'] = f"{homebrew_lib}:{current_ld}"

import re
import json
import zipfile
import shutil
import uuid
import datetime
from pathlib import Path
from slugify import slugify
from urllib.parse import quote

from flask import (
    Flask, render_template, request, redirect, url_for,
    send_file, send_from_directory, jsonify, abort, flash,
    make_response
)
from werkzeug.utils import secure_filename
import markdown
from bs4 import BeautifulSoup

try:
    import pdfkit
    PDFKIT_AVAILABLE = True
except ImportError:
    PDFKIT_AVAILABLE = False

try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False

BASE_DIR = Path(__file__).parent.resolve()
DOCS_DIR = BASE_DIR / "docs"
HISTORY_DIR = BASE_DIR / "history"
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"
THEMES_DIR = STATIC_DIR / "themes"

DOCS_DIR.mkdir(exist_ok=True)
HISTORY_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
THEMES_DIR.mkdir(exist_ok=True)

TAGS_FILE = DATA_DIR / "tags.json"
STATS_FILE = DATA_DIR / "stats.json"
SHARES_FILE = DATA_DIR / "shares.json"
PINNED_FILE = DATA_DIR / "pinned.json"

app = Flask(__name__)
app.config["SECRET_KEY"] = "markdown-doc-manager-secret-key"
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024
app.config["DOCS_DIR"] = DOCS_DIR
app.config["HISTORY_DIR"] = HISTORY_DIR

md = markdown.Markdown(
    extensions=[
        'tables',
        'fenced_code',
        'codehilite',
        'toc',
        'footnotes',
        'attr_list',
        'def_list',
        'sane_lists',
        'mdx_math'
    ],
    extension_configs={
        'codehilite': {'guess_lang': False},
        'mdx_math': {'enable_dollar_delimiter': True}
    }
)


def load_json(filepath):
    if not filepath.exists():
        return {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_tags():
    return load_json(TAGS_FILE)


def save_tags(tags):
    save_json(TAGS_FILE, tags)


def get_stats():
    return load_json(STATS_FILE)


def save_stats(stats):
    save_json(STATS_FILE, stats)


def get_shares():
    return load_json(SHARES_FILE)


def save_shares(shares):
    save_json(SHARES_FILE, shares)


def get_pinned():
    data = load_json(PINNED_FILE)
    return data if isinstance(data, list) else []


def save_pinned(pinned):
    save_json(PINNED_FILE, pinned)


def get_relative_path(full_path):
    try:
        return str(Path(full_path).resolve().relative_to(DOCS_DIR))
    except ValueError:
        return None


def get_full_path(rel_path):
    if not rel_path:
        return DOCS_DIR
    rel_path = rel_path.lstrip('/').lstrip('\\')
    full_path = (DOCS_DIR / rel_path).resolve()
    if not str(full_path).startswith(str(DOCS_DIR)):
        return None
    return full_path


def safe_path_join(base, *paths):
    base = Path(base).resolve()
    result = base
    for p in paths:
        p = p.lstrip('/').lstrip('\\').replace('..', '')
        result = result / p
    result = result.resolve()
    if not str(result).startswith(str(base)):
        return None
    return result


def get_document_tree():
    tree = []
    pinned = get_pinned()
    tags = get_tags()
    stats = get_stats()

    def scan_dir(dir_path, parent_rel=""):
        items = []
        try:
            entries = sorted(dir_path.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
        except (PermissionError, FileNotFoundError):
            return items

        for entry in entries:
            rel_path = str(entry.relative_to(DOCS_DIR)) if parent_rel else entry.name
            if entry.is_dir():
                children = scan_dir(entry, rel_path)
                items.append({
                    'type': 'folder',
                    'name': entry.name,
                    'path': rel_path,
                    'children': children,
                    'pinned': rel_path in pinned
                })
            elif entry.suffix.lower() == '.md':
                doc_tags = tags.get(rel_path, [])
                doc_stats = stats.get(rel_path, {'views': 0, 'edits': 0})
                items.append({
                    'type': 'document',
                    'name': entry.stem,
                    'path': rel_path,
                    'tags': doc_tags,
                    'views': doc_stats.get('views', 0),
                    'edits': doc_stats.get('edits', 0),
                    'pinned': rel_path in pinned,
                    'modified': datetime.datetime.fromtimestamp(entry.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
                })
        return items

    def sort_items(items):
        pinned_items = [item for item in items if item.get('pinned')]
        unpinned_items = [item for item in items if not item.get('pinned')]
        pinned_items.sort(key=lambda x: x['name'].lower())
        unpinned_items.sort(key=lambda x: (x['type'] == 'folder', x['name'].lower()))
        for item in unpinned_items:
            if item['type'] == 'folder' and item.get('children'):
                item['children'] = sort_items(item['children'])
        return pinned_items + unpinned_items

    return sort_items(scan_dir(DOCS_DIR))


def render_markdown(content):
    try:
        mermaid_blocks = []
        def replace_mermaid(match):
            idx = len(mermaid_blocks)
            mermaid_blocks.append(match.group(2))
            return f'\n<div class="mermaid-placeholder-{idx}"></div>\n'

        content = re.sub(
            r'```mermaid\s*\n(.*?)```',
            replace_mermaid,
            content,
            flags=re.DOTALL
        )

        lines = content.split('\n')
        processed_lines = []
        in_task_list = False

        for line in lines:
            stripped = line.lstrip()
            if stripped.startswith('- [ ] ') or stripped.startswith('- [x] ') or stripped.startswith('- [X] '):
                indent = len(line) - len(stripped)
                checked = 'checked' if stripped.startswith('- [x] ') or stripped.startswith('- [X] ') else ''
                task_text = stripped[6:]
                processed_lines.append(' ' * indent + f'<li class="task-list-item"><input type="checkbox" {checked} disabled class="task-list-item-checkbox"> {task_text}</li>')
                in_task_list = True
            else:
                if in_task_list and stripped and not stripped.startswith('- '):
                    processed_lines.append('</ul>')
                    in_task_list = False
                processed_lines.append(line)

        processed_content = '\n'.join(processed_lines)
        md.reset()
        html = md.convert(processed_content)

        soup = BeautifulSoup(html, 'html.parser')

        for pre in soup.find_all('pre'):
            code = pre.find('code')
            if code:
                pre['class'] = pre.get('class', []) + ['code-block']

        for i, mermaid_code in enumerate(mermaid_blocks):
            placeholder = soup.find('div', class_=f'mermaid-placeholder-{i}')
            if placeholder:
                placeholder.name = 'div'
                placeholder['class'] = ['mermaid']
                placeholder.clear()
                placeholder.append(mermaid_code)

        for task_input in soup.find_all('input', {'type': 'checkbox'}):
            task_input['disabled'] = True
            task_input['class'] = task_input.get('class', []) + ['task-list-item-checkbox']
            li_parent = task_input.find_parent('li')
            if li_parent:
                li_parent['class'] = li_parent.get('class', []) + ['task-list-item']

        return str(soup)
    except Exception as e:
        return f"<p>渲染错误: {str(e)}</p><pre>{content}</pre>"


def save_history(doc_path, content):
    rel_path = get_relative_path(doc_path)
    if not rel_path:
        return
    history_dir = HISTORY_DIR / rel_path
    history_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    history_file = history_dir / f"{timestamp}.md"
    with open(history_file, 'w', encoding='utf-8') as f:
        f.write(content)


def get_history(doc_path):
    rel_path = get_relative_path(doc_path)
    if not rel_path:
        return []
    history_dir = HISTORY_DIR / rel_path
    if not history_dir.exists():
        return []
    versions = []
    for f in sorted(history_dir.glob('*.md'), reverse=True):
        versions.append({
            'filename': f.name,
            'timestamp': f.stem,
            'time': datetime.datetime.strptime(f.stem, '%Y%m%d_%H%M%S').strftime('%Y-%m-%d %H:%M:%S'),
            'size': f.stat().st_size
        })
    return versions


def increment_stat(doc_path, stat_type):
    rel_path = get_relative_path(doc_path)
    if not rel_path:
        return
    stats = get_stats()
    if rel_path not in stats:
        stats[rel_path] = {'views': 0, 'edits': 0}
    stats[rel_path][stat_type] = stats[rel_path].get(stat_type, 0) + 1
    save_stats(stats)


def search_documents(query):
    results = []
    if not query:
        return results
    query_lower = query.lower()
    tags = get_tags()
    stats = get_stats()

    for root, dirs, files in os.walk(DOCS_DIR):
        for file in files:
            if file.endswith('.md'):
                file_path = Path(root) / file
                rel_path = get_relative_path(file_path)
                if not rel_path:
                    continue
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    content_lower = content.lower()
                    title_match = query_lower in file.lower()
                    content_match = query_lower in content_lower
                    doc_tags = tags.get(rel_path, [])
                    tag_match = any(query_lower in tag.lower() for tag in doc_tags)

                    if title_match or content_match or tag_match:
                        snippet = ""
                        if content_match:
                            idx = content_lower.find(query_lower)
                            start = max(0, idx - 50)
                            end = min(len(content), idx + 100)
                            snippet = content[start:end].replace('\n', ' ')
                            if start > 0:
                                snippet = "..." + snippet
                            if end < len(content):
                                snippet = snippet + "..."

                        doc_stats = stats.get(rel_path, {'views': 0, 'edits': 0})
                        results.append({
                            'path': rel_path,
                            'title': file[:-3],
                            'snippet': snippet,
                            'tags': doc_tags,
                            'views': doc_stats.get('views', 0),
                            'edits': doc_stats.get('edits', 0),
                            'title_match': title_match,
                            'content_match': content_match,
                            'tag_match': tag_match
                        })
                except (IOError, UnicodeDecodeError):
                    continue

    results.sort(key=lambda x: (
        not x['title_match'],
        not x['tag_match'],
        not x['content_match'],
        x['title'].lower()
    ))
    return results


def generate_share_link(doc_path):
    rel_path = get_relative_path(doc_path)
    if not rel_path:
        return None
    shares = get_shares()
    for share_id, data in shares.items():
        if data['path'] == rel_path:
            return share_id
    share_id = str(uuid.uuid4())[:8]
    shares[share_id] = {
        'path': rel_path,
        'created': datetime.datetime.now().isoformat(),
        'views': 0
    }
    save_shares(shares)
    return share_id


def get_all_tags():
    tags_data = get_tags()
    all_tags = set()
    for tags in tags_data.values():
        all_tags.update(tags)
    return sorted(list(all_tags))


def filter_docs_by_tag(tag_name):
    tags_data = get_tags()
    return [path for path, tags in tags_data.items() if tag_name in tags]


@app.route('/')
def index():
    tree = get_document_tree()
    all_tags = get_all_tags()
    return render_template('index.html', tree=tree, all_tags=all_tags, current_tag=None)


@app.route('/browse/<path:folder_path>')
def browse_folder(folder_path):
    full_path = get_full_path(folder_path)
    if not full_path or not full_path.exists() or not full_path.is_dir():
        abort(404)
    tree = get_document_tree()
    all_tags = get_all_tags()
    return render_template('index.html', tree=tree, all_tags=all_tags,
                           current_folder=folder_path, current_tag=None)


@app.route('/tag/<tag_name>')
def filter_by_tag(tag_name):
    tree = get_document_tree()
    all_tags = get_all_tags()
    filtered_paths = filter_docs_by_tag(tag_name)

    def filter_tree(items):
        filtered = []
        for item in items:
            if item['type'] == 'document' and item['path'] in filtered_paths:
                filtered.append(item)
            elif item['type'] == 'folder':
                filtered_children = filter_tree(item.get('children', []))
                if filtered_children:
                    item_copy = item.copy()
                    item_copy['children'] = filtered_children
                    filtered.append(item_copy)
        return filtered

    filtered_tree = filter_tree(tree)
    return render_template('index.html', tree=filtered_tree, all_tags=all_tags,
                           current_tag=tag_name, filtered_paths=filtered_paths)


@app.route('/view/<path:doc_path>')
def view_document(doc_path):
    full_path = get_full_path(doc_path)
    if not full_path or not full_path.exists() or not full_path.is_file():
        abort(404)

    increment_stat(full_path, 'views')

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    html_content = render_markdown(content)
    title = Path(doc_path).stem
    tags_data = get_tags()
    doc_tags = tags_data.get(doc_path, [])
    all_tags = get_all_tags()
    history = get_history(full_path)
    pinned = get_pinned()
    is_pinned = doc_path in pinned
    shares = get_shares()
    share_id = None
    for sid, data in shares.items():
        if data['path'] == doc_path:
            share_id = sid
            break

    return render_template('view.html',
                           content=content,
                           html_content=html_content,
                           title=title,
                           doc_path=doc_path,
                           tags=doc_tags,
                           all_tags=all_tags,
                           history=history,
                           is_pinned=is_pinned,
                           share_id=share_id)


@app.route('/new', methods=['GET', 'POST'])
@app.route('/new/<path:folder_path>', methods=['GET', 'POST'])
def new_document(folder_path=""):
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '')
        tags = request.form.get('tags', '').strip()
        folder = request.form.get('folder', folder_path).strip()

        if not title:
            flash('请输入文档标题', 'error')
            return redirect(url_for('new_document', folder_path=folder))

        filename = slugify(title) + '.md'
        if folder:
            full_folder = get_full_path(folder)
            if not full_folder or not full_folder.is_dir():
                flash('文件夹不存在', 'error')
                return redirect(url_for('new_document'))
            full_path = full_folder / filename
        else:
            full_path = DOCS_DIR / filename

        rel_path = get_relative_path(full_path)
        if full_path.exists():
            flash('文档已存在', 'error')
            return redirect(url_for('new_document', folder_path=folder))

        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        if tags:
            tags_list = [t.strip() for t in tags.split(',') if t.strip()]
            tags_data = get_tags()
            tags_data[rel_path] = tags_list
            save_tags(tags_data)

        increment_stat(full_path, 'edits')
        flash('文档创建成功', 'success')
        return redirect(url_for('view_document', doc_path=rel_path))

    all_tags = get_all_tags()
    return render_template('edit.html',
                           title='',
                           content='',
                           tags='',
                           doc_path=None,
                           folder_path=folder_path,
                           all_tags=all_tags,
                           is_new=True)


@app.route('/edit/<path:doc_path>', methods=['GET', 'POST'])
def edit_document(doc_path):
    full_path = get_full_path(doc_path)
    if not full_path or not full_path.exists() or not full_path.is_file():
        abort(404)

    if request.method == 'POST':
        new_title = request.form.get('title', '').strip()
        content = request.form.get('content', '')
        tags = request.form.get('tags', '').strip()

        if not new_title:
            flash('请输入文档标题', 'error')
            return redirect(url_for('edit_document', doc_path=doc_path))

        with open(full_path, 'r', encoding='utf-8') as f:
            old_content = f.read()
        save_history(full_path, old_content)

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        tags_list = [t.strip() for t in tags.split(',') if t.strip()]
        tags_data = get_tags()
        if tags_list:
            tags_data[doc_path] = tags_list
        elif doc_path in tags_data:
            del tags_data[doc_path]
        save_tags(tags_data)

        increment_stat(full_path, 'edits')

        new_filename = slugify(new_title) + '.md'
        old_filename = Path(doc_path).name
        if new_filename != old_filename:
            new_full_path = full_path.parent / new_filename
            if new_full_path.exists():
                flash('文件名已存在', 'error')
            else:
                full_path.rename(new_full_path)
                new_rel_path = get_relative_path(new_full_path)

                if doc_path in tags_data:
                    tags_data[new_rel_path] = tags_data.pop(doc_path)
                    save_tags(tags_data)

                stats = get_stats()
                if doc_path in stats:
                    stats[new_rel_path] = stats.pop(doc_path)
                    save_stats(stats)

                pinned = get_pinned()
                if doc_path in pinned:
                    pinned.remove(doc_path)
                    pinned.append(new_rel_path)
                    save_pinned(pinned)

                shares = get_shares()
                for sid, data in shares.items():
                    if data['path'] == doc_path:
                        data['path'] = new_rel_path
                save_shares(shares)

                doc_path = new_rel_path

        flash('文档保存成功', 'success')
        return redirect(url_for('view_document', doc_path=doc_path))

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    tags_data = get_tags()
    doc_tags = tags_data.get(doc_path, [])
    all_tags = get_all_tags()

    return render_template('edit.html',
                           title=Path(doc_path).stem,
                           content=content,
                           tags=','.join(doc_tags),
                           doc_path=doc_path,
                           folder_path=str(Path(doc_path).parent) if '/' in doc_path else '',
                           all_tags=all_tags,
                           is_new=False)


@app.route('/preview', methods=['POST'])
def preview():
    content = request.form.get('content', '')
    html_content = render_markdown(content)
    return jsonify({'html': html_content})


@app.route('/delete/<path:doc_path>', methods=['POST'])
def delete_document(doc_path):
    full_path = get_full_path(doc_path)
    if not full_path or not full_path.exists():
        abort(404)

    if full_path.is_file():
        full_path.unlink()

        tags_data = get_tags()
        if doc_path in tags_data:
            del tags_data[doc_path]
            save_tags(tags_data)

        stats = get_stats()
        if doc_path in stats:
            del stats[doc_path]
            save_stats(stats)

        pinned = get_pinned()
        if doc_path in pinned:
            pinned.remove(doc_path)
            save_pinned(pinned)

        shares = get_shares()
        shares = {k: v for k, v in shares.items() if v['path'] != doc_path}
        save_shares(shares)

        history_dir = HISTORY_DIR / doc_path
        if history_dir.exists():
            shutil.rmtree(history_dir)

        flash('文档已删除', 'success')
    elif full_path.is_dir():
        if any(full_path.iterdir()):
            flash('文件夹不为空，无法删除', 'error')
        else:
            full_path.rmdir()
            flash('文件夹已删除', 'success')

    return redirect(url_for('index'))


@app.route('/new-folder', methods=['POST'])
def new_folder():
    folder_name = request.form.get('folder_name', '').strip()
    parent_folder = request.form.get('parent_folder', '').strip()

    if not folder_name:
        flash('请输入文件夹名称', 'error')
        return redirect(url_for('index'))

    safe_name = slugify(folder_name)
    if parent_folder:
        parent_path = get_full_path(parent_folder)
        if not parent_path or not parent_path.is_dir():
            flash('父文件夹不存在', 'error')
            return redirect(url_for('index'))
        full_path = parent_path / safe_name
    else:
        full_path = DOCS_DIR / safe_name

    if full_path.exists():
        flash('文件夹已存在', 'error')
    else:
        full_path.mkdir(parents=True, exist_ok=True)
        flash('文件夹创建成功', 'success')

    return redirect(url_for('index'))


@app.route('/search')
def search():
    query = request.args.get('q', '').strip()
    results = search_documents(query)
    tree = get_document_tree()
    all_tags = get_all_tags()
    return render_template('search.html',
                           query=query,
                           results=results,
                           tree=tree,
                           all_tags=all_tags)


@app.route('/history/<path:doc_path>/<version>')
def view_history(doc_path, version):
    full_path = get_full_path(doc_path)
    if not full_path:
        abort(404)

    history_dir = HISTORY_DIR / doc_path
    history_file = history_dir / version
    if not history_file.exists():
        abort(404)

    with open(history_file, 'r', encoding='utf-8') as f:
        content = f.read()

    html_content = render_markdown(content)
    return render_template('history_view.html',
                           content=content,
                           html_content=html_content,
                           doc_path=doc_path,
                           version=version,
                           title=f"{Path(doc_path).stem} - 历史版本")


@app.route('/restore/<path:doc_path>/<version>', methods=['POST'])
def restore_history(doc_path, version):
    full_path = get_full_path(doc_path)
    if not full_path or not full_path.exists():
        abort(404)

    history_dir = HISTORY_DIR / doc_path
    history_file = history_dir / version
    if not history_file.exists():
        abort(404)

    with open(full_path, 'r', encoding='utf-8') as f:
        current_content = f.read()
    save_history(full_path, current_content)

    with open(history_file, 'r', encoding='utf-8') as f:
        content = f.read()
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    increment_stat(full_path, 'edits')
    flash('已恢复到历史版本', 'success')
    return redirect(url_for('view_document', doc_path=doc_path))


@app.route('/share/<share_id>')
def view_shared(share_id):
    shares = get_shares()
    if share_id not in shares:
        abort(404)

    share_data = shares[share_id]
    doc_path = share_data['path']
    full_path = get_full_path(doc_path)
    if not full_path or not full_path.exists():
        abort(404)

    share_data['views'] = share_data.get('views', 0) + 1
    shares[share_id] = share_data
    save_shares(shares)

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    html_content = render_markdown(content)
    return render_template('share_view.html',
                           html_content=html_content,
                           title=Path(doc_path).stem,
                           share_id=share_id)


def export_as_pdf(content, title, doc_path=None):
    if not WEASYPRINT_AVAILABLE:
        flash('PDF导出功能需要安装WeasyPrint', 'error')
        return redirect(url_for('view_document', doc_path=doc_path) if doc_path else url_for('index'))

    html_content = render_markdown(content)

    pdf_css = """
        @page {
            size: A4;
            margin: 2cm;
            @top-center {
                content: counter(page) " / " counter(pages);
                font-size: 12px;
                color: #666;
            }
        }
        body {
            font-family: 'PingFang SC', 'Microsoft YaHei', 'SimHei', 'WenQuanYi Micro Hei', sans-serif;
            font-size: 14px;
            line-height: 1.8;
            color: #333;
        }
        h1 {
            font-size: 28px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
            color: #1a1a1a;
        }
        h2 {
            font-size: 22px;
            margin-top: 30px;
            color: #2a2a2a;
        }
        h3 {
            font-size: 18px;
            margin-top: 20px;
            color: #333;
        }
        h4, h5, h6 {
            font-size: 16px;
            margin-top: 15px;
            color: #444;
        }
        p {
            margin: 10px 0;
            text-align: justify;
        }
        ul, ol {
            margin: 10px 0;
            padding-left: 25px;
        }
        li {
            margin: 5px 0;
        }
        pre {
            background-color: #f8f8f8;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.6;
            margin: 15px 0;
        }
        code {
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
            font-size: 13px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 10px 12px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
            color: #333;
        }
        tr:nth-child(even) {
            background-color: #fafafa;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 15px 0;
            padding-left: 20px;
            color: #666;
            font-style: italic;
        }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 20px 0;
        }
        .task-list-item {
            list-style-type: none;
            margin-left: -20px;
        }
        .task-list-item-checkbox {
            margin-right: 8px;
        }
    """

    full_html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>{pdf_css}</style>
</head>
<body>
<h1>{title}</h1>
{html_content}
</body>
</html>"""

    try:
        from io import BytesIO
        pdf_buffer = BytesIO()

        HTML(string=full_html).write_pdf(
            target=pdf_buffer
        )

        pdf_data = pdf_buffer.getvalue()
        pdf_buffer.close()

        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f"attachment; filename*=UTF-8''{quote(title)}.pdf"
        return response
    except Exception as e:
        flash(f'PDF导出失败: {str(e)}', 'error')
        return redirect(url_for('view_document', doc_path=doc_path) if doc_path else url_for('index'))


@app.route('/generate-share/<path:doc_path>', methods=['POST'])
def generate_share(doc_path):
    full_path = get_full_path(doc_path)
    if not full_path or not full_path.exists():
        abort(404)

    share_id = generate_share_link(full_path)
    if share_id:
        share_url = url_for('view_shared', share_id=share_id, _external=True)
        return jsonify({'success': True, 'share_id': share_id, 'share_url': share_url})
    return jsonify({'success': False, 'error': '生成分享链接失败'})


@app.route('/revoke-share/<share_id>', methods=['POST'])
def revoke_share(share_id):
    shares = get_shares()
    if share_id in shares:
        del shares[share_id]
        save_shares(shares)
        flash('分享链接已撤销', 'success')
    return redirect(request.referrer or url_for('index'))


@app.route('/pin/<path:doc_path>', methods=['POST'])
def pin_document(doc_path):
    full_path = get_full_path(doc_path)
    if not full_path or not full_path.exists():
        abort(404)

    pinned = get_pinned()
    if doc_path in pinned:
        pinned.remove(doc_path)
    else:
        pinned.append(doc_path)
    save_pinned(pinned)

    return jsonify({'success': True, 'pinned': doc_path in pinned})


@app.route('/export/<path:doc_path>/<format_type>')
def export_document(doc_path, format_type):
    full_path = get_full_path(doc_path)
    if not full_path or not full_path.exists():
        abort(404)

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    title = Path(doc_path).stem

    if format_type == 'html':
        html_content = render_markdown(content)
        full_html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }}
        pre {{ background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }}
        code {{ background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }}
        pre code {{ background: none; padding: 0; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; }}
        th {{ background: #f5f5f5; }}
        blockquote {{ border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }}
    </style>
</head>
<body>
<h1>{title}</h1>
{html_content}
</body>
</html>"""
        response = make_response(full_html)
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
        response.headers['Content-Disposition'] = f"attachment; filename*=UTF-8''{quote(title)}.html"
        return response

    elif format_type == 'pdf':
        return export_as_pdf(content, title, doc_path)

    elif format_type == 'md':
        response = make_response(content)
        response.headers['Content-Type'] = 'text/markdown; charset=utf-8'
        response.headers['Content-Disposition'] = f"attachment; filename*=UTF-8''{quote(title)}.md"
        return response

    abort(400)


@app.route('/export-all')
def export_all():
    zip_filename = f"markdown-docs-{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = BASE_DIR / "temp" / zip_filename
    zip_path.parent.mkdir(exist_ok=True)

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(DOCS_DIR):
            for file in files:
                if file.endswith('.md'):
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(DOCS_DIR)
                    zf.write(file_path, arcname)

        data_files = [TAGS_FILE, STATS_FILE, PINNED_FILE, SHARES_FILE]
        for data_file in data_files:
            if data_file.exists():
                zf.write(data_file, f"_data/{data_file.name}")

    return send_file(zip_path, as_attachment=True, download_name=zip_filename)


@app.route('/import', methods=['GET', 'POST'])
def import_documents():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('请选择文件', 'error')
            return redirect(request.url)

        file = request.files['file']
        if file.filename == '':
            flash('请选择文件', 'error')
            return redirect(request.url)

        filename = secure_filename(file.filename)
        temp_dir = BASE_DIR / "temp"
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / filename
        file.save(temp_path)

        target_folder = request.form.get('target_folder', '').strip()
        if target_folder:
            target_path = get_full_path(target_folder)
            if not target_path or not target_path.is_dir():
                flash('目标文件夹不存在', 'error')
                temp_path.unlink()
                return redirect(request.url)
        else:
            target_path = DOCS_DIR

        imported_count = 0

        try:
            if filename.lower().endswith('.zip'):
                with zipfile.ZipFile(temp_path, 'r') as zf:
                    for member in zf.namelist():
                        if member.endswith('.md') and not member.startswith('_'):
                            member_path = Path(member)
                            dest_path = safe_path_join(target_path, str(member_path))
                            if dest_path:
                                dest_path.parent.mkdir(parents=True, exist_ok=True)
                                with zf.open(member) as src, open(dest_path, 'wb') as dst:
                                    shutil.copyfileobj(src, dst)
                                imported_count += 1
                                rel_path = get_relative_path(dest_path)
                                if rel_path:
                                    increment_stat(dest_path, 'edits')

            elif filename.lower().endswith('.md'):
                dest_name = Path(filename).name
                dest_path = target_path / dest_name
                if dest_path.exists():
                    dest_path = target_path / f"{Path(filename).stem}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.md"

                shutil.copy(temp_path, dest_path)
                imported_count += 1
                rel_path = get_relative_path(dest_path)
                if rel_path:
                    increment_stat(dest_path, 'edits')

            else:
                flash('不支持的文件格式', 'error')
                temp_path.unlink()
                return redirect(request.url)

            temp_path.unlink()
            flash(f'成功导入 {imported_count} 个文档', 'success')
            return redirect(url_for('index'))

        except Exception as e:
            flash(f'导入失败: {str(e)}', 'error')
            if temp_path.exists():
                temp_path.unlink()
            return redirect(request.url)

    tree = get_document_tree()
    all_tags = get_all_tags()
    return render_template('import.html', tree=tree, all_tags=all_tags)


@app.route('/theme/upload', methods=['POST'])
def upload_theme():
    if 'theme' not in request.files:
        flash('请选择主题文件', 'error')
        return redirect(request.referrer or url_for('index'))

    file = request.files['theme']
    if file.filename == '':
        flash('请选择主题文件', 'error')
        return redirect(request.referrer or url_for('index'))

    if not file.filename.lower().endswith('.css'):
        flash('请上传CSS文件', 'error')
        return redirect(request.referrer or url_for('index'))

    filename = secure_filename(file.filename)
    file.save(THEMES_DIR / filename)
    flash('主题上传成功', 'success')
    return redirect(request.referrer or url_for('index'))


@app.route('/themes')
def list_themes():
    themes = []
    if THEMES_DIR.exists():
        for f in THEMES_DIR.glob('*.css'):
            themes.append(f.name)
    return jsonify({'themes': themes})


@app.route('/theme/<theme_name>')
def get_theme(theme_name):
    theme_path = THEMES_DIR / theme_name
    if not theme_path.exists() or not theme_name.endswith('.css'):
        abort(404)
    return send_from_directory(THEMES_DIR, theme_name)


@app.route('/theme/delete/<theme_name>', methods=['POST'])
def delete_theme(theme_name):
    theme_path = THEMES_DIR / theme_name
    if theme_path.exists() and theme_name.endswith('.css'):
        theme_path.unlink()
        flash('主题已删除', 'success')
    return redirect(request.referrer or url_for('index'))


@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404


if __name__ == '__main__':
    print("Markdown文档管理系统启动中...")
    print(f"文档目录: {DOCS_DIR}")
    print("访问地址: http://127.0.0.1:5001")
    app.run(debug=True, host='0.0.0.0', port=5001)
