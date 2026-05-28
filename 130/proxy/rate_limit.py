import time
from threading import Lock
from flask import request, jsonify
from config import Config

class RateLimiter:
    def __init__(self):
        self.enabled = Config.RATE_LIMIT_ENABLED
        self.max_requests = Config.RATE_LIMIT_MAX_REQUESTS
        self.window = Config.RATE_LIMIT_WINDOW
        self.requests = {}
        self.lock = Lock()
    
    def check_rate_limit(self):
        if not self.enabled:
            return True, None
        
        client_ip = self._get_client_ip()
        now = time.time()
        
        with self.lock:
            if client_ip not in self.requests:
                self.requests[client_ip] = []
            
            self.requests[client_ip] = [
                t for t in self.requests[client_ip]
                if now - t < self.window
            ]
            
            if len(self.requests[client_ip]) >= self.max_requests:
                response = jsonify({'error': 'Too many requests'})
                response.status_code = 429
                return False, response
            
            self.requests[client_ip].append(now)
        
        return True, None
    
    def _get_client_ip(self):
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        return request.remote_addr

rate_limiter = RateLimiter()
