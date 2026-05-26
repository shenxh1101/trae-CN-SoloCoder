import datetime
import os


LOG_FILE = "crypto_operations.log"


def log_operation(operation_type: str, details: str = "") -> None:
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {operation_type}"
    
    if details:
        log_entry += f" - {details}"
    
    log_entry += "\n"
    
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(log_entry)
    except Exception as e:
        print(f"警告: 无法写入日志文件: {e}")


def get_logs(count: int = 10) -> list:
    if not os.path.exists(LOG_FILE):
        return []
    
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    return lines[-count:] if count > 0 else lines
