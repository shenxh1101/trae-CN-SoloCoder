import json
import random
import uuid
import os
from collections import defaultdict
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, make_response

app = Flask(__name__)
app.secret_key = 'news_recommendation_secret_key_2026'

NEWS_FILE = 'news_database.json'

users = {}
ab_test_stats = {
    'simple': {'views': 0, 'clicks': 0},
    'weighted': {'views': 0, 'clicks': 0}
}

ALGORITHM_INFO = """
推荐算法说明：
本系统采用基于标签匹配的个性化推荐方案，而非TF-IDF算法。
原因：TF-IDF更适用于长文本内容分析，而本系统的新闻具有明确的类别标签和关键词标签，
直接使用标签匹配更高效且解释性更强。

两种推荐算法：
1. 简单匹配算法 (Simple Match)：
   - 基于类别和关键词的精确匹配
   - 类别匹配得分：1分
   - 每个关键词匹配得分：0.5分
   - 所有权重固定为1.0

2. 加权匹配算法 (Weighted Match)：
   - 基于用户反馈动态调整权重
   - 点赞：类别权重+0.5，关键词权重+0.3
   - 点踩：类别权重-0.3（最低0.1），关键词权重-0.2（最低0.1）
   - 权重越高，该类新闻推荐优先级越高
"""

def load_news():
    with open(NEWS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_news(news_list):
    with open(NEWS_FILE, 'w', encoding='utf-8') as f:
        json.dump(news_list, f, ensure_ascii=False, indent=2)

def get_all_categories(news_list):
    return sorted(list({news['category'] for news in news_list}))

def get_all_keywords(news_list):
    keywords = set()
    for news in news_list:
        keywords.update(news['keywords'])
    return sorted(list(keywords))

def simple_match_recommend(user_preferences, news_list, top_n=10):
    scores = []
    for news in news_list:
        score = 0
        reasons = []
        if news['category'] in user_preferences['categories']:
            score += 1
            reasons.append(f"您喜欢{news['category']}类新闻")
        matched_keywords = set(news['keywords']) & set(user_preferences['keywords'])
        if matched_keywords:
            score += len(matched_keywords) * 0.5
            reasons.append(f"包含您感兴趣的关键词：{', '.join(matched_keywords)}")
        scores.append((news, score, reasons))
    scores.sort(key=lambda x: x[1], reverse=True)
    return [(news, reasons) for news, score, reasons in scores[:top_n] if score > 0]

def weighted_match_recommend(user_preferences, news_list, top_n=10):
    category_weights = user_preferences.get('category_weights', {})
    keyword_weights = user_preferences.get('keyword_weights', {})
    scores = []
    for news in news_list:
        score = 0
        reasons = []
        if news['category'] in category_weights:
            weight = category_weights[news['category']]
            score += weight
            if weight > 1:
                reasons.append(f"您多次点赞{news['category']}类新闻")
            else:
                reasons.append(f"您喜欢{news['category']}类新闻")
        matched_keywords = set(news['keywords']) & set(keyword_weights.keys())
        for kw in matched_keywords:
            weight = keyword_weights[kw]
            score += weight * 0.5
            if weight > 1:
                reasons.append(f"您对关键词「{kw}」很感兴趣")
        scores.append((news, score, reasons))
    scores.sort(key=lambda x: x[1], reverse=True)
    return [(news, reasons) for news, score, reasons in scores[:top_n] if score > 0]

def get_news_statistics(news_list):
    category_counts = defaultdict(int)
    for news in news_list:
        category_counts[news['category']] += 1
    return dict(category_counts)

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('register'))
    user_id = session['user_id']
    if user_id not in users:
        session.pop('user_id', None)
        return redirect(url_for('register'))
    return redirect(url_for('recommend'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    news_list = load_news()
    categories = get_all_categories(news_list)
    keywords = get_all_keywords(news_list)
    if request.method == 'POST':
        selected_categories = request.form.getlist('categories')
        selected_keywords = request.form.getlist('keywords')
        if not selected_categories and not selected_keywords:
            return render_template('register.html', categories=categories, keywords=keywords, error='请至少选择一个类别或关键词')
        user_id = str(uuid.uuid4())
        ab_group = random.choice(['simple', 'weighted'])
        users[user_id] = {
            'preferences': {
                'categories': selected_categories,
                'keywords': selected_keywords,
                'category_weights': {cat: 1.0 for cat in selected_categories},
                'keyword_weights': {kw: 1.0 for kw in selected_keywords}
            },
            'ab_group': ab_group,
            'history': [],
            'created_at': datetime.now().isoformat()
        }
        session['user_id'] = user_id
        return redirect(url_for('recommend'))
    return render_template('register.html', categories=categories, keywords=keywords)

@app.route('/recommend')
def recommend():
    if 'user_id' not in session:
        return redirect(url_for('register'))
    user_id = session['user_id']
    user = users.get(user_id)
    if not user:
        session.pop('user_id', None)
        return redirect(url_for('register'))
    news_list = load_news()
    top_n = int(request.args.get('n', 10))
    ab_group = user['ab_group']
    ab_test_stats[ab_group]['views'] += 1
    if ab_group == 'simple':
        recommendations = simple_match_recommend(user['preferences'], news_list, top_n)
    else:
        recommendations = weighted_match_recommend(user['preferences'], news_list, top_n)
    return render_template('recommend.html', recommendations=recommendations, ab_group=ab_group)

@app.route('/feedback/<int:news_id>/<action>')
def feedback(news_id, action):
    if 'user_id' not in session:
        return redirect(url_for('register'))
    user_id = session['user_id']
    user = users.get(user_id)
    if not user:
        return redirect(url_for('register'))
    news_list = load_news()
    news = next((n for n in news_list if n['id'] == news_id), None)
    if not news:
        return redirect(url_for('recommend'))
    ab_group = user['ab_group']
    ab_test_stats[ab_group]['clicks'] += 1
    if action == 'like':
        user['preferences']['category_weights'][news['category']] = \
            user['preferences']['category_weights'].get(news['category'], 1.0) + 0.5
        for kw in news['keywords']:
            user['preferences']['keyword_weights'][kw] = \
                user['preferences']['keyword_weights'].get(kw, 1.0) + 0.3
        if news['category'] not in user['preferences']['categories']:
            user['preferences']['categories'].append(news['category'])
        user['history'].append({'news_id': news_id, 'action': 'like', 'time': datetime.now().isoformat()})
    elif action == 'dislike':
        user['preferences']['category_weights'][news['category']] = \
            max(0.1, user['preferences']['category_weights'].get(news['category'], 1.0) - 0.3)
        for kw in news['keywords']:
            user['preferences']['keyword_weights'][kw] = \
                max(0.1, user['preferences']['keyword_weights'].get(kw, 1.0) - 0.2)
        user['history'].append({'news_id': news_id, 'action': 'dislike', 'time': datetime.now().isoformat()})
    return redirect(url_for('recommend'))

@app.route('/admin')
def admin():
    news_list = load_news()
    stats = get_news_statistics(news_list)
    return render_template('admin.html', stats=stats, total_news=len(news_list))

@app.route('/admin/add_news', methods=['GET', 'POST'])
def add_news():
    if request.method == 'POST':
        try:
            news_data = json.loads(request.form['news_json'])
            news_list = load_news()
            if isinstance(news_data, list):
                for news in news_data:
                    news['id'] = max(n['id'] for n in news_list) + 1
                    news_list.append(news)
            else:
                news_data['id'] = max(n['id'] for n in news_list) + 1
                news_list.append(news_data)
            save_news(news_list)
            return redirect(url_for('admin'))
        except json.JSONDecodeError:
            return render_template('add_news.html', error='JSON格式错误')
    return render_template('add_news.html')

@app.route('/export_preferences')
def export_preferences():
    if 'user_id' not in session:
        return redirect(url_for('register'))
    user_id = session['user_id']
    user = users.get(user_id)
    if not user:
        return redirect(url_for('register'))
    preferences_data = {
        'preferences': user['preferences'],
        'ab_group': user['ab_group'],
        'export_time': datetime.now().isoformat()
    }
    response = make_response(json.dumps(preferences_data, ensure_ascii=False, indent=2))
    response.headers['Content-Type'] = 'application/json'
    response.headers['Content-Disposition'] = 'attachment; filename=preferences.json'
    return response

@app.route('/import_preferences', methods=['GET', 'POST'])
def import_preferences():
    if request.method == 'POST':
        if 'preferences_file' not in request.files:
            return render_template('import.html', error='请选择文件')
        file = request.files['preferences_file']
        if file.filename == '':
            return render_template('import.html', error='请选择文件')
        try:
            data = json.load(file)
            user_id = str(uuid.uuid4())
            users[user_id] = {
                'preferences': data['preferences'],
                'ab_group': data.get('ab_group', random.choice(['simple', 'weighted'])),
                'history': [],
                'created_at': datetime.now().isoformat(),
                'imported': True
            }
            session['user_id'] = user_id
            return redirect(url_for('recommend'))
        except json.JSONDecodeError:
            return render_template('import.html', error='JSON格式错误')
    return render_template('import.html')

@app.route('/ab_stats')
def ab_stats():
    simple_ctr = (ab_test_stats['simple']['clicks'] / ab_test_stats['simple']['views'] * 100) if ab_test_stats['simple']['views'] > 0 else 0
    weighted_ctr = (ab_test_stats['weighted']['clicks'] / ab_test_stats['weighted']['views'] * 100) if ab_test_stats['weighted']['views'] > 0 else 0
    return render_template('ab_stats.html', stats=ab_test_stats, simple_ctr=simple_ctr, weighted_ctr=weighted_ctr)

@app.route('/weekly_report')
def weekly_report():
    if 'user_id' not in session:
        return redirect(url_for('register'))
    user_id = session['user_id']
    user = users.get(user_id)
    if not user:
        return redirect(url_for('register'))
    news_list = load_news()
    ab_group = user['ab_group']
    if ab_group == 'simple':
        recommendations = simple_match_recommend(user['preferences'], news_list, 20)
    else:
        recommendations = weighted_match_recommend(user['preferences'], news_list, 20)
    week_start = datetime.now() - timedelta(days=datetime.now().weekday())
    week_end = week_start + timedelta(days=6)
    categorized_news = defaultdict(list)
    for news, reasons in recommendations:
        categorized_news[news['category']].append((news, reasons))
    return render_template('weekly_report.html', 
                          categorized_news=dict(categorized_news),
                          week_start=week_start.strftime('%Y年%m月%d日'),
                          week_end=week_end.strftime('%Y年%m月%d日'),
                          ab_group=ab_group)

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('register'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
