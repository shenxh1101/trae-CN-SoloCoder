import threading
import time
import uuid
import logging
from collections import OrderedDict
from datetime import datetime

logger = logging.getLogger(__name__)


class Task:
    STATUS_PENDING = 'pending'
    STATUS_RUNNING = 'running'
    STATUS_PAUSED = 'paused'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    STATUS_CANCELLED = 'cancelled'

    def __init__(self, task_id, config):
        self.task_id = task_id
        self.config = config
        self.status = self.STATUS_PENDING
        self.progress = 0
        self.error = None
        self.created_at = time.time()
        self.started_at = None
        self.completed_at = None
        self.results = []
        self.crawler = None
        self.thread = None

    def to_dict(self):
        return {
            'task_id': self.task_id,
            'url': self.config.get('url', ''),
            'status': self.status,
            'progress': self.progress,
            'error': self.error,
            'created_at': datetime.fromtimestamp(self.created_at).strftime('%Y-%m-%d %H:%M:%S'),
            'started_at': datetime.fromtimestamp(self.started_at).strftime('%Y-%m-%d %H:%M:%S') if self.started_at else None,
            'completed_at': datetime.fromtimestamp(self.completed_at).strftime('%Y-%m-%d %H:%M:%S') if self.completed_at else None,
            'max_depth': self.config.get('max_depth', 2),
            'keywords': self.config.get('keywords', []),
            'result_count': len(self.results),
            'config': self.config,
        }


class TaskManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self._tasks = OrderedDict()
        self._lock = threading.RLock()
        self._max_tasks = 10

    def create_task(self, config):
        task_id = str(uuid.uuid4())[:8]
        config['task_id'] = task_id
        task = Task(task_id, config)
        with self._lock:
            self._tasks[task_id] = task
        return task

    def start_task(self, task_id):
        from crawler import Crawler
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            if task.status not in (Task.STATUS_PENDING, Task.STATUS_PAUSED):
                return False

        if task.status == Task.STATUS_PENDING:
            crawler = Crawler(task.config, self)
            task.crawler = crawler
            task.status = Task.STATUS_RUNNING
            task.started_at = time.time()
            task.thread = threading.Thread(target=self._run_crawler, args=(task_id,), daemon=True)
            task.thread.start()
        elif task.status == Task.STATUS_PAUSED:
            if task.crawler:
                task.crawler.resume()
                task.status = Task.STATUS_RUNNING

        return True

    def _run_crawler(self, task_id):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task or not task.crawler:
                return
        try:
            task.crawler.crawl()
            task.results = task.crawler.get_results()
        except Exception as e:
            task.error = str(e)
            task.status = Task.STATUS_FAILED
        finally:
            if task.status == Task.STATUS_RUNNING:
                if task.crawler and task.crawler.is_cancelled:
                    task.status = Task.STATUS_CANCELLED
                else:
                    task.status = Task.STATUS_COMPLETED
            task.completed_at = time.time()

    def pause_task(self, task_id):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task or task.status != Task.STATUS_RUNNING:
                return False
            if task.crawler:
                task.crawler.pause()
                task.status = Task.STATUS_PAUSED
                return True
        return False

    def resume_task(self, task_id):
        return self.start_task(task_id)

    def cancel_task(self, task_id):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            if task.status in (Task.STATUS_RUNNING, Task.STATUS_PAUSED):
                if task.crawler:
                    task.crawler.cancel()
                task.status = Task.STATUS_CANCELLED
                task.completed_at = time.time()
                return True
            elif task.status == Task.STATUS_PENDING:
                task.status = Task.STATUS_CANCELLED
                task.completed_at = time.time()
                return True
        return False

    def delete_task(self, task_id):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            if task.status in (Task.STATUS_RUNNING, Task.STATUS_PAUSED):
                if task.crawler:
                    task.crawler.cancel()
                if task.thread and task.thread.is_alive():
                    task.thread.join(timeout=2)
            del self._tasks[task_id]
            return True

    def update_task(self, task_id, status, progress=None, error=None):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            task.status = status
            if progress is not None:
                task.progress = progress
            if error:
                task.error = error

    def get_task(self, task_id):
        with self._lock:
            return self._tasks.get(task_id)

    def get_all_tasks(self):
        with self._lock:
            return list(self._tasks.values())

    def get_task_results(self, task_id):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return []
            return task.results

    def search_results(self, task_id, keyword):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return []
            keyword_lower = keyword.lower()
            return [
                r for r in task.results
                if keyword_lower in r.get('title', '').lower()
                or keyword_lower in r.get('summary', '').lower()
                or keyword_lower in r.get('url', '').lower()
            ]
