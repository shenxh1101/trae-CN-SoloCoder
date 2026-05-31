import json
import os
from typing import Dict, List, Optional

from ..detectors.base import BaseDetector, SmellCategory
from ..detectors.long_function import LongFunctionDetector
from ..detectors.duplicate_code import DuplicateCodeDetector
from ..detectors.god_object import GodObjectDetector
from ..detectors.temp_field import TempFieldDetector


PRESET_RULES = {
    "all": {
        "description": "检测所有类型的代码异味",
        "enabled_smells": ["long_function", "duplicate_code", "god_object", "temporary_field"],
        "config": {},
    },
    "complexity": {
        "description": "仅检测复杂度相关异味（过长函数）",
        "enabled_smells": ["long_function"],
        "config": {},
    },
    "duplication": {
        "description": "仅检测重复代码异味",
        "enabled_smells": ["duplicate_code"],
        "config": {},
    },
    "coupling": {
        "description": "仅检测耦合相关异味（上帝对象）",
        "enabled_smells": ["god_object"],
        "config": {},
    },
    "maintainability": {
        "description": "检测可维护性相关异味（临时字段、过长函数）",
        "enabled_smells": ["long_function", "temporary_field"],
        "config": {},
    },
    "performance": {
        "description": "检测性能相关异味（过长函数、上帝对象）",
        "enabled_smells": ["long_function", "god_object"],
        "config": {"long_function": {"max_lines": 30}},
    },
    "strict": {
        "description": "严格模式，使用更低的阈值",
        "enabled_smells": ["long_function", "duplicate_code", "god_object", "temporary_field"],
        "config": {
            "long_function": {"max_lines": 30, "max_params": 3},
            "duplicate_code": {"min_lines": 4, "min_duplicates": 2},
            "god_object": {"max_methods": 7, "max_attributes": 10, "max_class_lines": 200},
        },
    },
    "relaxed": {
        "description": "宽松模式，使用更高的阈值",
        "enabled_smells": ["long_function", "duplicate_code", "god_object", "temporary_field"],
        "config": {
            "long_function": {"max_lines": 80, "max_params": 7},
            "duplicate_code": {"min_lines": 10, "min_duplicates": 3},
            "god_object": {"max_methods": 15, "max_attributes": 20, "max_class_lines": 500},
        },
    },
}

DETECTOR_MAP = {
    "long_function": LongFunctionDetector,
    "duplicate_code": DuplicateCodeDetector,
    "god_object": GodObjectDetector,
    "temporary_field": TempFieldDetector,
}


class RuleRegistry:
    def __init__(self):
        self._presets = dict(PRESET_RULES)
        self._custom_rules_path = os.path.expanduser("~/.smell_detector/custom_rules.json")
        self._load_custom_rules()

    def _load_custom_rules(self):
        if os.path.exists(self._custom_rules_path):
            try:
                with open(self._custom_rules_path, "r", encoding="utf-8") as f:
                    custom = json.load(f)
                self._presets.update(custom)
            except (json.JSONDecodeError, IOError):
                pass

    def get_preset_names(self) -> List[str]:
        return list(self._presets.keys())

    def get_preset(self, name: str) -> Optional[dict]:
        return self._presets.get(name)

    def get_detectors(self, preset_name: str = "all",
                      enabled_smells: Optional[List[str]] = None,
                      config: Optional[Dict] = None) -> List[BaseDetector]:
        if enabled_smells:
            smell_list = enabled_smells
        else:
            preset = self._presets.get(preset_name, self._presets["all"])
            smell_list = preset["enabled_smells"]

        preset_config = {}
        if preset_name in self._presets:
            preset_config = dict(self._presets[preset_name].get("config", {}))

        if config:
            for key, val in config.items():
                if isinstance(val, dict):
                    preset_config.setdefault(key, {}).update(val)
                else:
                    preset_config[key] = val

        detectors = []
        for smell_name in smell_list:
            if smell_name in DETECTOR_MAP:
                detector_config = preset_config.get(smell_name, {})
                detectors.append(DETECTOR_MAP[smell_name](config=detector_config))
        return detectors

    def save_custom_preset(self, name: str, description: str,
                           enabled_smells: List[str], config: Dict = None):
        self._presets[name] = {
            "description": description,
            "enabled_smells": enabled_smells,
            "config": config or {},
        }
        custom_dir = os.path.dirname(self._custom_rules_path)
        os.makedirs(custom_dir, exist_ok=True)
        custom = {}
        if os.path.exists(self._custom_rules_path):
            try:
                with open(self._custom_rules_path, "r", encoding="utf-8") as f:
                    custom = json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        custom[name] = self._presets[name]
        with open(self._custom_rules_path, "w", encoding="utf-8") as f:
            json.dump(custom, f, ensure_ascii=False, indent=2)

    def list_presets(self) -> str:
        lines = ["可用规则集:\n"]
        for name, preset in self._presets.items():
            lines.append(f"  {name}: {preset['description']}")
            lines.append(f"    启用的检测: {', '.join(preset['enabled_smells'])}")
            if preset.get("config"):
                lines.append(f"    自定义配置: {preset['config']}")
            lines.append("")
        return "\n".join(lines)
