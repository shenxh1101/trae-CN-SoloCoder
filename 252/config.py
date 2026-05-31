import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-2024'
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}
    RESUME_SNIPPETS_FILE = 'data/resume_snippets.json'
    ANALYSIS_HISTORY_FILE = 'data/analysis_history.json'
