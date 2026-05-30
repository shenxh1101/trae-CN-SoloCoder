import json
import os
from typing import Optional


class Config:
    DEFAULT_CONFIG = {
        "api_url": "http://localhost:11434/v1",
        "api_key": "",
        "model": "qwen2.5-coder:7b",
        "backend_type": "openai",
        "comment_style": "",
        "comment_lang": "en",
        "skip_commented": True,
        "author": "",
        "date": "",
        "template": "",
        "template_file": "",
        "ignore_patterns": [],
        "output_dir": "",
        "log_file": "annotation_log.json",
        "feedback_file": "annotation_feedback.json",
        "complex_logic_threshold": 8,
    }

    def __init__(self, config_file: str = None):
        self._config = dict(self.DEFAULT_CONFIG)
        if config_file and os.path.exists(config_file):
            self._load(config_file)

    def _load(self, config_file: str):
        with open(config_file, 'r', encoding='utf-8') as f:
            user_config = json.load(f)
        self._config.update(user_config)

    def get(self, key: str, default=None):
        return self._config.get(key, default)

    def set(self, key: str, value):
        self._config[key] = value

    def update(self, overrides: dict):
        for k, v in overrides.items():
            if v is not None:
                self._config[k] = v

    def save(self, config_file: str):
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(self._config, f, ensure_ascii=False, indent=2)

    def to_dict(self) -> dict:
        return dict(self._config)

    @classmethod
    def create_default_config(cls, config_file: str):
        config = cls()
        config.save(config_file)
