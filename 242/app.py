import os
import json
import uuid
import random
from datetime import datetime
from io import BytesIO, StringIO

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash, send_file
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.utils import secure_filename

from config import Config
from models import db, Question, InterviewSession, InterviewAnswer, Message, Admin
from evaluator import AnswerEvaluator
from sentiment_analyzer import SentimentAnalyzer
from code_sandbox import CodeSandbox
from pdf_generator import PDFGenerator

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'admin_login'
login_manager.login_message = '请先登录管理员账号'

evaluator = AnswerEvaluator()
sentiment_analyzer = SentimentAnalyzer()
code_sandbox = CodeSandbox(timeout=Config.SANDBOX_TIMEOUT)
pdf_generator = PDFGenerator()

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.root_path, 'question_bank'), exist_ok=True)

@app.template_filter('from_json')
def from_json_filter(value):
    try:
        if value:
            return json.loads(value)
    except Exception:
        pass
    return []

@app.template_filter('sum')
def sum_filter(items, attribute=None):
    if attribute:
        return sum(getattr(item, attribute, 0) for item in items)
    return sum(items)

@app.template_filter('max')
def max_filter(items, attribute=None):
    if not items:
        return type('obj', (object,), {'score': 0})()
    if attribute:
        return max(items, key=lambda x: getattr(x, attribute, 0))
    return max(items)

@app.template_filter('min')
def min_filter(items, attribute=None):
    if not items:
        return type('obj', (object,), {'score': 0})()
    if attribute:
        return min(items, key=lambda x: getattr(x, attribute, 0))
    return min(items)

POSITION_OPTIONS = [
    'Python后端工程师',
    '前端工程师',
    'Java后端工程师',
    '数据工程师',
    '算法工程师',
    '测试工程师',
    'DevOps工程师',
    '产品经理'
]

@login_manager.user_loader
def load_user(user_id):
    return Admin.query.get(int(user_id))

def init_database():
    db.create_all()
    _load_question_bank()
    _init_admin()

def _load_question_bank():
    question_bank_dir = os.path.join(app.root_path, 'question_bank')
    if not os.path.exists(question_bank_dir):
        return
    
    for filename in os.listdir(question_bank_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(question_bank_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    questions = json.load(f)
                
                for q in questions:
                    existing = Question.query.filter_by(
                        question=q['question'],
                        position=q['position'],
                        difficulty=q['difficulty']
                    ).first()
                    
                    if not existing:
                        question = Question(
                            position=q['position'],
                            difficulty=q.get('difficulty', 'junior'),
                            question_type=q.get('question_type', 'technical'),
                            question=q['question'],
                            keywords=json.dumps(q.get('keywords', []), ensure_ascii=False),
                            answer_points=q.get('answer_points', ''),
                            hint=q.get('hint', ''),
                            code_question=q.get('code_question', False),
                            test_cases=json.dumps(q.get('test_cases', []), ensure_ascii=False) if q.get('test_cases') else None,
                            custom=False
                        )
                        db.session.add(question)
                
                db.session.commit()
            except Exception as e:
                print(f"Error loading question bank {filename}: {e}")
                db.session.rollback()

def _init_admin():
    admin = Admin.query.filter_by(username=Config.ADMIN_USERNAME).first()
    if not admin:
        admin = Admin(username=Config.ADMIN_USERNAME)
        admin.set_password(Config.ADMIN_PASSWORD)
        db.session.add(admin)
        db.session.commit()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    return render_template('index.html', positions=POSITION_OPTIONS)

@app.route('/api/positions')
def get_positions():
    return jsonify({'positions': POSITION_OPTIONS})

@app.route('/start', methods=['POST'])
def start_interview():
    data = request.json
    position = data.get('position')
    difficulty = data.get('difficulty', 'junior')
    pressure_mode = data.get('pressure_mode', False)
    time_per_question = data.get('time_per_question', 120)
    custom_bank_id = data.get('custom_bank_id')
    
    if not position:
        return jsonify({'error': '请选择岗位类型'}), 400
    
    session_id = str(uuid.uuid4())
    
    query = Question.query.filter_by(custom=False)
    if custom_bank_id:
        query = Question.query.filter(
            (Question.custom == True) & (Question.user_session_id == session.get('custom_session_id', ''))
        )
    else:
        query = query.filter_by(position=position, difficulty=difficulty)
    
    questions = query.all()
    
    if len(questions) < Config.QUESTIONS_PER_INTERVIEW:
        available_questions = questions
    else:
        available_questions = random.sample(questions, Config.QUESTIONS_PER_INTERVIEW)
    
    if not available_questions:
        return jsonify({'error': '该岗位暂时没有可用的面试题'}), 404
    
    interview_session = InterviewSession(
        session_id=session_id,
        position=position,
        difficulty=difficulty,
        pressure_mode=pressure_mode,
        time_per_question=time_per_question,
        status='in_progress'
    )
    db.session.add(interview_session)
    
    question_ids = [q.id for q in available_questions]
    interview_session.question_ids = json.dumps(question_ids)
    interview_session.current_question_index = 0
    interview_session.hint_used = False
    
    session['session_id'] = session_id
    session['question_start_time'] = datetime.now().timestamp()
    
    welcome_msg = f"欢迎参加{position}面试！我是您的AI面试官。本次面试共{len(available_questions)}道题，让我们开始吧！"
    message = Message(session_id=session_id, role='system', content=welcome_msg)
    db.session.add(message)
    
    db.session.commit()
    
    first_q = available_questions[0]
    first_msg = Message(session_id=session_id, role='interviewer', content=first_q.question)
    db.session.add(first_msg)
    db.session.commit()
    
    return jsonify({
        'session_id': session_id,
        'total_questions': len(available_questions),
        'pressure_mode': pressure_mode,
        'time_per_question': time_per_question,
        'position': position,
        'difficulty': difficulty,
        'question': {
            'id': first_q.id,
            'text': first_q.question,
            'type': first_q.question_type,
            'is_code': first_q.code_question,
            'index': 1
        }
    })

@app.route('/api/messages/<session_id>')
def get_messages(session_id):
    messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
    return jsonify({
        'messages': [
            {
                'role': m.role,
                'content': m.content,
                'timestamp': m.timestamp.strftime('%H:%M:%S')
            }
            for m in messages
        ]
    })

@app.route('/api/answer', methods=['POST'])
def submit_answer():
    data = request.json
    session_id = data.get('session_id')
    user_answer = data.get('answer', '')
    time_spent = data.get('time_spent', 0)
    
    if not session_id:
        return jsonify({'error': '无效的会话'}), 400
    
    interview_session = InterviewSession.query.filter_by(session_id=session_id).first()
    if not interview_session or interview_session.status != 'in_progress':
        return jsonify({'error': '面试会话已结束或不存在'}), 404
    
    try:
        question_ids = json.loads(interview_session.question_ids) if interview_session.question_ids else []
    except Exception:
        question_ids = []
    
    current_index = interview_session.current_question_index or 0
    
    if current_index >= len(question_ids):
        return jsonify({'error': '面试已完成'}), 400
    
    current_q = Question.query.get(question_ids[current_index])
    if not current_q:
        return jsonify({'error': '题目不存在'}), 404
    
    hint_used = interview_session.hint_used or False
    
    user_msg = Message(session_id=session_id, role='user', content=user_answer)
    db.session.add(user_msg)
    
    code_output = None
    code_passed = None
    if current_q.code_question and user_answer.strip():
        sandbox_result = code_sandbox.run_code(user_answer, current_q.test_cases)
        code_output = json.dumps(sandbox_result.get('test_results', []), ensure_ascii=False)
        code_passed = sandbox_result.get('passed', False)
        
        if sandbox_result.get('error'):
            error_msg = f"⚠️ 代码执行提示: {sandbox_result['error']}"
            msg = Message(session_id=session_id, role='system', content=error_msg)
            db.session.add(msg)
    
    question_dict = {
        'id': current_q.id,
        'question': current_q.question,
        'keywords': current_q.keywords,
        'answer_points': current_q.answer_points,
        'code_question': current_q.code_question
    }
    eval_result = evaluator.evaluate(question_dict, user_answer)
    
    score = eval_result['score']
    feedback = eval_result['feedback']
    
    answer = InterviewAnswer(
        session_id=session_id,
        question_id=current_q.id,
        question_text=current_q.question,
        user_answer=user_answer,
        score=score,
        feedback=feedback,
        keywords_matched=json.dumps(eval_result.get('keywords_matched', []), ensure_ascii=False),
        keywords_missing=json.dumps(eval_result.get('keywords_missing', []), ensure_ascii=False),
        code_output=code_output,
        code_passed=code_passed,
        time_spent=time_spent,
        hint_used=hint_used
    )
    db.session.add(answer)
    
    feedback_msg = Message(session_id=session_id, role='interviewer', content=feedback)
    db.session.add(feedback_msg)
    
    interview_session.current_question_index = current_index + 1
    interview_session.hint_used = False
    session['question_start_time'] = datetime.now().timestamp()
    
    next_index = current_index + 1
    is_last = next_index >= len(question_ids)
    
    if is_last:
        db.session.commit()
        return jsonify({
            'evaluation': eval_result,
            'code_passed': code_passed,
            'code_output': code_output,
            'is_last': True,
            'next_question': None
        })
    
    next_q = Question.query.get(question_ids[next_index])
    next_msg = Message(session_id=session_id, role='interviewer', content=next_q.question)
    db.session.add(next_msg)
    db.session.commit()
    
    return jsonify({
        'evaluation': eval_result,
        'code_passed': code_passed,
        'code_output': code_output,
        'is_last': False,
        'next_question': {
            'id': next_q.id,
            'text': next_q.question,
            'type': next_q.question_type,
            'is_code': next_q.code_question,
            'index': next_index + 1
        }
    })

@app.route('/api/hint', methods=['POST'])
def get_hint():
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'error': '无效的会话'}), 400
    
    interview_session = InterviewSession.query.filter_by(session_id=session_id).first()
    if not interview_session or interview_session.status != 'in_progress':
        return jsonify({'error': '面试会话不存在或已结束'}), 404
    
    try:
        question_ids = json.loads(interview_session.question_ids) if interview_session.question_ids else []
    except Exception:
        question_ids = []
    
    current_index = interview_session.current_question_index or 0
    
    if current_index >= len(question_ids):
        return jsonify({'error': '面试已完成'}), 400
    
    current_q = Question.query.get(question_ids[current_index])
    if not current_q:
        return jsonify({'error': '题目不存在'}), 404
    
    if interview_session.hint_used:
        return jsonify({'error': '每题只能使用一次提示'}), 400
    
    interview_session.hint_used = True
    db.session.commit()
    
    hint = current_q.hint or '暂无提示'
    
    hint_msg = Message(
        session_id=session_id,
        role='system',
        content=f"💡 提示: {hint}"
    )
    db.session.add(hint_msg)
    db.session.commit()
    
    return jsonify({'hint': hint})

@app.route('/api/timeout', methods=['POST'])
def handle_timeout():
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'error': '无效的会话'}), 400
    
    interview_session = InterviewSession.query.filter_by(session_id=session_id).first()
    if not interview_session or interview_session.status != 'in_progress':
        return jsonify({'error': '面试会话不存在或已结束'}), 404
    
    try:
        question_ids = json.loads(interview_session.question_ids) if interview_session.question_ids else []
    except Exception:
        question_ids = []
    
    current_index = interview_session.current_question_index or 0
    
    if current_index >= len(question_ids):
        return jsonify({'error': '面试已完成'}), 400
    
    current_q = Question.query.get(question_ids[current_index])
    
    timeout_msg = "⏰ 时间到！本题答题时间已用完，将自动进入下一题。"
    msg = Message(session_id=session_id, role='system', content=timeout_msg)
    db.session.add(msg)
    
    answer = InterviewAnswer(
        session_id=session_id,
        question_id=current_q.id,
        question_text=current_q.question,
        user_answer='[超时未作答]',
        score=1,
        feedback='答题超时，未在规定时间内提交答案。',
        keywords_matched=json.dumps([], ensure_ascii=False),
        keywords_missing=current_q.keywords or json.dumps([], ensure_ascii=False),
        time_spent=0,
        hint_used=interview_session.hint_used or False
    )
    db.session.add(answer)
    
    interview_session.current_question_index = current_index + 1
    interview_session.hint_used = False
    session['question_start_time'] = datetime.now().timestamp()
    
    next_index = current_index + 1
    is_last = next_index >= len(question_ids)
    
    if is_last:
        db.session.commit()
        return jsonify({'is_last': True, 'next_question': None})
    
    next_q = Question.query.get(question_ids[next_index])
    next_msg = Message(session_id=session_id, role='interviewer', content=next_q.question)
    db.session.add(next_msg)
    db.session.commit()
    
    return jsonify({
        'is_last': False,
        'next_question': {
            'id': next_q.id,
            'text': next_q.question,
            'type': next_q.question_type,
            'is_code': next_q.code_question,
            'index': next_index + 1
        }
    })

@app.route('/api/finish', methods=['POST'])
def finish_interview():
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'error': '无效的会话'}), 400
    
    interview_session = InterviewSession.query.filter_by(session_id=session_id).first()
    if not interview_session:
        return jsonify({'error': '面试会话不存在'}), 404
    
    answers = InterviewAnswer.query.filter_by(session_id=session_id).all()
    answers_dict = [a.__dict__ for a in answers]
    
    overall_score = 0
    if answers:
        scores = [a.score for a in answers if a.score]
        overall_score = sum(scores) / len(scores) if scores else 0
        interview_session.overall_score = round(overall_score, 1)
    
    sentiment_result = sentiment_analyzer.analyze_session(answers_dict)
    interview_session.sentiment = sentiment_result['overall_sentiment']
    interview_session.confidence_score = sentiment_result['overall_confidence']
    
    weaknesses = evaluator.analyze_weaknesses(answers_dict)
    interview_session.weaknesses = json.dumps(weaknesses, ensure_ascii=False)
    
    interview_session.status = 'completed'
    interview_session.completed_at = datetime.now()
    
    score_stars = '⭐' * int(overall_score) + '☆' * (5 - int(overall_score))
    weaknesses_text = f"⚠️ 薄弱环节: {', '.join(weaknesses)}" if weaknesses else "✅ 表现优秀，没有明显薄弱环节！"
    
    finish_msg = f"""
🎉 面试结束！

📊 面试总结:
- 总体评分: {score_stars} ({overall_score:.1f}/5)
- 情感分析: {sentiment_result['overall_sentiment']}
- 自信程度: {sentiment_result['overall_confidence'] * 100:.0f}%

{weaknesses_text}

感谢您的参与！点击下方按钮查看详细报告。
    """.strip()
    
    msg = Message(session_id=session_id, role='system', content=finish_msg)
    db.session.add(msg)
    db.session.commit()
    
    session.clear()
    
    return jsonify({
        'session_id': session_id,
        'overall_score': round(overall_score, 1),
        'sentiment': sentiment_result['overall_sentiment'],
        'confidence_score': sentiment_result['overall_confidence'],
        'weaknesses': weaknesses
    })

@app.route('/report/<session_id>')
def view_report(session_id):
    interview_session = InterviewSession.query.filter_by(session_id=session_id).first()
    if not interview_session:
        return '报告不存在', 404
    
    answers = InterviewAnswer.query.filter_by(session_id=session_id).all()
    
    score_stats = {'avg': 0, 'max': 0, 'min': 0, 'count': len(answers)}
    if answers:
        scores = [a.score for a in answers if a.score is not None]
        if scores:
            score_stats['avg'] = round(sum(scores) / len(scores), 1)
            score_stats['max'] = max(scores)
            score_stats['min'] = min(scores)
    
    return render_template('report.html', session=interview_session, answers=answers, score_stats=score_stats)

@app.route('/api/report/pdf/<session_id>')
def download_pdf(session_id):
    interview_session = InterviewSession.query.filter_by(session_id=session_id).first()
    if not interview_session:
        return jsonify({'error': '报告不存在'}), 404
    
    answers = InterviewAnswer.query.filter_by(session_id=session_id).all()
    
    session_dict = {
        'position': interview_session.position,
        'difficulty': interview_session.difficulty,
        'pressure_mode': interview_session.pressure_mode,
        'started_at': interview_session.started_at.strftime('%Y-%m-%d %H:%M:%S'),
        'completed_at': interview_session.completed_at.strftime('%Y-%m-%d %H:%M:%S') if interview_session.completed_at else '-',
        'overall_score': interview_session.overall_score,
        'sentiment': interview_session.sentiment,
        'confidence_score': interview_session.confidence_score,
        'weaknesses': interview_session.weaknesses
    }
    
    answers_dict = []
    for a in answers:
        answers_dict.append({
            'question_text': a.question_text,
            'user_answer': a.user_answer,
            'score': a.score,
            'feedback': a.feedback,
            'keywords_matched': a.keywords_matched,
            'keywords_missing': a.keywords_missing,
            'code_passed': a.code_passed,
            'time_spent': a.time_spent,
            'hint_used': a.hint_used
        })
    
    pdf_data = pdf_generator.generate_report(session_dict, answers_dict)
    
    filename = f"面试报告_{interview_session.position}_{interview_session.started_at.strftime('%Y%m%d')}.pdf"
    
    return send_file(
        BytesIO(pdf_data),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )

@app.route('/api/history/download/<session_id>')
def download_history(session_id):
    messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
    interview_session = InterviewSession.query.filter_by(session_id=session_id).first()
    
    if not messages:
        return jsonify({'error': '历史记录不存在'}), 404
    
    output = StringIO()
    output.write("=" * 60 + "\n")
    output.write("AI面试官 - 面试对话历史记录\n")
    output.write("=" * 60 + "\n\n")
    
    if interview_session:
        output.write(f"岗位: {interview_session.position}\n")
        output.write(f"难度: {'高级' if interview_session.difficulty == 'senior' else '初级'}\n")
        output.write(f"模式: {'压力面试' if interview_session.pressure_mode else '普通模式'}\n")
        output.write(f"开始时间: {interview_session.started_at.strftime('%Y-%m-%d %H:%M:%S')}\n")
        if interview_session.completed_at:
            output.write(f"结束时间: {interview_session.completed_at.strftime('%Y-%m-%d %H:%M:%S')}\n")
            output.write(f"总体评分: {interview_session.overall_score}/5\n")
            output.write(f"情感分析: {interview_session.sentiment}\n")
        output.write("\n" + "-" * 60 + "\n\n")
    
    for msg in messages:
        role_name = {
            'system': '【系统】',
            'interviewer': '【面试官】',
            'user': '【你】'
        }.get(msg.role, msg.role)
        
        output.write(f"{role_name} ({msg.timestamp.strftime('%H:%M:%S')}):\n")
        output.write(f"{msg.content}\n\n")
    
    output.write("=" * 60 + "\n")
    output.write(f"记录生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    content = output.getvalue().encode('utf-8')
    filename = f"面试历史_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.txt"
    
    return send_file(
        BytesIO(content),
        mimetype='text/plain; charset=utf-8',
        as_attachment=True,
        download_name=filename
    )

@app.route('/upload', methods=['POST'])
def upload_questions():
    if 'file' not in request.files:
        return jsonify({'error': '请选择要上传的文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': '只支持JSON格式文件'}), 400
    
    try:
        file_content = file.read().decode('utf-8')
        questions_data = json.loads(file_content)
        
        if not isinstance(questions_data, list):
            return jsonify({'error': 'JSON文件格式错误，应为数组格式'}), 400
        
        custom_session_id = str(uuid.uuid4())
        session['custom_session_id'] = custom_session_id
        
        added_count = 0
        for q in questions_data:
            if 'question' not in q:
                continue
            
            question = Question(
                position=q.get('position', '自定义'),
                difficulty=q.get('difficulty', 'junior'),
                question_type=q.get('question_type', 'technical'),
                question=q['question'],
                keywords=json.dumps(q.get('keywords', []), ensure_ascii=False),
                answer_points=q.get('answer_points', ''),
                hint=q.get('hint', ''),
                code_question=q.get('code_question', False),
                test_cases=json.dumps(q.get('test_cases', []), ensure_ascii=False) if q.get('test_cases') else None,
                custom=True,
                user_session_id=custom_session_id
            )
            db.session.add(question)
            added_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'成功导入{added_count}道题目',
            'custom_bank_id': custom_session_id,
            'count': added_count
        })
        
    except json.JSONDecodeError:
        return jsonify({'error': 'JSON文件解析失败，请检查格式'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'上传失败: {str(e)}'}), 500

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if current_user.is_authenticated:
        return redirect(url_for('admin_dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(username=username).first()
        if admin and admin.check_password(password):
            login_user(admin)
            return redirect(url_for('admin_dashboard'))
        else:
            flash('用户名或密码错误', 'error')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
@login_required
def admin_logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/admin')
@login_required
def admin_dashboard():
    sessions = InterviewSession.query.order_by(InterviewSession.started_at.desc()).all()
    
    total_sessions = len(sessions)
    completed_sessions = len([s for s in sessions if s.status == 'completed'])
    avg_score = 0
    if completed_sessions > 0:
        scores = [s.overall_score for s in sessions if s.status == 'completed' and s.overall_score]
        avg_score = sum(scores) / len(scores) if scores else 0
    
    all_answers = InterviewAnswer.query.all()
    weakness_count = {}
    for answer in all_answers:
        if answer.keywords_missing:
            try:
                missing = json.loads(answer.keywords_missing)
                for kw in missing:
                    weakness_count[kw] = weakness_count.get(kw, 0) + 1
            except Exception:
                pass
    
    common_errors = sorted(weakness_count.items(), key=lambda x: x[1], reverse=True)[:10]
    
    position_stats = {}
    for s in sessions:
        if s.position not in position_stats:
            position_stats[s.position] = {'total': 0, 'completed': 0, 'avg_score': 0}
        position_stats[s.position]['total'] += 1
        if s.status == 'completed':
            position_stats[s.position]['completed'] += 1
            if s.overall_score:
                position_stats[s.position]['avg_score'] += s.overall_score
    
    for pos in position_stats:
        if position_stats[pos]['completed'] > 0:
            position_stats[pos]['avg_score'] /= position_stats[pos]['completed']
    
    difficulty_stats = {}
    for s in sessions:
        diff = s.difficulty
        if diff not in difficulty_stats:
            difficulty_stats[diff] = {'total': 0, 'completed': 0}
        difficulty_stats[diff]['total'] += 1
        if s.status == 'completed':
            difficulty_stats[diff]['completed'] += 1
    
    return render_template('admin_dashboard.html',
                           sessions=sessions,
                           total_sessions=total_sessions,
                           completed_sessions=completed_sessions,
                           avg_score=round(avg_score, 2),
                           common_errors=common_errors,
                           position_stats=position_stats,
                           difficulty_stats=difficulty_stats)

@app.route('/admin/session/<session_id>')
@login_required
def admin_view_session(session_id):
    interview_session = InterviewSession.query.filter_by(session_id=session_id).first()
    if not interview_session:
        return '会话不存在', 404
    
    answers = InterviewAnswer.query.filter_by(session_id=session_id).all()
    messages = Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
    
    return render_template('admin_session.html',
                           session=interview_session,
                           answers=answers,
                           messages=messages)

@app.route('/interview')
def interview_page():
    return render_template('interview.html')

@app.route('/api/run-code', methods=['POST'])
def run_code():
    data = request.json
    code = data.get('code', '')
    test_cases = data.get('test_cases')
    
    result = code_sandbox.run_code(code, test_cases)
    return jsonify(result)

with app.app_context():
    init_database()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
