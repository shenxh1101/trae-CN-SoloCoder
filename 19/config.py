import os
import secrets
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    CHUNK_FOLDER = os.path.join(BASE_DIR, 'chunks')
    DATA_FOLDER = os.path.join(BASE_DIR, 'data')
    
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024 * 1024
    MAX_SINGLE_FILE_SIZE = 10 * 1024 * 1024 * 1024
    
    CHUNK_SIZE = 5 * 1024 * 1024
    
    MAX_RETRY_ATTEMPTS = 5
    LOCK_DURATION = timedelta(minutes=10)
    
    SHORT_CODE_LENGTH = 8
    EXTRACT_CODE_LENGTH = 6
    ADMIN_KEY_LENGTH = 16
    
    FILES_JSON = os.path.join(DATA_FOLDER, 'files.json')
    API_TOKENS_JSON = os.path.join(DATA_FOLDER, 'api_tokens.json')
    LOCKED_LINKS_JSON = os.path.join(DATA_FOLDER, 'locked_links.json')
    ADMIN_KEYS_JSON = os.path.join(DATA_FOLDER, 'admin_keys.json')
    
    ALLOWED_PREVIEW_EXTENSIONS = {
        'image': {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'},
        'pdf': {'pdf'},
        'text': {'txt', 'log', 'csv', 'json', 'xml', 'yaml', 'yml', 'ini', 'cfg'},
        'markdown': {'md', 'markdown'},
        'code': {'py', 'js', 'ts', 'html', 'css', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'rb', 'php', 'sh', 'bash'}
    }
    
    DEFAULT_ADMIN_KEY = 'admin123456'
    
    EXPIRATION_OPTIONS = {
        '1d': timedelta(days=1),
        '7d': timedelta(days=7),
        '30d': timedelta(days=30),
        'never': None
    }
