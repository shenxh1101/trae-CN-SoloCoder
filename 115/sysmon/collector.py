import psutil
import time
import json


def collect_cpu():
    total = psutil.cpu_percent(interval=None)
    per_core = psutil.cpu_percent(interval=None, percpu=True)
    return {"total": total, "per_core": per_core}


def collect_memory():
    mem = psutil.virtual_memory()
    return {
        "percent": mem.percent,
        "used_gb": round(mem.used / (1024 ** 3), 2),
        "total_gb": round(mem.total / (1024 ** 3), 2),
        "available_gb": round(mem.available / (1024 ** 3), 2),
    }


def collect_swap():
    swap = psutil.swap_memory()
    return {
        "percent": swap.percent,
        "used_gb": round(swap.used / (1024 ** 3), 2),
        "total_gb": round(swap.total / (1024 ** 3), 2),
    }


def collect_disk():
    partitions = {}
    for part in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(part.mountpoint)
            key = part.mountpoint.replace("/", "_").replace("\\", "_").strip("_")
            if not key:
                key = "root"
            partitions[key] = {
                "mountpoint": part.mountpoint,
                "percent": usage.percent,
                "used_gb": round(usage.used / (1024 ** 3), 2),
                "total_gb": round(usage.total / (1024 ** 3), 2),
            }
        except PermissionError:
            continue
    return partitions


def collect_network(interval=1.0):
    if interval <= 0:
        return {"upload_bytes_per_sec": 0.0, "download_bytes_per_sec": 0.0}
    net1 = psutil.net_io_counters()
    time.sleep(interval)
    net2 = psutil.net_io_counters()
    upload_speed = (net2.bytes_sent - net1.bytes_sent) / interval
    download_speed = (net2.bytes_recv - net1.bytes_recv) / interval
    return {
        "upload_bytes_per_sec": round(upload_speed, 2),
        "download_bytes_per_sec": round(download_speed, 2),
    }


def collect_top_processes(n=5):
    cpu_procs = []
    mem_procs = []
    procs = []
    for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
        try:
            info = proc.info
            procs.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    cpu_procs = sorted(procs, key=lambda p: p.get("cpu_percent") or 0, reverse=True)[:n]
    mem_procs = sorted(procs, key=lambda p: p.get("memory_percent") or 0, reverse=True)[:n]
    return {
        "top_cpu": [
            {"name": p["name"], "pid": p["pid"], "percent": round(p.get("cpu_percent") or 0, 2)}
            for p in cpu_procs
        ],
        "top_mem": [
            {"name": p["name"], "pid": p["pid"], "percent": round(p.get("memory_percent") or 0, 2)}
            for p in mem_procs
        ],
    }


def collect_snapshot(net_interval=1.0):
    snapshot = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "cpu": collect_cpu(),
        "memory": collect_memory(),
        "swap": collect_swap(),
        "disk": collect_disk(),
        "network": collect_network(interval=net_interval),
        "processes": collect_top_processes(),
    }
    return snapshot


def build_headers(snapshot):
    headers = ["timestamp", "cpu_total"]
    for i in range(len(snapshot["cpu"]["per_core"])):
        headers.append(f"cpu_core_{i}")
    headers.extend(["mem_percent", "mem_used_gb", "mem_total_gb", "mem_available_gb"])
    headers.extend(["swap_percent", "swap_used_gb", "swap_total_gb"])
    for key in snapshot["disk"]:
        headers.extend([
            f"disk_{key}_percent",
            f"disk_{key}_used_gb",
            f"disk_{key}_total_gb",
        ])
    headers.extend(["net_upload_bytes_per_sec", "net_download_bytes_per_sec"])
    headers.append("top_cpu_procs")
    headers.append("top_mem_procs")
    return headers


def snapshot_to_row(snapshot, headers):
    row = {}
    for h in headers:
        row[h] = ""
    row["timestamp"] = snapshot["timestamp"]
    row["cpu_total"] = snapshot["cpu"]["total"]
    for i, v in enumerate(snapshot["cpu"]["per_core"]):
        row[f"cpu_core_{i}"] = v
    row["mem_percent"] = snapshot["memory"]["percent"]
    row["mem_used_gb"] = snapshot["memory"]["used_gb"]
    row["mem_total_gb"] = snapshot["memory"]["total_gb"]
    row["mem_available_gb"] = snapshot["memory"]["available_gb"]
    row["swap_percent"] = snapshot["swap"]["percent"]
    row["swap_used_gb"] = snapshot["swap"]["used_gb"]
    row["swap_total_gb"] = snapshot["swap"]["total_gb"]
    for key, val in snapshot["disk"].items():
        row[f"disk_{key}_percent"] = val["percent"]
        row[f"disk_{key}_used_gb"] = val["used_gb"]
        row[f"disk_{key}_total_gb"] = val["total_gb"]
    row["net_upload_bytes_per_sec"] = snapshot["network"]["upload_bytes_per_sec"]
    row["net_download_bytes_per_sec"] = snapshot["network"]["download_bytes_per_sec"]
    row["top_cpu_procs"] = json.dumps(snapshot["processes"]["top_cpu"])
    row["top_mem_procs"] = json.dumps(snapshot["processes"]["top_mem"])
    return [row.get(h, "") for h in headers]
