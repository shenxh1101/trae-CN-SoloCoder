import csv
import json
import os
from datetime import datetime, date
from typing import List, Optional
from html import escape

from .models import Task, TaskStatus, Priority
from .config import STATUS_LABELS, PRIORITY_LABELS, REPEAT_LABELS


class DataExporter:
    @staticmethod
    def export_to_csv(tasks: List[Task], filepath: str) -> None:
        with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "ID", "标题", "描述", "状态", "优先级", "标签",
                "截止日期", "创建时间", "更新时间", "完成时间",
                "重复频率", "提醒时间", "依赖任务"
            ])

            for task in tasks:
                writer.writerow([
                    task.id,
                    task.title,
                    task.description,
                    STATUS_LABELS.get(task.status.value, task.status.value),
                    PRIORITY_LABELS.get(task.priority.value, task.priority.value),
                    ", ".join(task.tags),
                    task.due_date.isoformat() if task.due_date else "",
                    task.created_at.isoformat(),
                    task.updated_at.isoformat(),
                    task.completed_at.isoformat() if task.completed_at else "",
                    REPEAT_LABELS.get(task.repeat_frequency.value, task.repeat_frequency.value),
                    task.reminder_time.isoformat() if task.reminder_time else "",
                    ", ".join(task.dependencies),
                ])

    @staticmethod
    def export_to_html(tasks: List[Task], filepath: str, title: str = "任务报告") -> None:
        today = date.today().strftime("%Y年%m月%d日")

        status_colors = {
            "pending": "#f59e0b",
            "in_progress": "#3b82f6",
            "completed": "#10b981",
            "on_hold": "#6b7280",
        }

        priority_colors = {
            "low": "#10b981",
            "medium": "#f59e0b",
            "high": "#ef4444",
            "urgent": "#dc2626",
        }

        def format_date(d: Optional[date]) -> str:
            return d.strftime("%Y-%m-%d") if d else "-"

        def format_datetime(dt: Optional[datetime]) -> str:
            return dt.strftime("%Y-%m-%d %H:%M") if dt else "-"

        html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escape(title)}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 40px;
        }}
        .header h1 {{ font-size: 28px; margin-bottom: 8px; }}
        .header p {{ opacity: 0.9; }}
        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            padding: 30px 40px;
            background: #f8fafc;
        }}
        .stat-card {{
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }}
        .stat-value {{ font-size: 32px; font-weight: bold; color: #667eea; }}
        .stat-label {{ color: #64748b; margin-top: 4px; }}
        .content {{ padding: 30px 40px; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        th, td {{
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }}
        th {{
            background: #f1f5f9;
            font-weight: 600;
            color: #475569;
        }}
        tr:hover {{ background: #f8fafc; }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            color: white;
        }}
        .tag {{
            display: inline-block;
            background: #e0e7ff;
            color: #4338ca;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin: 2px;
        }}
        .overdue {{ color: #dc2626; font-weight: 600; }}
        .footer {{
            padding: 20px 40px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
            background: #f8fafc;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 {escape(title)}</h1>
            <p>生成日期: {today} | 共 {len(tasks)} 个任务</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">{len(tasks)}</div>
                <div class="stat-label">总任务数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)}</div>
                <div class="stat-label">已完成</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{sum(1 for t in tasks if t.status == TaskStatus.IN_PROGRESS)}</div>
                <div class="stat-label">进行中</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{sum(1 for t in tasks if t.is_overdue())}</div>
                <div class="stat-label">已逾期</div>
            </div>
        </div>

        <div class="content">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>状态</th>
                        <th>优先级</th>
                        <th>标题</th>
                        <th>截止日期</th>
                        <th>标签</th>
                    </tr>
                </thead>
                <tbody>
"""

        for task in tasks:
            status_color = status_colors.get(task.status.value, "#6b7280")
            priority_color = priority_colors.get(task.priority.value, "#6b7280")
            status_label = STATUS_LABELS.get(task.status.value, task.status.value)
            priority_label = PRIORITY_LABELS.get(task.priority.value, task.priority.value)

            due_class = 'overdue' if task.is_overdue() else ''
            due_str = f'<span class="{due_class}">{format_date(task.due_date)}</span>'

            tags_html = "".join(
                f'<span class="tag">{escape(tag)}</span>'
                for tag in task.tags
            )

            html_content += f"""
                    <tr>
                        <td><code>{escape(task.id)}</code></td>
                        <td><span class="badge" style="background: {status_color}">{escape(status_label)}</span></td>
                        <td><span class="badge" style="background: {priority_color}">{escape(priority_label)}</span></td>
                        <td><strong>{escape(task.title)}</strong></td>
                        <td>{due_str}</td>
                        <td>{tags_html}</td>
                    </tr>
"""

        html_content += f"""
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>由 TaskManager 生成于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>"""

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)

    @staticmethod
    def export_to_json(tasks: List[Task], filepath: str) -> None:
        tasks_data = [task.to_dict() for task in tasks]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(tasks_data, f, indent=2, ensure_ascii=False)

    @staticmethod
    def import_from_json(filepath: str) -> List[dict]:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
