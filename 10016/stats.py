import logging
import json
import os
import sys
from datetime import datetime, timedelta
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional
from logging.handlers import TimedRotatingFileHandler

from config import LoggingConfig, StatsConfig


@dataclass
class CheckResult:
    timestamp: datetime
    website_name: str
    url: str
    success: bool
    response_time: float
    status_code: Optional[int]
    error_message: Optional[str] = None


@dataclass
class WebsiteStats:
    name: str
    results: Deque[CheckResult] = field(default_factory=lambda: deque(maxlen=10000))

    def add_result(self, result: CheckResult) -> None:
        self.results.append(result)

    def get_stats_in_range(self, start_time: datetime, end_time: datetime) -> Dict:
        filtered = [
            r for r in self.results
            if start_time <= r.timestamp <= end_time
        ]
        if not filtered:
            return {
                "total_checks": 0,
                "successful_checks": 0,
                "failed_checks": 0,
                "availability": 0.0,
                "avg_response_time": 0.0,
                "min_response_time": 0.0,
                "max_response_time": 0.0,
            }

        successful = [r for r in filtered if r.success]
        response_times = [r.response_time for r in filtered if r.response_time > 0]

        return {
            "total_checks": len(filtered),
            "successful_checks": len(successful),
            "failed_checks": len(filtered) - len(successful),
            "availability": (len(successful) / len(filtered)) * 100 if filtered else 0.0,
            "avg_response_time": sum(response_times) / len(response_times) if response_times else 0.0,
            "min_response_time": min(response_times) if response_times else 0.0,
            "max_response_time": max(response_times) if response_times else 0.0,
        }


class ProgressBar:
    def __init__(self, total: int, description: str = "", width: int = 30):
        self.total = total
        self.description = description
        self.width = width
        self.current = 0
        self.start_time = datetime.now()

    def update(self, current: int = None) -> None:
        if current is not None:
            self.current = current
        else:
            self.current += 1

        if sys.stdout.isatty():
            progress = self.current / self.total if self.total > 0 else 0
            bar_length = int(self.width * progress)
            bar = "█" * bar_length + "░" * (self.width - bar_length)
            elapsed = (datetime.now() - self.start_time).total_seconds()
            eta = (elapsed / progress - elapsed) if progress > 0 else 0

            sys.stdout.write(
                f"\r{self.description} |{bar}| {self.current}/{self.total} "
                f"[{progress*100:5.1f}%] 耗时:{elapsed:5.1f}s 预计剩余:{eta:5.1f}s"
            )
            sys.stdout.flush()

    def finish(self) -> None:
        if sys.stdout.isatty():
            elapsed = (datetime.now() - self.start_time).total_seconds()
            sys.stdout.write(
                f"\r{self.description} |{'█' * self.width}| {self.total}/{self.total} "
                f"[100.0%] 完成! 总耗时:{elapsed:5.1f}s\n"
            )
            sys.stdout.flush()


class StatsManager:
    def __init__(self, stats_config: StatsConfig):
        self.stats_config = stats_config
        self.website_stats: Dict[str, WebsiteStats] = {}
        self.last_stats_output: Dict[str, datetime] = {}

    def add_website(self, website_name: str) -> None:
        if website_name not in self.website_stats:
            self.website_stats[website_name] = WebsiteStats(name=website_name)
            self.last_stats_output[website_name] = datetime.now()

    def record_result(self, result: CheckResult) -> None:
        if result.website_name not in self.website_stats:
            self.add_website(result.website_name)
        self.website_stats[result.website_name].add_result(result)

    def get_website_stats(self, website_name: str, hours: int = 24) -> Optional[Dict]:
        if website_name not in self.website_stats:
            return None
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        return self.website_stats[website_name].get_stats_in_range(start_time, end_time)

    def get_all_stats(self, hours: int = 24) -> Dict[str, Dict]:
        results = {}
        for name in self.website_stats:
            results[name] = self.get_website_stats(name, hours)
        return results

    def format_stats_report(self, hours: int = 24) -> str:
        stats = self.get_all_stats(hours)
        lines = [f"\n{'='*60}"]
        lines.append(f"监控统计报告 (最近 {hours} 小时)")
        lines.append(f"{'='*60}")
        lines.append(f"{'网站名称':<15} {'可用性':<10} {'平均响应':<12} {'检查次数':<10} {'成功':<8} {'失败':<8}")
        lines.append(f"{'-'*60}")
        for name, data in stats.items():
            if data:
                lines.append(
                    f"{name:<15} {data['availability']:>8.2f}% "
                    f"{data['avg_response_time']:>9.2f}s "
                    f"{data['total_checks']:>10} "
                    f"{data['successful_checks']:>8} "
                    f"{data['failed_checks']:>8}"
                )
        lines.append(f"{'='*60}\n")
        return "\n".join(lines)

    def should_output_stats(self, website_name: str) -> bool:
        if website_name not in self.last_stats_output:
            return True
        elapsed = (datetime.now() - self.last_stats_output[website_name]).total_seconds()
        return elapsed >= self.stats_config.output_interval

    def update_last_output(self, website_name: str) -> None:
        self.last_stats_output[website_name] = datetime.now()


class ColorFormatter(logging.Formatter):
    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[41m\033[37m",
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        original_levelname = record.levelname
        try:
            if sys.stdout.isatty() and original_levelname in self.COLORS:
                record.levelname = f"{self.COLORS[original_levelname]}{original_levelname:<8}{self.RESET}"
            else:
                record.levelname = f"{original_levelname:<8}"
            return super().format(record)
        finally:
            record.levelname = original_levelname


def setup_logging(logging_config: LoggingConfig) -> logging.Logger:
    logger = logging.getLogger("monitor")
    logger.setLevel(getattr(logging, logging_config.log_level.upper()))
    logger.propagate = False

    file_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    console_formatter = ColorFormatter(
        "%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    if logging_config.log_file:
        os.makedirs(os.path.dirname(logging_config.log_file) or ".", exist_ok=True)
        file_handler = TimedRotatingFileHandler(
            logging_config.log_file,
            when="midnight",
            interval=1,
            backupCount=logging_config.retention_days,
            encoding="utf-8"
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    return logger
