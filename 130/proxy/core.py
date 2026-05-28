import time
import requests
from flask import request, Response, jsonify
from urllib.parse import urljoin
from .rules import rule_manager
from .cache import cache_manager
from .logger import logger
from .access_control import access_control
from .rate_limit import rate_limiter

class Proxy:
    def __init__(self):
        self.session = requests.Session()
    
    def _get_client_ip(self):
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        return request.remote_addr
    
    def _filter_headers(self, headers, rule):
        filtered = {}
        include_headers = rule.get('include_headers', [])
        exclude_headers = rule.get('exclude_headers', [])
        
        hop_by_hop = ['connection', 'keep-alive', 'proxy-authenticate', 
                      'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade']
        
        for key, value in headers.items():
            key_lower = key.lower()
            
            if key_lower in hop_by_hop:
                continue
            
            if key_lower == 'host':
                continue
            
            if include_headers:
                if key_lower not in [h.lower() for h in include_headers]:
                    continue
            
            if exclude_headers:
                if key_lower in [h.lower() for h in exclude_headers]:
                    continue
            
            filtered[key] = value
        
        return filtered
    
    def _modify_response_body(self, content, rule):
        replacements = rule.get('response_replacements', [])
        if not replacements:
            return content
        
        try:
            content_str = content.decode('utf-8') if isinstance(content, bytes) else content
            for repl in replacements:
                old = repl.get('old', '')
                new = repl.get('new', '')
                if old:
                    content_str = content_str.replace(old, new)
            return content_str.encode('utf-8') if isinstance(content, bytes) else content_str
        except:
            return content
    
    def forward_request(self, path):
        start_time = time.time()
        client_ip = self._get_client_ip()
        method = request.method
        
        allowed, rate_response = rate_limiter.check_rate_limit()
        if not allowed:
            logger.log(
                client_ip=client_ip,
                method=method,
                path=path,
                target_url=None,
                status_code=rate_response.status_code,
                duration_ms=0,
                error='Rate limit exceeded'
            )
            return rate_response
        
        rule, path_params, extra_path = rule_manager.match_rule('/' + path)
        
        if not rule:
            logger.log(
                client_ip=client_ip,
                method=method,
                path='/' + path,
                target_url=None,
                status_code=404,
                duration_ms=0,
                error='No matching rule'
            )
            return jsonify({'error': 'No matching proxy rule'}), 404
        
        allowed, access_response = access_control.check_access(rule)
        if not allowed:
            logger.log(
                client_ip=client_ip,
                method=method,
                path='/' + path,
                target_url=None,
                status_code=access_response.status_code,
                duration_ms=0,
                error='Access denied'
            )
            return access_response
        
        target_url = rule_manager.build_target_url(rule, path_params, extra_path)
        if not target_url:
            logger.log(
                client_ip=client_ip,
                method=method,
                path='/' + path,
                target_url=None,
                status_code=500,
                duration_ms=0,
                error='Invalid target URL'
            )
            return jsonify({'error': 'Invalid target URL'}), 500
        
        query_string = request.query_string.decode('utf-8')
        if query_string:
            target_url = target_url + ('&' if '?' in target_url else '?') + query_string
        
        cache_key = f"{method}:{target_url}"
        if method == 'GET' and rule.get('cache_enabled', False):
            cached = cache_manager.get(method, target_url)
            if cached:
                duration = int((time.time() - start_time) * 1000)
                logger.log(
                    client_ip=client_ip,
                    method=method,
                    path='/' + path,
                    target_url=target_url,
                    status_code=cached.get('status_code', 200),
                    duration_ms=duration,
                    cached=True
                )
                return Response(
                    cached['content'],
                    status=cached.get('status_code', 200),
                    headers=cached.get('headers', {})
                )
        
        try:
            headers = self._filter_headers(dict(request.headers), rule)
            
            if request.method in ['GET', 'HEAD']:
                data = None
            else:
                data = request.get_data()
            
            response = self.session.request(
                method=method,
                url=target_url,
                headers=headers,
                data=data,
                params=None,
                allow_redirects=False,
                stream=True,
                timeout=30
            )
            
            response_headers = dict(response.headers)
            for h in ['content-encoding', 'transfer-encoding', 'content-length']:
                response_headers.pop(h, None)
            
            response_content = response.content
            response_content = self._modify_response_body(response_content, rule)
            
            if method == 'GET' and rule.get('cache_enabled', False):
                cache_ttl = rule.get('cache_ttl')
                cache_manager.set(
                    method, target_url, None,
                    response={
                        'content': response_content.decode('utf-8', errors='replace') if isinstance(response_content, bytes) else response_content,
                        'status_code': response.status_code,
                        'headers': response_headers
                    },
                    ttl=cache_ttl
                )
            
            duration = int((time.time() - start_time) * 1000)
            logger.log(
                client_ip=client_ip,
                method=method,
                path='/' + path,
                target_url=target_url,
                status_code=response.status_code,
                duration_ms=duration,
                cached=False
            )
            
            return Response(
                response_content,
                status=response.status_code,
                headers=response_headers
            )
            
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            logger.log(
                client_ip=client_ip,
                method=method,
                path='/' + path,
                target_url=target_url,
                status_code=502,
                duration_ms=duration,
                error=str(e)
            )
            return jsonify({'error': f'Proxy error: {str(e)}'}), 502

proxy = Proxy()
