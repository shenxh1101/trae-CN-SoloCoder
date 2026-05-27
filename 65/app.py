import os
import json
import uuid
import csv
import io
from urllib.parse import urlparse
from datetime import datetime

from flask import Flask, render_template, request, redirect, url_for, jsonify, Response, send_from_directory

from crawler import CrawlerTask

app = Flask(__name__)


@app.template_filter('datetimeformat')
def datetimeformat(value):
    try:
        return datetime.fromtimestamp(value).strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return str(value)


@app.template_filter('safe_filename')
def safe_filename(url):
    import re
    return re.sub(r"[^\w\-_.]", "_", url)[:100] + ".txt"

TASKS_FILE = "tasks.json"
tasks = {}


def load_tasks():
    if os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for task_data in data:
            task = CrawlerTask(
                task_id=task_data["task_id"],
                start_url=task_data["start_url"],
                max_depth=task_data.get("max_depth", 3),
                respect_robots=task_data.get("respect_robots", True),
                request_interval=task_data.get("request_interval", 1),
                allowed_domains=task_data.get("allowed_domains", []),
                keywords=task_data.get("keywords", [])
            )
            task.status = task_data.get("status", "pending")
            task.pages_crawled = task_data.get("pages_crawled", 0)
            task.links_found = task_data.get("links_found", 0)
            task.error_count = task_data.get("error_count", 0)
            task.start_time = task_data.get("start_time")
            task.end_time = task_data.get("end_time")
            tasks[task.task_id] = task


def save_tasks():
    data = [task.to_dict() for task in tasks.values()]
    with open(TASKS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_task_results(task_id):
    results_file = os.path.join("results", task_id, "results.json")
    if os.path.exists(results_file):
        with open(results_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


@app.route("/")
def index():
    task_list = sorted(tasks.values(), key=lambda t: t.start_time or 0, reverse=True)
    return render_template("index.html", tasks=task_list)


@app.route("/create", methods=["POST"])
def create_task():
    start_url = request.form.get("start_url", "").strip()
    max_depth = int(request.form.get("max_depth", 3))
    respect_robots = "respect_robots" in request.form
    request_interval = float(request.form.get("request_interval", 1))
    allowed_domains_raw = request.form.get("allowed_domains", "").strip()
    keywords_raw = request.form.get("keywords", "").strip()

    if not start_url:
        return redirect(url_for("index"))

    allowed_domains = []
    if allowed_domains_raw:
        allowed_domains = [d.strip() for d in allowed_domains_raw.split(",") if d.strip()]
    else:
        parsed = urlparse(start_url)
        if parsed.netloc:
            allowed_domains = [parsed.netloc]

    keywords = []
    if keywords_raw:
        keywords = [k.strip() for k in keywords_raw.split(",") if k.strip()]

    task_id = str(uuid.uuid4())[:8]
    task = CrawlerTask(
        task_id=task_id,
        start_url=start_url,
        max_depth=max_depth,
        respect_robots=respect_robots,
        request_interval=request_interval,
        allowed_domains=allowed_domains,
        keywords=keywords
    )
    tasks[task_id] = task
    save_tasks()
    task.start()

    return redirect(url_for("task_detail", task_id=task_id))


@app.route("/task/<task_id>")
def task_detail(task_id):
    task = tasks.get(task_id)
    if not task:
        return redirect(url_for("index"))

    results = load_task_results(task_id)
    pages = results.get("pages", []) if results else task.pages

    return render_template("task_detail.html", task=task, pages=pages)


@app.route("/api/progress/<task_id>")
def api_progress(task_id):
    task = tasks.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.get_progress())


@app.route("/task/<task_id>/pause")
def pause_task(task_id):
    task = tasks.get(task_id)
    if task:
        task.pause()
        save_tasks()
    return redirect(url_for("task_detail", task_id=task_id))


@app.route("/task/<task_id>/resume")
def resume_task(task_id):
    task = tasks.get(task_id)
    if task:
        task.resume()
        save_tasks()
    return redirect(url_for("task_detail", task_id=task_id))


@app.route("/task/<task_id>/cancel")
def cancel_task(task_id):
    task = tasks.get(task_id)
    if task:
        task.cancel()
        save_tasks()
    return redirect(url_for("task_detail", task_id=task_id))


@app.route("/task/<task_id>/export/csv")
def export_csv(task_id):
    results = load_task_results(task_id)
    if not results or not results.get("pages"):
        return "No results found", 404

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["URL", "Title", "Depth", "Status Code", "Crawled At", "Content Length", "Summary"])

    for page in results["pages"]:
        writer.writerow([
            page["url"],
            page["title"],
            page["depth"],
            page["status_code"],
            page["crawled_at"],
            page["content_length"],
            page["summary"].replace("\n", " ")
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=crawler_{task_id}.csv"}
    )


@app.route("/task/<task_id>/export/json")
def export_json(task_id):
    results = load_task_results(task_id)
    if not results:
        return "No results found", 404

    return Response(
        json.dumps(results, ensure_ascii=False, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename=crawler_{task_id}.json"}
    )


@app.route("/task/<task_id>/page/<int:page_index>")
def view_page(task_id, page_index):
    results = load_task_results(task_id)
    if not results or page_index >= len(results.get("pages", [])):
        return "Page not found", 404

    page = results["pages"][page_index]
    return render_template("page_detail.html", task_id=task_id, page=page, page_index=page_index)


@app.route("/task/<task_id>/download/<path:filename>")
def download_text(task_id, filename):
    directory = os.path.join("results", task_id)
    return send_from_directory(directory, filename, as_attachment=True)


if __name__ == "__main__":
    load_tasks()
    app.run(debug=True, host="0.0.0.0", port=5001)
