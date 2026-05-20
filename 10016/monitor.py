import asyncio
import time
from datetime import datetime
from typing import Dict, Optional
from collections import deque

import aiohttp

from config import WebsiteConfig, AppConfig
from stats import CheckResult, StatsManager
from notifier import Notifier


class WebsiteMonitor:
    def __init__(self, config: AppConfig, stats_manager: StatsManager, notifier: Notifier, logger):
        self.config = config
        self.stats_manager = stats_manager
        self.notifier = notifier
        self.logger = logger
        self._failure_counts: Dict[str, int] = {}
        self._last_results: Dict[str, deque] = {}
        self._is_alerted: Dict[str, bool] = {}
        self._shutdown_event = asyncio.Event()

        for website in config.websites:
            self._failure_counts[website.name] = 0
            self._last_results[website.name] = deque(maxlen=config.failure_threshold)
            self._is_alerted[website.name] = False
            self.stats_manager.add_website(website.name)

    async def check_website(self, session: aiohttp.ClientSession, website: WebsiteConfig) -> CheckResult:
        start_time = time.time()
        status_code = None
        error_message = None
        success = False

        try:
            timeout = aiohttp.ClientTimeout(total=website.max_response_time + 2)
            async with session.get(website.url, timeout=timeout, allow_redirects=True) as response:
                status_code = response.status
                elapsed = time.time() - start_time

                if status_code == website.expected_status and elapsed <= website.max_response_time:
                    success = True
                elif status_code != website.expected_status:
                    error_message = f"状态码异常: 预期 {website.expected_status}, 实际 {status_code}"
                else:
                    error_message = f"响应超时: {elapsed:.2f}s > {website.max_response_time}s"

        except asyncio.TimeoutError:
            elapsed = time.time() - start_time
            error_message = f"请求超时: {elapsed:.2f}s"
        except aiohttp.ClientError as e:
            elapsed = time.time() - start_time
            error_message = f"连接错误: {str(e)}"
        except Exception as e:
            elapsed = time.time() - start_time
            error_message = f"未知错误: {str(e)}"

        return CheckResult(
            timestamp=datetime.now(),
            website_name=website.name,
            url=website.url,
            success=success,
            response_time=elapsed,
            status_code=status_code,
            error_message=error_message
        )

    async def monitor_website(self, website: WebsiteConfig) -> None:
        self.logger.info(f"开始监控: {website.name} ({website.url})")

        async with aiohttp.ClientSession() as session:
            while not self._shutdown_event.is_set():
                result = await self.check_website(session, website)
                self._process_result(website, result)

                try:
                    await asyncio.wait_for(
                        self._shutdown_event.wait(),
                        timeout=website.interval
                    )
                except asyncio.TimeoutError:
                    pass

        self.logger.info(f"停止监控: {website.name}")

    def _process_result(self, website: WebsiteConfig, result: CheckResult) -> None:
        self.stats_manager.record_result(result)
        self._last_results[website.name].append(result)

        if result.success:
            status_str = "✓"
            self._failure_counts[website.name] = 0

            if self._is_alerted[website.name]:
                self._is_alerted[website.name] = False
                asyncio.create_task(self.notifier.send_alert(
                    website.name, website.url, 0, result, is_recovery=True
                ))
        else:
            status_str = "✗"
            self._failure_counts[website.name] += 1

            if (self._failure_counts[website.name] >= self.config.failure_threshold
                    and not self._is_alerted[website.name]):
                self._is_alerted[website.name] = True
                asyncio.create_task(self.notifier.send_alert(
                    website.name, website.url, self._failure_counts[website.name], result
                ))

        self.logger.info(
            f"{status_str} {website.name:<15} | "
            f"状态: {result.status_code or 'N/A':>5} | "
            f"耗时: {result.response_time:>7.2f}s | "
            f"{'成功' if result.success else '失败'}"
            + (f" | {result.error_message}" if result.error_message else "")
        )

        if self.stats_manager.should_output_stats(website.name):
            stats = self.stats_manager.get_website_stats(website.name)
            if stats:
                self.logger.info(
                    f"统计 {website.name}: "
                    f"可用性 {stats['availability']:.2f}% | "
                    f"平均响应 {stats['avg_response_time']:.2f}s | "
                    f"共 {stats['total_checks']} 次检查"
                )
                self.stats_manager.update_last_output(website.name)

    async def start(self) -> None:
        tasks = [
            asyncio.create_task(self.monitor_website(website))
            for website in self.config.websites
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    def shutdown(self) -> None:
        self.logger.info("收到关闭信号，正在优雅停止监控...")
        self._shutdown_event.set()
