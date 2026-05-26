#!/usr/bin/env python3
import os
import re
import json
import time
import zipfile
import secrets
import shutil
from datetime import datetime
from io import BytesIO
from pathlib import Path

from flask import (Flask, render_template, request, redirect, url_for,
                   jsonify, send_file, abort, flash, get_flashed_messages)
from slugify import slugify

BASE_DIR = Path(__file__).resolve().parent
NOTES_DIR = BASE_DIR / 'notes'
HISTORY_DIR = BASE_DIR / 'history'
DRAFTS_DIR = BASE_DIR / 'drafts'
TAGS_FILE = BASE_DIR / 'tags.json'
SHARES_FILE = BASE_DIR / 'shares.json'

for d in [NOTES_DIR, HISTORY_DIR, DRAFTS_DIR]:
    d.mkdir(exist_ok=True)

for f in [TAGS_FILE, SHARES_FILE]:
    if not f.exists():
        f.write_text('{}', encoding='utf-8')

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_MIMETYPE'] = 'application/json; charset=utf-8'


def load_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return {}


def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def generate_note_id(title):
    slug = slugify(title) if title else 'note'
    timestamp = int(time.time())
    return f"{slug}-{timestamp}"


def parse_note_file(filepath):
    content = filepath.read_text(encoding='utf-8')
    meta = {}
    body = ''
    if '===META===' in content and '===CONTENT===' in content:
        parts = content.split('===CONTENT===', 1)
        meta_part = parts[0].replace('===META===', '').strip()
        body = parts[1].strip()
        for line in meta_part.split('\n'):
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip()] = v.strip()
    else:
        body = content
        meta['Title'] = filepath.stem
    return meta, body


def format_note_content(meta, body):
    lines = ['===META===']
    for k, v in meta.items():
        lines.append(f'{k}: {v}')
    lines.append('===CONTENT===')
    lines.append(body)
    return '\n'.join(lines)


def get_note_meta(note_id):
    filepath = NOTES_DIR / f'{note_id}.txt'
    if not filepath.exists():
        return None
    meta, body = parse_note_file(filepath)
    stat = filepath.stat()
    return {
        'id': note_id,
        'title': meta.get('Title', note_id),
        'content': body,
        'created_at': meta.get('Created', datetime.fromtimestamp(stat.st_birthtime).strftime('%Y-%m-%d %H:%M:%S')),
        'updated_at': meta.get('Updated', datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')),
        'tags': [t.strip() for t in meta.get('Tags', '').split(',') if t.strip()]
    }


def get_all_notes():
    notes = []
    for f in sorted(NOTES_DIR.glob('*.txt'), key=lambda x: x.stat().st_mtime, reverse=True):
        note = get_note_meta(f.stem)
        if note:
            notes.append(note)
    return notes


def update_tags_index(note_id, old_tags, new_tags):
    tags = load_json(TAGS_FILE)
    for tag in old_tags:
        if tag in tags and note_id in tags[tag]:
            tags[tag].remove(note_id)
            if not tags[tag]:
                del tags[tag]
    for tag in new_tags:
        if tag not in tags:
            tags[tag] = []
        if note_id not in tags[tag]:
            tags[tag].append(note_id)
    save_json(TAGS_FILE, tags)


def save_history(note_id, meta, body):
    note_history_dir = HISTORY_DIR / note_id
    note_history_dir.mkdir(exist_ok=True)
    version = datetime.now().strftime('%Y%m%d_%H%M%S')
    content = format_note_content(meta, body)
    (note_history_dir / f'{version}.txt').write_text(content, encoding='utf-8')
    return version


def get_note_history(note_id):
    note_history_dir = HISTORY_DIR / note_id
    if not note_history_dir.exists():
        return []
    versions = []
    for f in sorted(note_history_dir.glob('*.txt'), reverse=True):
        meta, body = parse_note_file(f)
        versions.append({
            'id': f.stem,
            'title': meta.get('Title', ''),
            'saved_at': datetime.strptime(f.stem, '%Y%m%d_%H%M%S').strftime('%Y-%m-%d %H:%M:%S'),
            'size': len(body),
            'content': body,
            'tags': [t.strip() for t in meta.get('Tags', '').split(',') if t.strip()]
        })
    return versions


def parse_internal_links(content, all_notes):
    note_titles = {n['title']: n['id'] for n in all_notes}
    pattern = r'\[\[([^\]]+)\]\]'

    def replace_link(match):
        title = match.group(1)
        if title in note_titles:
            return f'<a href="/note/{note_titles[title]}" class="internal-link">[[{title}]]</a>'
        return match.group(0)

    return re.sub(pattern, replace_link, content)


def escape_html(text):
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))


@app.template_filter('nl2br')
def nl2br_filter(s):
    return s.replace('\n', '<br>\n')


@app.route('/')
def index():
    tag_filter = request.args.get('tag', '')
    notes = get_all_notes()
    if tag_filter:
        tags_idx = load_json(TAGS_FILE)
        filtered_ids = tags_idx.get(tag_filter, [])
        notes = [n for n in notes if n['id'] in filtered_ids]
    all_tags = load_json(TAGS_FILE)
    tags_with_count = sorted([(t, len(ids)) for t, ids in all_tags.items()], key=lambda x: x[1], reverse=True)
    return render_template('index.html', notes=notes, all_tags=tags_with_count, current_tag=tag_filter)


@app.route('/search')
def search():
    q = request.args.get('q', '')
    if isinstance(q, bytes):
        q = q.decode('utf-8')
    q = q.strip().lower()
    notes = get_all_notes()
    if q:
        notes = [n for n in notes if q in n['title'].lower()]
    response = jsonify({
        'success': True,
        'notes': [{
            'id': n['id'],
            'title': n['title'],
            'created_at': n['created_at'],
            'updated_at': n['updated_at'],
            'tags': n['tags']
        } for n in notes]
    })
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response


@app.route('/note/new', methods=['GET', 'POST'])
def new_note():
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '')
        tags_input = request.form.get('tags', '')
        tags = [t.strip() for t in tags_input.split(',') if t.strip()]
        if not title:
            title = '未命名笔记'
        note_id = generate_note_id(title)
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        meta = {
            'Title': title,
            'Created': now,
            'Updated': now,
            'Tags': ', '.join(tags)
        }
        file_content = format_note_content(meta, content)
        (NOTES_DIR / f'{note_id}.txt').write_text(file_content, encoding='utf-8')
        update_tags_index(note_id, [], tags)
        draft_path = DRAFTS_DIR / 'new_draft.txt'
        if draft_path.exists():
            draft_path.unlink()
        flash('笔记创建成功！', 'success')
        return redirect(url_for('view_note', note_id=note_id))
    draft_path = DRAFTS_DIR / 'new_draft.txt'
    draft_data = None
    if draft_path.exists():
        try:
            meta, body = parse_note_file(draft_path)
            draft_data = {
                'title': meta.get('Title', ''),
                'content': body,
                'tags': meta.get('Tags', '')
            }
        except Exception:
            pass
    return render_template('edit.html', note=None, draft_data=draft_data)


@app.route('/note/<note_id>')
def view_note(note_id):
    note = get_note_meta(note_id)
    if not note:
        abort(404)
    all_notes = get_all_notes()
    content_html = parse_internal_links(escape_html(note['content']), all_notes)
    return render_template('view.html', note=note, content_html=content_html)


@app.route('/note/<note_id>/edit', methods=['GET', 'POST'])
def edit_note(note_id):
    filepath = NOTES_DIR / f'{note_id}.txt'
    if not filepath.exists():
        abort(404)
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '')
        tags_input = request.form.get('tags', '')
        new_tags = [t.strip() for t in tags_input.split(',') if t.strip()]
        if not title:
            title = '未命名笔记'
        old_meta, old_body = parse_note_file(filepath)
        old_tags = [t.strip() for t in old_meta.get('Tags', '').split(',') if t.strip()]
        save_history(note_id, old_meta, old_body)
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        meta = {
            'Title': title,
            'Created': old_meta.get('Created', now),
            'Updated': now,
            'Tags': ', '.join(new_tags)
        }
        file_content = format_note_content(meta, content)
        filepath.write_text(file_content, encoding='utf-8')
        update_tags_index(note_id, old_tags, new_tags)
        draft_path = DRAFTS_DIR / f'{note_id}_draft.txt'
        if draft_path.exists():
            draft_path.unlink()
        flash('笔记保存成功！', 'success')
        return redirect(url_for('view_note', note_id=note_id))
    note = get_note_meta(note_id)
    draft_path = DRAFTS_DIR / f'{note_id}_draft.txt'
    draft_data = None
    if draft_path.exists():
        try:
            meta, body = parse_note_file(draft_path)
            draft_data = {
                'title': meta.get('Title', ''),
                'content': body,
                'tags': meta.get('Tags', '')
            }
        except Exception:
            pass
    return render_template('edit.html', note=note, draft_data=draft_data)


@app.route('/note/<note_id>/draft', methods=['POST'])
def save_draft(note_id):
    try:
        data = request.get_json()
        title = data.get('title', '').strip()
        content = data.get('content', '')
        tags = data.get('tags', '')
        meta = {
            'Title': title,
            'Created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Tags': tags
        }
        file_content = format_note_content(meta, content)
        draft_name = 'new_draft.txt' if note_id == 'new' else f'{note_id}_draft.txt'
        (DRAFTS_DIR / draft_name).write_text(file_content, encoding='utf-8')
        return jsonify({
            'success': True,
            'saved_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/note/<note_id>/delete', methods=['POST'])
def delete_note(note_id):
    filepath = NOTES_DIR / f'{note_id}.txt'
    if not filepath.exists():
        abort(404)
    meta, _ = parse_note_file(filepath)
    tags = [t.strip() for t in meta.get('Tags', '').split(',') if t.strip()]
    update_tags_index(note_id, tags, [])
    filepath.unlink()
    note_history_dir = HISTORY_DIR / note_id
    if note_history_dir.exists():
        shutil.rmtree(note_history_dir)
    draft_path = DRAFTS_DIR / f'{note_id}_draft.txt'
    if draft_path.exists():
        draft_path.unlink()
    shares = load_json(SHARES_FILE)
    shares = {k: v for k, v in shares.items() if v['note_id'] != note_id}
    save_json(SHARES_FILE, shares)
    flash('笔记已删除', 'info')
    return redirect(url_for('index'))


@app.route('/notes/batch_delete', methods=['POST'])
def batch_delete():
    note_ids = request.form.getlist('note_ids')
    deleted_count = 0
    for note_id in note_ids:
        filepath = NOTES_DIR / f'{note_id}.txt'
        if filepath.exists():
            meta, _ = parse_note_file(filepath)
            tags = [t.strip() for t in meta.get('Tags', '').split(',') if t.strip()]
            update_tags_index(note_id, tags, [])
            filepath.unlink()
            note_history_dir = HISTORY_DIR / note_id
            if note_history_dir.exists():
                shutil.rmtree(note_history_dir)
            draft_path = DRAFTS_DIR / f'{note_id}_draft.txt'
            if draft_path.exists():
                draft_path.unlink()
            deleted_count += 1
    shares = load_json(SHARES_FILE)
    shares = {k: v for k, v in shares.items() if v['note_id'] not in note_ids}
    save_json(SHARES_FILE, shares)
    flash(f'已删除 {deleted_count} 篇笔记', 'info')
    return redirect(url_for('index'))


@app.route('/note/<note_id>/pdf')
def export_pdf(note_id):
    note = get_note_meta(note_id)
    if not note:
        abort(404)
    all_notes = get_all_notes()
    content_html = parse_internal_links(escape_html(note['content']), all_notes)
    html_content = render_template('pdf_template.html', note=note, content_html=content_html)
    try:
        from weasyprint import HTML
        pdf_file = BytesIO()
        HTML(string=html_content).write_pdf(pdf_file)
        pdf_file.seek(0)
        return send_file(
            pdf_file,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{note["title"]}.pdf'
        )
    except Exception as e:
        flash(f'PDF导出失败: {str(e)}', 'error')
        return redirect(url_for('view_note', note_id=note_id))


@app.route('/note/<note_id>/share', methods=['POST'])
def share_note(note_id):
    note = get_note_meta(note_id)
    if not note:
        return jsonify({'success': False, 'error': '笔记不存在'}), 404
    shares = load_json(SHARES_FILE)
    existing = [t for t, v in shares.items() if v['note_id'] == note_id]
    if existing:
        token = existing[0]
    else:
        token = secrets.token_urlsafe(8)
        shares[token] = {
            'note_id': note_id,
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        save_json(SHARES_FILE, shares)
    return jsonify({
        'success': True,
        'token': token,
        'share_url': url_for('view_shared', token=token, _external=True)
    })


@app.route('/share/<token>')
def view_shared(token):
    shares = load_json(SHARES_FILE)
    if token not in shares:
        abort(404)
    note_id = shares[token]['note_id']
    note = get_note_meta(note_id)
    if not note:
        abort(404)
    all_notes = get_all_notes()
    content_html = parse_internal_links(escape_html(note['content']), all_notes)
    return render_template('share_view.html', note=note, content_html=content_html, token=token)


@app.route('/note/<note_id>/history')
def note_history(note_id):
    note = get_note_meta(note_id)
    if not note:
        abort(404)
    versions = get_note_history(note_id)
    return render_template('history.html', note=note, versions=versions)


@app.route('/note/<note_id>/history/<version>')
def view_history_version(note_id, version):
    version_path = HISTORY_DIR / note_id / f'{version}.txt'
    if not version_path.exists():
        abort(404)
    meta, body = parse_note_file(version_path)
    note = get_note_meta(note_id)
    if not note:
        abort(404)
    version_data = {
        'id': version,
        'title': meta.get('Title', ''),
        'saved_at': datetime.strptime(version, '%Y%m%d_%H%M%S').strftime('%Y-%m-%d %H:%M:%S'),
        'content': body,
        'tags': [t.strip() for t in meta.get('Tags', '').split(',') if t.strip()]
    }
    all_notes = get_all_notes()
    content_html = parse_internal_links(escape_html(body), all_notes)
    return render_template('history_view.html', note=note, version=version_data, content_html=content_html)


@app.route('/note/<note_id>/history/<version>/restore', methods=['POST'])
def restore_version(note_id, version):
    version_path = HISTORY_DIR / note_id / f'{version}.txt'
    filepath = NOTES_DIR / f'{note_id}.txt'
    if not version_path.exists() or not filepath.exists():
        abort(404)
    old_meta, old_body = parse_note_file(filepath)
    old_tags = [t.strip() for t in old_meta.get('Tags', '').split(',') if t.strip()]
    save_history(note_id, old_meta, old_body)
    v_meta, v_body = parse_note_file(version_path)
    new_tags = [t.strip() for t in v_meta.get('Tags', '').split(',') if t.strip()]
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    meta = {
        'Title': v_meta.get('Title', ''),
        'Created': old_meta.get('Created', now),
        'Updated': now,
        'Tags': ', '.join(new_tags)
    }
    file_content = format_note_content(meta, v_body)
    filepath.write_text(file_content, encoding='utf-8')
    update_tags_index(note_id, old_tags, new_tags)
    flash('版本恢复成功！', 'success')
    return redirect(url_for('view_note', note_id=note_id))


@app.route('/tag/<tag_name>')
def filter_by_tag(tag_name):
    return redirect(url_for('index', tag=tag_name))


@app.route('/export/zip')
def export_zip():
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for filepath in NOTES_DIR.glob('*.txt'):
            zf.write(filepath, arcname=f'notes/{filepath.name}')
        if TAGS_FILE.exists():
            zf.write(TAGS_FILE, arcname='tags.json')
        for note_id_dir in HISTORY_DIR.iterdir():
            if note_id_dir.is_dir():
                for v_file in note_id_dir.glob('*.txt'):
                    zf.write(v_file, arcname=f'history/{note_id_dir.name}/{v_file.name}')
    zip_buffer.seek(0)
    filename = f'notes_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name=filename
    )


@app.route('/import/zip', methods=['POST'])
def import_zip():
    if 'zipfile' not in request.files:
        flash('请选择要上传的ZIP文件', 'error')
        return redirect(url_for('index'))
    file = request.files['zipfile']
    if file.filename == '':
        flash('未选择文件', 'error')
        return redirect(url_for('index'))
    try:
        with zipfile.ZipFile(file, 'r') as zf:
            for item in NOTES_DIR.glob('*.txt'):
                item.unlink()
            for item in HISTORY_DIR.iterdir():
                if item.is_dir():
                    shutil.rmtree(item)
            zf.extractall(BASE_DIR)
        if TAGS_FILE.exists():
            tags = load_json(TAGS_FILE)
            save_json(TAGS_FILE, tags)
        flash('笔记导入成功！', 'success')
    except Exception as e:
        flash(f'导入失败: {str(e)}', 'error')
    return redirect(url_for('index'))


@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8001)
