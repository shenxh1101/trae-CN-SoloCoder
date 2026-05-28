import hashlib
import json
import os
import time
from threading import Lock
from config import Config

class CacheManager:
    def __init__(self):
        self.cache_dir = Config.CACHE_DIR
        self.enabled = Config.CACHE_ENABLED
        self.default_ttl = Config.CACHE_TTL
        self.lock = Lock()
    
    def _get_cache_key(self, method, url, params=None):
        key_str = f"{method}:{url}:{json.dumps(params or {}, sort_keys=True)}"
        return hashlib.md5(key_str.encode('utf-8')).hexdigest()
    
    def _get_cache_file(self, cache_key):
        return os.path.join(self.cache_dir, f"{cache_key}.json")
    
    def get(self, method, url, params=None):
        if not self.enabled or method.upper() != 'GET':
            return None
        
        cache_key = self._get_cache_key(method, url, params)
        cache_file = self._get_cache_file(cache_key)
        
        with self.lock:
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, 'r', encoding='utf-8') as f:
                        cache_data = json.load(f)
                    
                    if time.time() < cache_data['expires_at']:
                        return cache_data['response']
                    else:
                        os.remove(cache_file)
                except:
                    pass
        return None
    
    def set(self, method, url, params=None, response=None, ttl=None):
        if not self.enabled or method.upper() != 'GET':
            return
        
        cache_key = self._get_cache_key(method, url, params)
        cache_file = self._get_cache_file(cache_key)
        ttl = ttl or self.default_ttl
        
        cache_data = {
            'response': response,
            'expires_at': time.time() + ttl,
            'created_at': time.time()
        }
        
        with self.lock:
            try:
                with open(cache_file, 'w', encoding='utf-8') as f:
                    json.dump(cache_data, f)
            except:
                pass
    
    def clear(self):
        with self.lock:
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.json'):
                    try:
                        os.remove(os.path.join(self.cache_dir, filename))
                    except:
                        pass
    
    def clear_expired(self):
        with self.lock:
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.cache_dir, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            cache_data = json.load(f)
                        if time.time() >= cache_data['expires_at']:
                            os.remove(filepath)
                    except:
                        pass

cache_manager = CacheManager()
