import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CACHE_DIR = os.path.join(DATA_DIR, 'cache')
LOGS_DIR = os.path.join(DATA_DIR, 'logs')
CERTS_DIR = os.path.join(DATA_DIR, 'certs')

for directory in [DATA_DIR, CACHE_DIR, LOGS_DIR, CERTS_DIR]:
    os.makedirs(directory, exist_ok=True)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    HOST = '0.0.0.0'
    PORT = 8888
    
    CACHE_ENABLED = True
    CACHE_TTL = 300
    CACHE_DIR = CACHE_DIR
    
    LOG_FILE = os.path.join(LOGS_DIR, 'proxy.log')
    LOG_MAX_LINES = 10000
    
    RATE_LIMIT_ENABLED = True
    RATE_LIMIT_MAX_REQUESTS = 100
    RATE_LIMIT_WINDOW = 60
    
    ADMIN_USERNAME = 'admin'
    ADMIN_PASSWORD = 'admin123'
    
    HTTPS_ENABLED = False
    HTTPS_CERT = os.path.join(CERTS_DIR, 'cert.pem')
    HTTPS_KEY = os.path.join(CERTS_DIR, 'key.pem')
    
    RULES_FILE = os.path.join(DATA_DIR, 'rules.json')
