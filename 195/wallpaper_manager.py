#!/usr/bin/env python3
import argparse
import sys
import time
from pathlib import Path

from config import Config
from logger import setup_logger
from history import HistoryManager
from wallpaper_setter import WallpaperSetter
from image_processor import ImageProcessor
from preview import AsciiPreview
from sources import LocalSource, BingSource, UnsplashSource


class WallpaperManager:
    def __init__(self, config_path=None):
        self.config = Config(config_path)
        self.logger = setup_logger(self.config.get("log_file"))
        self.history = HistoryManager(self.config.get("history_file"))
        self.setter = WallpaperSetter(self.config, self.logger, self.history)
        self.image_processor = ImageProcessor(self.logger)
        self.preview = AsciiPreview()

        self.local_source = LocalSource(
            self.config.get("wallpaper_dir"), self.logger
        )
        self.bing_source = BingSource(
            self.config.get("download_dir"),
            self.config.get("bing.market", "zh-CN"),
            self.logger
        )
        self.unsplash_source = UnsplashSource(
            self.config.get("download_dir"),
            self.config.get("unsplash.access_key", ""),
            self.config.get("unsplash.query", "nature"),
            self.config.get("unsplash.featured", True),
            self.logger
        )

    def set_wallpaper_from_source(self, source, monitor=0, quality=None,
                                  auto_resize=None, subdir=None):
        image = None
        source_name = source

        if source == "local":
            image = self.local_source.get_random_image(subdir)
        elif source == "time":
            slot_name, slot = self.config.get_current_time_slot()
            if slot:
                subdir = slot.get("subdir")
                image = self.local_source.get_random_image(subdir)
                source_name = f"time:{slot_name}"
                if self.logger:
                    self.logger.info(f"当前时间段: {slot_name} ({slot['start']}-{slot['end']})")
            else:
                if self.logger:
                    self.logger.error("无法确定当前时间段")
                return False
        elif source == "bing":
            image = self.bing_source.download_daily_image()
        elif source == "unsplash":
            image = self.unsplash_source.download_random_image()
        else:
            image = Path(source)
            if not image.exists():
                if self.logger:
                    self.logger.error(f"图片不存在: {source}")
                return False
            source_name = "custom"

        if not image:
            if self.logger:
                self.logger.error("无法获取壁纸图片")
            return False

        return self.setter.set_wallpaper(
            image, monitor=monitor, source=source_name,
            quality=quality, auto_resize=auto_resize
        )

    def set_wallpaper_multi(self, primary_source, secondary_source=None,
                            quality=None, auto_resize=None):
        primary_image = None
        secondary_image = None
        primary_src_name = primary_source
        secondary_src_name = secondary_source

        primary_image = self._get_image_from_source(primary_source)
        if not primary_image:
            if self.logger:
                self.logger.error("无法获取主显示器壁纸")
            return False
        if primary_source in ["local", "time", "bing", "unsplash"]:
            primary_src_name = primary_source

        if secondary_source:
            secondary_image = self._get_image_from_source(secondary_source)
            if secondary_source in ["local", "time", "bing", "unsplash"]:
                secondary_src_name = secondary_source

        return self.setter.set_wallpaper_multi_monitor(
            primary_image, secondary_image,
            primary_source=primary_src_name,
            secondary_source=secondary_src_name,
            quality=quality, auto_resize=auto_resize
        )

    def _get_image_from_source(self, source):
        if source == "local":
            return self.local_source.get_random_image()
        elif source == "time":
            slot_name, slot = self.config.get_current_time_slot()
            if slot:
                return self.local_source.get_random_image(slot.get("subdir"))
            return None
        elif source == "bing":
            return self.bing_source.download_daily_image()
        elif source == "unsplash":
            return self.unsplash_source.download_random_image()
        else:
            path = Path(source)
            return path if path.exists() else None

    def show_history(self, count=10):
        history = self.history.get_recent(count)
        if not history:
            print("暂无壁纸更换历史")
            return

        print(f"\n最近 {len(history)} 张壁纸:\n")
        for i, entry in enumerate(history, 1):
            monitor = "主显示器" if entry.get("monitor") == "primary" else "副显示器"
            print(f"{i:2d}. [{entry['timestamp']}]")
            print(f"     来源: {entry.get('source', 'unknown')}")
            print(f"     显示器: {monitor}")
            print(f"     路径: {entry['path']}\n")

    def show_preview(self, image_path, colorful=False, width=80):
        if not Path(image_path).exists():
            print(f"图片不存在: {image_path}")
            return

        print(f"\n壁纸预览: {image_path}\n")
        if colorful:
            self.preview.print_colorful_preview(image_path, width)
        else:
            self.preview.print_preview(image_path, width)

    def show_current(self):
        last = self.history.get_last()
        if last:
            print(f"\n当前壁纸:\n")
            monitor = "主显示器" if last.get("monitor") == "primary" else "副显示器"
            print(f"  时间: {last['timestamp']}")
            print(f"  来源: {last.get('source', 'unknown')}")
            print(f"  显示器: {monitor}")
            print(f"  路径: {last['path']}\n")
        else:
            print("\n暂无当前壁纸记录\n")

    def run_daemon(self, interval_minutes=60):
        if self.logger:
            self.logger.info(f"启动壁纸自动切换服务，间隔: {interval_minutes} 分钟")

        try:
            while True:
                slot_name, slot = self.config.get_current_time_slot()
                if slot and self.logger:
                    self.logger.info(f"当前时间段: {slot_name} ({slot['start']}-{slot['end']})")

                self.set_wallpaper_from_source("time")
                time.sleep(interval_minutes * 60)
        except KeyboardInterrupt:
            if self.logger:
                self.logger.info("壁纸自动切换服务已停止")

    def export_config(self, export_path):
        export_path = Path(export_path)
        self.config.config_path = export_path
        self.config.save()
        print(f"配置已导出到: {export_path}")

    def import_config(self, import_path):
        import_path = Path(import_path)
        if not import_path.exists():
            print(f"配置文件不存在: {import_path}")
            return False
        self.config.config_path = import_path
        self.config.load()
        self.config.save()
        print(f"配置已从 {import_path} 导入")
        return True


def main():
    parser = argparse.ArgumentParser(
        description="壁纸切换工具 - 自动更换桌面壁纸",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s set --source local                    # 从本地文件夹随机选图
  %(prog)s set --source time                     # 根据当前时间段选图
  %(prog)s set --source bing                     # 使用必应每日图片
  %(prog)s set --source unsplash                 # 使用Unsplash随机图片
  %(prog)s set --source /path/to/image.jpg       # 使用指定图片
  %(prog)s set --source local --quality 70       # 指定压缩质量
  %(prog)s set --multi --primary time --secondary bing  # 多显示器
  %(prog)s history                               # 显示历史记录
  %(prog)s preview /path/to/image.jpg            # ASCII预览
  %(prog)s preview /path/to/image.jpg --colorful # 彩色预览
  %(prog)s current                               # 显示当前壁纸
  %(prog)s daemon --interval 30                  # 后台自动切换
  %(prog)s config --set wallpaper.dir /path      # 设置配置项
  %(prog)s config --export config.json           # 导出配置
  %(prog)s config --import config.json           # 导入配置
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    set_parser = subparsers.add_parser("set", help="设置壁纸")
    set_parser.add_argument("--source", "-s", default="time",
                          help="壁纸来源: local, time, bing, unsplash, 或图片路径")
    set_parser.add_argument("--subdir", "-d", help="本地子文件夹")
    set_parser.add_argument("--monitor", "-m", type=int, default=0,
                          help="显示器编号 (0为主显示器)")
    set_parser.add_argument("--quality", "-q", type=int,
                          help="图片质量/压缩比例 (1-100)")
    set_parser.add_argument("--no-resize", action="store_true",
                          help="不自动调整尺寸")
    set_parser.add_argument("--multi", action="store_true",
                          help="多显示器模式")
    set_parser.add_argument("--primary", help="主显示器来源")
    set_parser.add_argument("--secondary", help="副显示器来源")

    history_parser = subparsers.add_parser("history", help="显示历史记录")
    history_parser.add_argument("--count", "-n", type=int, default=10,
                              help="显示最近N条记录")
    history_parser.add_argument("--clear", action="store_true",
                              help="清空历史记录")

    preview_parser = subparsers.add_parser("preview", help="预览图片(ASCII)")
    preview_parser.add_argument("image", help="图片路径")
    preview_parser.add_argument("--colorful", "-c", action="store_true",
                              help="彩色预览")
    preview_parser.add_argument("--width", "-w", type=int, default=80,
                              help="预览宽度")

    current_parser = subparsers.add_parser("current", help="显示当前壁纸")
    current_parser.add_argument("--preview", "-p", action="store_true",
                              help="同时显示ASCII预览")

    daemon_parser = subparsers.add_parser("daemon", help="后台自动切换")
    daemon_parser.add_argument("--interval", "-i", type=int, default=60,
                             help="切换间隔(分钟)")

    config_parser = subparsers.add_parser("config", help="配置管理")
    config_parser.add_argument("--set", nargs=2, metavar=("KEY", "VALUE"),
                             help="设置配置项")
    config_parser.add_argument("--get", metavar="KEY", help="获取配置项")
    config_parser.add_argument("--list", action="store_true",
                             help="列出所有配置")
    config_parser.add_argument("--export", metavar="PATH",
                             help="导出配置到文件")
    config_parser.add_argument("--import", dest="import_cfg", metavar="PATH",
                             help="从文件导入配置")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    manager = WallpaperManager()

    if args.command == "set":
        if args.multi:
            primary = args.primary or manager.config.get("multi_monitor.primary_source", "local")
            secondary = args.secondary or manager.config.get("multi_monitor.secondary_source", "local")
            success = manager.set_wallpaper_multi(
                primary, secondary,
                quality=args.quality,
                auto_resize=not args.no_resize
            )
        else:
            success = manager.set_wallpaper_from_source(
                args.source,
                monitor=args.monitor,
                quality=args.quality,
                auto_resize=not args.no_resize,
                subdir=args.subdir
            )
        sys.exit(0 if success else 1)

    elif args.command == "history":
        if args.clear:
            manager.history.clear()
            print("历史记录已清空")
        else:
            manager.show_history(args.count)

    elif args.command == "preview":
        manager.show_preview(args.image, args.colorful, args.width)

    elif args.command == "current":
        manager.show_current()
        if args.preview:
            last = manager.history.get_last()
            if last:
                manager.show_preview(last["path"], colorful=True)

    elif args.command == "daemon":
        manager.run_daemon(args.interval)

    elif args.command == "config":
        if args.set:
            key, value = args.set
            manager.config.set(key, value)
            manager.config.save()
            print(f"已设置: {key} = {value}")
        elif args.get:
            value = manager.config.get(args.get)
            print(f"{args.get} = {value}")
        elif args.list:
            import json
            print(json.dumps(manager.config.data, indent=2, ensure_ascii=False))
        elif args.export:
            manager.export_config(args.export)
        elif args.import_cfg:
            manager.import_config(args.import_cfg)
        else:
            config_parser.print_help()


if __name__ == "__main__":
    main()
