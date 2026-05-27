import json
import os
import uuid
import smtplib
import csv
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date, timedelta
from functools import wraps
from io import StringIO

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, make_response, flash

app = Flask(__name__)
app.secret_key = 'feedback-secret-key-2024'

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'feedback.json')

ADMIN_PASSWORD = 'admin123'
PAGE_SIZE = 10

SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '465'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_SENDER = os.environ.get('SMTP_SENDER', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '')
SMTP_USE_SSL = os.environ.get('SMTP_USE_SSL', 'true').lower() == 'true'

SENSITIVE_WORDS = [
    '脏话', '垃圾', '混蛋', '白痴', '废物', '去死', '滚蛋', '卑鄙', '无耻', '下流',
    '傻逼', '傻B', 'SB', 'sb', '草泥马', '操你妈', '妈的', '他妈的', '狗日的', '畜生',
    '王八蛋', '龟儿子', '兔崽子', '贱人', '婊子', '鸡巴', '阳痿', '早泄', '色情', '淫秽',
    '赌博', '毒品', '走私', '洗钱', '诈骗', '传销', '杀人', '放火', '抢劫', '强奸',
    '暴恐', '恐怖分子', '邪教', '反动', '推翻政府', '台独', '港独', '藏独', '疆独', '法轮功',
    '枪支', '弹药', '炸药', '军火', '假币', '发票', '办证', '刻章', '高利贷', '催收'
]

CATEGORY_OPTIONS = [
    {'value': 'suggestion', 'label': '建议'},
    {'value': 'complaint', 'label': '投诉'},
    {'value': 'inquiry', 'label': '咨询'},
]

STATUS_OPTIONS = ['未读', '已读', '已处理']


def load_data():
    if not os.path.exists(DATA_FILE):
        return {'feedbacks': [], 'next_id': 1}
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def check_sensitive_words(text):
    found = []
    for word in SENSITIVE_WORDS:
        if word in text:
            found.append(word)
    return found


def send_email(subject, body):
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_SENDER, ADMIN_EMAIL]):
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_SENDER
        msg['To'] = ADMIN_EMAIL
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        if SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
            server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_SENDER, [ADMIN_EMAIL], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f'邮件发送失败: {e}')
        return False


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return redirect(url_for('admin_login', next=request.path))
        return f(*args, **kwargs)
    return decorated_function


@app.route('/')
def index():
    return render_template('index.html', category_options=CATEGORY_OPTIONS)


@app.route('/submit', methods=['POST'])
def submit():
    nickname = request.form.get('nickname', '').strip()
    email = request.form.get('email', '').strip()
    content = request.form.get('content', '').strip()
    rating = request.form.get('rating', '3').strip()
    category = request.form.get('category', 'suggestion').strip()

    if not nickname or not content:
        flash('昵称和反馈内容为必填项', 'error')
        return redirect(url_for('index'))

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            rating = 3
    except ValueError:
        rating = 3

    found_words = check_sensitive_words(content)
    if found_words:
        flash(f'反馈内容包含敏感词: {", ".join(found_words)}，请修改后重新提交', 'error')
        return render_template('index.html',
            category_options=CATEGORY_OPTIONS,
            nickname=nickname, email=email, content=content,
            rating=rating, category=category)

    data = load_data()
    query_code = uuid.uuid4().hex[:8]
    feedback = {
        'id': data['next_id'],
        'nickname': nickname,
        'email': email,
        'content': content,
        'rating': rating,
        'category': category,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'query_code': query_code,
        'status': '未读'
    }
    data['feedbacks'].append(feedback)
    data['next_id'] += 1
    save_data(data)

    category_label = dict((o['value'], o['label']) for o in CATEGORY_OPTIONS).get(category, category)
    send_email(
        '用户反馈新通知',
        f'您收到了一条新的用户反馈：\n\n'
        f'昵称: {nickname}\n'
        f'邮箱: {email}\n'
        f'分类: {category_label}\n'
        f'评分: {rating} 星\n'
        f'内容: {content}\n'
        f'时间: {feedback["created_at"]}\n'
        f'查询码: {query_code}\n'
    )

    return render_template('success.html', query_code=query_code)


@app.route('/query', methods=['GET', 'POST'])
def query():
    feedback = None
    if request.method == 'POST':
        query_code = request.form.get('query_code', '').strip()
        if query_code:
            data = load_data()
            for fb in data['feedbacks']:
                if fb['query_code'] == query_code:
                    feedback = fb
                    break
            if not feedback:
                flash('未找到对应的反馈记录，请检查查询码是否正确', 'error')
    return render_template('query.html', feedback=feedback)


@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == ADMIN_PASSWORD:
            session['is_admin'] = True
            next_page = request.args.get('next', url_for('admin_dashboard'))
            return redirect(next_page)
        else:
            flash('密码错误', 'error')
    return render_template('admin_login.html')


@app.route('/admin/logout')
def admin_logout():
    session.pop('is_admin', None)
    return redirect(url_for('index'))


@app.route('/admin')
@login_required
def admin_dashboard():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '').strip()

    data = load_data()
    feedbacks = data['feedbacks']

    if search:
        feedbacks = [f for f in feedbacks
            if search.lower() in f['content'].lower() or search.lower() in f['nickname'].lower()]

    total_count = len(feedbacks)
    today_str = date.today().strftime('%Y-%m-%d')
    today_count = sum(1 for f in feedbacks if f['created_at'].startswith(today_str))

    total_pages = max(1, (total_count + PAGE_SIZE - 1) // PAGE_SIZE)
    page = max(1, min(page, total_pages))
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE
    page_feedbacks = feedbacks[start:end]

    return render_template('admin.html',
        feedbacks=page_feedbacks,
        total_count=total_count,
        today_count=today_count,
        page=page,
        total_pages=total_pages,
        search=search,
        category_options=CATEGORY_OPTIONS,
        status_options=STATUS_OPTIONS)


@app.route('/admin/delete/<int:fb_id>', methods=['POST'])
@login_required
def delete_feedback(fb_id):
    data = load_data()
    data['feedbacks'] = [f for f in data['feedbacks'] if f['id'] != fb_id]
    save_data(data)
    return redirect(url_for('admin_dashboard', page=request.args.get('page', 1), search=request.args.get('search', '')))


@app.route('/admin/clear', methods=['POST'])
@login_required
def clear_feedback():
    data = load_data()
    data['feedbacks'] = []
    save_data(data)
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/update_status/<int:fb_id>', methods=['POST'])
@login_required
def update_status(fb_id):
    status = request.form.get('status', '未读')
    if status not in STATUS_OPTIONS:
        status = '未读'
    data = load_data()
    for f in data['feedbacks']:
        if f['id'] == fb_id:
            f['status'] = status
            break
    save_data(data)
    return redirect(url_for('admin_dashboard', page=request.args.get('page', 1), search=request.args.get('search', '')))


@app.route('/admin/export')
@login_required
def export_csv():
    data = load_data()
    feedbacks = data['feedbacks']

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', '昵称', '邮箱', '分类', '评分', '内容', '提交时间', '查询码', '状态'])

    category_map = dict((o['value'], o['label']) for o in CATEGORY_OPTIONS)
    for fb in feedbacks:
        writer.writerow([
            fb['id'],
            fb['nickname'],
            fb['email'],
            category_map.get(fb['category'], fb['category']),
            f"{fb['rating']} 星",
            fb['content'],
            fb['created_at'],
            fb['query_code'],
            fb['status']
        ])

    csv_content = output.getvalue()
    output.close()

    filename = f'feedback_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    response = make_response(csv_content)
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@app.route('/admin/test/generate', methods=['POST'])
@login_required
def generate_test_data():
    count = request.args.get('count', 25, type=int)
    count = max(1, min(count, 200))
    data = load_data()
    nicknames = ['张三', '李四', '王五', '赵六', '陈七', '周八', '吴九', '郑十', '孙悟空', '猪八戒',
                 '沙和尚', '唐三藏', '贾宝玉', '林黛玉', '薛宝钗', '宋江', '武松', '林冲', '鲁智深', '吴用']
    contents = [
        '产品功能非常好用，希望能继续优化',
        '登录页面加载太慢了，希望能改进',
        '建议增加深色模式，晚上看更舒服',
        '付款时遇到问题，客服能及时解决',
        '移动端适配不太好，按钮太小',
        '搜索功能很好用，能快速找到需要的内容',
        '希望增加数据导出功能，方便备份',
        '界面设计很漂亮，用户体验不错',
        '建议增加消息推送功能',
        '整体使用很流畅，继续保持',
        '反馈问题后响应速度很快，点赞',
        '希望能支持更多第三方登录',
        '文档写得很详细，容易上手',
        '部分功能隐藏太深，不好找',
        '建议增加快捷键支持'
    ]
    categories = ['suggestion', 'complaint', 'inquiry']
    statuses = ['未读', '已读', '已处理']

    for i in range(count):
        days_ago = random.randint(0, 10)
        hours_ago = random.randint(0, 23)
        created = (datetime.now() - timedelta(days=days_ago, hours=hours_ago)).strftime('%Y-%m-%d %H:%M:%S')
        feedback = {
            'id': data['next_id'],
            'nickname': random.choice(nicknames),
            'email': f'test{data["next_id"]}@example.com',
            'content': random.choice(contents),
            'rating': random.randint(1, 5),
            'category': random.choice(categories),
            'created_at': created,
            'query_code': uuid.uuid4().hex[:8],
            'status': random.choice(statuses)
        }
        data['feedbacks'].append(feedback)
        data['next_id'] += 1
    save_data(data)
    flash(f'成功生成 {count} 条测试数据', 'error')
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/test/email')
@login_required
def test_email():
    result = send_email('SMTP配置测试邮件',
        '这是一封测试邮件，用于验证SMTP配置是否正确。\n\n如果您收到这封邮件，说明邮件通知功能配置成功。')
    if result:
        return jsonify({'status': 'success', 'message': '测试邮件已发送，请检查邮箱'})
    else:
        return jsonify({'status': 'error', 'message': '邮件发送失败，请检查SMTP配置'})


if __name__ == '__main__':
    if not os.path.exists(DATA_FILE):
        save_data({'feedbacks': [], 'next_id': 1})
    app.run(debug=True, host='0.0.0.0', port=5000)