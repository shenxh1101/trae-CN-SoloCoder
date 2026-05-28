import os
import uuid
import json
import shutil
import zipfile
import re
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify, abort
from io import BytesIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NOTES_DIR = os.path.join(BASE_DIR, 'data', 'notes')
VERSIONS_DIR = os.path.join(BASE_DIR, 'data', 'versions')
TRASH_DIR = os.path.join(BASE_DIR, 'data', 'trash')
DRAFTS_DIR = os.path.join(BASE_DIR, 'data', 'drafts')

for directory in [NOTES_DIR, VERSIONS_DIR, TRASH_DIR, DRAFTS_DIR]:
    os.makedirs(directory, exist_ok=True)


def load_note(note_id, from_trash=False):
    notes_dir = TRASH_DIR if from_trash else NOTES_DIR
    note_path = os.path.join(notes_dir, f'{note_id}.json')
    if os.path.exists(note_path):
        with open(note_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def save_note(note_data, note_id=None):
    if note_id is None:
        note_id = str(uuid.uuid4())
    note_data['id'] = note_id
    note_path = os.path.join(NOTES_DIR, f'{note_id}.json')
    with open(note_path, 'w', encoding='utf-8') as f:
        json.dump(note_data, f, ensure_ascii=False, indent=2)
    return note_id


def get_all_notes(from_trash=False):
    notes_dir = TRASH_DIR if from_trash else NOTES_DIR
    notes = []
    for filename in os.listdir(notes_dir):
        if filename.endswith('.json'):
            note_id = filename[:-5]
            note = load_note(note_id, from_trash)
            if note:
                notes.append(note)
    return notes


def get_summary(content, length=100):
    text = re.sub(r'[#*`>\[\]()\-]', '', content)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:length] + '...' if len(text) > length else text


def filter_notes_by_tags(notes, tags):
    if not tags:
        return notes
    tag_set = set(tags)
    return [note for note in notes if tag_set.issubset(set(note.get('tags', [])))]


def search_notes(notes, query):
    if not query:
        return notes
    query = query.lower()
    return [note for note in notes 
            if query in note['title'].lower() 
            or query in note['content'].lower()
            or any(query in tag.lower() for tag in note.get('tags', []))]


def save_version(note_id, note_data):
    version_dir = os.path.join(VERSIONS_DIR, note_id)
    os.makedirs(version_dir, exist_ok=True)
    now = datetime.now()
    version_id = now.strftime('%Y%m%d_%H%M%S_') + str(now.microsecond)
    version_path = os.path.join(version_dir, f'{version_id}.json')
    with open(version_path, 'w', encoding='utf-8') as f:
        json.dump(note_data, f, ensure_ascii=False, indent=2)
    return version_id


def get_versions(note_id):
    version_dir = os.path.join(VERSIONS_DIR, note_id)
    if not os.path.exists(version_dir):
        return []
    versions = []
    for filename in sorted(os.listdir(version_dir), reverse=True):
        if filename.endswith('.json'):
            version_id = filename[:-5]
            version_path = os.path.join(version_dir, filename)
            with open(version_path, 'r', encoding='utf-8') as f:
                version_data = json.load(f)
                ts_part = version_id.split('_')
                dt_str = f"{ts_part[0][:4]}-{ts_part[0][4:6]}-{ts_part[0][6:8]} {ts_part[1][:2]}:{ts_part[1][2:4]}:{ts_part[1][4:6]}"
                versions.append({
                    'id': version_id,
                    'title': version_data['title'],
                    'created_at': dt_str
                })
    return versions


def load_version(note_id, version_id):
    version_path = os.path.join(VERSIONS_DIR, note_id, f'{version_id}.json')
    if os.path.exists(version_path):
        with open(version_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


@app.route('/')
def index():
    notes = get_all_notes()
    
    tags = request.args.getlist('tag')
    search_query = request.args.get('q', '')
    
    if tags:
        notes = filter_notes_by_tags(notes, tags)
    if search_query:
        notes = search_notes(notes, search_query)
    
    pinned_notes = [n for n in notes if n.get('pinned', False)]
    unpinned_notes = [n for n in notes if not n.get('pinned', False)]
    
    pinned_notes.sort(key=lambda x: x['created_at'], reverse=True)
    unpinned_notes.sort(key=lambda x: x['created_at'], reverse=True)
    
    sorted_notes = pinned_notes + unpinned_notes
    
    for note in sorted_notes:
        note['summary'] = get_summary(note['content'])
        note['created_at_formatted'] = datetime.fromisoformat(note['created_at']).strftime('%Y-%m-%d %H:%M')
    
    all_tags = set()
    for note in get_all_notes():
        all_tags.update(note.get('tags', []))
    
    return render_template('index.html', 
                         notes=sorted_notes, 
                         all_tags=sorted(all_tags),
                         selected_tags=tags,
                         search_query=search_query)


@app.route('/note/<note_id>')
def view_note(note_id):
    note = load_note(note_id)
    if not note:
        abort(404)
    note['created_at_formatted'] = datetime.fromisoformat(note['created_at']).strftime('%Y-%m-%d %H:%M')
    versions = get_versions(note_id)
    return render_template('note.html', note=note, versions=versions)


@app.route('/create', methods=['GET', 'POST'])
def create_note():
    if request.method == 'POST':
        title = request.form['title'].strip()
        content = request.form['content'].strip()
        tags_text = request.form.get('tags', '').strip()
        tags = [tag.strip() for tag in tags_text.split(',') if tag.strip()]
        
        if not title:
            title = '无标题笔记'
        
        note_data = {
            'title': title,
            'content': content,
            'tags': tags,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'pinned': False
        }
        
        note_id = save_note(note_data)
        return redirect(url_for('view_note', note_id=note_id))
    
    return render_template('edit.html', note=None)


@app.route('/edit/<note_id>', methods=['GET', 'POST'])
def edit_note(note_id):
    note = load_note(note_id)
    if not note:
        abort(404)
    
    if request.method == 'POST':
        save_version(note_id, note)
        
        note['title'] = request.form['title'].strip() or '无标题笔记'
        note['content'] = request.form['content'].strip()
        tags_text = request.form.get('tags', '').strip()
        note['tags'] = [tag.strip() for tag in tags_text.split(',') if tag.strip()]
        note['updated_at'] = datetime.now().isoformat()
        
        save_note(note, note_id)
        
        draft_path = os.path.join(DRAFTS_DIR, f'{note_id}.json')
        if os.path.exists(draft_path):
            os.remove(draft_path)
        
        return redirect(url_for('view_note', note_id=note_id))
    
    return render_template('edit.html', note=note)


@app.route('/autosave/<note_id>', methods=['POST'])
def autosave_draft(note_id):
    data = request.json
    draft_path = os.path.join(DRAFTS_DIR, f'{note_id}.json')
    with open(draft_path, 'w', encoding='utf-8') as f:
        json.dump({
            'title': data.get('title', ''),
            'content': data.get('content', ''),
            'tags': data.get('tags', []),
            'saved_at': datetime.now().isoformat()
        }, f, ensure_ascii=False)
    return jsonify({'status': 'ok', 'saved_at': datetime.now().isoformat()})


@app.route('/draft/<note_id>')
def get_draft(note_id):
    draft_path = os.path.join(DRAFTS_DIR, f'{note_id}.json')
    if os.path.exists(draft_path):
        with open(draft_path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify(None)


@app.route('/delete/<note_id>', methods=['POST'])
def delete_note(note_id):
    note = load_note(note_id)
    if not note:
        abort(404)
    
    src = os.path.join(NOTES_DIR, f'{note_id}.json')
    dst = os.path.join(TRASH_DIR, f'{note_id}.json')
    shutil.move(src, dst)
    
    return redirect(url_for('index'))


@app.route('/trash')
def trash():
    notes = get_all_notes(from_trash=True)
    notes.sort(key=lambda x: x['created_at'], reverse=True)
    for note in notes:
        note['summary'] = get_summary(note['content'])
        note['created_at_formatted'] = datetime.fromisoformat(note['created_at']).strftime('%Y-%m-%d %H:%M')
    return render_template('trash.html', notes=notes)


@app.route('/restore/<note_id>', methods=['POST'])
def restore_note(note_id):
    src = os.path.join(TRASH_DIR, f'{note_id}.json')
    dst = os.path.join(NOTES_DIR, f'{note_id}.json')
    if os.path.exists(src):
        shutil.move(src, dst)
    return redirect(url_for('trash'))


@app.route('/permanent-delete/<note_id>', methods=['POST'])
def permanent_delete_note(note_id):
    note_path = os.path.join(TRASH_DIR, f'{note_id}.json')
    if os.path.exists(note_path):
        os.remove(note_path)
    
    version_dir = os.path.join(VERSIONS_DIR, note_id)
    if os.path.exists(version_dir):
        shutil.rmtree(version_dir)
    
    return redirect(url_for('trash'))


@app.route('/pin/<note_id>', methods=['POST'])
def pin_note(note_id):
    note = load_note(note_id)
    if note:
        note['pinned'] = not note.get('pinned', False)
        save_note(note, note_id)
    return redirect(url_for('index'))


@app.route('/copy/<note_id>', methods=['POST'])
def copy_note(note_id):
    note = load_note(note_id)
    if not note:
        abort(404)
    
    new_note = {
        'title': note['title'] + ' (副本)',
        'content': note['content'],
        'tags': note.get('tags', []),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'pinned': False
    }
    
    new_id = save_note(new_note)
    return redirect(url_for('view_note', note_id=new_id))


@app.route('/export')
def export_notes():
    notes = get_all_notes()
    
    memory_file = BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for note in notes:
            safe_title = re.sub(r'[\\/*?:"<>|]', '', note['title'])
            filename = f"{safe_title[:50]}.md"
            content = f"# {note['title']}\n\n"
            if note.get('tags'):
                content += f"**标签**: {', '.join(note['tags'])}\n\n"
            content += f"**创建时间**: {datetime.fromisoformat(note['created_at']).strftime('%Y-%m-%d %H:%M:%S')}\n\n---\n\n"
            content += note['content']
            zf.writestr(filename, content.encode('utf-8'))
    
    memory_file.seek(0)
    return send_file(memory_file,
                     mimetype='application/zip',
                     as_attachment=True,
                     download_name=f'notes_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip')


@app.route('/import', methods=['GET', 'POST'])
def import_notes():
    if request.method == 'POST':
        if 'file' not in request.files:
            return redirect(request.url)
        
        files = request.files.getlist('file')
        for file in files:
            if file and file.filename.endswith('.md'):
                content = file.read().decode('utf-8')
                
                title_match = re.match(r'^#\s+(.+?)\n', content)
                if title_match:
                    title = title_match.group(1).strip()
                    body_start = content.find('\n', title_match.end())
                    body = content[body_start:].strip() if body_start != -1 else content
                else:
                    title = file.filename[:-3]
                    body = content
                
                tags_match = re.search(r'\*\*标签\*\*:\s*(.+?)\n', body)
                tags = []
                if tags_match:
                    tags_text = tags_match.group(1)
                    tags = [tag.strip() for tag in tags_text.split(',') if tag.strip()]
                    body = re.sub(r'\*\*标签\*\*:\s*.+?\n', '', body, count=1)
                
                body = re.sub(r'\*\*创建时间\*\*:\s*.+?\n', '', body)
                body = re.sub(r'^---\s*\n', '', body, flags=re.MULTILINE).strip()
                body = re.sub(r'\n{3,}', '\n\n', body).strip()
                
                note_data = {
                    'title': title,
                    'content': body,
                    'tags': tags,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                    'pinned': False
                }
                save_note(note_data)
        
        return redirect(url_for('index'))
    
    return render_template('import.html')


@app.route('/stats')
def stats():
    notes = get_all_notes()
    
    total_notes = len(notes)
    
    tag_count = {}
    for note in notes:
        for tag in note.get('tags', []):
            tag_count[tag] = tag_count.get(tag, 0) + 1
    
    sorted_tags = sorted(tag_count.items(), key=lambda x: x[1], reverse=True)
    
    calendar_data = {}
    for note in notes:
        date = datetime.fromisoformat(note['created_at']).strftime('%Y-%m-%d')
        calendar_data[date] = calendar_data.get(date, 0) + 1
    
    return render_template('stats.html',
                         total_notes=total_notes,
                         tag_count=len(tag_count),
                         top_tags=sorted_tags[:10],
                         calendar_data=json.dumps(calendar_data))


@app.route('/version/<note_id>/<version_id>')
def view_version(note_id, version_id):
    note = load_version(note_id, version_id)
    if not note:
        abort(404)
    return render_template('version.html', note=note, note_id=note_id, version_id=version_id)


@app.route('/restore-version/<note_id>/<version_id>', methods=['POST'])
def restore_version(note_id, version_id):
    current_note = load_note(note_id)
    version_note = load_version(note_id, version_id)
    
    if current_note and version_note:
        save_version(note_id, current_note)
        version_note['updated_at'] = datetime.now().isoformat()
        save_note(version_note, note_id)
    
    return redirect(url_for('view_note', note_id=note_id))


if __name__ == '__main__':
    app.run(debug=True, port=5000)
