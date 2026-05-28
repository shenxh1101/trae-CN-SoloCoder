import sys
import os
import unittest
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
import json
import tempfile
import re


class TestCollector(unittest.TestCase):

    def test_collect_cpu(self):
        result = collect_cpu()
        self.assertIsInstance(result, dict)
        self.assertIn("total", result)
        self.assertIn("per_core", result)
        self.assertIsInstance(result["total"], (int, float))
        self.assertIsInstance(result["per_core"], list)
        self.assertGreater(len(result["per_core"]), 0)
        self.assertTrue(all(isinstance(x, (int, float)) for x in result["per_core"]))
        self.assertGreaterEqual(result["total"], 0)
        self.assertLessEqual(result["total"], 100)

    def test_collect_memory(self):
        result = collect_memory()
        self.assertIsInstance(result, dict)
        self.assertIn("percent", result)
        self.assertIn("used_gb", result)
        self.assertIn("total_gb", result)
        self.assertIn("available_gb", result)
        self.assertIsInstance(result["percent"], (int, float))
        self.assertGreater(result["total_gb"], 0)
        self.assertGreaterEqual(result["percent"], 0)
        self.assertLessEqual(result["percent"], 100)

    def test_collect_swap(self):
        result = collect_swap()
        self.assertIsInstance(result, dict)
        self.assertIn("percent", result)
        self.assertIsInstance(result["percent"], (int, float))
        self.assertGreaterEqual(result["percent"], 0)
        self.assertLessEqual(result["percent"], 100)

    def test_collect_disk(self):
        result = collect_disk()
        self.assertIsInstance(result, dict)
        self.assertGreater(len(result), 0)
        for key, value in result.items():
            self.assertIsInstance(key, str)
            self.assertIn("mountpoint", value)
            self.assertIn("percent", value)
            self.assertGreaterEqual(value["percent"], 0)
            self.assertLessEqual(value["percent"], 100)

    def test_collect_network_zero_interval(self):
        result = collect_network(interval=0)
        self.assertEqual(result["upload_bytes_per_sec"], 0.0)
        self.assertEqual(result["download_bytes_per_sec"], 0.0)

    def test_collect_network_negative_interval(self):
        result = collect_network(interval=-1)
        self.assertEqual(result["upload_bytes_per_sec"], 0.0)
        self.assertEqual(result["download_bytes_per_sec"], 0.0)

    def test_collect_network_positive_interval(self):
        result = collect_network(interval=0.1)
        self.assertIsInstance(result, dict)
        self.assertIn("upload_bytes_per_sec", result)
        self.assertIn("download_bytes_per_sec", result)
        self.assertGreaterEqual(result["upload_bytes_per_sec"], 0)
        self.assertGreaterEqual(result["download_bytes_per_sec"], 0)

    def test_collect_top_processes(self):
        result = collect_top_processes(n=5)
        self.assertIsInstance(result, dict)
        self.assertIn("top_cpu", result)
        self.assertIn("top_mem", result)
        self.assertIsInstance(result["top_cpu"], list)
        self.assertLessEqual(len(result["top_cpu"]), 5)
        for proc in result["top_cpu"]:
            self.assertIn("name", proc)
            self.assertIn("pid", proc)
            self.assertIn("percent", proc)

    def test_collect_snapshot(self):
        result = collect_snapshot(net_interval=0)
        self.assertIsInstance(result, dict)
        self.assertIn("timestamp", result)
        self.assertIn("cpu", result)
        self.assertIn("memory", result)
        self.assertIn("swap", result)
        self.assertIn("disk", result)
        self.assertIn("network", result)
        self.assertIn("processes", result)

    def test_collect_snapshot_timestamp_format(self):
        result = collect_snapshot(net_interval=0)
        pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
        self.assertIsNotNone(re.match(pattern, result["timestamp"]))

    def test_build_headers(self):
        snapshot = collect_snapshot(net_interval=0)
        headers = build_headers(snapshot)
        self.assertIsInstance(headers, list)
        self.assertIn("timestamp", headers)
        self.assertIn("cpu_total", headers)
        self.assertIn("mem_percent", headers)
        self.assertIn("net_upload_bytes_per_sec", headers)

    def test_snapshot_to_row(self):
        snapshot = collect_snapshot(net_interval=0)
        headers = build_headers(snapshot)
        row = snapshot_to_row(snapshot, headers)
        self.assertIsInstance(row, list)
        self.assertEqual(len(row), len(headers))
        self.assertEqual(row[0], snapshot["timestamp"])


class TestAlertMonitor(unittest.TestCase):

    def test_alert_monitor_init(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=85.0, consecutive_count=3)
        self.assertEqual(am.cpu_threshold, 90.0)
        self.assertEqual(am.mem_threshold, 85.0)
        self.assertEqual(am.consecutive_count, 3)

    def test_alert_monitor_no_trigger(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(50.0, 50.0)
        am.check(50.0, 50.0)
        am.check(50.0, 50.0)
        self.assertFalse(am.is_triggered())

    def test_alert_monitor_cpu_trigger(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(95.0, 50.0)
        am.check(95.0, 50.0)
        result = am.check(95.0, 50.0)
        self.assertTrue(result)
        self.assertTrue(am.is_triggered())
        self.assertIn("CPU", am.get_alert_message())

    def test_alert_monitor_mem_trigger(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(50.0, 95.0)
        am.check(50.0, 95.0)
        result = am.check(50.0, 95.0)
        self.assertTrue(result)
        self.assertIn("内存", am.get_alert_message())

    def test_alert_monitor_both_trigger(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(95.0, 95.0)
        am.check(95.0, 95.0)
        am.check(95.0, 95.0)
        self.assertIn("CPU 和内存", am.get_alert_message())

    def test_alert_monitor_reset(self):
        am = AlertMonitor(cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3)
        am.check(95.0, 95.0)
        am.check(95.0, 95.0)
        am.check(95.0, 95.0)
        self.assertTrue(am.is_triggered())
        am.reset()
        self.assertFalse(am.is_triggered())
        self.assertEqual(am.get_alert_message(), "")


class TestStorage(unittest.TestCase):

    def test_write_and_read_csv(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            filepath = f.name
        try:
            headers = ["timestamp", "cpu_total", "mem_percent"]
            write_csv_header(filepath, headers)
            row1 = ["2024-01-01 00:00:00", 50.0, 60.0]
            append_csv_row(filepath, headers, row1)
            read_headers, rows = read_csv(filepath)
            self.assertEqual(read_headers, headers)
            self.assertEqual(len(rows), 1)
        finally:
            os.unlink(filepath)

    def test_parse_csv_data(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            filepath = f.name
        try:
            headers = ["timestamp", "cpu_total", "top_cpu_procs"]
            procs = json.dumps([{"name": "test", "pid": 1, "percent": 50.0}])
            write_csv_header(filepath, headers)
            append_csv_row(filepath, headers, ["2024-01-01 00:00:00", 50.0, procs])
            data = parse_csv_data(filepath)
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]["cpu_total"], 50.0)
            self.assertIsInstance(data[0]["top_cpu_procs"], list)
        finally:
            os.unlink(filepath)

    def test_filter_by_time_range(self):
        data = [
            {"timestamp": "2024-01-01 10:00:00"},
            {"timestamp": "2024-01-01 12:00:00"},
            {"timestamp": "2024-01-01 14:00:00"},
        ]
        filtered = filter_by_time_range(data, start_time="2024-01-01 11:00:00")
        self.assertEqual(len(filtered), 2)
        filtered = filter_by_time_range(data, end_time="2024-01-01 13:00:00")
        self.assertEqual(len(filtered), 2)
        filtered = filter_by_time_range(data, start_time="2024-01-01 11:00:00", end_time="2024-01-01 13:00:00")
        self.assertEqual(len(filtered), 1)

    def test_read_nonexistent_csv(self):
        headers, rows = read_csv("/nonexistent/path/file.csv")
        self.assertEqual(headers, [])
        self.assertEqual(rows, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
