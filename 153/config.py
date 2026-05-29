import os
from dataclasses import dataclass


@dataclass
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024
    SCREENSHOT_DIR = 'screenshots'
    SCREENSHOT_TIMEOUT = 60
    MAX_BATCH_URLS = 20
    HISTORY_LIMIT = 10
    DEFAULT_QUALITY = 80
    DEFAULT_DELAY = 0
    DEFAULT_DEVICE = 'desktop'
    CLEANUP_INTERVAL = 3600

    SMTP_HOST = os.environ.get('SMTP_HOST', '')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USER = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SMTP_USE_TLS = os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true'
    SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER)

    DEVICE_PRESETS = {
        'mobile': {
            'width': 375,
            'height': 667,
            'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            'device_scale_factor': 2,
            'has_touch': True
        },
        'tablet': {
            'width': 768,
            'height': 1024,
            'user_agent': 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/604.1',
            'device_scale_factor': 2,
            'has_touch': True
        },
        'desktop': {
            'width': 1920,
            'height': 1080,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'device_scale_factor': 1,
            'has_touch': False
        }
    }
