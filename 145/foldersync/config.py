import os
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import yaml


DEFAULT_EXCLUDES = ["*.tmp", ".git", "__pycache__", ".DS_Store"]


@dataclass
class SyncRule:
    name: str = ""
    source: str = ""
    target: str = ""
    mode: str = "unidirectional"
    excludes: List[str] = field(default_factory=lambda: list(DEFAULT_EXCLUDES))
    extensions: Optional[List[str]] = None
    use_md5: bool = True
    conflict_strategy: str = "ask"
    post_sync_command: Optional[str] = None
    incremental: bool = False
    max_workers: int = 4


@dataclass
class SyncConfig:
    rules: List[SyncRule] = field(default_factory=list)
    schedule: Optional[str] = None
    schedule_interval: int = 0


def load_config(config_path: str) -> SyncConfig:
    p = Path(config_path).resolve()
    if not p.exists():
        raise FileNotFoundError(f"Config file not found: {p}")
    with open(p, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    config = SyncConfig()
    raw_rules = data.get("rules", [])
    for item in raw_rules:
        rule = SyncRule(
            name=item.get("name", "unnamed"),
            source=os.path.expanduser(item.get("source", "")),
            target=os.path.expanduser(item.get("target", "")),
            mode=item.get("mode", "unidirectional"),
            excludes=item.get("excludes", list(DEFAULT_EXCLUDES)),
            extensions=item.get("extensions", None),
            use_md5=item.get("use_md5", True),
            conflict_strategy=item.get("conflict_strategy", "ask"),
            post_sync_command=item.get("post_sync_command", None),
            incremental=item.get("incremental", False),
            max_workers=item.get("max_workers", 4),
        )
        config.rules.append(rule)

    config.schedule = data.get("schedule", None)
    config.schedule_interval = data.get("schedule_interval", 0)
    return config


def load_last_sync_time(state_dir: str, rule_name: str) -> Optional[float]:
    state_file = os.path.join(state_dir, f".foldersync_{rule_name}.json")
    if not os.path.exists(state_file):
        return None
    try:
        with open(state_file, "r") as f:
            data = json.load(f)
        return data.get("last_sync_time")
    except (json.JSONDecodeError, OSError):
        return None


def save_last_sync_time(state_dir: str, rule_name: str, sync_time: float) -> None:
    os.makedirs(state_dir, exist_ok=True)
    state_file = os.path.join(state_dir, f".foldersync_{rule_name}.json")
    data = {"last_sync_time": sync_time}
    with open(state_file, "w") as f:
        json.dump(data, f)
