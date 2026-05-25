import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional


class ConfigManager:
    def __init__(self, config_dir: str = None):
        if config_dir is None:
            self.config_dir = os.path.join(str(Path.home()), ".stock_watcher")
        else:
            self.config_dir = config_dir
        
        os.makedirs(self.config_dir, exist_ok=True)
        self.current_profile = "default"
        self._profiles_file = os.path.join(self.config_dir, "profiles.json")
        self._init_profiles()

    def _init_profiles(self):
        if not os.path.exists(self._profiles_file):
            default_data = {
                "current_profile": "default",
                "profiles": ["default"]
            }
            self._save_json(self._profiles_file, default_data)
        
        data = self._load_json(self._profiles_file)
        self.current_profile = data.get("current_profile", "default")

    def _load_json(self, filepath: str) -> Dict[str, Any]:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_json(self, filepath: str, data: Dict[str, Any]) -> None:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _get_profile_file(self, profile: str = None) -> str:
        profile = profile or self.current_profile
        return os.path.join(self.config_dir, f"profile_{profile}.json")

    def list_profiles(self) -> List[str]:
        data = self._load_json(self._profiles_file)
        return data.get("profiles", ["default"])

    def create_profile(self, profile_name: str) -> bool:
        profiles = self.list_profiles()
        if profile_name in profiles:
            return False
        
        profiles.append(profile_name)
        self._save_json(self._profiles_file, {
            "current_profile": self.current_profile,
            "profiles": profiles
        })
        
        default_config = {
            "stocks": [],
            "groups": {"默认": []},
            "alerts": [],
            "settings": {
                "refresh_interval": 5,
                "alert_sound": True,
                "alert_popup": True
            }
        }
        self._save_json(self._get_profile_file(profile_name), default_config)
        return True

    def delete_profile(self, profile_name: str) -> bool:
        profiles = self.list_profiles()
        if profile_name == "default" or profile_name not in profiles:
            return False
        
        profiles.remove(profile_name)
        if self.current_profile == profile_name:
            self.current_profile = "default"
        
        self._save_json(self._profiles_file, {
            "current_profile": self.current_profile,
            "profiles": profiles
        })
        
        profile_file = self._get_profile_file(profile_name)
        if os.path.exists(profile_file):
            os.remove(profile_file)
        return True

    def switch_profile(self, profile_name: str) -> bool:
        profiles = self.list_profiles()
        if profile_name not in profiles:
            return False
        
        self.current_profile = profile_name
        self._save_json(self._profiles_file, {
            "current_profile": self.current_profile,
            "profiles": profiles
        })
        return True

    def get_config(self, profile: str = None) -> Dict[str, Any]:
        profile_file = self._get_profile_file(profile)
        if not os.path.exists(profile_file):
            default_config = {
                "stocks": [],
                "groups": {"默认": []},
                "alerts": [],
                "settings": {
                    "refresh_interval": 5,
                    "alert_sound": True,
                    "alert_popup": True
                }
            }
            self._save_json(profile_file, default_config)
            return default_config
        return self._load_json(profile_file)

    def save_config(self, config: Dict[str, Any], profile: str = None) -> None:
        self._save_json(self._get_profile_file(profile), config)

    def update_settings(self, settings: Dict[str, Any], profile: str = None) -> None:
        config = self.get_config(profile)
        if "settings" not in config:
            config["settings"] = {}
        config["settings"].update(settings)
        self.save_config(config, profile)

    def get_setting(self, key: str, default: Any = None, profile: str = None) -> Any:
        config = self.get_config(profile)
        return config.get("settings", {}).get(key, default)
