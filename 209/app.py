from flask import Flask, request, jsonify, render_template, make_response
from flask_cors import CORS
import json
import time
import os
import csv
import io
from datetime import datetime
from collections import OrderedDict
from sentiment_model import SentimentModel

app = Flask(__name__)
CORS(app)

model = SentimentModel()

LOG_FILE = 'logs/requests.json'
SENSITIVE_WORDS_FILE = 'config/sensitive_words.json'
CACHE_SIZE = 1000
cache = OrderedDict()

os.makedirs('logs', exist_ok=True)
os.makedirs('config', exist_ok=True)
os.makedirs('templates', exist_ok=True)
os.makedirs('static', exist_ok=True)

DEFAULT_SENSITIVE_WORDS = [
    'badword1', 'badword2', '敏感词1', '敏感词2', 'fuck', 'shit',
    'damn', 'bitch', 'asshole', 'bastard', '傻逼', '草泥马', '他妈的',
    '操', '干', '日', '死', '垃圾', '白痴', '蠢货', '废物'
]


def load_sensitive_words():
    if os.path.exists(SENSITIVE_WORDS_FILE):
        try:
            with open(SENSITIVE_WORDS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return list(DEFAULT_SENSITIVE_WORDS)


def save_sensitive_words(words):
    with open(SENSITIVE_WORDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(sorted(set(words)), f, ensure_ascii=False, indent=2)


sensitive_words_list = load_sensitive_words()


def load_logs():
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []


def save_log(logs):
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)


def log_request(text, result, duration, ip, has_sensitive=False, positive_threshold=None, negative_threshold=None):
    logs = load_logs()
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'text': text,
        'result': result,
        'duration_seconds': round(duration, 4),
        'ip_address': ip,
        'has_sensitive': has_sensitive,
        'positive_threshold': positive_threshold,
        'negative_threshold': negative_threshold
    }
    logs.insert(0, log_entry)
    if len(logs) > 1000:
        logs = logs[:1000]
    save_log(logs)


def filter_sensitive_words(text):
    found_words = []
    lower_text = text.lower()
    for word in sensitive_words_list:
        if word.lower() in lower_text:
            found_words.append(word)
    return found_words


def get_cache_key(text, pos_thresh, neg_thresh):
    return f"{text.lower().strip()}|{pos_thresh}|{neg_thresh}"


def get_from_cache(key):
    if key in cache:
        cache.move_to_end(key)
        return cache[key]
    return None


def set_to_cache(key, value):
    if len(cache) >= CACHE_SIZE:
        cache.popitem(last=False)
    cache[key] = value


def parse_threshold(data, form=None):
    pos_thresh = 0.6
    neg_thresh = 0.6
    if data:
        pos_thresh = float(data.get('positive_threshold', 0.6))
        neg_thresh = float(data.get('negative_threshold', 0.6))
    elif form:
        pos_thresh = float(form.get('positive_threshold', 0.6))
        neg_thresh = float(form.get('negative_threshold', 0.6))
    pos_thresh = max(0.0, min(1.0, pos_thresh))
    neg_thresh = max(0.0, min(1.0, neg_thresh))
    return pos_thresh, neg_thresh


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/admin')
def admin():
    return render_template('admin.html')


@app.route('/api/analyze', methods=['POST'])
def analyze():
    start_time = time.time()
    data = request.get_json(silent=True) or {}

    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Text is required'}), 400

    positive_threshold, negative_threshold = parse_threshold(data)

    sensitive_words = filter_sensitive_words(text)
    has_sensitive = len(sensitive_words) > 0

    cache_key = get_cache_key(text, positive_threshold, negative_threshold)
    cached_result = get_from_cache(cache_key)

    if cached_result:
        result = cached_result.copy()
        from_cache = True
    else:
        result = model.analyze(text, positive_threshold, negative_threshold)
        from_cache = False
        set_to_cache(cache_key, result)

    duration = time.time() - start_time
    ip = request.remote_addr

    log_request(
        text, result, duration, ip, has_sensitive,
        positive_threshold=positive_threshold,
        negative_threshold=negative_threshold
    )

    return jsonify({
        'text': text,
        'sentiment': result['sentiment'],
        'confidence': result['confidence'],
        'language': result['language'],
        'positive_threshold': positive_threshold,
        'negative_threshold': negative_threshold,
        'sensitive_words': sensitive_words,
        'has_sensitive': has_sensitive,
        'from_cache': from_cache,
        'duration_seconds': round(duration, 4)
    })


@app.route('/api/batch', methods=['POST'])
def batch_analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Only CSV files are allowed'}), 400

    positive_threshold, negative_threshold = parse_threshold(None, request.form)

    try:
        content = file.read().decode('utf-8-sig')
        reader = csv.reader(io.StringIO(content))
        texts = []
        for row in reader:
            if row and row[0].strip():
                texts.append(row[0].strip())

        results = []
        for text in texts:
            sensitive_words = filter_sensitive_words(text)
            result = model.analyze(text, positive_threshold, negative_threshold)
            results.append({
                'text': text,
                'sentiment': result['sentiment'],
                'confidence': result['confidence'],
                'language': result['language'],
                'sensitive_words': sensitive_words,
                'has_sensitive': len(sensitive_words) > 0
            })

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['text', 'sentiment', 'confidence', 'language', 'has_sensitive', 'sensitive_words', 'positive_threshold', 'negative_threshold'])
        for r in results:
            writer.writerow([
                r['text'],
                r['sentiment'],
                r['confidence'],
                r['language'],
                r['has_sensitive'],
                ','.join(r['sensitive_words']),
                positive_threshold,
                negative_threshold
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=sentiment_results.csv'
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/logs', methods=['GET'])
def get_logs():
    logs = load_logs()
    limit = min(int(request.args.get('limit', 100)), 100)
    return jsonify(logs[:limit])


@app.route('/api/logs/export', methods=['GET'])
def export_logs():
    logs = load_logs()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['timestamp', 'text', 'sentiment', 'confidence', 'language',
                     'duration_seconds', 'ip_address', 'has_sensitive',
                     'positive_threshold', 'negative_threshold'])

    for log in logs:
        writer.writerow([
            log['timestamp'],
            log['text'],
            log['result']['sentiment'],
            log['result']['confidence'],
            log['result']['language'],
            log['duration_seconds'],
            log['ip_address'],
            log.get('has_sensitive', False),
            log.get('positive_threshold', ''),
            log.get('negative_threshold', '')
        ])

    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = 'attachment; filename=sentiment_logs.csv'
    return response


@app.route('/api/sensitive-words', methods=['GET'])
def get_sensitive_words():
    return jsonify({
        'words': sensitive_words_list,
        'count': len(sensitive_words_list)
    })


@app.route('/api/sensitive-words', methods=['POST'])
def add_sensitive_words():
    global sensitive_words_list
    data = request.get_json(silent=True) or {}
    words = data.get('words', [])
    if not isinstance(words, list):
        return jsonify({'error': 'words must be a list'}), 400
    if len(words) == 0:
        return jsonify({'error': 'words list cannot be empty'}), 400

    added = []
    for word in words:
        word = str(word).strip()
        if word and word not in sensitive_words_list:
            sensitive_words_list.append(word)
            added.append(word)

    if added:
        save_sensitive_words(sensitive_words_list)

    return jsonify({
        'added': added,
        'total_count': len(sensitive_words_list),
        'words': sensitive_words_list
    })


@app.route('/api/sensitive-words', methods=['DELETE'])
def delete_sensitive_words():
    global sensitive_words_list
    data = request.get_json(silent=True) or {}
    words = data.get('words', [])
    if not isinstance(words, list):
        return jsonify({'error': 'words must be a list'}), 400

    removed = []
    for word in words:
        word = str(word).strip()
        if word in sensitive_words_list:
            sensitive_words_list.remove(word)
            removed.append(word)

    if removed:
        save_sensitive_words(sensitive_words_list)

    return jsonify({
        'removed': removed,
        'total_count': len(sensitive_words_list),
        'words': sensitive_words_list
    })


@app.route('/api/sensitive-words/reset', methods=['POST'])
def reset_sensitive_words():
    global sensitive_words_list
    sensitive_words_list = list(DEFAULT_SENSITIVE_WORDS)
    save_sensitive_words(sensitive_words_list)
    return jsonify({
        'message': 'Sensitive words reset to defaults',
        'words': sensitive_words_list,
        'count': len(sensitive_words_list)
    })


@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    cache.clear()
    return jsonify({'message': 'Cache cleared successfully'})


@app.route('/api/cache/stats', methods=['GET'])
def cache_stats():
    return jsonify({
        'cache_size': len(cache),
        'max_cache_size': CACHE_SIZE
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=9999)
