import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
METADATA_DIR = os.path.join(BASE_DIR, 'metadata')
TEMP_DIR = os.path.join(BASE_DIR, 'temp')

MAX_FILE_SIZE = 100 * 1024 * 1024
MAX_UPLOADS_PER_HOUR = 10

ALLOWED_EXTENSIONS = {
    'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'tar', 'gz',
    'mp3', 'wav', 'ogg', 'flac',
    'mp4', 'avi', 'mkv', 'mov', 'webm',
    'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'c', 'cpp', 'h',
    'md', 'rtf'
}

PREVIEWABLE_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
    'pdf',
    'txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'c', 'cpp', 'h', 'rtf'
}

EXPIRY_OPTIONS = {
    '1h': timedelta(hours=1),
    '1d': timedelta(days=1),
    '7d': timedelta(days=7),
    'never': None
}

SHORT_CODE_LENGTH = 8
MANAGE_KEY_LENGTH = 16

SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', '')
SMTP_USE_TLS = os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true'

CLEANUP_INTERVAL = 3600

for directory in [UPLOAD_DIR, METADATA_DIR, TEMP_DIR]:
    os.makedirs(directory, exist_ok=True)
