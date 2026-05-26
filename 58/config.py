import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    BASE_DIR = BASE_DIR
    SECRET_KEY = 'dev-secret-key-change-in-production'
    JSON_CONFIG_PATH = os.path.join(BASE_DIR, 'data', 'urls.json')
    MAX_RECORDS_PER_URL = 20
    CONSECUTIVE_FAILURES_FOR_NOTIFICATION = 3
    ANOMALY_THRESHOLD_MULTIPLIER = 3
    NOTIFICATION_COOLDOWN_SECONDS = 300
    
    SMTP_HOST = 'smtp.example.com'
    SMTP_PORT = 587
    SMTP_USERNAME = ''
    SMTP_PASSWORD = ''
    SMTP_USE_TLS = True
    SMTP_FROM_EMAIL = 'noreply@example.com'
    
    DEFAULT_TIMEOUT = 10
    DEFAULT_INTERVAL = 60
    DEFAULT_EXPECTED_STATUS = '200'
