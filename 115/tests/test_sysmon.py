import pytest
import time
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sysmon.collector import (
    collect_cpu,
    collect_memory,
    collect_swap,
    collect_disk,
    collect_network,
    collect_top_processes,
    collect_snapshot,
    build_headers,
    snapshot_to_row,
)
from sysmon.alert import AlertMonitor
from sysmon.storage import (
    write_csv_header,
    append_csv_row,
    read_csv,
    parse_csv_data,
    filter_by_time_range,
)


class TestCollector:

    def test_collect_cpu(self):
        result = collect_cpu()
        assert isinstance(result, dict)
        assert "total" in result
        assert "per_core" in result
        assert isinstance(result["total"], (int, float))
        assert isinstance(result["per_core"], list)
        assert len(result["per_core"]) > 0
        assert all(isinstance(x, (int, float)) for x in result["per_core"])
        assert 0 <= result["total"] <= 100
        assert all(0 <= x <= 100 for x in result["per_core"])

    def test_collect_memory(self):
        result = collect_memory()
        assert isinstance(result, dict)
        assert "percent" in result
        assert "used_gb" in result
        assert "total_gb" in result
        assert "available_gb" in result
        assert isinstance(result["percent"], (int, float))
        assert isinstance(result["used_gb"], (int, float))
        assert isinstance(result["total_gb"], (int, float))
        assert isinstance(result["available_gb"], (int, float))
        assert 0 <= result["percent"] <= 100
        assert result["total_gb"] > 0
        assert result["used_gb"] <= result["total_gb"]

    def test_collect_swap(self):
        result = collect_swap()
        assert isinstance(result, dict)
        assert "percent" in result
        assert "used_gb" in result
        assert "total_gb" in result
        assert isinstance(result["percent"], (int, float))
        assert isinstance(result["total_gb"], (int, float))
        assert 0 <= result["percent"] <= 100

    def test_collect_disk(self):
        result = collect_disk()
        assert isinstance(result, dict)
        assert len(result) > 0
        for key, value in result.items():
            assert isinstance(key, str)
            assert "mountpoint" in value
            assert "percent" in value
            assert "used_gb" in value
            assert "total_gb" in value
            assert 0 <= value["percent"] <= 100

    def test_collect_network_zero_interval(self):
        result = collect_network(interval=0)
        assert isinstance(result, dict)
        assert result["upload_bytes_per_sec"] == 0.0
        assert result["download_bytes_per_sec"] == 0.0

    def test_collect_network_negative_interval(self):
        result = collect_network(interval=-1)
        assert result["upload_bytes_per_sec"] == 0.0
        assert result["download_bytes_per_sec"] == 0.0

    def test_collect_network_positive_interval(self):
        result = collect_network(interval=0.1)
        assert isinstance(result, dict)
        assert "upload_bytes_per_sec" in result
        assert "download_bytes_per_sec" in result
        assert isinstance(result["upload_bytes_per_sec"], (int, float))
        assert result["upload_bytes_per_sec"] >= 0
        assert result["download_bytes_per_sec"] >= 0

    def test_collect_top_processes(self):
        result = collect_top_processes(n=5)
        assert isinstance(result, dict)
        assert "top_cpu" in result
        assert "top_mem" in result
        assert isinstance(result["top_cpu"], list)
        assert isinstance(result["top_mem"], list)
        assert len(result["top_cpu"]) <= 5
        assert len(result["top_mem"]) <= 5
        for proc in result["top_cpu"]:
            assert "name" in proc
            assert "pid" in proc
            assert "percent" in proc
            assert isinstance(proc["name"], str)
            assert isinstance(proc["percent"], (int, float))

    def test_collect_top_processes_custom_n(self):
        result = collect_top_processes(n=3)
        assert len(result["top_cpu"]) <= 3
        assert len(result["top_mem"]) <= 3

    def test_collect_snapshot(self):
        result = collect_snapshot(net_interval=0)
        assert isinstance(result, dict)
        assert "timestamp" in result
        assert "cpu" in result
        assert "memory" in result
        assert "swap" in result
        assert "disk" in result
        assert "network" in result
        assert "processes" in result
        assert isinstance(result["timestamp"], str)
        assert len(result["timestamp"]) > 0

    def test_collect_snapshot_timestamp_format(self):
        result = collect_snapshot(net_interval=0)
        import re
        pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
        assert re.match(pattern, result["timestamp"]) is not None

    def test_build_headers(self):
        snapshot = collect_snapshot(net_interval=0)
        headers = build_headers(snapshot)
        assert isinstance(headers, list)
        assert "timestamp" in headers
        assert "cpu_total" in headers
        assert "mem_percent" in headers
        assert "swap_percent" in headers
        assert "net_upload_bytes_per_sec" in headers
        assert "net_download_bytes_per_sec" in headers
        assert "top_cpu_procs" in headers
        assert "top_mem_procs" in headers

    def test_snapshot_to_row(self):
        snapshot = collect_snapshot(net_interval=0)
        headers = build_headers(snapshot)
        row = snapshot_to_row(snapshot, headers)
        assert isinstance(row, list)
        assert len(row) == len(headers)
        assert row[0] == snapshot["timestamp"]


class TestAlertMonitor:

    def test_alert_monitor_init(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=85.0, consecutive_count=3)
        assert am.cpu_threshold == 90.0
        assert am.mem_threshold == 85.0
        assert am.consecutive_count == 3

    def test_alert_monitor_no_trigger(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        assert am.check(50.0, 50.0) is False
        assert am.check(50.0, 50.0) is False
        assert am.check(50.0, 50.0) is False
        assert am.is_triggered() is False

    def test_alert_monitor_cpu_trigger(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(95.0, 50.0)
        am.check(95.0, 50.0)
        assert am.check(95.0, 50.0) is True
        assert am.is_triggered() is True
        assert "CPU" in am.get_alert_message()

    def test_alert_monitor_mem_trigger(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(50.0, 95.0)
        am.check(50.0, 95.0)
        assert am.check(50.0, 95.0) is True
        assert am.is_triggered() is True
        assert "内存" in am.get_alert_message()

    def test_alert_monitor_both_trigger(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(95.0, 95.0)
        am.check(95.0, 95.0)
        assert am.check(95.0, 95.0) is True
        assert "CPU 和内存" in am.get_alert_message()

    def test_alert_monitor_reset(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(95.0, 95.0)
        am.check(95.0, 95.0)
        am.check(95.0, 95.0)
        assert am.is_triggered() is True
        am.reset()
        assert am.is_triggered() is False
        assert am.get_alert_message() == ""

    def test_alert_monitor_recovery(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(95.0, 50.0)
        am.check(95.0, 50.0)
        am.check(50.0, 50.0)
        assert am.is_triggered() is False


class TestStorage:

    def test_write_and_read_csv(self, tmp_path):
        filepath = str(tmp_path / "test.csv")
        headers = ["timestamp", "cpu_total", "mem_percent"]
        write_csv_header(filepath, headers)
        row1 = ["2024-01-01 00:00:00", 50.0, 60.0]
        append_csv_row(filepath, headers, row1)
        read_headers, rows = read_csv(filepath)
        assert read_headers == headers
        assert len(rows) == 1

    def test_parse_csv_data(self, tmp_path):
        filepath = str(tmp_path / "test.csv")
        headers = ["timestamp", "cpu_total", "top_cpu_procs"]
        procs = json.dumps([{"name": "test", "pid": 1, "percent": 50.0])
        write_csv_header(filepath, headers)
        append_csv_row(filepath, headers, ["2024-01-01 00:00:00", 50.0, procs])
        data = parse_csv_data(filepath)
        assert len(data) == 1
        assert data[0]["cpu_total"] == 50.0
        assert isinstance(data[0]["top_cpu_procs"], list)

    def test_filter_by_time_range(self):
        data = [
            {"timestamp": "2024-01-01 10:00:00"},
            {"timestamp": "2024-01-01 12:00:00"},
            {"timestamp": "2024-01-01 14:00:00"},
        ]
        filtered = filter_by_time_range(data, start_time="2024-01-01 11:00:00")
        assert len(filtered) == 2
        filtered = filter_by_time_range(data, end_time="2024-01-01 13:00:00")
        assert len(filtered) == 2
        filtered = filter_by_time_range(data, start_time="2024-01-01 11:00:00", end_time="2024-01-01 13:00:00")
        assert len(filtered) == 1

    def test_read_nonexistent_csv(self):
        headers, rows = read_csv("/nonexistent/path/file.csv")
        assert headers == []
        assert rows == []

    def test_parse_nonexistent_csv(self):
        data = parse_csv_data("/nonexistent/path/file.csv")
        assert data == []
