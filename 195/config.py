#!/usr/bin/env python3
import json
import os
from pathlib import Path


class Config:
    def __init__(self, config_path=None):
        if config_path is None:
            home = Path.home()
            self.config_dir = home / ".wallpaper_manager"
            self.config_path = self.config_dir / "config.json"
        else:
            self.config_path = Path(config_path)
            self.config_dir = self.config_path.parent

        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.data = self._load_defaults()
        self.load()

    def _load_defaults(self):
        return {
            "wallpaper_dir": str(Path.home() / "Pictures" / "Wallpapers"),
            "time_slots": {
                "morning": {"start": "06:00", "end": "12:00", "subdir": "morning"},
                "noon": {"start": "12:00", "end": "18:00", "subdir": "noon"},
                "evening": {"start": "18:00", "end": "22:00", "subdir": "evening"},
                "night": {"start": "22:00", "end": "06:00", "subdir": "night"}
            },
            "quality": 85,
            "auto_resize": True,
            "log_file": str(self.config_dir / "wallpaper.log"),
            "history_file": str(self.config_dir / "history.json"),
            "download_dir": str(self.config_dir / "downloads"),
            "multi_monitor": {
                "enabled": False,
                "primary_source": "local",
                "secondary_source": "local"
            },
            "unsplash": {
                "access_key": "",
                "query": "nature",
                "featured": True
            },
            "bing": {
                "market": "zh-CN"
            }
        }

    def load(self):
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    loaded = json.load(f)
                    self.data = self._merge(self.data, loaded)
            except (json.JSONDecodeError, IOError):
                pass

    def save(self):
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def _merge(self, defaults, overrides):
        result = defaults.copy()
        for k, v in overrides.items():
            if k in result and isinstance(result[k], dict) and isinstance(v, dict):
                result[k] = self._merge(result[k], v)
            else:
                result[k] = v
        return result

    def get(self, key, default=None):
        keys = key.split('.')
        val = self.data
        for k in keys:
            if isinstance(val, dict) and k in val:
                val = val[k]
            else:
                return default
        return val

    @staticmethod
    def _coerce_type(value):
        if isinstance(value, (bool, int, float, list, dict)):
            return value
        if isinstance(value, str):
            if value.lower() == 'true':
                return True
            if value.lower() == 'false':
                return False
            try:
                return int(value)
            except (ValueError, TypeError):
                pass
            try:
                return float(value)
            except (ValueError, TypeError):
                pass
        return value

    def set(self, key, value):
        keys = key.split('.')
        d = self.data
        for k in keys[:-1]:
            if k not in d:
                d[k] = {}
            d = d[k]
        d[keys[-1]] = self._coerce_type(value)

    def get_current_time_slot(self):
        from datetime import datetime
        now = datetime.now().time()
        for slot_name, slot in self.data["time_slots"].items():
            start = datetime.strptime(slot["start"], "%H:%M").time()
            end = datetime.strptime(slot["end"], "%H:%M").time()
            if start < end:
                if start <= now < end:
                    return slot_name, slot
            else:
                if now >= start or now < end:
                    return slot_name, slot
        return None, None
