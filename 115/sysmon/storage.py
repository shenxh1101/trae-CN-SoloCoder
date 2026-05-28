import csv
import os
import json
from datetime import datetime


DEFAULT_CSV_DIR = os.path.join(os.path.expanduser("~"), ".sysmon", "data")


def ensure_csv_dir(path=None):
    d = path or DEFAULT_CSV_DIR
    os.makedirs(d, exist_ok=True)
    return d


def get_csv_filename(path=None):
    d = ensure_csv_dir(path)
    today = datetime.now().strftime("%Y-%m-%d")
    return os.path.join(d, f"sysmon_{today}.csv")


def write_csv_header(filepath, headers):
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)


def append_csv_row(filepath, headers, row):
    file_exists = os.path.exists(filepath)
    if not file_exists:
        write_csv_header(filepath, headers)
    with open(filepath, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(row)


def read_csv(filepath):
    if not os.path.exists(filepath):
        return [], []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader, None)
        if headers is None:
            return [], []
        rows = [row for row in reader if row]
    return headers, rows


def parse_csv_data(filepath):
    headers, rows = read_csv(filepath)
    if not headers:
        return []
    result = []
    for row in rows:
        entry = {}
        for i, h in enumerate(headers):
            if i < len(row):
                val = row[i]
                if h in ("top_cpu_procs", "top_mem_procs"):
                    try:
                        entry[h] = json.loads(val)
                    except (json.JSONDecodeError, TypeError):
                        entry[h] = val
                else:
                    try:
                        entry[h] = float(val)
                    except (ValueError, TypeError):
                        entry[h] = val
            else:
                entry[h] = ""
        result.append(entry)
    return result


def list_csv_files(directory=None):
    d = directory or DEFAULT_CSV_DIR
    if not os.path.isdir(d):
        return []
    files = sorted(
        [os.path.join(d, f) for f in os.listdir(d) if f.startswith("sysmon_") and f.endswith(".csv")]
    )
    return files


def filter_by_time_range(data, start_time=None, end_time=None):
    filtered = data
    if start_time:
        start = datetime.strptime(start_time, "%Y-%m-%d %H:%M:%S")
        filtered = [
            d for d in filtered
            if datetime.strptime(d.get("timestamp", ""), "%Y-%m-%d %H:%M:%S") >= start
        ]
    if end_time:
        end = datetime.strptime(end_time, "%Y-%m-%d %H:%M:%S")
        filtered = [
            d for d in filtered
            if datetime.strptime(d.get("timestamp", ""), "%Y-%m-%d %H:%M:%S") <= end
        ]
    return filtered
