#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
功能强大的Python命令行定时截图工具
支持多种截图模式、图片处理、定时任务、自动上传等功能
"""

import os
import sys
import argparse
import signal
from typing import Optional, Dict, Any
from datetime import datetime

from .capture import ScreenCapture
from .image_processor import ImageProcessor
from .uploader import FileUploader
from .scheduler import Scheduler, WindowHider
from .report import ReportGenerator


class ScreenshotTool:
    def __init__(self, args):
        self.args = args
        self.capturer = ScreenCapture()
        self.processor = ImageProcessor()
        self.uploader = FileUploader()
        self.scheduler = Scheduler()
        self.reporter = ReportGenerator()
        
        self._setup_signal_handler()
        self._prepare_output_dir()

    def _setup_signal_handler(self):
        def signal_handler(signum, frame):
            print("\n\n接收到中断信号，正在停止...")
            self.scheduler.stop()
            self._finalize()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

    def _prepare_output_dir(self):
        os.makedirs(self.args.output_dir, exist_ok=True)

    def _single_capture(self) -> Optional[str]:
        try:
            img = self.capturer.capture(
                mode=self.args.mode,
                monitor=self.args.monitor,
                radius=self.args.radius,
                region=self.args.region
            )
            
            if self.args.watermark:
                img = self.processor.add_watermark(
                    img,
                    position=self.args.watermark_position,
                    font_size=self.args.watermark_size,
                    opacity=self.args.watermark_opacity
                )
            
            filepath = self.processor.save_png(
                img,
                self.args.output_dir,
                prefix=self.args.prefix
            )
            
            if self.args.to_jpg:
                filepath = self.processor.convert_to_jpg(
                    filepath,
                    quality=self.args.jpg_quality,
                    delete_original=True
                )
            
            if self.args.upload_config:
                self.uploader.upload_file(filepath, self.args.upload_config)
            
            self.reporter.add_screenshot(filepath, mode=self.args.mode)
            print(f"  ✓ 已保存: {filepath}")
            
            return filepath
            
        except Exception as e:
            print(f"  ✗ 截图失败: {e}")
            return None

    def _finalize(self):
        self.reporter.finish()
        
        if not self.reporter.screenshots:
            print("没有截图数据")
            return
        
        if self.args.make_gif and len(self.reporter.screenshots) >= 2:
            try:
                gif_path = os.path.join(
                    self.args.output_dir,
                    f"animation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.gif"
                )
                image_paths = [s["filepath"] for s in self.reporter.screenshots]
                self.processor.create_gif(
                    image_paths,
                    gif_path,
                    duration=self.args.gif_duration,
                    max_width=self.args.gif_max_width
                )
                print(f"GIF动画已生成: {gif_path}")
                if self.args.upload_config:
                    self.uploader.upload_file(gif_path, self.args.upload_config)
            except Exception as e:
                print(f"生成GIF失败: {e}")
        
        if self.args.report:
            self.reporter.print_report()
            self.reporter.save_report(self.args.output_dir, format=self.args.report_format)

    def run(self):
        if self.args.hide_window:
            WindowHider.hide_console()
        elif self.args.minimize_window:
            WindowHider.minimize_console()
        
        if self.args.list_monitors:
            self.capturer.list_monitors()
            return
        
        if self.args.test_upload:
            if self.args.upload_config:
                success, msg = self.uploader.test_connection(self.args.upload_config)
                if success:
                    print("\n✅ 上传连接测试通过!")
                else:
                    print(f"\n❌ 上传连接测试失败: {msg}")
                    sys.exit(1)
            else:
                print("❌ 请先配置 FTP 或 HTTP 上传参数")
                sys.exit(1)
            return
        
        if self.args.upload_config and self.args.test_upload_before:
            print("正在测试上传连接...")
            success, msg = self.uploader.test_connection(self.args.upload_config)
            if not success:
                print(f"❌ 上传连接测试失败: {msg}")
                print("使用 --no-test-upload 参数可跳过连接测试")
                sys.exit(1)
            print("✅ 上传连接测试通过!\n")
        
        self.reporter.start()
        print(f"截图工具启动 - 模式: {self.args.mode} | 输出: {self.args.output_dir}")
        if self.args.upload_config:
            upload_type = self.args.upload_config["type"].upper()
            if upload_type == "FTP":
                target = self.args.upload_config["host"]
            else:
                target = self.args.upload_config["url"]
            print(f"上传模式: {upload_type} -> {target}")
        print("-" * 60)
        
        try:
            if self.args.schedule:
                self.scheduler.run_scheduled(
                    self._single_capture,
                    self.args.schedule
                )
            elif self.args.daily_schedule:
                self.scheduler.run_daily_schedule(
                    self._single_capture,
                    self.args.daily_schedule,
                    days=self.args.days
                )
            else:
                self.scheduler.run_interval(
                    self._single_capture,
                    interval=self.args.interval,
                    count=self.args.count,
                    initial_delay=self.args.delay
                )
        finally:
            self._finalize()


def _parse_upload_config(args) -> Optional[Dict[str, Any]]:
    config = {}
    
    if args.ftp_host:
        config.update({
            "type": "ftp",
            "host": args.ftp_host,
            "port": args.ftp_port,
            "username": args.ftp_user,
            "password": args.ftp_pass,
            "remote_dir": args.ftp_dir,
            "use_tls": args.ftp_tls,
            "max_retries": args.upload_retries,
            "retry_delay": args.upload_retry_delay
        })
    elif args.http_url:
        config.update({
            "type": "http",
            "url": args.http_url,
            "field_name": args.http_field,
            "timeout": args.http_timeout,
            "max_retries": args.upload_retries,
            "retry_delay": args.upload_retry_delay
        })
    
    return config if config else None


def _parse_region(region_str: str) -> Optional[tuple]:
    if not region_str:
        return None
    try:
        parts = [int(x.strip()) for x in region_str.split(",")]
        if len(parts) == 4:
            return tuple(parts)
    except:
        pass
    raise ValueError(f"区域格式错误，应为: left,top,width,height，例如: 100,100,800,600")


def main():
    parser = argparse.ArgumentParser(
        description="功能强大的命令行定时截图工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本用法：每5秒截一次图，共10张
  python -m screenshot_tool --interval 5 --count 10
  
  # 截取活动窗口，保存为JPG（质量85），删除PNG
  python -m screenshot_tool --mode window --to-jpg --jpg-quality 85
  
  # 截取鼠标周围300像素圆形区域，添加水印
  python -m screenshot_tool --mode circle --radius 300 --watermark
  
  # 定时任务：每天09:00:00截一张图
  python -m screenshot_tool --schedule 09:00:00
  
  # 多显示器：选择第2个显示器
  python -m screenshot_tool --monitor 1 --list-monitors
  
  # 生成GIF动画，帧间隔500ms
  python -m screenshot_tool --interval 2 --count 5 --make-gif --gif-duration 500
  
  # 隐藏命令行窗口，等待3秒后开始
  python -m screenshot_tool --hide-window --delay 3
  
  # FTP上传截图
  python -m screenshot_tool --ftp-host ftp.example.com --ftp-user user --ftp-pass pass
  
  # HTTP POST上传
  python -m screenshot_tool --http-url https://api.example.com/upload
        """
    )

    parser.add_argument("--interval", type=float, default=5,
                        help="截图间隔秒数 (默认: 5)")
    parser.add_argument("--count", type=int, default=1,
                        help="总截图张数 (默认: 1)")
    parser.add_argument("--delay", type=float, default=0,
                        help="开始前等待秒数，方便切换界面 (默认: 0)")
    
    parser.add_argument("--mode", choices=["full", "window", "circle", "region"],
                        default="full",
                        help="截图模式: full=全屏, window=活动窗口, circle=鼠标周围圆形, region=指定区域 (默认: full)")
    parser.add_argument("--monitor", type=int, default=0,
                        help="选择显示器编号，使用 --list-monitors 查看 (默认: 0)")
    parser.add_argument("--list-monitors", action="store_true",
                        help="列出所有可用显示器后退出")
    parser.add_argument("--radius", type=int, default=200,
                        help="圆形截取模式的半径像素 (默认: 200)")
    parser.add_argument("--region", type=str, default=None,
                        help="区域截取: left,top,width,height 例如: 100,100,800,600")
    
    parser.add_argument("--output-dir", type=str, default="./screenshots",
                        help="截图保存目录 (默认: ./screenshots)")
    parser.add_argument("--prefix", type=str, default="screenshot",
                        help="文件名前缀 (默认: screenshot)")
    
    parser.add_argument("--to-jpg", action="store_true",
                        help="转换为JPG格式并删除原始PNG")
    parser.add_argument("--jpg-quality", type=int, default=85,
                        help="JPG压缩质量 1-100 (默认: 85)")
    
    parser.add_argument("--watermark", action="store_true",
                        help="添加时间戳水印")
    parser.add_argument("--watermark-position", 
                        choices=["top-left", "top-right", "bottom-left", "bottom-right", "center"],
                        default="bottom-right",
                        help="水印位置 (默认: bottom-right)")
    parser.add_argument("--watermark-size", type=int, default=24,
                        help="水印字体大小 (默认: 24)")
    parser.add_argument("--watermark-opacity", type=int, default=180,
                        help="水印透明度 0-255 (默认: 180)")
    
    parser.add_argument("--schedule", type=str, default=None,
                        help="定时任务模式，指定时间点如 09:00:00，只截一张")
    parser.add_argument("--daily-schedule", type=str, nargs="+", default=None,
                        help="每日定时任务，可指定多个时间点 如 09:00 12:00 18:00")
    parser.add_argument("--days", type=int, default=None,
                        help="每日定时任务执行天数，默认无限")
    
    parser.add_argument("--make-gif", action="store_true",
                        help="任务完成后将所有截图合成为GIF动画")
    parser.add_argument("--gif-duration", type=int, default=500,
                        help="GIF帧间隔毫秒 (默认: 500)")
    parser.add_argument("--gif-max-width", type=int, default=None,
                        help="GIF最大宽度像素，用于缩小")
    
    parser.add_argument("--hide-window", action="store_true",
                        help="截图时隐藏命令行窗口")
    parser.add_argument("--minimize-window", action="store_true",
                        help="截图时最小化命令行窗口")
    
    parser.add_argument("--ftp-host", type=str, default=None,
                        help="FTP服务器地址")
    parser.add_argument("--ftp-port", type=int, default=21,
                        help="FTP端口 (默认: 21)")
    parser.add_argument("--ftp-user", type=str, default="",
                        help="FTP用户名")
    parser.add_argument("--ftp-pass", type=str, default="",
                        help="FTP密码")
    parser.add_argument("--ftp-dir", type=str, default="/",
                        help="FTP远程目录")
    parser.add_argument("--ftp-tls", action="store_true",
                        help="使用FTP TLS加密")
    
    parser.add_argument("--http-url", type=str, default=None,
                        help="HTTP POST上传URL")
    parser.add_argument("--http-field", type=str, default="file",
                        help="HTTP上传字段名 (默认: file)")
    parser.add_argument("--http-timeout", type=int, default=30,
                        help="HTTP请求超时秒 (默认: 30)")
    
    parser.add_argument("--test-upload", action="store_true",
                        help="测试FTP/HTTP上传连接后退出")
    parser.add_argument("--test-upload-before", action="store_true", default=True,
                        help="开始截图前测试上传连接 (默认: 开启)")
    parser.add_argument("--no-test-upload", action="store_false", dest="test_upload_before",
                        help="跳过上传连接测试")
    parser.add_argument("--upload-retries", type=int, default=3,
                        help="上传失败重试次数 (默认: 3)")
    parser.add_argument("--upload-retry-delay", type=int, default=2,
                        help="上传重试间隔秒数 (默认: 2)")
    
    parser.add_argument("--report", action="store_true", default=True,
                        help="生成截图报告 (默认: 开启)")
    parser.add_argument("--no-report", action="store_false", dest="report",
                        help="不生成报告")
    parser.add_argument("--report-format", choices=["txt", "json"], default="txt",
                        help="报告格式 (默认: txt)")

    args = parser.parse_args()
    
    try:
        args.region = _parse_region(args.region)
    except ValueError as e:
        parser.error(str(e))
    
    args.upload_config = _parse_upload_config(args)
    
    if args.mode == "region" and args.region is None:
        parser.error("使用 region 模式必须指定 --region 参数")
    
    if args.schedule and args.daily_schedule:
        parser.error("--schedule 和 --daily-schedule 不能同时使用")
    
    tool = ScreenshotTool(args)
    tool.run()


if __name__ == "__main__":
    main()
