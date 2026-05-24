from dataclasses import dataclass
from typing import Dict, Tuple


class Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


@dataclass
class Theme:
    name: str
    primary: str
    success: str
    warning: str
    error: str
    info: str
    highlight: str
    muted: str
    urgent: str
    high: str
    medium: str
    low: str
    completed: str
    in_progress: str
    pending: str
    on_hold: str
    border: str
    header: str

    def apply(self, text: str, color: str) -> str:
        return f"{color}{text}{Color.RESET}"


DARK_THEME = Theme(
    name="dark",
    primary="\033[94m",
    success="\033[92m",
    warning="\033[93m",
    error="\033[91m",
    info="\033[96m",
    highlight="\033[95m",
    muted="\033[90m",
    urgent="\033[41;97m",
    high="\033[91m",
    medium="\033[93m",
    low="\033[92m",
    completed="\033[92m",
    in_progress="\033[94m",
    pending="\033[93m",
    on_hold="\033[90m",
    border="\033[36m",
    header="\033[1;96m",
)

LIGHT_THEME = Theme(
    name="light",
    primary="\033[34m",
    success="\033[32m",
    warning="\033[33m",
    error="\033[31m",
    info="\033[36m",
    highlight="\033[35m",
    muted="\033[37m",
    urgent="\033[41;97m",
    high="\033[31m",
    medium="\033[33m",
    low="\033[32m",
    completed="\033[32m",
    in_progress="\033[34m",
    pending="\033[33m",
    on_hold="\033[37m",
    border="\033[36m",
    header="\033[1;36m",
)

THEMES: Dict[str, Theme] = {
    "dark": DARK_THEME,
    "light": LIGHT_THEME,
}


def get_theme(name: str) -> Theme:
    return THEMES.get(name, DARK_THEME)


STATUS_LABELS = {
    "pending": "待处理",
    "in_progress": "进行中",
    "completed": "已完成",
    "on_hold": "已搁置",
}

PRIORITY_LABELS = {
    "low": "低",
    "medium": "中",
    "high": "高",
    "urgent": "紧急",
}

REPEAT_LABELS = {
    "none": "不重复",
    "daily": "每天",
    "weekly": "每周",
    "monthly": "每月",
}


DEFAULT_SHORTCUTS: Dict[str, Tuple[str, str]] = {
    "show_today": ("<ctrl>+<alt>+t", "显示今日任务"),
}
