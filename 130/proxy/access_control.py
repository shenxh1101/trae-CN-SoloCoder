from flask import request, jsonify
from threading import Lock
from .rules import rule_manager

class AccessControl:
    def __init__(self):
        self.lock = Lock()
    
    def check_access(self, rule):
        if not rule:
            return True, None
        
        ip_whitelist = rule.get('ip_whitelist', [])
        api_key = rule.get('api_key')
        
        client_ip = self._get_client_ip()
        
        if ip_whitelist:
            if client_ip not in ip_whitelist:
                response = jsonify({'error': 'Access denied: IP not allowed'})
                response.status_code = 403
                return False, response
        
        if api_key:
            request_key = request.headers.get('X-API-Key') or request.args.get('api_key')
            if request_key != api_key:
                response = jsonify({'error': 'Access denied: Invalid API key'})
                response.status_code = 401
                return False, response
        
        return True, None
    
    def _get_client_ip(self):
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        return request.remote_addr

access_control = AccessControl()
