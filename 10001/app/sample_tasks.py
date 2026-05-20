import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def sample_add(a: int, b: int) -> dict:
    """Sample task that adds two numbers."""
    logger.info(f"Adding {a} + {b}")
    result = a + b
    return {"result": result, "timestamp": datetime.utcnow().isoformat()}


def sample_multiply(a: int, b: int) -> dict:
    """Sample task that multiplies two numbers."""
    logger.info(f"Multiplying {a} * {b}")
    result = a * b
    return {"result": result, "timestamp": datetime.utcnow().isoformat()}


def sample_sleep(seconds: int) -> dict:
    """Sample task that sleeps for a specified number of seconds."""
    logger.info(f"Sleeping for {seconds} seconds")
    time.sleep(seconds)
    return {"slept_for": seconds, "timestamp": datetime.utcnow().isoformat()}


def sample_echo(message: str) -> dict:
    """Sample task that echoes a message."""
    logger.info(f"Echoing: {message}")
    return {"message": message, "timestamp": datetime.utcnow().isoformat()}


def sample_failure() -> dict:
    """Sample task that always fails (for testing retries)."""
    logger.error("This task is designed to fail")
    raise ValueError("Intentional failure for testing purposes")


def sample_long_running_task(duration: int = 60) -> dict:
    """Sample long-running task for testing timeouts."""
    logger.info(f"Starting long running task for {duration} seconds")
    time.sleep(duration)
    return {"duration": duration, "timestamp": datetime.utcnow().isoformat()}
