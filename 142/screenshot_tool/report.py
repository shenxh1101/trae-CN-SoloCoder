import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from .image_processor import ImageProcessor


class ReportGenerator:
    def __init__(self):
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.screenshots: List[Dict[str, Any]] = []

    def start(self):
        self.start_time = datetime.now()

    def add_screenshot(self, filepath: str, **kwargs):
        size = ImageProcessor.get_file_size(filepath)
        self.screenshots.append({
            "filepath": filepath,
            "filename": os.path.basename(filepath),
            "size": size,
            "timestamp": datetime.now().isoformat(),
            **kwargs
        })

    def finish(self):
        self.end_time = datetime.now()

    def get_summary(self) -> Dict[str, Any]:
        total_size = sum(s["size"] for s in self.screenshots)
        duration = 0
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
        
        return {
            "total_count": len(self.screenshots),
            "total_size": total_size,
            "total_size_formatted": ImageProcessor.format_size(total_size),
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration": duration,
            "duration_formatted": self._format_duration(duration),
            "average_size": total_size / len(self.screenshots) if self.screenshots else 0,
            "average_size_formatted": ImageProcessor.format_size(
                total_size / len(self.screenshots) if self.screenshots else 0
            )
        }

    def print_report(self):
        summary = self.get_summary()
        print("\n" + "=" * 60)
        print("📸 截图任务报告")
        print("=" * 60)
        print(f"  开始时间: {self._format_datetime(self.start_time)}")
        print(f"  结束时间: {self._format_datetime(self.end_time)}")
        print(f"  总耗时: {summary['duration_formatted']}")
        print("-" * 60)
        print(f"  截图总数: {summary['total_count']} 张")
        print(f"  总文件大小: {summary['total_size_formatted']}")
        print(f"  平均文件大小: {summary['average_size_formatted']}")
        print("-" * 60)
        
        if self.screenshots:
            print("  截图列表:")
            for i, s in enumerate(self.screenshots, 1):
                print(f"    {i:3d}. {s['filename']} - {ImageProcessor.format_size(s['size'])}")
        
        print("=" * 60 + "\n")

    def save_report(self, output_dir: str, format: str = "txt") -> str:
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == "json":
            filepath = os.path.join(output_dir, f"report_{timestamp}.json")
            report_data = {
                "summary": self.get_summary(),
                "screenshots": self.screenshots
            }
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
        else:
            filepath = os.path.join(output_dir, f"report_{timestamp}.txt")
            summary = self.get_summary()
            lines = []
            lines.append("=" * 60)
            lines.append("截图任务报告")
            lines.append("=" * 60)
            lines.append(f"开始时间: {self._format_datetime(self.start_time)}")
            lines.append(f"结束时间: {self._format_datetime(self.end_time)}")
            lines.append(f"总耗时: {summary['duration_formatted']}")
            lines.append("-" * 60)
            lines.append(f"截图总数: {summary['total_count']} 张")
            lines.append(f"总文件大小: {summary['total_size_formatted']}")
            lines.append(f"平均文件大小: {summary['average_size_formatted']}")
            lines.append("-" * 60)
            lines.append("截图列表:")
            for i, s in enumerate(self.screenshots, 1):
                lines.append(f"  {i:3d}. {s['filename']} - {ImageProcessor.format_size(s['size'])}")
            lines.append("=" * 60)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
        
        print(f"报告已保存到: {filepath}")
        return filepath

    @staticmethod
    def _format_datetime(dt: Optional[datetime]) -> str:
        if dt:
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        return "N/A"

    @staticmethod
    def _format_duration(seconds: float) -> str:
        if seconds < 60:
            return f"{seconds:.2f} 秒"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.2f} 分钟"
        else:
            hours = seconds / 3600
            return f"{hours:.2f} 小时"
