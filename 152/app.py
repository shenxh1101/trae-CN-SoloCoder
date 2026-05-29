#!/usr/bin/env python3

import os
import re
import json
import uuid
import csv
import io
import time
import smtplib
import secrets
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from flask import Flask, render_template, request, redirect, url_for, session, Response, send_file, flash, get_flashed_messages
from werkzeug.utils import secure_filename
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
TEMPLATES_PATH = os.path.join(BASE_DIR, "templates.json")
LOGS_PATH = os.path.join(BASE_DIR, "logs.json")

os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

CAPTCHA_EXPIRE_SECONDS = 300

batch_tasks = {}


def load_config():
    if not os.path.exists(CONFIG_PATH):
        default = {"smtp_accounts": [], "signature": ""}
        save_config(default)
        return default
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_config(config):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def load_templates():
    if not os.path.exists(TEMPLATES_PATH):
        save_templates([])
        return []
    with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_templates(templates):
    with open(TEMPLATES_PATH, "w", encoding="utf-8") as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)


def load_logs():
    if not os.path.exists(LOGS_PATH):
        save_logs([])
        return []
    with open(LOGS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_logs(logs):
    with open(LOGS_PATH, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)


def replace_variables(text, row_dict, row_num):
    missing = []
    pattern = r"\{\{\s*([^{}]+?)\s*\}\}"
    matches = re.findall(pattern, text)
    for var in matches:
        var_stripped = var.strip()
        if var_stripped not in row_dict or row_dict[var_stripped] is None or str(row_dict[var_stripped]).strip() == "":
            missing.append(var_stripped)
        else:
            text = text.replace("{{" + var + "}}", str(row_dict[var_stripped]))
    return text, missing


def send_email(smtp_config, recipient, subject, content, is_html, attachments, signature):
    msg = MIMEMultipart()
    msg["From"] = smtp_config["username"]
    msg["To"] = recipient
    msg["Subject"] = subject

    full_content = content
    if signature:
        full_content = content + "\n\n" + signature

    if is_html:
        msg.attach(MIMEText(full_content, "html", "utf-8"))
    else:
        msg.attach(MIMEText(full_content, "plain", "utf-8"))

    for filepath in attachments:
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                filename = os.path.basename(filepath)
                part.add_header("Content-Disposition", f"attachment; filename={filename}")
                msg.attach(part)

    server = None
    try:
        if smtp_config.get("use_tls", True):
            if smtp_config["port"] == 465:
                server = smtplib.SMTP_SSL(smtp_config["host"], smtp_config["port"], timeout=30)
            else:
                server = smtplib.SMTP(smtp_config["host"], smtp_config["port"], timeout=30)
                server.starttls()
        else:
            server = smtplib.SMTP(smtp_config["host"], smtp_config["port"], timeout=30)

        server.login(smtp_config["username"], smtp_config["password"])
        server.sendmail(smtp_config["username"], recipient, msg.as_string())
        server.quit()
        return True, None
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"SMTP认证失败：请检查用户名和密码是否正确。错误代码：{e.smtp_code}"
        return False, error_msg
    except smtplib.SMTPConnectError as e:
        error_msg = f"SMTP连接失败：无法连接到 {smtp_config['host']}:{smtp_config['port']}，请检查服务器地址、端口和网络连接。错误：{str(e)}"
        return False, error_msg
    except smtplib.SMTPException as e:
        error_msg = f"SMTP发送失败：{str(e)}"
        return False, error_msg
    except TimeoutError:
        error_msg = f"连接超时：无法在30秒内连接到SMTP服务器 {smtp_config['host']}:{smtp_config['port']}，请检查端口是否被防火墙拦截"
        return False, error_msg
    except Exception as e:
        error_type = type(e).__name__
        error_msg = f"发送失败（{error_type}）：{str(e)}"
        return False, error_msg


def verify_captcha(answer):
    stored_answer = session.get("captcha_answer", "")
    stored_time = session.get("captcha_timestamp", 0)
    current_time = time.time()

    if not stored_answer:
        return False

    if current_time - stored_time > CAPTCHA_EXPIRE_SECONDS:
        session.pop("captcha_answer", None)
        session.pop("captcha_timestamp", None)
        return False

    if answer.strip() == stored_answer:
        session.pop("captcha_answer", None)
        session.pop("captcha_timestamp", None)
        return True

    return False


def generate_captcha():
    import random
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    answer = str(a + b)
    text = f"{a}+{b}=?"

    width, height = 120, 40
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
    except Exception:
        font = ImageFont.load_default()

    draw.text((10, 5), text, fill=(0, 0, 0), font=font)

    for _ in range(50):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        draw.point((x1, y1), fill=(random.randint(0, 200), random.randint(0, 200), random.randint(0, 200)))

    for _ in range(3):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        x2 = random.randint(0, width)
        y2 = random.randint(0, height)
        draw.line((x1, y1, x2, y2), fill=(random.randint(0, 200), random.randint(0, 200), random.randint(0, 200)), width=1)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    image_bytes = buf.getvalue()
    buf.close()

    return image_bytes, answer


def cleanup_attachments(attachments):
    for filepath in attachments:
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception:
            pass


def get_smtp_account(config, account_id):
    for acc in config.get("smtp_accounts", []):
        if acc["id"] == account_id:
            return acc
    for acc in config.get("smtp_accounts", []):
        if acc.get("is_default"):
            return acc
    if config.get("smtp_accounts"):
        return config["smtp_accounts"][0]
    return None


@app.route("/")
def index():
    config = load_config()
    templates = load_templates()
    template_id = request.args.get("template_id", "")
    selected_template = None
    if template_id:
        for t in templates:
            if t["id"] == template_id:
                selected_template = t
                break
    messages = get_flashed_messages(with_categories=True)
    return render_template("index.html", smtp_accounts=config.get("smtp_accounts", []), signature=config.get("signature", ""), templates=templates, selected_template=selected_template, messages=messages)


@app.route("/send", methods=["POST"])
def send():
    captcha_answer = request.form.get("captcha_answer", "").strip()
    if not verify_captcha(captcha_answer):
        flash("验证码错误或已过期，请重新输入", "error")
        return redirect(url_for("index"))

    config = load_config()
    recipient = request.form.get("recipient", "")
    subject = request.form.get("subject", "")
    content = request.form.get("content", "")
    is_html = request.form.get("is_html") == "on"
    smtp_account_id = request.form.get("smtp_account", "")
    delay = float(request.form.get("delay", 0))
    signature = config.get("signature", "")

    smtp_config = get_smtp_account(config, smtp_account_id)
    if not smtp_config:
        flash("请先配置SMTP账户", "error")
        return redirect(url_for("index"))

    attachments = []
    files = request.files.getlist("attachments")
    for f in files:
        if f and f.filename:
            filename = secure_filename(f.filename)
            filepath = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}_{filename}")
            f.save(filepath)
            attachments.append(filepath)

    csv_file = request.files.get("csv_file")
    if csv_file and csv_file.filename:
        csv_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}_{secure_filename(csv_file.filename)}")
        csv_file.save(csv_path)

        rows = []
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames or []
            for row in reader:
                rows.append(row)

        try:
            os.remove(csv_path)
        except Exception:
            pass

        if not rows:
            flash("CSV文件为空或格式错误", "error")
            return redirect(url_for("index"))

        pattern = r"\{\{\s*([^{}]+?)\s*\}\}"
        vars_in_subject = set(m.strip() for m in re.findall(pattern, subject))
        vars_in_content = set(m.strip() for m in re.findall(pattern, content))
        all_vars = vars_in_subject.union(vars_in_content)

        missing_cols = []
        for var in all_vars:
            if var not in fieldnames and var not in ["email", "Email", "recipient"]:
                missing_cols.append(var)

        if missing_cols:
            flash(f"CSV缺少以下列：{', '.join(missing_cols)}，请检查CSV文件", "error")
            return redirect(url_for("index"))

        task_id = uuid.uuid4().hex
        batch_tasks[task_id] = {
            "total": len(rows),
            "sent": 0,
            "success": 0,
            "failed": 0,
            "results": [],
            "running": True,
            "fieldnames": fieldnames
        }

        import threading

        def batch_send():
            missing_warnings = []
            for i, row in enumerate(rows):
                row_recipient = row.get("email", row.get("Email", row.get("recipient", recipient)))
                row_subject, missing_subject = replace_variables(subject, row, i + 1)
                row_content, missing_content = replace_variables(content, row, i + 1)

                all_missing = missing_subject + missing_content
                if all_missing:
                    missing_warnings.append(f"第{i+1}行缺少变量：{', '.join(set(all_missing))}")

                success, error = send_email(smtp_config, row_recipient, row_subject, row_content, is_html, attachments, signature)

                log_entry = {
                    "id": str(uuid.uuid4()),
                    "recipient": row_recipient,
                    "subject": row_subject,
                    "status": "success" if success else "failed",
                    "error": error,
                    "sent_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "smtp_account": smtp_config.get("name", smtp_config["username"])
                }
                logs = load_logs()
                logs.append(log_entry)
                save_logs(logs)

                batch_tasks[task_id]["sent"] = i + 1
                if success:
                    batch_tasks[task_id]["success"] += 1
                else:
                    batch_tasks[task_id]["failed"] += 1
                batch_tasks[task_id]["results"].append(log_entry)

                if i < len(rows) - 1 and delay > 0:
                    time.sleep(delay)

            batch_tasks[task_id]["running"] = False
            batch_tasks[task_id]["missing_warnings"] = missing_warnings
            cleanup_attachments(attachments)

        thread = threading.Thread(target=batch_send)
        thread.daemon = True
        thread.start()

        return render_template("batch_progress.html", task_id=task_id)

    success, error = send_email(smtp_config, recipient, subject, content, is_html, attachments, signature)

    log_entry = {
        "id": str(uuid.uuid4()),
        "recipient": recipient,
        "subject": subject,
        "status": "success" if success else "failed",
        "error": error,
        "sent_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "smtp_account": smtp_config.get("name", smtp_config["username"])
    }
    logs = load_logs()
    logs.append(log_entry)
    save_logs(logs)

    cleanup_attachments(attachments)

    if success:
        flash("邮件发送成功", "success")
    else:
        flash(f"邮件发送失败：{error}", "error")

    return redirect(url_for("index"))


@app.route("/send/batch-progress")
def batch_progress():
    task_id = request.args.get("task_id", "")

    def generate():
        while True:
            task = batch_tasks.get(task_id)
            if not task:
                yield f"data: {json.dumps({'error': 'task not found'})}\n\n"
                break

            data = {
                "total": task["total"],
                "sent": task["sent"],
                "success": task["success"],
                "failed": task["failed"],
                "running": task["running"],
                "missing_warnings": task.get("missing_warnings", [])
            }
            yield f"data: {json.dumps(data)}\n\n"

            if not task["running"]:
                if task_id in batch_tasks:
                    del batch_tasks[task_id]
                break

            time.sleep(0.5)

    return Response(generate(), mimetype="text/event-stream")


@app.route("/templates")
def templates_page():
    templates = load_templates()
    return render_template("templates.html", templates=templates)


@app.route("/templates/save", methods=["POST"])
def save_template():
    templates = load_templates()
    template_id = request.form.get("id", "")
    name = request.form.get("name", "")
    subject = request.form.get("subject", "")
    content = request.form.get("content", "")

    if template_id:
        for t in templates:
            if t["id"] == template_id:
                t["name"] = name
                t["subject"] = subject
                t["content"] = content
                break
    else:
        templates.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "subject": subject,
            "content": content,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    save_templates(templates)
    return redirect(url_for("templates_page"))


@app.route("/templates/delete/<id>", methods=["POST"])
def delete_template(id):
    templates = load_templates()
    templates = [t for t in templates if t["id"] != id]
    save_templates(templates)
    return redirect(url_for("templates_page"))


@app.route("/logs")
def logs_page():
    status_filter = request.args.get("status", "")
    logs = load_logs()
    if status_filter:
        logs = [l for l in logs if l.get("status") == status_filter]
    logs.reverse()
    return render_template("logs.html", logs=logs, status_filter=status_filter)


@app.route("/logs/export-failed")
def export_failed_logs():
    logs = load_logs()
    failed = [l for l in logs if l.get("status") == "failed"]

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["recipient", "subject", "status", "error", "sent_at", "smtp_account"])
    for l in failed:
        writer.writerow([l.get("recipient", ""), l.get("subject", ""), l.get("status", ""), l.get("error", ""), l.get("sent_at", ""), l.get("smtp_account", "")])

    buf.seek(0)
    output = io.BytesIO()
    output.write(buf.getvalue().encode("utf-8-sig"))
    output.seek(0)
    buf.close()

    return send_file(output, mimetype="text/csv", as_attachment=True, download_name="failed_logs.csv")


@app.route("/settings")
def settings_page():
    config = load_config()
    messages = get_flashed_messages(with_categories=True)
    return render_template("settings.html", smtp_accounts=config.get("smtp_accounts", []), signature=config.get("signature", ""), messages=messages)


@app.route("/settings/smtp", methods=["POST"])
def save_smtp():
    config = load_config()
    account_id = request.form.get("id", "")
    name = request.form.get("name", "")
    host = request.form.get("host", "")
    port = int(request.form.get("port", 587))
    username = request.form.get("username", "")
    password = request.form.get("password", "")
    use_tls = request.form.get("use_tls") == "on"
    is_default = request.form.get("is_default") == "on"

    accounts = config.get("smtp_accounts", [])

    if is_default:
        for acc in accounts:
            acc["is_default"] = False

    if account_id:
        for acc in accounts:
            if acc["id"] == account_id:
                acc["name"] = name
                acc["host"] = host
                acc["port"] = port
                acc["username"] = username
                if password:
                    acc["password"] = password
                acc["use_tls"] = use_tls
                acc["is_default"] = is_default
                break
    else:
        accounts.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "host": host,
            "port": port,
            "username": username,
            "password": password,
            "use_tls": use_tls,
            "is_default": is_default
        })

    config["smtp_accounts"] = accounts
    save_config(config)
    return redirect(url_for("settings_page"))


@app.route("/settings/smtp/delete/<id>", methods=["POST"])
def delete_smtp(id):
    config = load_config()
    config["smtp_accounts"] = [acc for acc in config.get("smtp_accounts", []) if acc["id"] != id]
    save_config(config)
    return redirect(url_for("settings_page"))


@app.route("/settings/signature", methods=["POST"])
def save_signature():
    config = load_config()
    config["signature"] = request.form.get("signature", "")
    save_config(config)
    return redirect(url_for("settings_page"))


@app.route("/settings/test-send", methods=["POST"])
def test_send():
    config = load_config()
    smtp_account_id = request.form.get("smtp_account", "")
    smtp_config = get_smtp_account(config, smtp_account_id)

    if not smtp_config:
        flash("请选择SMTP账户", "error")
        return redirect(url_for("settings_page"))

    success, error = send_email(
        smtp_config,
        smtp_config["username"],
        "测试邮件 - MailSender",
        "这是一封测试邮件，如果您收到此邮件，说明SMTP配置正确。",
        False,
        [],
        ""
    )

    log_entry = {
        "id": str(uuid.uuid4()),
        "recipient": smtp_config["username"],
        "subject": "测试邮件 - MailSender",
        "status": "success" if success else "failed",
        "error": error,
        "sent_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "smtp_account": smtp_config.get("name", smtp_config["username"])
    }
    logs = load_logs()
    logs.append(log_entry)
    save_logs(logs)

    if success:
        flash("测试邮件发送成功！配置正确。", "success")
    else:
        flash(f"测试邮件发送失败：{error}", "error")

    return redirect(url_for("settings_page"))


@app.route("/captcha")
def captcha():
    image_bytes, answer = generate_captcha()
    session["captcha_answer"] = answer
    session["captcha_timestamp"] = time.time()
    return Response(image_bytes, mimetype="image/png")


if __name__ == "__main__":
    app.run(debug=True)
