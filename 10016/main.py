#!/usr/bin/env python3
import asyncio
import signal
import sys
import argparse
from datetime import datetime

from config import load_config
from stats import StatsManager, setup_logging
from notifier import Notifier
from monitor import WebsiteMonitor


def parse_args():
    parser = argparse.ArgumentParser(description="网站监控告警系统")
    parser.add_argument(
        "-c", "--config",
        default="config.yaml",
        help="配置文件路径 (默认: config.yaml)"
    )
    parser.add_argument(
        "--stats",
        type=int,
        metavar="HOURS",
        help="输出最近N小时的统计报告并退出"
    )
    return parser.parse_args()


async def run_monitor(config_path: str) -> None:
    config = load_config(config_path)
    logger = setup_logging(config.logging)
    stats_manager = StatsManager(config.stats)
    notifier = Notifier(config.notifications)
    monitor = WebsiteMonitor(config, stats_manager, notifier, logger)

    loop = asyncio.get_running_loop()

    def handle_shutdown(signum, frame):
        signame = signal.Signals(signum).name
        logger.info(f"收到信号 {signame}，正在优雅关闭...")
        monitor.shutdown()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, handle_shutdown, sig, None)

    logger.info("=" * 60)
    logger.info("网站监控告警系统启动")
    logger.info(f"监控网站数量: {len(config.websites)}")
    logger.info(f"失败阈值: {config.failure_threshold} 次")
    for website in config.websites:
        logger.info(
            f"  - {website.name}: {website.url} "
            f"(预期状态: {website.expected_status}, "
            f"超时: {website.max_response_time}s, "
            f"间隔: {website.interval}s)"
        )
    logger.info("=" * 60)

    try:
        await monitor.start()
    except asyncio.CancelledError:
        logger.info("监控任务被取消")
    finally:
        logger.info("\n" + "=" * 60)
        logger.info("监控已停止，输出最终统计报告:")
        logger.info(stats_manager.format_stats_report())
        logger.info("=" * 60)
        logger.info("程序正常退出")


def show_stats(config_path: str, hours: int) -> None:
    config = load_config(config_path)
    logger = setup_logging(config.logging)
    stats_manager = StatsManager(config.stats)

    logger.info(f"加载配置文件: {config_path}")
    logger.info(f"输出最近 {hours} 小时的统计报告")
    logger.info(stats_manager.format_stats_report(hours=hours))


def main():
    args = parse_args()

    if args.stats is not None:
        show_stats(args.config, args.stats)
        return

    try:
        asyncio.run(run_monitor(args.config))
    except KeyboardInterrupt:
        print("\n程序被用户中断")
        sys.exit(0)


if __name__ == "__main__":
    main()
