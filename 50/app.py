import io
import csv
import json
from flask import Flask, render_template, request, jsonify, make_response, redirect, url_for
from storage import storage

app = Flask(__name__)


def json_response(data=None, success=True, error=None, status=200):
    return make_response(jsonify({
        "success": success,
        "data": data,
        "error": error
    }), status)


@app.route('/')
def index():
    return redirect(url_for('todo_board', username='default'))


@app.route('/todo/<username>')
def todo_board(username):
    return render_template('index.html', username=username)


@app.route('/api/tasks/<username>', methods=['GET'])
def get_tasks(username):
    tasks = storage.get_all_tasks(username)
    return json_response({"tasks": tasks})


@app.route('/api/tasks/<username>', methods=['POST'])
def create_task(username):
    data = request.get_json() or {}
    if not data.get('title'):
        return json_response(error="任务标题不能为空", status=400)
    
    task = storage.create_task(username, data)
    return json_response({"task": task}, status=201)


@app.route('/api/tasks/<username>/<task_id>', methods=['PUT'])
def update_task(username, task_id):
    data = request.get_json() or {}
    task = storage.update_task(username, task_id, data)
    if not task:
        return json_response(error="任务不存在", status=404)
    return json_response({"task": task})


@app.route('/api/tasks/<username>/<task_id>/status', methods=['PATCH'])
def update_task_status(username, task_id):
    data = request.get_json() or {}
    status = data.get('status')
    if status not in ['todo', 'in_progress', 'completed']:
        return json_response(error="无效的状态值", status=400)
    
    task = storage.update_task_status(username, task_id, status)
    if not task:
        return json_response(error="任务不存在", status=404)
    return json_response({"task": task})


@app.route('/api/tasks/<username>/<task_id>', methods=['DELETE'])
def delete_task(username, task_id):
    if storage.delete_task(username, task_id):
        return json_response({"deleted": True})
    return json_response(error="任务不存在", status=404)


@app.route('/api/stats/<username>', methods=['GET'])
def get_stats(username):
    stats = storage.get_stats(username)
    return json_response({"stats": stats})


@app.route('/api/export/csv/<username>', methods=['GET'])
def export_csv(username):
    tasks = storage.get_all_tasks(username)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['标题', '描述', '状态', '优先级', '截止日期', '创建时间', '完成时间'])
    
    for task in tasks:
        writer.writerow([
            task['title'],
            task['description'],
            task['status'],
            task['priority'],
            task.get('due_date') or '',
            task.get('created_at') or '',
            task.get('completed_at') or ''
        ])
    
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = f'attachment; filename="{username}_tasks.csv"'
    return response


@app.route('/api/import/csv/<username>', methods=['POST'])
def import_csv(username):
    if 'file' not in request.files:
        return json_response(error="未上传文件", status=400)
    
    file = request.files['file']
    if file.filename == '':
        return json_response(error="未选择文件", status=400)
    
    on_duplicate = request.form.get('on_duplicate', 'skip')
    
    try:
        stream = io.TextIOWrapper(file.stream, encoding='utf-8')
        reader = csv.reader(stream)
        rows = list(reader)
        if rows and rows[0][0] in ['标题', 'title', 'Title']:
            rows = rows[1:]
        
        result = storage.import_csv(username, rows, on_duplicate)
        return json_response(result)
    except Exception as e:
        return json_response(error=f"导入失败: {str(e)}", status=500)


@app.route('/api/backup/json/<username>', methods=['GET'])
def backup_json(username):
    data = storage.export_json(username)
    response = make_response(json.dumps(data, ensure_ascii=False, indent=2))
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    response.headers['Content-Disposition'] = f'attachment; filename="{username}_backup.json"'
    return response


@app.route('/api/restore/json/<username>', methods=['POST'])
def restore_json(username):
    if 'file' not in request.files:
        return json_response(error="未上传文件", status=400)
    
    file = request.files['file']
    if file.filename == '':
        return json_response(error="未选择文件", status=400)
    
    try:
        data = json.load(file.stream)
        count = storage.restore_json(username, data)
        return json_response({"restored": count})
    except Exception as e:
        return json_response(error=f"恢复失败: {str(e)}", status=500)


@app.errorhandler(404)
def not_found(e):
    return json_response(error="接口不存在", status=404)


@app.errorhandler(500)
def server_error(e):
    return json_response(error="服务器内部错误", status=500)


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5001)
