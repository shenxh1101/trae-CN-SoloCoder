import logging
import os
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional

from config import BASE_DIR

LOG_DIR = BASE_DIR / "logs"
LOG_FILE = LOG_DIR / "diary_analyzer.log"
ERROR_LOG_FILE = LOG_DIR / "errors.log"

try:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass


def get_logger(name: str = "diary_analyzer") -> logging.Logger:
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    log_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    try:
        file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(log_format)
        logger.addHandler(file_handler)
    except Exception:
        pass

    try:
        error_handler = logging.FileHandler(ERROR_LOG_FILE, encoding="utf-8")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s\n%(stack_info)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        ))
        logger.addHandler(error_handler)
    except Exception:
        pass

    return logger


def log_error(logger: logging.Logger, message: str, exc: Optional[Exception] = None) -> None:
    if exc is not None:
        exc_info = traceback.format_exc()
        logger.error(f"{message} | 异常: {str(exc)} | 堆栈: {exc_info}", exc_info=True)
    else:
        logger.error(message)


def log_warning(logger: logging.Logger, message: str) -> None:
    logger.warning(message)


def log_info(logger: logging.Logger, message: str) -> None:
    logger.info(message)


def log_search(logger: logging.Logger, query: str, result_count: int) -> None:
    logger.info(f"搜索查询: {repr(query)} | 结果数: {result_count}")


def log_qa(logger: logging.Logger, question: str, answer_type: str, result_count: int) -> None:
    logger.info(f"问答查询: {repr(question)} | 类型: {answer_type} | 结果数: {result_count}")


def get_recent_errors(count: int = 10) -> list:
    if not ERROR_LOG_FILE.exists():
        return []

    try:
        with open(ERROR_LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
        return lines[-count * 3:] if lines else []
    except Exception:
        return []
