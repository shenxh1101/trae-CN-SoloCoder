import time
import json
import os
import subprocess
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from enum import Enum


class CountdownStatus(Enum):
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


@dataclass
class Countdown:
    name: str
    total_seconds: int
    remaining_seconds: int
    status: CountdownStatus = CountdownStatus.RUNNING
    created_at: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    is_periodic: bool = False
    on_complete_command: Optional[str] = None
    paused_at: Optional[float] = None

    def __post_init__(self):
        if self.end_time is None and self.status == CountdownStatus.RUNNING:
            self.end_time = time.time() + self.remaining_seconds

    def tick(self) -> bool:
        if self.status != CountdownStatus.RUNNING:
            return False
        if time.time() >= self.end_time:
            return True
        self.remaining_seconds = max(0, int(self.end_time - time.time()))
        return False

    def pause(self):
        if self.status == CountdownStatus.RUNNING:
            self.status = CountdownStatus.PAUSED
            self.paused_at = time.time()

    def resume(self):
        if self.status == CountdownStatus.PAUSED and self.paused_at:
            pause_duration = time.time() - self.paused_at
            self.end_time += pause_duration
            self.status = CountdownStatus.RUNNING
            self.paused_at = None

    def cancel(self):
        self.status = CountdownStatus.CANCELLED

    def reset(self):
        self.remaining_seconds = self.total_seconds
        self.status = CountdownStatus.RUNNING
        self.end_time = time.time() + self.total_seconds
        self.paused_at = None

    def to_dict(self) -> Dict:
        data = asdict(self)
        data['status'] = self.status.value
        return data

    @classmethod
    def from_dict(cls, data: Dict) -> 'Countdown':
        status = CountdownStatus(data['status'])
        countdown = cls(
            name=data['name'],
            total_seconds=data['total_seconds'],
            remaining_seconds=data['remaining_seconds'],
            status=status,
            created_at=data['created_at'],
            end_time=data['end_time'],
            is_periodic=data.get('is_periodic', False),
            on_complete_command=data.get('on_complete_command'),
            paused_at=data.get('paused_at')
        )
        return countdown


class CountdownManager:
    def __init__(self, save_file: str = "countdowns.json", log_file: str = "countdowns.log"):
        self.countdowns: List[Countdown] = []
        self.save_file = save_file
        self.log_file = log_file
        self._setup_logging()
        self.load()

    def _setup_logging(self):
        logging.basicConfig(
            filename=self.log_file,
            level=logging.INFO,
            format='%(asctime)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    def add_countdown(self, name: str, days: int = 0, hours: int = 0, minutes: int = 0,
                     seconds: int = 0, is_periodic: bool = False,
                     on_complete_command: Optional[str] = None) -> Countdown:
        total_seconds = days * 86400 + hours * 3600 + minutes * 60 + seconds
        countdown = Countdown(
            name=name,
            total_seconds=total_seconds,
            remaining_seconds=total_seconds,
            is_periodic=is_periodic,
            on_complete_command=on_complete_command
        )
        self.countdowns.append(countdown)
        self.save()
        return countdown

    def remove_countdown(self, name: str):
        self.countdowns = [c for c in self.countdowns if c.name != name]
        self.save()

    def get_countdown(self, name: str) -> Optional[Countdown]:
        for c in self.countdowns:
            if c.name == name:
                return c
        return None

    def tick_all(self) -> List[Countdown]:
        completed = []
        for countdown in self.countdowns:
            if countdown.tick():
                countdown.status = CountdownStatus.COMPLETED
                completed.append(countdown)
                self._on_complete(countdown)
        self._cleanup_completed()
        return completed

    def _on_complete(self, countdown: Countdown):
        logging.info(f"倒计时完成: {countdown.name}")
        if countdown.on_complete_command:
            try:
                subprocess.Popen(countdown.on_complete_command, shell=True)
                logging.info(f"执行命令: {countdown.on_complete_command}")
            except Exception as e:
                logging.error(f"命令执行失败: {e}")
        if countdown.is_periodic:
            countdown.reset()
            logging.info(f"周期性倒计时重启: {countdown.name}, 时长: {format_duration(countdown.total_seconds)}")

    def _cleanup_completed(self):
        self.countdowns = [c for c in self.countdowns
                          if c.status != CountdownStatus.COMPLETED or c.is_periodic]
        self.countdowns = [c for c in self.countdowns
                          if c.status != CountdownStatus.CANCELLED]

    def get_earliest(self) -> Optional[Countdown]:
        running = [c for c in self.countdowns if c.status == CountdownStatus.RUNNING]
        if not running:
            return None
        return min(running, key=lambda c: c.end_time)

    def save(self):
        data = [c.to_dict() for c in self.countdowns]
        with open(self.save_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self):
        if not os.path.exists(self.save_file):
            return
        try:
            with open(self.save_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.countdowns = [Countdown.from_dict(d) for d in data]
            for c in self.countdowns:
                if c.status == CountdownStatus.RUNNING and c.end_time:
                    if time.time() >= c.end_time:
                        if c.is_periodic:
                            c.reset()
                        else:
                            c.status = CountdownStatus.COMPLETED
                            self._on_complete(c)
        except Exception as e:
            logging.error(f"加载失败: {e}")
            self.countdowns = []

    def export_to_text(self, filename: str) -> bool:
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"倒计时列表 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("=" * 60 + "\n\n")
                if not self.countdowns:
                    f.write("暂无倒计时\n")
                else:
                    for i, c in enumerate(self.countdowns, 1):
                        f.write(f"{i}. 名称: {c.name}\n")
                        f.write(f"   状态: {c.status.value}\n")
                        f.write(f"   总时长: {format_duration(c.total_seconds)}\n")
                        f.write(f"   剩余: {format_duration(c.remaining_seconds)}\n")
                        if c.status == CountdownStatus.RUNNING and c.end_time:
                            end_dt = datetime.fromtimestamp(c.end_time)
                            f.write(f"   结束时间: {end_dt.strftime('%Y-%m-%d %H:%M:%S')}\n")
                        if c.is_periodic:
                            f.write(f"   周期性: 是\n")
                        if c.on_complete_command:
                            f.write(f"   完成命令: {c.on_complete_command}\n")
                        f.write("\n")
            return True
        except Exception as e:
            logging.error(f"导出失败: {e}")
            return False


def format_duration(seconds: int) -> str:
    if seconds < 0:
        seconds = 0
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    parts = []
    if days > 0:
        parts.append(f"{days}天")
    if hours > 0 or days > 0:
        parts.append(f"{hours:02d}小时")
    parts.append(f"{minutes:02d}分{secs:02d}秒")
    return " ".join(parts)
