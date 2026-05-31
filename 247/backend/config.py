import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-dev-secret')
    JSON_SORT_KEYS = False
    
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')
    
    LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'mock')
    LLM_API_KEY = os.getenv('LLM_API_KEY', '')
    LLM_BASE_URL = os.getenv('LLM_BASE_URL', 'https://api.openai.com/v1')
    LLM_MODEL = os.getenv('LLM_MODEL', 'gpt-3.5-turbo')
    LLM_TEMPERATURE = float(os.getenv('LLM_TEMPERATURE', '0.7'))
    LLM_MAX_TOKENS = int(os.getenv('LLM_MAX_TOKENS', '1000'))
    
    MATCH_THRESHOLD = float(os.getenv('MATCH_THRESHOLD', '0.6'))
    BACKUP_INTERVAL_HOURS = int(os.getenv('BACKUP_INTERVAL_HOURS', '24'))
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    BACKUP_DIR = os.path.join(DATA_DIR, 'backups')
    
    KNOWLEDGE_BASE_FILE = os.path.join(DATA_DIR, 'knowledge_base.json')
    CONVERSATION_HISTORY_FILE = os.path.join(DATA_DIR, 'conversation_history.json')
    MISSED_QUESTIONS_FILE = os.path.join(DATA_DIR, 'missed_questions.json')
