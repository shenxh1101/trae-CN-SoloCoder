import os
import json
from datetime import datetime
from config import HISTORY_FILE
from task_queue import ProcessingTask


class HistoryManager:
    def __init__(self):
        self.history_file = HISTORY_FILE
        self.history = []
        self.load_history()

    def load_history(self):
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.history = data.get('history', [])
            except Exception as e:
                print(f"加载历史记录失败: {e}")
                self.history = []
        else:
            self.history = []

    def save_history(self):
        try:
            os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump({'history': self.history}, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存历史记录失败: {e}")

    def add_record(self, name, tasks):
        record = {
            'id': datetime.now().strftime('%Y%m%d_%H%M%S'),
            'name': name,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'tasks': [task.to_dict() for task in tasks]
        }
        self.history.insert(0, record)
        if len(self.history) > 50:
            self.history = self.history[:50]
        self.save_history()
        return record['id']

    def get_history(self):
        return self.history

    def get_record(self, record_id):
        for record in self.history:
            if record['id'] == record_id:
                return record
        return None

    def delete_record(self, record_id):
        self.history = [r for r in self.history if r['id'] != record_id]
        self.save_history()

    def clear_history(self):
        self.history = []
        self.save_history()

    def get_tasks_from_record(self, record_id):
        record = self.get_record(record_id)
        if record:
            return [ProcessingTask.from_dict(t) for t in record['tasks']]
        return []

    def update_record_name(self, record_id, new_name):
        for record in self.history:
            if record['id'] == record_id:
                record['name'] = new_name
                self.save_history()
                return True
        return False
