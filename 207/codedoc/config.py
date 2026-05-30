import json
import os
from dataclasses import dataclass, field, asdict
from typing import List, Optional


DEFAULT_CONFIG = {
    "ignore_rules": [],
    "ignore_files": [],
    "ignore_patterns": ["node_modules/", ".git/", "__pycache__/", "venv/", ".venv/", "*.min.js"],
    "severity_threshold": "info",
    "auto_fix": False,
    "email": {
        "smtp_host": "",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_password": "",
        "from_addr": "",
        "to_addr": "",
    },
    "complexity": {
        "threshold_high": 10,
        "threshold_medium": 5,
    },
    "python": {
        "known_modules": [
            "os", "sys", "json", "re", "math", "datetime", "collections",
            "itertools", "functools", "pathlib", "typing", "dataclasses",
            "abc", "copy", "hashlib", "random", "string", "time", "logging",
            "argparse", "subprocess", "shutil", "tempfile", "unittest",
            "io", "csv", "xml", "html", "http", "urllib", "socket",
            "threading", "multiprocessing", "queue", "struct", "enum",
            "operator", "textwrap", "warnings", "contextlib", "traceback",
        ],
    },
    "javascript": {
        "check_semicolons": True,
        "check_console": True,
    },
}


@dataclass
class Diagnosis:
    file: str
    line: int
    column: int = 0
    severity: str = "warning"
    rule_id: str = ""
    message: str = ""
    suggestion: str = ""
    category: str = ""
    fixable: bool = False
    fix_code: str = ""

    def to_dict(self):
        return asdict(self)


@dataclass
class ComplexityResult:
    file: str
    function_name: str
    line_start: int
    line_end: int
    complexity: int
    level: str = ""
    suggestion: str = ""

    def to_dict(self):
        return asdict(self)


@dataclass
class ScanResult:
    file: str
    diagnoses: List[Diagnosis] = field(default_factory=list)
    complexity_results: List[ComplexityResult] = field(default_factory=list)

    def to_dict(self):
        return {
            "file": self.file,
            "diagnoses": [d.to_dict() for d in self.diagnoses],
            "complexity_results": [c.to_dict() for c in self.complexity_results],
        }


class Config:
    def __init__(self, config_path: Optional[str] = None):
        self._data = json.loads(json.dumps(DEFAULT_CONFIG))
        if config_path and os.path.isfile(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                user_cfg = json.load(f)
            self._deep_merge(self._data, user_cfg)

    @staticmethod
    def _deep_merge(base, override):
        for k, v in override.items():
            if k in base and isinstance(base[k], dict) and isinstance(v, dict):
                Config._deep_merge(base[k], v)
            else:
                base[k] = v

    def get(self, key, default=None):
        keys = key.split(".")
        val = self._data
        for k in keys:
            if isinstance(val, dict) and k in val:
                val = val[k]
            else:
                return default
        return val

    @property
    def ignore_rules(self):
        return self._data.get("ignore_rules", [])

    @property
    def ignore_files(self):
        return self._data.get("ignore_files", [])

    @property
    def ignore_patterns(self):
        return self._data.get("ignore_patterns", [])

    def should_ignore_file(self, filepath: str) -> bool:
        basename = os.path.basename(filepath)
        if basename in self.ignore_files:
            return True
        for pattern in self.ignore_patterns:
            if pattern.endswith("/"):
                if pattern.rstrip("/") in filepath.replace(os.sep, "/"):
                    return True
            elif pattern.startswith("*"):
                if filepath.endswith(pattern[1:]):
                    return True
            elif pattern in filepath:
                return True
        return False

    def should_ignore_rule(self, rule_id: str) -> bool:
        return rule_id in self.ignore_rules

    def save(self, config_path: str):
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)


def find_config(start_dir: str) -> Optional[str]:
    names = [".codedoc.json", "codedoc.json", ".codedocrc"]
    d = os.path.abspath(start_dir)
    while True:
        for n in names:
            p = os.path.join(d, n)
            if os.path.isfile(p):
                return p
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return None
