#!/usr/bin/env python3
import json
import os
import csv
from datetime import datetime, timedelta
from io import StringIO
from flask import Flask, request, jsonify, send_file, make_response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)
CORS(app)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100 per minute"],
    storage_uri="memory://",
)

DATA_FILE = 'todos.json'
PAGE_SIZE = 10

def load_data():
    if not os.path.exists(DATA_FILE):
        return {'todos': [], 'next_id': 1}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {'todos': [], 'next_id': 1}

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def generate_recurring_todos():
    data = load_data()
    todos = data['todos']
    new_todos = []
    today = datetime.now().date()
    
    for todo in todos:
        if todo.get('recurrence') and not todo.get('recurrence_generated'):
            rec = todo['recurrence']
            if rec == 'daily':
                next_date = datetime.fromisoformat(todo['created_at']).date() + timedelta(days=1)
                while next_date <= today:
                    new_todo = create_recurring_todo(todo, next_date)
                    new_todos.append(new_todo)
                    next_date += timedelta(days=1)
            elif rec == 'weekly':
                next_date = datetime.fromisoformat(todo['created_at']).date() + timedelta(weeks=1)
                while next_date <= today:
                    new_todo = create_recurring_todo(todo, next_date)
                    new_todos.append(new_todo)
                    next_date += timedelta(weeks=1)
            todo['recurrence_generated'] = True
    
    if new_todos:
        for nt in new_todos:
            nt['id'] = data['next_id']
            data['next_id'] += 1
            todos.append(nt)
        save_data(data)

def create_recurring_todo(original, date):
    return {
        'title': original['title'],
        'description': original.get('description', ''),
        'completed': False,
        'priority': original.get('priority', 'medium'),
        'tags': original.get('tags', []),
        'due_date': original.get('due_date'),
        'recurrence': None,
        'recurrence_generated': False,
        'created_at': datetime.combine(date, datetime.min.time()).isoformat()
    }

@app.route('/api/todos', methods=['GET'])
def get_todos():
    generate_recurring_todos()
    data = load_data()
    todos = data['todos']
    
    priority = request.args.get('priority')
    if priority:
        todos = [t for t in todos if t.get('priority') == priority]
    
    completed = request.args.get('completed')
    if completed is not None:
        completed_bool = completed.lower() == 'true'
        todos = [t for t in todos if t.get('completed', False) == completed_bool]
    
    tag = request.args.get('tag')
    if tag:
        todos = [t for t in todos if tag in t.get('tags', [])]
    
    search = request.args.get('search')
    if search:
        todos = [t for t in todos if search.lower() in t['title'].lower()]
    
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    
    def sort_key(t):
        if sort_by == 'priority':
            p_order = {'high': 0, 'medium': 1, 'low': 2}
            return p_order.get(t.get('priority', 'medium'), 1)
        return t.get('created_at', '')
    
    todos.sort(key=sort_key, reverse=(sort_order == 'desc'))
    
    page = int(request.args.get('page', 1))
    total = len(todos)
    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE
    todos_page = todos[start:end]
    
    return jsonify({
        'todos': todos_page,
        'total': total,
        'page': page,
        'total_pages': total_pages,
        'page_size': PAGE_SIZE
    })

@app.route('/api/todos/<int:todo_id>', methods=['GET'])
def get_todo(todo_id):
    data = load_data()
    todo = next((t for t in data['todos'] if t['id'] == todo_id), None)
    if not todo:
        return jsonify({'error': '待办事项不存在'}), 404
    return jsonify(todo)

@app.route('/api/todos', methods=['POST'])
def create_todo():
    data = load_data()
    body = request.json
    
    todo = {
        'id': data['next_id'],
        'title': body.get('title', ''),
        'description': body.get('description', ''),
        'completed': body.get('completed', False),
        'priority': body.get('priority', 'medium'),
        'tags': body.get('tags', []),
        'due_date': body.get('due_date'),
        'recurrence': body.get('recurrence'),
        'recurrence_generated': False,
        'created_at': body.get('created_at', datetime.now().isoformat())
    }
    
    data['todos'].append(todo)
    data['next_id'] += 1
    save_data(data)
    
    return jsonify(todo), 201

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    data = load_data()
    todo = next((t for t in data['todos'] if t['id'] == todo_id), None)
    if not todo:
        return jsonify({'error': '待办事项不存在'}), 404
    
    body = request.json
    todo['title'] = body.get('title', todo['title'])
    todo['description'] = body.get('description', todo.get('description', ''))
    todo['priority'] = body.get('priority', todo.get('priority', 'medium'))
    todo['tags'] = body.get('tags', todo.get('tags', []))
    todo['due_date'] = body.get('due_date', todo.get('due_date'))
    todo['recurrence'] = body.get('recurrence', todo.get('recurrence'))
    
    if 'completed' in body:
        todo['completed'] = body['completed']
    
    save_data(data)
    return jsonify(todo)

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    data = load_data()
    todo = next((t for t in data['todos'] if t['id'] == todo_id), None)
    if not todo:
        return jsonify({'error': '待办事项不存在'}), 404
    
    data['todos'] = [t for t in data['todos'] if t['id'] != todo_id]
    save_data(data)
    return jsonify({'message': '删除成功'})

@app.route('/api/todos/completed', methods=['DELETE'])
def delete_completed():
    data = load_data()
    data['todos'] = [t for t in data['todos'] if not t.get('completed', False)]
    save_data(data)
    return jsonify({'message': '已清除所有已完成事项'})

@app.route('/api/todos/export', methods=['GET'])
def export_csv():
    data = load_data()
    todos = data['todos']
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', '标题', '描述', '是否完成', '优先级', '标签', '截止日期', '重复', '创建时间'])
    
    for todo in todos:
        writer.writerow([
            todo['id'],
            todo['title'],
            todo.get('description', ''),
            '是' if todo.get('completed', False) else '否',
            todo.get('priority', 'medium'),
            ','.join(todo.get('tags', [])),
            todo.get('due_date', ''),
            todo.get('recurrence', ''),
            todo.get('created_at', '')
        ])
    
    output.seek(0)
    response = make_response(output.getvalue())
    response.headers['Content-Disposition'] = 'attachment; filename=todos.csv'
    response.headers['Content-type'] = 'text/csv; charset=utf-8'
    return response

@app.route('/api/todos/import', methods=['POST'])
def import_csv():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    data = load_data()
    stream = StringIO(file.stream.read().decode('utf-8-sig'))
    reader = csv.DictReader(stream)
    
    imported = 0
    for row in reader:
        todo = {
            'id': data['next_id'],
            'title': row.get('标题', row.get('title', '')),
            'description': row.get('描述', row.get('description', '')),
            'completed': row.get('是否完成', row.get('completed', '')) == '是',
            'priority': row.get('优先级', row.get('priority', 'medium')),
            'tags': [t.strip() for t in row.get('标签', row.get('tags', '')).split(',') if t.strip()],
            'due_date': row.get('截止日期', row.get('due_date', '')) or None,
            'recurrence': row.get('重复', row.get('recurrence', '')) or None,
            'recurrence_generated': False,
            'created_at': row.get('创建时间', row.get('created_at', datetime.now().isoformat()))
        }
        data['todos'].append(todo)
        data['next_id'] += 1
        imported += 1
    
    save_data(data)
    return jsonify({'message': f'成功导入 {imported} 条事项', 'imported': imported})

@app.route('/')
def index():
    return send_file('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
