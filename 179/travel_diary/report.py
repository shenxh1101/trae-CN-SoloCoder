from typing import Optional, Dict
from pathlib import Path
from datetime import datetime

from .models import Trip
from .manager import DiaryManager
from .storage import StorageManager


class ReportGenerator:
    def __init__(self, manager: Optional[DiaryManager] = None):
        self.manager = manager or DiaryManager()
        self.storage = self.manager.storage

    def generate_markdown_report(self, username: str, trip_id: str,
                                 output_path: Optional[str] = None) -> str:
        trip = self.manager.get_trip(username, trip_id)
        if not trip:
            raise ValueError(f"旅行 '{trip_id}' 不存在")
        summary = self.manager.get_expense_summary(username, trip_id)
        md_content = self._build_markdown(trip, summary)
        if not output_path:
            reports_dir = self.storage.get_reports_dir(username)
            safe_name = "".join(c if c.isalnum() or c in "_-" else "_" for c in trip.name)
            output_path = str(reports_dir / f"{safe_name}_{trip.start_date}_report.md")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(md_content)
        return output_path

    def _build_markdown(self, trip: Trip, summary: Dict) -> str:
        lines = []
        lines.append(f"# 旅行报告: {trip.name}")
        lines.append("")
        lines.append(f"**目的地**: {trip.destination}  ")
        lines.append(f"**旅行日期**: {trip.start_date} 至 {trip.end_date}  ")
        lines.append(f"**总天数**: {summary.get('duration_days', 0)} 天  ")
        lines.append(f"**总开销**: ¥{summary.get('total', 0):.2f}  ")
        lines.append(f"**日均开销**: ¥{summary.get('daily_average', 0):.2f}  ")
        lines.append("")
        if trip.description:
            lines.append("## 旅行简介")
            lines.append("")
            lines.append(trip.description)
            lines.append("")
        lines.append("## 开销统计")
        lines.append("")
        lines.append("| 类别 | 金额 (¥) | 占比 |")
        lines.append("|------|---------|------|")
        by_category = summary.get("by_category", {})
        percentages = summary.get("category_percentages", {})
        for category in sorted(by_category.keys()):
            amount = by_category[category]
            pct = percentages.get(category, 0)
            lines.append(f"| {category} | {amount:.2f} | {pct:.1f}% |")
        lines.append(f"| **总计** | **{summary.get('total', 0):.2f}** | **100%** |")
        lines.append("")
        lines.append("## 每日开销")
        lines.append("")
        lines.append("| 日期 | 开销 (¥) |")
        lines.append("|------|---------|")
        by_date = summary.get("by_date", {})
        for date in sorted(by_date.keys()):
            lines.append(f"| {date} | {by_date[date]:.2f} |")
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## 旅行日记")
        lines.append("")
        for entry in trip.diary_entries:
            lines.append(f"### {entry.date}")
            lines.append("")
            meta_parts = []
            if entry.mood:
                meta_parts.append(f"**心情**: {entry.mood}")
            if entry.location:
                meta_parts.append(f"**位置**: {entry.location.name}")
            if meta_parts:
                lines.append("  \n".join(meta_parts))
                lines.append("")
            if entry.photo_path:
                photo_path = Path(entry.photo_path)
                if photo_path.exists():
                    lines.append(f"![{entry.date}]({photo_path.as_uri()})")
                    lines.append("")
            if entry.content:
                lines.append(entry.content)
                lines.append("")
            if entry.expenses:
                lines.append("#### 当日开销")
                lines.append("")
                lines.append("| 类别 | 描述 | 金额 (¥) |")
                lines.append("|------|------|---------|")
                for exp in entry.expenses:
                    lines.append(f"| {exp.category} | {exp.description} | {exp.amount:.2f} |")
                lines.append(f"| **小计** | | **{entry.get_total_expenses():.2f}** |")
                lines.append("")
            lines.append("---")
            lines.append("")
        lines.append(f"*报告生成于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        return "\n".join(lines)

    def generate_pdf_report(self, username: str, trip_id: str,
                            output_path: Optional[str] = None) -> str:
        md_path = self.generate_markdown_report(username, trip_id)
        if not output_path:
            md_file = Path(md_path)
            output_path = str(md_file.with_suffix('.pdf'))
        try:
            import markdown
            from weasyprint import HTML, CSS
            with open(md_path, "r", encoding="utf-8") as f:
                md_content = f.read()
            html_content = markdown.markdown(md_content, extensions=['tables'])
            css = CSS(string="""
                @page { size: A4; margin: 2cm; }
                body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 12px; }
                h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                h2 { color: #34495e; margin-top: 25px; }
                h3 { color: #3498db; margin-top: 20px; }
                table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f8f9fa; }
                img { max-width: 100%; height: auto; margin: 10px 0; }
                hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
            """)
            HTML(string=html_content, base_url=str(Path(md_path).parent)).write_pdf(
                output_path, stylesheets=[css]
            )
            return output_path
        except ImportError as e:
            raise RuntimeError(
                f"PDF导出需要安装额外依赖: {e}. "
                "请运行: pip install markdown weasyprint"
            )
