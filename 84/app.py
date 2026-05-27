import os
import json
import io
import base64
import hashlib
import re
from datetime import datetime, timedelta
from collections import Counter

import feedparser
import requests
import qrcode
from flask import Flask, render_template, request, jsonify, send_file, Response
from apscheduler.schedulers.background import BackgroundScheduler
from bs4 import BeautifulSoup
from dateutil import parser as date_parser

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
FEEDS_FILE = os.path.join(DATA_DIR, 'feeds.json')
CACHE_FILE = os.path.join(DATA_DIR, 'cache.json')
FAVORITES_FILE = os.path.join(DATA_DIR, 'favorites.json')

for f in [FEEDS_FILE, CACHE_FILE, FAVORITES_FILE]:
    if not os.path.exists(f):
        with open(f, 'w') as fp:
            json.dump([] if 'feeds' in f else {}, fp)

POSITIVE_WORDS = {
    '好', '棒', '优秀', '成功', '增长', '突破', '创新', '领先', '提升', '改善',
    'happy', 'great', 'excellent', 'success', 'growth', 'breakthrough', 'innovation',
    'good', 'best', 'positive', 'win', 'boost', 'surge', 'record', 'amazing'
}
NEGATIVE_WORDS = {
    '差', '糟', '失败', '下降', '危机', '问题', '风险', '警告', '损失', '衰退',
    'bad', 'terrible', 'fail', 'decline', 'crisis', 'problem', 'risk', 'warn',
    'loss', 'recession', 'negative', 'worst', 'crash', 'drop', 'fall', 'poor'
}


def load_feeds():
    with open(FEEDS_FILE, 'r') as f:
        return json.load(f)


def save_feeds(feeds):
    with open(FEEDS_FILE, 'w') as f:
        json.dump(feeds, f, ensure_ascii=False, indent=2)


def load_cache():
    try:
        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_cache(cache):
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def load_favorites():
    try:
        with open(FAVORITES_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_favorites(favs):
    with open(FAVORITES_FILE, 'w') as f:
        json.dump(favs, f, ensure_ascii=False, indent=2)


def article_id(link):
    return hashlib.md5(link.encode('utf-8')).hexdigest()


def parse_date(entry):
    for date_field in ['published_parsed', 'updated_parsed', 'created_parsed']:
        parsed = entry.get(date_field)
        if parsed:
            try:
                return datetime(*parsed[:6])
            except (TypeError, ValueError):
                pass
    for date_field in ['published', 'updated', 'created']:
        date_str = entry.get(date_field)
        if date_str:
            try:
                return date_parser.parse(date_str)
            except (ValueError, TypeError):
                pass
    return datetime.now()


def clean_summary(summary):
    if not summary:
        return ''
    soup = BeautifulSoup(summary, 'html.parser')
    text = soup.get_text(separator=' ', strip=True)
    text = re.sub(r'\s+', ' ', text)
    return text[:300] + '...' if len(text) > 300 else text


def analyze_sentiment(text):
    if not text:
        return 'neutral'
    text_lower = text.lower()
    pos_count = sum(1 for w in POSITIVE_WORDS if w in text_lower)
    neg_count = sum(1 for w in NEGATIVE_WORDS if w in text_lower)
    if pos_count > neg_count:
        return 'positive'
    elif neg_count > pos_count:
        return 'negative'
    return 'neutral'


def fetch_feed(feed_url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (NewsAggregator/1.0)'}
        resp = requests.get(feed_url, timeout=15, headers=headers)
        resp.raise_for_status()
        return feedparser.parse(resp.content)
    except Exception as e:
        print(f"Error fetching {feed_url}: {e}")
        return None


def fetch_all_feeds():
    feeds = load_feeds()
    cache = load_cache()
    now = datetime.now()

    for feed_info in feeds:
        url = feed_info['url']
        parsed = fetch_feed(url)
        if not parsed or not parsed.entries:
            feed_info['last_update'] = now.strftime('%Y-%m-%d %H:%M:%S')
            feed_info['article_count'] = 0
            continue

        articles = []
        for entry in parsed.entries[:50]:
            link = entry.get('link', '')
            if not link:
                continue
            pub_date = parse_date(entry)
            title = entry.get('title', '无标题')
            summary = clean_summary(entry.get('summary', entry.get('description', '')))
            sentiment = analyze_sentiment(title)

            articles.append({
                'id': article_id(link),
                'title': title,
                'link': link,
                'source': feed_info.get('name', parsed.feed.get('title', 'Unknown')),
                'source_url': url,
                'published': pub_date.strftime('%Y-%m-%d %H:%M:%S'),
                'published_ts': pub_date.timestamp(),
                'summary': summary,
                'sentiment': sentiment,
            })

        articles.sort(key=lambda x: x['published_ts'], reverse=True)
        cache[url] = articles
        feed_info['last_update'] = now.strftime('%Y-%m-%d %H:%M:%S')
        feed_info['article_count'] = len(articles)

    save_cache(cache)
    save_feeds(feeds)
    return feeds, cache


def get_all_articles():
    cache = load_cache()
    all_articles = []
    for url, articles in cache.items():
        all_articles.extend(articles)
    all_articles.sort(key=lambda x: x['published_ts'], reverse=True)
    return all_articles


def filter_articles(articles, keyword=None, days=None):
    if keyword:
        keyword_lower = keyword.lower()
        articles = [a for a in articles if keyword_lower in a['title'].lower()
                    or keyword_lower in a.get('summary', '').lower()]
    if days and days > 0:
        cutoff = datetime.now().timestamp() - (days * 86400)
        articles = [a for a in articles if a['published_ts'] >= cutoff]
    return articles


def generate_daily_report():
    articles = get_all_articles()
    if not articles:
        return None
    cutoff = datetime.now().timestamp() - 86400
    recent = [a for a in articles if a['published_ts'] >= cutoff]
    recent.sort(key=lambda x: x['published_ts'], reverse=True)
    top5 = recent[:5] if len(recent) >= 5 else recent[:len(recent)]

    report_lines = []
    report_lines.append(f"📰 新闻日报 - {datetime.now().strftime('%Y年%m月%d日')}")
    report_lines.append("=" * 50)
    for i, article in enumerate(top5, 1):
        report_lines.append(f"\n{i}. [{article['source']}] {article['title']}")
        report_lines.append(f"   发布时间: {article['published']}")
        report_lines.append(f"   情感: {'😊 正面' if article['sentiment'] == 'positive' else '😟 负面' if article['sentiment'] == 'negative' else '😐 中性'}")
        if article['summary']:
            report_lines.append(f"   摘要: {article['summary'][:100]}")
        report_lines.append(f"   链接: {article['link']}")
    report_lines.append("\n" + "=" * 50)
    report_lines.append(f"共收录 {len(recent)} 条今日新闻")
    return "\n".join(report_lines)


import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone='Asia/Shanghai')

def scheduled_fetch():
    logger.info("⏰ 定时任务开始执行 - 自动抓取RSS源")
    try:
        feeds, cache = fetch_all_feeds()
        total_articles = sum(len(cache.get(f['url'], [])) for f in feeds)
        logger.info(f"✅ 定时任务完成 - 刷新了 {len(feeds)} 个订阅源，共 {total_articles} 篇文章")
    except Exception as e:
        logger.error(f"❌ 定时任务失败: {e}")

SCHEDULE_INTERVAL = int(os.environ.get('RSS_INTERVAL', 15))
scheduler.add_job(scheduled_fetch, 'interval', minutes=SCHEDULE_INTERVAL, id='fetch_feeds', next_run_time=datetime.now())
scheduler.start()
logger.info(f"🔧 定时任务调度器已启动 - 每{SCHEDULE_INTERVAL}分钟自动抓取一次")


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/feeds', methods=['GET'])
def api_feeds():
    feeds = load_feeds()
    return jsonify(feeds)


@app.route('/api/feeds', methods=['POST'])
def api_add_feed():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': '缺少URL'}), 400

    url = data['url'].strip()
    name = data.get('name', '').strip()

    if not url.startswith(('http://', 'https://')):
        return jsonify({'error': 'URL格式不正确'}), 400

    feeds = load_feeds()
    for f in feeds:
        if f['url'] == url:
            return jsonify({'error': '该RSS源已存在'}), 400

    parsed = fetch_feed(url)
    if not parsed:
        return jsonify({'error': '无法获取RSS源，请检查URL是否正确'}), 400

    if not name:
        name = parsed.feed.get('title', url)

    new_feed = {
        'name': name,
        'url': url,
        'last_update': '-',
        'article_count': 0
    }
    feeds.append(new_feed)
    save_feeds(feeds)

    fetch_all_feeds()
    return jsonify({'success': True, 'feed': new_feed})


@app.route('/api/feeds/<path:url>', methods=['DELETE'])
def api_delete_feed(url):
    feeds = load_feeds()
    feeds = [f for f in feeds if f['url'] != url]
    save_feeds(feeds)

    cache = load_cache()
    if url in cache:
        del cache[url]
        save_cache(cache)

    return jsonify({'success': True})


@app.route('/api/articles', methods=['GET'])
def api_articles():
    keyword = request.args.get('keyword', '').strip()
    days_str = request.args.get('days', '0')
    try:
        days = int(days_str)
    except ValueError:
        days = 0

    articles = get_all_articles()
    articles = filter_articles(articles, keyword if keyword else None, days if days > 0 else None)

    return jsonify({'articles': articles, 'total': len(articles)})


@app.route('/api/fetch', methods=['POST'])
def api_fetch():
    feeds, cache = fetch_all_feeds()
    return jsonify({'success': True, 'feed_count': len(feeds)})


@app.route('/api/favorites', methods=['GET'])
def api_favorites():
    favs = load_favorites()
    return jsonify(favs)


@app.route('/api/favorites', methods=['POST'])
def api_add_favorite():
    data = request.get_json()
    if not data or 'id' not in data:
        return jsonify({'error': '缺少文章ID'}), 400

    favs = load_favorites()
    articles = get_all_articles()
    article = next((a for a in articles if a['id'] == data['id']), None)
    if not article:
        return jsonify({'error': '文章不存在'}), 404

    if any(f['id'] == data['id'] for f in favs):
        return jsonify({'success': True, 'favorites': favs})

    favs.append(article)
    save_favorites(favs)
    return jsonify({'success': True, 'favorites': favs})


@app.route('/api/favorites/<aid>', methods=['DELETE'])
def api_delete_favorite(aid):
    favs = load_favorites()
    favs = [f for f in favs if f['id'] != aid]
    save_favorites(favs)
    return jsonify({'success': True, 'favorites': favs})


@app.route('/api/qrcode')
def api_qrcode():
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': '缺少URL'}), 400

    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='#333', back_color='white')

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode('utf-8')

    return jsonify({'qrcode': img_b64})


@app.route('/api/daily-report')
def api_daily_report():
    report = generate_daily_report()
    if not report:
        return jsonify({'report': '暂无新闻数据，请先添加RSS源并抓取。'})
    return jsonify({'report': report})


@app.route('/api/opml/import', methods=['POST'])
def api_opml_import():
    if 'file' not in request.files:
        return jsonify({'error': '未上传文件'}), 400

    file = request.files['file']
    if not file.filename.endswith('.opml') and not file.filename.endswith('.xml'):
        return jsonify({'error': '文件格式不正确，请上传.opml或.xml文件'}), 400

    try:
        content = file.read().decode('utf-8')
        soup = BeautifulSoup(content, 'xml')
        outlines = soup.find_all('outline')

        feeds = load_feeds()
        existing_urls = {f['url'] for f in feeds}
        imported = 0

        for outline in outlines:
            xml_url = outline.get('xmlUrl') or outline.get('xmlurl')
            if xml_url:
                if xml_url not in existing_urls:
                    title = outline.get('title') or outline.get('text') or xml_url
                    feeds.append({
                        'name': title,
                        'url': xml_url,
                        'last_update': '-',
                        'article_count': 0
                    })
                    existing_urls.add(xml_url)
                    imported += 1

        save_feeds(feeds)
        if imported > 0:
            fetch_all_feeds()
        return jsonify({'success': True, 'imported': imported})
    except Exception as e:
        return jsonify({'error': f'解析OPML失败: {str(e)}'}), 400


@app.route('/api/opml/export')
def api_opml_export():
    feeds = load_feeds()
    opml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    opml += '<opml version="1.0">\n'
    opml += '  <head>\n'
    opml += f'    <title>News Aggregator Subscriptions - {datetime.now().strftime("%Y-%m-%d")}</title>\n'
    opml += '  </head>\n'
    opml += '  <body>\n'
    for feed in feeds:
        name = feed['name'].replace('&', '&amp;').replace('"', '&quot;')
        url = feed['url'].replace('&', '&amp;')
        opml += f'    <outline type="rss" text="{name}" title="{name}" xmlUrl="{url}"/>\n'
    opml += '  </body>\n'
    opml += '</opml>'

    return Response(
        opml,
        mimetype='application/xml',
        headers={'Content-Disposition': 'attachment; filename=subscriptions.opml'}
    )


@app.route('/api/status')
def api_status():
    feeds = load_feeds()
    articles = get_all_articles()
    return jsonify({
        'feed_count': len(feeds),
        'article_count': len(articles),
        'feeds': feeds
    })


if __name__ == '__main__':
    if not load_feeds():
        default_feeds = [
            {'name': 'BBC News', 'url': 'http://feeds.bbci.co.uk/news/rss.xml', 'last_update': '-', 'article_count': 0},
            {'name': 'Reuters', 'url': 'http://feeds.reuters.com/reuters/topNews', 'last_update': '-', 'article_count': 0},
        ]
        save_feeds(default_feeds)
        print("已添加默认RSS源，请等待首次抓取...")
    app.run(host='0.0.0.0', port=5001, debug=False)