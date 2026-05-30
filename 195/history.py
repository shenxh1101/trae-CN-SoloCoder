#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime


class HistoryManager:
    def __init__(self, history_file, max_entries=10):
        self.history_file = Path(history_file)
        self.max_entries = max_entries
        self.history_file.parent.mkdir(parents=True, exist_ok=True)
        self.history = self._load()

    def _load(self):
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def save(self):
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, indent=2, ensure_ascii=False)

    def add_entry(self, image_path, source="local", monitor="primary"):
        entry = {
            "path": str(image_path),
            "source": source,
            "monitor": monitor,
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        self.history.insert(0, entry)
        if len(self.history) > self.max_entries:
            self.history = self.history[:self.max_entries]
        self.save()

    def get_recent(self, count=10):
        return self.history[:min(count, self.max_entries)]

    def get_last(self):
        return self.history[0] if self.history else None

    def clear(self):
        self.history = []
        self.save()
