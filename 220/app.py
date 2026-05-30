import os
import json
import uuid
import csv
import random
import sqlite3
import logging
import io
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, Response, g

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'chatbot-secret-key-2026'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'uploads'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
LOG_DIR = os.path.join(BASE_DIR, 'logs')
UPLOAD_DIR = os.path.join(BASE_DIR, app.config['UPLOAD_FOLDER'])
DB_PATH = os.path.join(DATA_DIR, 'chatbot.db')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

QA_FILE = os.path.join(DATA_DIR, 'qa_knowledge.json')
CHAT_LOG_FILE = os.path.join(LOG_DIR, f'chat_logs_{datetime.now().strftime("%Y%m%d")}.log')

logging.basicConfig(
    filename=CHAT_LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    encoding='utf-8'
)
logger = logging.getLogger(__name__)

qa_knowledge = []

PERSONALITIES = {
    'friendly': {
        'name': '友好',
        'prefix': ['', '嗯嗯，', '哎呀，', '哈哈，', ''],
        'suffix': ['～', '呢！', '哦！', '呀～', ''],
        'empathy': {
            'positive': '真为你高兴！',
            'negative': '我理解你的心情，抱抱你～',
            'neutral': ''
        }
    },
    'sarcastic': {
        'name': '讽刺',
        'prefix': ['呵呵，', '哦？', '有趣，', '好吧，', ''],
        'suffix': ['，不是吗？', '。你懂的。', '，当然。', '。太棒了。', ''],
        'empathy': {
            'positive': '哇，真厉害啊。',
            'negative': '哦，太惨了，真的。',
            'neutral': ''
        }
    },
    'professional': {
        'name': '专业',
        'prefix': ['', '根据分析，', '经评估，', '从对话来看，', ''],
        'suffix': ['。', '。感谢您的交流。', '。请继续。', '。', ''],
        'empathy': {
            'positive': '观察到您情绪积极，这很好。',
            'negative': '注意到您情绪低落，我会耐心倾听。',
            'neutral': ''
        }
    }
}

SENTIMENT_KEYWORDS = {
    'positive': [
        '开心', '高兴', '快乐', '幸福', '兴奋', '激动', '喜欢', '爱', '棒', '好',
        '赞', '优秀', '完美', '满意', '感谢', '感激', '幸运', '成功', '胜利', '庆祝',
        'great', 'happy', 'good', 'nice', 'love', 'excellent', 'amazing', 'wonderful',
        'awesome', 'fantastic', 'glad', 'joyful', 'delighted'
    ],
    'negative': [
        '难过', '伤心', '痛苦', '悲伤', '沮丧', '焦虑', '担心', '害怕', '恐惧', '愤怒',
        '生气', '讨厌', '恨', '糟糕', '差', '坏', '失望', '绝望', '压力', '累',
        'sad', 'angry', 'bad', 'terrible', 'awful', 'depressed', 'anxious', 'scared',
        'afraid', 'hate', 'disappointed', 'frustrated', 'stressed', 'tired'
    ]
}

PROACTIVE_TOPICS = [
    '对了，你平时有什么兴趣爱好吗？',
    '话说回来，最近有没有遇到什么有趣的事情？',
    '闲聊这么久了，你想聊点什么特别的话题吗？比如音乐、电影或者美食？',
    '不知道你喜不喜欢旅行？有没有特别想去的地方？',
    '对了，你最近在看什么书或者剧吗？推荐一下？',
    '话说，你觉得什么样的一天才算完美的一天？'
]

SUGGESTION_TEMPLATES = {
    'greeting': ['你好呀！', '今天过得怎么样？', '能介绍一下你自己吗？'],
    'emotional': ['谢谢你的理解', '能再听我说几句吗？', '我感觉好多了'],
    'entertainment': ['再讲一个吧！', '你喜欢什么类型的？', '有什么推荐吗？'],
    'lifestyle': ['是呀，我也这么觉得！', '你呢，你喜欢什么？', '有什么建议吗？'],
    'default': ['继续聊', '换个话题吧', '我想问个问题']
}

CATEGORY_KEYWORDS = {
    'greeting': ['你好', 'hi', 'hello', '嗨', '您好', '哈喽'],
    'farewell': ['再见', 'bye', '拜拜', '下次见', '晚安'],
    'emotional': ['难过', '开心', '伤心', '高兴', '无聊', '焦虑', '害怕', '痛苦', '幸福'],
    'entertainment': ['笑话', '音乐', '电影', '游戏', '剧', '动漫', '综艺'],
    'lifestyle': ['美食', '旅行', '工作', '学习', '运动', '健身', '吃'],
    'weather': ['天气', '下雨', '晴天', '温度', '冷', '热'],
    'identity': ['你是谁', '叫什么', '自我介绍'],
    'capability': ['能做什么', '功能', '会什么'],
    'thanks': ['谢谢', '感谢', '多谢'],
    'recommendation': ['推荐', '建议']
}


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            personality TEXT DEFAULT 'friendly',
            created_at TEXT NOT NULL,
            round_count INTEGER DEFAULT 0,
            last_topic_round INTEGER DEFAULT 0
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            emotion TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)")
    db.commit()
    db.close()
    logger.info("Database initialized")


def load_qa_knowledge():
    global qa_knowledge
    try:
        with open(QA_FILE, 'r', encoding='utf-8') as f:
            qa_knowledge = json.load(f)
        logger.info(f"Loaded {len(qa_knowledge)} QA pairs from {QA_FILE}")
    except Exception as e:
        logger.error(f"Error loading QA knowledge: {e}")
        qa_knowledge = []


def save_qa_knowledge():
    try:
        with open(QA_FILE, 'w', encoding='utf-8') as f:
            json.dump(qa_knowledge, f, ensure_ascii=False, indent=4)
        return True
    except Exception as e:
        logger.error(f"Error saving QA knowledge: {e}")
        return False


def get_or_create_session():
    session_id = session.get('chat_session_id')
    db = get_db()

    if session_id:
        row = db.execute("SELECT session_id FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if row:
            return session_id

    session_id = str(uuid.uuid4())
    session['chat_session_id'] = session_id
    now = datetime.now().isoformat()
    db.execute(
        "INSERT INTO sessions (session_id, personality, created_at, round_count, last_topic_round) VALUES (?, ?, ?, 0, 0)",
        (session_id, 'friendly', now)
    )
    db.commit()
    logger.info(f"New session created: {session_id}")
    return session_id


def get_session_data(session_id):
    db = get_db()
    row = db.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    if not row:
        return None
    return dict(row)


def analyze_sentiment(text):
    text_lower = text.lower()
    positive_score = sum(1 for kw in SENTIMENT_KEYWORDS['positive'] if kw in text_lower)
    negative_score = sum(1 for kw in SENTIMENT_KEYWORDS['negative'] if kw in text_lower)
    if positive_score > negative_score:
        return 'positive'
    elif negative_score > positive_score:
        return 'negative'
    return 'neutral'


def categorize_message(text):
    text_lower = text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return category
    return 'default'


def match_qa(text):
    text_lower = text.lower().strip()
    best_match = None
    best_score = 0

    for qa in qa_knowledge:
        score = 0
        keywords = qa.get('keywords', [])
        for kw in keywords:
            if kw.lower() in text_lower:
                score += 2
        if qa['question'].lower() in text_lower:
            score += 3
        if text_lower in qa['question'].lower():
            score += 2
        if score > best_score:
            best_score = score
            best_match = qa

    if best_score >= 2:
        return best_match
    return None


def render_personality(text, personality, emotion):
    persona = PERSONALITIES.get(personality, PERSONALITIES['friendly'])
    prefix = random.choice(persona['prefix'])
    suffix = random.choice(persona['suffix'])
    empathy = persona['empathy'].get(emotion, '')

    if empathy and emotion != 'neutral':
        text = f"{empathy} {text}"

    return f"{prefix}{text}{suffix}"


def generate_suggestions(category, context=None):
    templates = SUGGESTION_TEMPLATES.get(category, SUGGESTION_TEMPLATES['default'])
    suggestions = random.sample(templates, min(3, len(templates)))
    return suggestions


def check_proactive_topic(session_id):
    db = get_db()
    row = db.execute("SELECT round_count, last_topic_round FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    if not row:
        return None
    rounds_since_topic = row['round_count'] - row['last_topic_round']
    if rounds_since_topic >= 5:
        db.execute("UPDATE sessions SET last_topic_round = round_count WHERE session_id = ?", (session_id,))
        db.commit()
        return random.choice(PROACTIVE_TOPICS)
    return None


def save_message(session_id, role, content, emotion=None):
    db = get_db()
    now = datetime.now().isoformat()
    db.execute(
        "INSERT INTO messages (session_id, role, content, emotion, timestamp) VALUES (?, ?, ?, ?, ?)",
        (session_id, role, content, emotion, now)
    )
    if role == 'user':
        db.execute("UPDATE sessions SET round_count = round_count + 1 WHERE session_id = ?", (session_id,))
    db.commit()
    logger.info(f"[{session_id}] {role}: {content}")


def log_chat(session_id, role, content, emotion=None):
    log_line = f"SESSION:{session_id} | ROLE:{role} | EMOTION:{emotion or '-'} | CONTENT:{content}"
    logger.info(log_line)


@app.route('/')
def index():
    session_id = get_or_create_session()
    return render_template('chat.html', session_id=session_id)


@app.route('/admin')
def admin():
    return render_template('admin.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        session_id = get_or_create_session()
        data = request.get_json()
        user_message = data.get('message', '').strip()

        if not user_message:
            return jsonify({'error': '消息不能为空'}), 400

        emotion = analyze_sentiment(user_message)
        category = categorize_message(user_message)
        save_message(session_id, 'user', user_message, emotion)
        log_chat(session_id, 'user', user_message, emotion)

        matched = match_qa(user_message)
        if matched:
            base_reply = matched['answer']
        else:
            default_replies = [
                f"关于「{user_message}」，这是个很有意思的话题！能多说一点吗？",
                f"嗯，我听到你说的了。你为什么对这个感兴趣呢？",
                f"我理解你想聊「{user_message}」，不过我的知识库中还没有相关内容。要不我们换个话题？",
                f"这个话题很有趣，虽然我不太了解，但我很乐意听听你的看法！"
            ]
            base_reply = random.choice(default_replies)

        sess = get_session_data(session_id)
        personality = sess['personality'] if sess else 'friendly'
        reply = render_personality(base_reply, personality, emotion)

        proactive_topic = check_proactive_topic(session_id)
        if proactive_topic:
            reply = f"{reply}\n\n{proactive_topic}"

        suggestions = generate_suggestions(category, user_message)

        save_message(session_id, 'bot', reply)
        log_chat(session_id, 'bot', reply)

        sess = get_session_data(session_id)
        return jsonify({
            'reply': reply,
            'emotion': emotion,
            'suggestions': suggestions,
            'proactive_topic': proactive_topic,
            'round_count': sess['round_count'] if sess else 0
        })
    except Exception as e:
        logger.error(f"Chat API error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/personality', methods=['GET', 'POST'])
def personality():
    session_id = get_or_create_session()
    db = get_db()
    if request.method == 'POST':
        data = request.get_json()
        p = data.get('personality')
        if p in PERSONALITIES:
            db.execute("UPDATE sessions SET personality = ? WHERE session_id = ?", (p, session_id))
            db.commit()
            logger.info(f"[{session_id}] Personality changed to: {p}")
            return jsonify({'success': True, 'personality': p, 'name': PERSONALITIES[p]['name']})
        return jsonify({'success': False, 'error': 'Invalid personality'}), 400
    else:
        row = db.execute("SELECT personality FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        p = row['personality'] if row else 'friendly'
        return jsonify({
            'personality': p,
            'name': PERSONALITIES[p]['name'],
            'available': {k: v['name'] for k, v in PERSONALITIES.items()}
        })


@app.route('/api/upload-qa', methods=['POST'])
def upload_qa():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '没有上传文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': '未选择文件'}), 400

        if not file.filename.endswith('.json'):
            return jsonify({'success': False, 'error': '只支持JSON文件'}), 400

        content = json.load(file)
        if not isinstance(content, list):
            return jsonify({'success': False, 'error': 'JSON格式必须是数组'}), 400

        count = 0
        for item in content:
            if 'question' in item and 'answer' in item:
                if 'keywords' not in item:
                    item['keywords'] = [item['question']]
                if 'category' not in item:
                    item['category'] = categorize_message(item['question'])
                qa_knowledge.append(item)
                count += 1

        if save_qa_knowledge():
            logger.info(f"Uploaded {count} new QA pairs")
            return jsonify({'success': True, 'count': count})
        return jsonify({'success': False, 'error': '保存失败'}), 500
    except json.JSONDecodeError:
        return jsonify({'success': False, 'error': 'JSON格式错误'}), 400
    except Exception as e:
        logger.error(f"Upload QA error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/suggestions', methods=['POST'])
def suggestions():
    data = request.get_json()
    context = data.get('context', '')
    category = categorize_message(context)
    suggs = generate_suggestions(category, context)
    return jsonify({'suggestions': suggs})


@app.route('/api/sessions', methods=['GET'])
def list_sessions():
    db = get_db()
    rows = db.execute("""
        SELECT s.session_id, s.created_at, s.personality,
               (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.session_id) AS message_count
        FROM sessions s
        ORDER BY s.created_at DESC
    """).fetchall()
    result = []
    for row in rows:
        p = row['personality']
        result.append({
            'session_id': row['session_id'],
            'created_at': row['created_at'],
            'message_count': row['message_count'],
            'personality': PERSONALITIES.get(p, {}).get('name', p),
            'personality_key': p
        })
    return jsonify({'sessions': result})


@app.route('/api/sessions/<sid>', methods=['GET'])
def get_session(sid):
    db = get_db()
    row = db.execute("SELECT * FROM sessions WHERE session_id = ?", (sid,)).fetchone()
    if not row:
        return jsonify({'error': '会话不存在'}), 404
    messages = db.execute(
        "SELECT role, content, emotion, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC",
        (sid,)
    ).fetchall()
    p = row['personality']
    return jsonify({
        'session_id': sid,
        'created_at': row['created_at'],
        'personality': p,
        'personality_name': PERSONALITIES.get(p, {}).get('name', p),
        'round_count': row['round_count'],
        'messages': [dict(m) for m in messages]
    })


@app.route('/api/export-csv')
def export_csv():
    try:
        sid_filter = request.args.get('session_id', 'all')
        db = get_db()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['session_id', 'timestamp', 'user_message', 'bot_response'])

        if sid_filter == 'all':
            sessions_rows = db.execute("SELECT session_id FROM sessions ORDER BY created_at ASC").fetchall()
        else:
            sessions_rows = db.execute("SELECT session_id FROM sessions WHERE session_id = ?", (sid_filter,)).fetchall()

        for sess_row in sessions_rows:
            sid = sess_row['session_id']
            messages = db.execute(
                "SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC",
                (sid,)
            ).fetchall()

            i = 0
            while i < len(messages):
                if messages[i]['role'] == 'user':
                    user_msg = messages[i]['content']
                    user_ts = messages[i]['timestamp']
                    bot_msg = ''
                    if i + 1 < len(messages) and messages[i + 1]['role'] == 'bot':
                        bot_msg = messages[i + 1]['content']
                        i += 2
                    else:
                        i += 1
                    writer.writerow([sid, user_ts, user_msg, bot_msg])
                else:
                    i += 1

        output.seek(0)
        filename = f"chat_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            output.getvalue(),
            mimetype='text/csv; charset=utf-8-sig',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        logger.error(f"Export CSV error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/delete-session/<sid>', methods=['DELETE'])
def delete_session(sid):
    try:
        db = get_db()
        db.execute("DELETE FROM messages WHERE session_id = ?", (sid,))
        db.execute("DELETE FROM sessions WHERE session_id = ?", (sid,))
        db.commit()
        logger.info(f"Session deleted: {sid}")
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Delete session error: {e}")
        return jsonify({'error': str(e)}), 500


init_db()
load_qa_knowledge()

if __name__ == '__main__':
    print("=" * 60)
    print("AI 闲聊机器人服务已启动")
    print("聊天页面: http://127.0.0.1:5555/")
    print("管理页面: http://127.0.0.1:5555/admin")
    print("=" * 60)
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5555)
