import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
REPORTS_FOLDER = os.path.join(BASE_DIR, 'reports')
TEMP_FOLDER = os.path.join(BASE_DIR, 'temp')
CHUNK_SIZE = 8192

ALLOWED_EXTENSIONS = {'txt', 'md5', 'sha1', 'sha256'}

ADMIN_PASSWORD = 'admin123'

SECRET_KEY = 'your-secret-key-here-change-in-production'

MAX_CONTENT_LENGTH = 500 * 1024 * 1024

for folder in [UPLOAD_FOLDER, REPORTS_FOLDER, TEMP_FOLDER]:
    os.makedirs(folder, exist_ok=True)
