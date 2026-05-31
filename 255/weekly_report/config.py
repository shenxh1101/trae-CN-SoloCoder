import json
import os
from pathlib import Path
from typing import Any, Dict, Optional


class Config:
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = Path(config_path) if config_path else Path.home() / ".weekly_report_config.json"
        self._config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        default_config = {
            "default_style": "detailed",
            "preference": {
                "tone": "professional",
                "detail_level": "detailed",
                "format": "markdown"
            },
            "time_categories": [
                "开发",
                "会议",
                "设计",
                "测试",
                "沟通",
                "学习",
                "其他"
            ],
            "report_sections": [
                "本周完成",
                "进行中工作",
                "遇到的问题",
                "下周计划"
            ],
            "ratings": []
        }

        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception:
                pass

        return default_config

    def save(self) -> None:
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(self._config, f, ensure_ascii=False, indent=2)

    def get(self, key: str, default: Any = None) -> Any:
        return self._config.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self._config[key] = value
        self.save()

    def get_preference(self, key: str, default: Any = None) -> Any:
        return self._config.get("preference", {}).get(key, default)

    def set_preference(self, key: str, value: Any) -> None:
        if "preference" not in self._config:
            self._config["preference"] = {}
        self._config["preference"][key] = value
        self.save()

    def add_rating(self, rating: Dict[str, Any]) -> None:
        if "ratings" not in self._config:
            self._config["ratings"] = []
        self._config["ratings"].append(rating)
        self.save()

    def get_ratings(self) -> list:
        return self._config.get("ratings", [])

    @property
    def time_categories(self) -> list:
        return self._config.get("time_categories", [])

    @property
    def report_sections(self) -> list:
        return self._config.get("report_sections", [])
