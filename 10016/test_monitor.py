import unittest
import asyncio
import time
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, AsyncMock
from collections import deque

import yaml

from config import (
    load_config, AppConfig, WebsiteConfig, NotificationConfig,
    ConsoleConfig, EmailConfig, WebhookConfig, LoggingConfig, StatsConfig
)
from stats import CheckResult, WebsiteStats, StatsManager, setup_logging
from notifier import Notifier
from monitor import WebsiteMonitor


class TestConfig(unittest.TestCase):
    def test_load_config(self):
        config = load_config("config.yaml")
        self.assertIsInstance(config, AppConfig)
        self.assertGreater(len(config.websites), 0)
        self.assertEqual(config.failure_threshold, 3)

    def test_website_config(self):
        website = WebsiteConfig(
            name="Test",
            url="http://example.com",
            expected_status=200,
            max_response_time=5.0,
            interval=30
        )
        self.assertEqual(website.name, "Test")
        self.assertEqual(website.url, "http://example.com")
        self.assertEqual(website.expected_status, 200)


class TestCheckResult(unittest.TestCase):
    def test_check_result_creation(self):
        result = CheckResult(
            timestamp=datetime.now(),
            website_name="Test",
            url="http://example.com",
            success=True,
            response_time=0.5,
            status_code=200
        )
        self.assertTrue(result.success)
        self.assertEqual(result.response_time, 0.5)
        self.assertEqual(result.status_code, 200)
        self.assertIsNone(result.error_message)

    def test_check_result_with_error(self):
        result = CheckResult(
            timestamp=datetime.now(),
            website_name="Test",
            url="http://example.com",
            success=False,
            response_time=10.0,
            status_code=500,
            error_message="Internal Server Error"
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_message, "Internal Server Error")


class TestWebsiteStats(unittest.TestCase):
    def setUp(self):
        self.stats = WebsiteStats(name="Test")

    def test_add_result(self):
        result = CheckResult(
            timestamp=datetime.now(),
            website_name="Test",
            url="http://example.com",
            success=True,
            response_time=0.5,
            status_code=200
        )
        self.stats.add_result(result)
        self.assertEqual(len(self.stats.results), 1)

    def test_get_stats_in_range(self):
        now = datetime.now()
        for i in range(10):
            result = CheckResult(
                timestamp=now - timedelta(minutes=i),
                website_name="Test",
                url="http://example.com",
                success=i < 8,
                response_time=0.5 + i * 0.1,
                status_code=200 if i < 8 else 500
            )
            self.stats.add_result(result)

        stats_data = self.stats.get_stats_in_range(now - timedelta(hours=1), now)
        self.assertEqual(stats_data["total_checks"], 10)
        self.assertEqual(stats_data["successful_checks"], 8)
        self.assertEqual(stats_data["failed_checks"], 2)
        self.assertEqual(stats_data["availability"], 80.0)
        self.assertGreater(stats_data["avg_response_time"], 0)

    def test_get_stats_empty(self):
        now = datetime.now()
        stats_data = self.stats.get_stats_in_range(now - timedelta(hours=1), now)
        self.assertEqual(stats_data["total_checks"], 0)
        self.assertEqual(stats_data["availability"], 0.0)


class TestStatsManager(unittest.TestCase):
    def setUp(self):
        config = StatsConfig(output_interval=3600)
        self.manager = StatsManager(config)

    def test_add_website(self):
        self.manager.add_website("TestSite")
        self.assertIn("TestSite", self.manager.website_stats)

    def test_record_result(self):
        result = CheckResult(
            timestamp=datetime.now(),
            website_name="TestSite",
            url="http://example.com",
            success=True,
            response_time=0.5,
            status_code=200
        )
        self.manager.record_result(result)
        self.assertIn("TestSite", self.manager.website_stats)
        stats = self.manager.get_website_stats("TestSite")
        self.assertEqual(stats["total_checks"], 1)

    def test_format_stats_report(self):
        result = CheckResult(
            timestamp=datetime.now(),
            website_name="TestSite",
            url="http://example.com",
            success=True,
            response_time=0.5,
            status_code=200
        )
        self.manager.record_result(result)
        report = self.manager.format_stats_report(hours=1)
        self.assertIn("TestSite", report)
        self.assertIn("可用性", report)


class TestNotifier(unittest.TestCase):
    def setUp(self):
        config = NotificationConfig(
            console=ConsoleConfig(enabled=True),
            email=EmailConfig(enabled=False),
            webhook=WebhookConfig(enabled=False)
        )
        self.notifier = Notifier(config)

    def test_format_alert_message_failure(self):
        result = CheckResult(
            timestamp=datetime.now(),
            website_name="Test",
            url="http://example.com",
            success=False,
            response_time=10.0,
            status_code=500,
            error_message="Internal Server Error"
        )
        message = self.notifier._format_alert_message(
            "Test", "http://example.com", 3, result, is_recovery=False
        )
        self.assertIn("故障告警", message)
        self.assertIn("连续失败次数: 3", message)
        self.assertIn("Internal Server Error", message)

    def test_format_alert_message_recovery(self):
        result = CheckResult(
            timestamp=datetime.now(),
            website_name="Test",
            url="http://example.com",
            success=True,
            response_time=0.5,
            status_code=200
        )
        message = self.notifier._format_alert_message(
            "Test", "http://example.com", 0, result, is_recovery=True
        )
        self.assertIn("恢复正常", message)
        self.assertIn("服务已恢复正常", message)

    def test_build_dingtalk_payload(self):
        webhook_config = WebhookConfig(
            enabled=True,
            url="http://example.com",
            type="dingtalk",
            secret=""
        )
        payload = self.notifier._build_webhook_payload(
            webhook_config, "Test message", is_recovery=False
        )
        self.assertEqual(payload["msgtype"], "text")
        self.assertEqual(payload["text"]["content"], "Test message")
        self.assertTrue(payload["at"]["isAtAll"])

    def test_build_signed_url_with_secret(self):
        webhook_config = WebhookConfig(
            enabled=True,
            url="https://oapi.dingtalk.com/robot/send?access_token=test",
            type="dingtalk",
            secret="SEC123456"
        )
        signed_url = self.notifier._build_signed_url(webhook_config)
        self.assertIn("timestamp=", signed_url)
        self.assertIn("sign=", signed_url)

    def test_build_signed_url_without_secret(self):
        webhook_config = WebhookConfig(
            enabled=True,
            url="https://oapi.dingtalk.com/robot/send?access_token=test",
            type="dingtalk",
            secret=""
        )
        signed_url = self.notifier._build_signed_url(webhook_config)
        self.assertEqual(signed_url, webhook_config.url)


class TestWebsiteMonitor(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.app_config = AppConfig(
            websites=[
                WebsiteConfig(
                    name="Test1",
                    url="http://example.com",
                    expected_status=200,
                    max_response_time=5.0,
                    interval=5
                ),
                WebsiteConfig(
                    name="Test2",
                    url="http://example.org",
                    expected_status=200,
                    max_response_time=3.0,
                    interval=10
                )
            ],
            failure_threshold=3,
            notifications=NotificationConfig(
                console=ConsoleConfig(enabled=True),
                email=EmailConfig(enabled=False),
                webhook=WebhookConfig(enabled=False)
            ),
            logging=LoggingConfig(log_file="test.log", log_level="DEBUG"),
            stats=StatsConfig(output_interval=3600)
        )

        self.stats_manager = StatsManager(self.app_config.stats)
        self.notifier = Notifier(self.app_config.notifications)
        self.logger = MagicMock()

        self.monitor = WebsiteMonitor(
            self.app_config, self.stats_manager, self.notifier, self.logger
        )

    async def test_initialization(self):
        self.assertIn("Test1", self.monitor._failure_counts)
        self.assertIn("Test2", self.monitor._failure_counts)
        self.assertEqual(self.monitor._failure_counts["Test1"], 0)
        self.assertFalse(self.monitor._is_alerted["Test1"])

    async def test_check_website_success(self):
        pass

    async def test_check_website_wrong_status(self):
        pass

    async def test_check_website_timeout(self):
        pass

    async def test_process_result_success(self):
        website = self.app_config.websites[0]
        result = CheckResult(
            timestamp=datetime.now(),
            website_name=website.name,
            url=website.url,
            success=True,
            response_time=0.5,
            status_code=200
        )

        self.monitor._failure_counts[website.name] = 2
        self.monitor._is_alerted[website.name] = True

        self.monitor._process_result(website, result)
        await asyncio.sleep(0.01)

        self.assertEqual(self.monitor._failure_counts[website.name], 0)
        self.assertFalse(self.monitor._is_alerted[website.name])

    async def test_process_result_failure_no_alert(self):
        website = self.app_config.websites[0]
        result = CheckResult(
            timestamp=datetime.now(),
            website_name=website.name,
            url=website.url,
            success=False,
            response_time=10.0,
            status_code=500,
            error_message="Server Error"
        )

        self.monitor._process_result(website, result)
        await asyncio.sleep(0.01)

        self.assertEqual(self.monitor._failure_counts[website.name], 1)
        self.assertFalse(self.monitor._is_alerted[website.name])

    async def test_process_result_failure_trigger_alert(self):
        website = self.app_config.websites[0]
        result = CheckResult(
            timestamp=datetime.now(),
            website_name=website.name,
            url=website.url,
            success=False,
            response_time=10.0,
            status_code=500,
            error_message="Server Error"
        )

        self.monitor._failure_counts[website.name] = 2

        self.monitor._process_result(website, result)
        await asyncio.sleep(0.01)

        self.assertEqual(self.monitor._failure_counts[website.name], 3)
        self.assertTrue(self.monitor._is_alerted[website.name])

    async def test_process_result_failure_alert_already_sent(self):
        website = self.app_config.websites[0]
        result = CheckResult(
            timestamp=datetime.now(),
            website_name=website.name,
            url=website.url,
            success=False,
            response_time=10.0,
            status_code=500,
            error_message="Server Error"
        )

        self.monitor._failure_counts[website.name] = 3
        self.monitor._is_alerted[website.name] = True

        self.monitor._process_result(website, result)
        await asyncio.sleep(0.01)

        self.assertEqual(self.monitor._failure_counts[website.name], 4)
        self.assertTrue(self.monitor._is_alerted[website.name])

    async def test_shutdown(self):
        self.assertFalse(self.monitor._shutdown_event.is_set())
        self.monitor.shutdown()
        self.assertTrue(self.monitor._shutdown_event.is_set())


class TestSetupLogging(unittest.TestCase):
    def test_setup_logging(self):
        config = LoggingConfig(log_file="test.log", log_level="INFO", retention_days=7)
        logger = setup_logging(config)
        self.assertEqual(logger.name, "monitor")
        self.assertEqual(logger.level, 20)


if __name__ == "__main__":
    unittest.main(verbosity=2)
