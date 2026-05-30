# -*- coding: utf-8 -*-
import json
import os
import csv
import io
import uuid
import random
import time
from collections import Counter
from datetime import datetime

from flask import Flask, render_template, request, jsonify, session
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.urandom(24)

RULES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rules.json')
SYNONYMS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'synonyms.json')
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')
HISTORY_MAX = 20


def load_rules():
    if os.path.exists(RULES_FILE):
        with open(RULES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_rules(rules):
    with open(RULES_FILE, 'w', encoding='utf-8') as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)


def load_synonyms():
    if os.path.exists(SYNONYMS_FILE):
        with open(SYNONYMS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def load_config():
    default_config = {
        'simulate_delay': True,
        'min_delay_seconds': 0.3,
        'max_delay_seconds': 1.5
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                user_config = json.load(f)
            default_config.update(user_config)
        except (json.JSONDecodeError, IOError):
            pass
    return default_config


def save_config(config):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def edit_distance(s1, s2):
    if len(s1) < len(s2):
        return edit_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row
    return prev_row[-1]


def expand_with_synonyms(text, synonyms):
    expansions = [text]
    for key, syns in synonyms.items():
        if key in text:
            for syn in syns:
                expansions.append(text.replace(key, syn))
    return expansions


def match_intent(command, rules, synonyms, context=None):
    command = command.strip()
    if not command:
        return None

    expansions = expand_with_synonyms(command, synonyms)

    best_rule = None
    best_score = -1
    best_match_type = None

    for rule in rules:
        for keyword in rule.get('keywords', []):
            if keyword in command:
                score = len(keyword) * 2
                if score > best_score:
                    best_score = score
                    best_rule = rule
                    best_match_type = 'exact'

            for exp in expansions:
                if keyword in exp and keyword not in command:
                    score = len(keyword) * 1.5
                    if score > best_score:
                        best_score = score
                        best_rule = rule
                        best_match_type = 'synonym'

    if best_rule is None:
        for rule in rules:
            for keyword in rule.get('keywords', []):
                dist = edit_distance(command, keyword)
                threshold = max(len(keyword) * 0.4, 1)
                if dist <= threshold:
                    score = len(keyword) - dist
                    if score > best_score:
                        best_score = score
                        best_rule = rule
                        best_match_type = 'fuzzy'

    if best_rule is None and context:
        last_category = context.get('last_category')
        if last_category:
            for rule in rules:
                if rule.get('category') == last_category and rule.get('context_followup'):
                    best_rule = rule
                    best_match_type = 'context'
                    break

    if best_rule is None:
        return {
            'matched': False,
            'rule_id': None,
            'category': '未识别',
            'match_type': 'none',
            'confidence': 0,
            'response': {
                'text': '抱歉，我无法理解该指令。请尝试其他说法。',
                'command': None,
                'api_call': None
            }
        }

    if best_match_type == 'exact':
        confidence = round(min(best_score / max(len(command), 1) * 0.3 + 0.7, 1.0), 2)
    elif best_match_type == 'synonym':
        confidence = round(min(best_score / max(len(command), 1) * 0.3 + 0.6, 1.0), 2)
    elif best_match_type == 'fuzzy':
        confidence = round(min(best_score / max(len(command), 1) * 0.3 + 0.4, 1.0), 2)
    elif best_match_type == 'context':
        confidence = 0.5
    else:
        confidence = 0.3

    return {
        'matched': True,
        'rule_id': best_rule['id'],
        'category': best_rule['category'],
        'match_type': best_match_type,
        'confidence': confidence,
        'matched_keyword': best_rule['keywords'][0] if best_rule.get('keywords') else None,
        'response': best_rule['response']
    }


def get_history():
    return session.get('history', [])


def add_history(command, result):
    history = get_history()
    history.append({
        'id': str(uuid.uuid4())[:8],
        'command': command,
        'result': result,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })
    history = history[-HISTORY_MAX:]
    session['history'] = history


def get_context():
    return session.get('context', {})


def update_context(result):
    ctx = get_context()
    if result.get('matched'):
        ctx['last_category'] = result['category']
        ctx['last_rule_id'] = result['rule_id']
    session['context'] = ctx


def get_statistics():
    history = get_history()
    if not history:
        return {'total': 0, 'categories': {}, 'match_types': {}}
    categories = Counter(h['result'].get('category', '未识别') for h in history)
    match_types = Counter(h['result'].get('match_type', 'none') for h in history)
    return {
        'total': len(history),
        'categories': dict(categories),
        'match_types': dict(match_types)
    }


@app.route('/')
def index():
    rules = load_rules()
    return render_template('index.html', rules=rules)


@app.route('/admin')
def admin():
    rules = load_rules()
    config = load_config()
    return render_template('admin.html', rules=rules, config=config)


@app.route('/stats')
def stats():
    return render_template('stats.html')


@app.route('/api/execute', methods=['POST'])
def api_execute():
    data = request.get_json()
    command = data.get('command', '').strip()
    config = load_config()
    simulate_delay = data.get('simulate_delay', config.get('simulate_delay', True))

    if not command:
        return jsonify({'error': '指令不能为空'}), 400

    rules = load_rules()
    synonyms = load_synonyms()
    context = get_context()

    result = match_intent(command, rules, synonyms, context)

    delay = 0
    if simulate_delay:
        min_d = config.get('min_delay_seconds', 0.3)
        max_d = config.get('max_delay_seconds', 1.5)
        delay = random.uniform(min_d, max_d)
        time.sleep(delay)

    result['delay'] = round(delay, 2)

    add_history(command, result)
    update_context(result)

    return jsonify(result)


@app.route('/api/history')
def api_history():
    return jsonify(get_history())


@app.route('/api/history/clear', methods=['POST'])
def api_history_clear():
    session['history'] = []
    session['context'] = {}
    return jsonify({'status': 'ok'})


@app.route('/api/context')
def api_context():
    return jsonify(get_context())


@app.route('/api/context/clear', methods=['POST'])
def api_context_clear():
    session['context'] = {}
    return jsonify({'status': 'ok'})


@app.route('/api/statistics')
def api_statistics():
    return jsonify(get_statistics())


@app.route('/api/config', methods=['GET'])
def api_config_get():
    return jsonify(load_config())


@app.route('/api/config', methods=['POST'])
def api_config_update():
    data = request.get_json()
    config = load_config()
    if 'simulate_delay' in data:
        config['simulate_delay'] = bool(data['simulate_delay'])
    if 'min_delay_seconds' in data:
        config['min_delay_seconds'] = float(data['min_delay_seconds'])
    if 'max_delay_seconds' in data:
        config['max_delay_seconds'] = float(data['max_delay_seconds'])
    save_config(config)
    return jsonify({'status': 'ok', 'config': config})


@app.route('/api/rules', methods=['GET'])
def api_rules_list():
    return jsonify(load_rules())


@app.route('/api/rules', methods=['POST'])
def api_rules_add():
    data = request.get_json()
    rules = load_rules()
    new_rule = {
        'id': f"rule_{uuid.uuid4().hex[:6]}",
        'keywords': data.get('keywords', []),
        'category': data.get('category', '自定义'),
        'response': data.get('response', {
            'text': '',
            'command': None,
            'api_call': None
        })
    }
    if data.get('context_followup'):
        new_rule['context_followup'] = True
    rules.append(new_rule)
    save_rules(rules)
    return jsonify({'status': 'ok', 'rule': new_rule})


@app.route('/api/rules/<rule_id>', methods=['PUT'])
def api_rules_update(rule_id):
    data = request.get_json()
    rules = load_rules()
    for i, rule in enumerate(rules):
        if rule['id'] == rule_id:
            if 'keywords' in data:
                rules[i]['keywords'] = data['keywords']
            if 'category' in data:
                rules[i]['category'] = data['category']
            if 'response' in data:
                rules[i]['response'] = data['response']
            if 'context_followup' in data:
                rules[i]['context_followup'] = data['context_followup']
            save_rules(rules)
            return jsonify({'status': 'ok', 'rule': rules[i]})
    return jsonify({'error': '规则不存在'}), 404


@app.route('/api/rules/<rule_id>', methods=['DELETE'])
def api_rules_delete(rule_id):
    rules = load_rules()
    rules = [r for r in rules if r['id'] != rule_id]
    save_rules(rules)
    return jsonify({'status': 'ok'})


@app.route('/api/rules/export', methods=['GET'])
def api_rules_export():
    rules = load_rules()
    return jsonify(rules)


@app.route('/api/rules/import', methods=['POST'])
def api_rules_import():
    if 'file' in request.files:
        file = request.files['file']
        content = file.read().decode('utf-8')
    else:
        content = request.get_data(as_text=True)
    try:
        imported = json.loads(content)
        if not isinstance(imported, list):
            return jsonify({'error': 'JSON格式错误，应为数组'}), 400
        for rule in imported:
            if 'keywords' not in rule or 'response' not in rule:
                return jsonify({'error': '规则格式不完整，需包含keywords和response'}), 400
            if 'id' not in rule:
                rule['id'] = f"rule_{uuid.uuid4().hex[:6]}"
            if 'category' not in rule:
                rule['category'] = '自定义'
        save_rules(imported)
        return jsonify({'status': 'ok', 'count': len(imported)})
    except json.JSONDecodeError:
        return jsonify({'error': 'JSON解析失败'}), 400


@app.route('/api/batch', methods=['POST'])
def api_batch():
    if 'file' not in request.files:
        return jsonify({'error': '请上传CSV文件'}), 400

    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': '仅支持CSV文件'}), 400

    stream = io.StringIO(file.read().decode('utf-8'))
    reader = csv.DictReader(stream)

    if 'command' not in (reader.fieldnames or []):
        return jsonify({'error': 'CSV文件必须包含command列'}), 400

    rules = load_rules()
    synonyms = load_synonyms()
    context = get_context()

    results = []
    for row in reader:
        command = row['command'].strip()
        if not command:
            continue

        result = match_intent(command, rules, synonyms, context)
        config = load_config()
        delay = 0
        if config.get('simulate_delay', True):
            min_d = max(0.1, config.get('min_delay_seconds', 0.3) * 0.3)
            max_d = max(0.5, config.get('max_delay_seconds', 1.5) * 0.3)
            delay = random.uniform(min_d, max_d)
            time.sleep(delay)

        result['delay'] = round(delay, 2)
        result['input_command'] = command

        if result.get('matched'):
            context['last_category'] = result['category']
            context['last_rule_id'] = result['rule_id']

        results.append(result)

    return jsonify({'results': results, 'total': len(results)})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
