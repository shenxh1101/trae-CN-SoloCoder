import os
import json
import csv
import io
import time
import logging
from flask import Flask, render_template, request, redirect, url_for, jsonify, Response, send_file
from task_manager import TaskManager, Task
from scheduler import SchedulerManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'crawler-secret-key-change-in-production'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

task_manager = TaskManager()
scheduler_manager = SchedulerManager()
scheduler_manager.set_task_manager(task_manager)


@app.route('/')
def index():
    tasks = task_manager.get_all_tasks()
    return render_template('index.html', tasks=tasks)


@app.route('/new', methods=['GET', 'POST'])
def new_task():
    if request.method == 'POST':
        url = request.form.get('url', '').strip()
        max_depth = int(request.form.get('max_depth', 2))
        respect_robots = request.form.get('respect_robots') == 'on'
        crawl_interval = float(request.form.get('crawl_interval', 1.0))
        timeout = int(request.form.get('timeout', 30))
        allowed_domains_str = request.form.get('allowed_domains', '').strip()
        keywords_str = request.form.get('keywords', '').strip()
        save_html = request.form.get('save_html') == 'on'

        allowed_domains = [d.strip() for d in allowed_domains_str.split(',') if d.strip()] if allowed_domains_str else []
        keywords = [k.strip() for k in keywords_str.split(',') if k.strip()] if keywords_str else []

        if not url:
            return render_template('new_task.html', error='请输入目标URL')

        if max_depth < 1:
            max_depth = 1
        elif max_depth > 3:
            max_depth = 3

        config = {
            'url': url,
            'max_depth': max_depth,
            'respect_robots': respect_robots,
            'crawl_interval': crawl_interval,
            'timeout': timeout,
            'allowed_domains': allowed_domains,
            'keywords': keywords,
            'save_html': save_html,
        }

        task = task_manager.create_task(config)
        task_manager.start_task(task.task_id)

        return redirect(url_for('task_detail', task_id=task.task_id))

    return render_template('new_task.html')


@app.route('/tasks')
def task_list():
    tasks = task_manager.get_all_tasks()
    return render_template('task_list.html', tasks=tasks)


@app.route('/task/<task_id>')
def task_detail(task_id):
    task = task_manager.get_task(task_id)
    if not task:
        return render_template('404.html'), 404
    return render_template('task_detail.html', task=task)


@app.route('/task/<task_id>/pause', methods=['POST'])
def pause_task(task_id):
    success = task_manager.pause_task(task_id)
    return jsonify({'success': success, 'task_id': task_id})


@app.route('/task/<task_id>/resume', methods=['POST'])
def resume_task(task_id):
    success = task_manager.resume_task(task_id)
    return jsonify({'success': success, 'task_id': task_id})


@app.route('/task/<task_id>/cancel', methods=['POST'])
def cancel_task(task_id):
    success = task_manager.cancel_task(task_id)
    return jsonify({'success': success, 'task_id': task_id})


@app.route('/task/<task_id>/delete', methods=['POST'])
def delete_task(task_id):
    success = task_manager.delete_task(task_id)
    return jsonify({'success': success})


@app.route('/task/<task_id>/results')
def task_results(task_id):
    task = task_manager.get_task(task_id)
    if not task:
        return jsonify({'error': '任务不存在'}), 404
    results = task_manager.get_task_results(task_id)
    search_keyword = request.args.get('q', '').strip()
    if search_keyword:
        results = task_manager.search_results(task_id, search_keyword)
    return jsonify({
        'task': task.to_dict(),
        'results': results,
        'total': len(results),
    })


@app.route('/task/<task_id>/page/<int:page_index>')
def task_page_detail(task_id, page_index):
    task = task_manager.get_task(task_id)
    if not task:
        return render_template('404.html'), 404
    results = task_manager.get_task_results(task_id)
    if page_index < 0 or page_index >= len(results):
        return render_template('404.html'), 404
    return render_template('page_detail.html', task=task, page=results[page_index], page_index=page_index)


@app.route('/task/<task_id>/export/json')
def export_json(task_id):
    task = task_manager.get_task(task_id)
    if not task:
        return jsonify({'error': '任务不存在'}), 404
    results = task_manager.get_task_results(task_id)
    data = {
        'task': task.to_dict(),
        'results': results,
    }
    output = json.dumps(data, ensure_ascii=False, indent=2)
    return Response(
        output,
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename=crawl_{task_id}.json'}
    )


@app.route('/task/<task_id>/export/csv')
def export_csv(task_id):
    task = task_manager.get_task(task_id)
    if not task:
        return jsonify({'error': '任务不存在'}), 404
    results = task_manager.get_task_results(task_id)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['URL', '标题', '摘要', '状态码', '内容类型', '内容大小', '爬取时间'])
    for r in results:
        writer.writerow([
            r.get('url', ''),
            r.get('title', ''),
            r.get('summary', ''),
            r.get('status_code', ''),
            r.get('content_type', ''),
            r.get('content_length', ''),
            r.get('crawled_at', ''),
        ])
    csv_content = output.getvalue()
    output.close()

    return Response(
        csv_content,
        mimetype='text/csv; charset=utf-8-sig',
        headers={'Content-Disposition': f'attachment; filename=crawl_{task_id}.csv'}
    )


@app.route('/api/tasks')
def api_tasks():
    tasks = task_manager.get_all_tasks()
    return jsonify([t.to_dict() for t in tasks])


@app.route('/api/task/<task_id>/status')
def api_task_status(task_id):
    task = task_manager.get_task(task_id)
    if not task:
        return jsonify({'error': '任务不存在'}), 404
    return jsonify(task.to_dict())


@app.route('/schedules', methods=['GET'])
def schedules():
    all_schedules = scheduler_manager.get_schedules()
    return render_template('schedules.html', schedules=all_schedules)


@app.route('/schedules/new', methods=['GET', 'POST'])
def new_schedule():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        cron_expr = request.form.get('cron_expr', '').strip()
        url = request.form.get('url', '').strip()
        max_depth = int(request.form.get('max_depth', 2))
        respect_robots = request.form.get('respect_robots') == 'on'
        crawl_interval = float(request.form.get('crawl_interval', 1.0))
        timeout = int(request.form.get('timeout', 30))
        keywords_str = request.form.get('keywords', '').strip()
        save_html = request.form.get('save_html') == 'on'

        keywords = [k.strip() for k in keywords_str.split(',') if k.strip()] if keywords_str else []

        if not name or not cron_expr or not url:
            return render_template('new_schedule.html', error='请填写必填项')

        config = {
            'url': url,
            'max_depth': max_depth,
            'respect_robots': respect_robots,
            'crawl_interval': crawl_interval,
            'timeout': timeout,
            'keywords': keywords,
            'save_html': save_html,
        }

        try:
            scheduler_manager.add_schedule(name, cron_expr, config)
        except ValueError as e:
            return render_template('new_schedule.html', error=str(e))

        return redirect(url_for('schedules'))

    return render_template('new_schedule.html')


@app.route('/schedule/<schedule_id>/toggle', methods=['POST'])
def toggle_schedule(schedule_id):
    enabled = request.json.get('enabled', True) if request.is_json else True
    success = scheduler_manager.toggle_schedule(schedule_id, enabled)
    return jsonify({'success': success})


@app.route('/schedule/<schedule_id>/delete', methods=['POST'])
def delete_schedule(schedule_id):
    success = scheduler_manager.remove_schedule(schedule_id)
    return jsonify({'success': success})


@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
