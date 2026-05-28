import json
import os
import time
from threading import Lock
from datetime import datetime
from config import Config

class Logger:
    def __init__(self):
        self.log_file = Config.LOG_FILE
        self.max_lines = Config.LOG_MAX_LINES
        self.lock = Lock()
    
    def log(self, **kwargs):
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'timestamp_unix': time.time()
        }
        log_entry.update(kwargs)
        
        with self.lock:
            try:
                with open(self.log_file, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
                self._trim_log()
            except:
                pass
    
    def _trim_log(self):
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if len(lines) > self.max_lines:
                lines = lines[-self.max_lines:]
                with open(self.log_file, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
        except:
            pass
    
    def get_logs(self, limit=100, offset=0):
        with self.lock:
            try:
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                logs = []
                for line in reversed(lines):
                    try:
                        logs.append(json.loads(line.strip()))
                    except:
                        pass
                
                return logs[offset:offset + limit]
            except:
                return []
    
    def clear_logs(self):
        with self.lock:
            try:
                os.remove(self.log_file)
            except:
                pass

logger = Logger()
