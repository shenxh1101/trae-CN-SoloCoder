from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

db = SQLAlchemy()

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    position = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(db.String(20), default='junior')
    question_type = db.Column(db.String(50), default='technical')
    question = db.Column(db.Text, nullable=False)
    keywords = db.Column(db.Text)
    answer_points = db.Column(db.Text)
    hint = db.Column(db.String(500))
    code_question = db.Column(db.Boolean, default=False)
    test_cases = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    custom = db.Column(db.Boolean, default=False)
    user_session_id = db.Column(db.String(100))

class InterviewSession(db.Model):
    __tablename__ = 'interview_sessions'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    position = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(db.String(20), default='junior')
    pressure_mode = db.Column(db.Boolean, default=False)
    time_per_question = db.Column(db.Integer, default=120)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='in_progress')
    overall_score = db.Column(db.Float)
    sentiment = db.Column(db.String(50))
    confidence_score = db.Column(db.Float)
    weaknesses = db.Column(db.Text)
    question_ids = db.Column(db.Text)
    current_question_index = db.Column(db.Integer, default=0)
    hint_used = db.Column(db.Boolean, default=False)

class InterviewAnswer(db.Model):
    __tablename__ = 'interview_answers'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'))
    question_text = db.Column(db.Text, nullable=False)
    user_answer = db.Column(db.Text)
    score = db.Column(db.Integer)
    feedback = db.Column(db.Text)
    keywords_matched = db.Column(db.Text)
    keywords_missing = db.Column(db.Text)
    code_output = db.Column(db.Text)
    code_passed = db.Column(db.Boolean)
    time_spent = db.Column(db.Integer)
    hint_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    question = db.relationship('Question', backref='answers')

class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Admin(UserMixin, db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
