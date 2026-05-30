import hashlib
import os
from typing import Dict, List, Optional, Callable
from config import CHUNK_SIZE
import threading

class HashProgress:
    def __init__(self):
        self.progress = {}
        self.status = {}
        self.results = {}
        self._lock = threading.Lock()

    def update(self, task_id: str, percent: float, status: str = 'processing'):
        with self._lock:
            self.progress[task_id] = percent
            self.status[task_id] = status

    def get(self, task_id: str) -> Optional[float]:
        with self._lock:
            return self.progress.get(task_id)

    def get_status(self, task_id: str) -> Optional[str]:
        with self._lock:
            return self.status.get(task_id)

    def set_result(self, task_id: str, result: any):
        with self._lock:
            self.results[task_id] = result
            self.status[task_id] = 'completed'

    def get_result(self, task_id: str) -> Optional[any]:
        with self._lock:
            return self.results.get(task_id)

    def set_error(self, task_id: str, error: str):
        with self._lock:
            self.status[task_id] = 'error'
            self.progress[task_id] = 0
            if task_id in self.results:
                self.results[task_id] = {'error': error}
            else:
                self.results[task_id] = {'error': error}

    def remove(self, task_id: str):
        with self._lock:
            for d in [self.progress, self.status, self.results]:
                if task_id in d:
                    del d[task_id]

    def cleanup_old(self, max_age: int = 300):
        pass

hash_progress = HashProgress()

def calculate_file_hash(file_path: str, algorithms: List[str] = None, task_id: str = None, progress_callback: Callable = None) -> Dict[str, str]:
    if algorithms is None:
        algorithms = ['md5', 'sha1', 'sha256']
    
    hashers = {}
    for algo in algorithms:
        algo_lower = algo.lower()
        if algo_lower == 'md5':
            hashers[algo_lower] = hashlib.md5()
        elif algo_lower == 'sha1':
            hashers[algo_lower] = hashlib.sha1()
        elif algo_lower == 'sha256':
            hashers[algo_lower] = hashlib.sha256()
        elif algo_lower == 'sha512':
            hashers[algo_lower] = hashlib.sha512()
    
    file_size = os.path.getsize(file_path)
    bytes_read = 0
    
    with open(file_path, 'rb') as f:
        while chunk := f.read(CHUNK_SIZE):
            for hasher in hashers.values():
                hasher.update(chunk)
            bytes_read += len(chunk)
            if task_id and file_size > 0:
                percent = (bytes_read / file_size) * 100
                hash_progress.update(task_id, round(percent))
                if progress_callback:
                    progress_callback(percent)
    
    result = {algo: hasher.hexdigest() for algo, hasher in hashers.items()}
    if task_id:
        hash_progress.update(task_id, 100.0)
    
    return result

def verify_file_hash(file_path: str, expected_hash: str) -> Dict:
    expected_hash = expected_hash.strip().lower()
    hash_length = len(expected_hash)
    
    if hash_length == 32:
        algo = 'md5'
    elif hash_length == 40:
        algo = 'sha1'
    elif hash_length == 64:
        algo = 'sha256'
    elif hash_length == 128:
        algo = 'sha512'
    else:
        return {
            'success': False,
            'error': '无法识别哈希算法，请确保哈希长度 (32=MD5, 40=SHA1, 64=SHA256, 128=SHA512)'
        }
    
    actual_hash = calculate_file_hash(file_path, [algo])[algo]
    is_match = actual_hash == expected_hash
    
    return {
        'success': True,
        'algorithm': algo.upper(),
        'expected_hash': expected_hash,
        'actual_hash': actual_hash,
        'match': is_match
    }

def generate_hash_manifest(file_paths: List[str], algorithm: str = 'md5') -> str:
    lines = []
    for file_path in file_paths:
        if os.path.exists(file_path):
            hash_value = calculate_file_hash(file_path, [algorithm])[algorithm.lower()]
            filename = os.path.basename(file_path)
            lines.append(f"{hash_value}  {filename}")
    return '\n'.join(lines)

def parse_hash_manifest(manifest_content: str) -> List[Dict[str, str]]:
    results = []
    for line in manifest_content.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split(None, 1)
        if len(parts) == 2:
            results.append({
                'hash': parts[0],
                'filename': parts[1]
            })
    return results

def verify_folder_from_manifest(folder_path: str, manifest_content: str) -> List[Dict]:
    manifest_entries = parse_hash_manifest(manifest_content)
    results = []
    
    for entry in manifest_entries:
        file_path = os.path.join(folder_path, entry['filename'])
        result = {
            'filename': entry['filename'],
            'expected_hash': entry['hash'],
            'status': '通过',
            'actual_hash': ''
        }
        
        if not os.path.exists(file_path):
            result['status'] = '文件不存在'
            result['actual_hash'] = 'N/A'
        else:
            verify_result = verify_file_hash(file_path, entry['hash'])
            if verify_result['success']:
                result['actual_hash'] = verify_result['actual_hash']
                if not verify_result['match']:
                    result['status'] = '不匹配'
            else:
                result['status'] = verify_result['error']
                result['actual_hash'] = 'N/A'
        
        results.append(result)
    
    return results
