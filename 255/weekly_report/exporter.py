from pathlib import Path
from typing import Dict


class Exporter:
    @staticmethod
    def to_markdown(report: Dict) -> str:
        lines = []
        
        title = report.get("title", "工作周报")
        date = report.get("date", "")
        author = report.get("author", "")
        
        lines.append(f"# {title}")
        lines.append("")
        
        if author or date:
            meta = []
            if author:
                meta.append(f"**报告人**：{author}")
            if date:
                meta.append(f"**日期**：{date}")
            lines.append("  ".join(meta))
            lines.append("")
        
        sections = report.get("sections", {})
        for section_name, items in sections.items():
            lines.append(f"## {section_name}")
            lines.append("")
            if items:
                for item in items:
                    lines.append(f"- {item}")
            else:
                lines.append("*无*")
            lines.append("")
        
        time_analysis = report.get("time_analysis", {})
        if time_analysis:
            lines.append("## 工作耗时统计")
            lines.append("")
            
            total = sum(time_analysis.values()) if time_analysis else 0
            for category, percentage in sorted(time_analysis.items(), key=lambda x: -x[1]):
                bar_length = int(percentage / 5) if total > 0 else 0
                bar = "█" * bar_length + "░" * (20 - bar_length)
                lines.append(f"- {category}: {percentage}% {bar}")
            lines.append("")
        
        todo_list = report.get("todo_list", [])
        if todo_list:
            lines.append("## 待办事项")
            lines.append("")
            
            priority_map = {"high": "🔴 高", "medium": "🟡 中", "low": "🟢 低"}
            
            for todo in todo_list:
                if isinstance(todo, dict):
                    task = todo.get("task", str(todo))
                    priority = todo.get("priority", "medium")
                    priority_text = priority_map.get(priority, priority)
                    lines.append(f"- [ ] {task}（优先级：{priority_text}）")
                else:
                    lines.append(f"- [ ] {todo}")
            lines.append("")
        
        summary = report.get("summary", "")
        if summary:
            lines.append("## 总结")
            lines.append("")
            lines.append(summary)
            lines.append("")
        
        return "\n".join(lines)

    @staticmethod
    def to_html(report: Dict, include_css: bool = True) -> str:
        title = report.get("title", "工作周报")
        date = report.get("date", "")
        author = report.get("author", "")
        
        css = """
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; border-left: 4px solid #3498db; padding-left: 15px; margin-top: 30px; }
    .meta { color: #7f8c8d; margin-bottom: 30px; font-size: 0.95em; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .time-bar { display: inline-block; height: 12px; background: linear-gradient(90deg, #3498db, #2980b9); border-radius: 3px; margin-left: 10px; vertical-align: middle; }
    .time-item { margin: 10px 0; }
    .todo-item { padding: 8px; background: #f8f9fa; border-radius: 4px; margin: 5px 0; }
    .priority-high { border-left: 4px solid #e74c3c; }
    .priority-medium { border-left: 4px solid #f39c12; }
    .priority-low { border-left: 4px solid #27ae60; }
    .summary { background: #e8f4f8; padding: 15px; border-radius: 8px; margin-top: 20px; }
</style>
""" if include_css else ""
        
        html_parts = [f"<!DOCTYPE html><html><head><meta charset='UTF-8'><title>{title}</title>{css}</head><body>"]
        
        html_parts.append(f"<h1>{title}</h1>")
        
        if author or date:
            meta_parts = []
            if author:
                meta_parts.append(f"报告人：<strong>{author}</strong>")
            if date:
                meta_parts.append(f"日期：{date}")
            html_parts.append(f"<div class='meta'>{' | '.join(meta_parts)}</div>")
        
        sections = report.get("sections", {})
        for section_name, items in sections.items():
            html_parts.append(f"<h2>{section_name}</h2><ul>")
            if items:
                for item in items:
                    html_parts.append(f"<li>{item}</li>")
            else:
                html_parts.append("<li><em>无</em></li>")
            html_parts.append("</ul>")
        
        time_analysis = report.get("time_analysis", {})
        if time_analysis:
            html_parts.append("<h2>工作耗时统计</h2>")
            html_parts.append("<div>")
            total = sum(time_analysis.values()) if time_analysis else 0
            for category, percentage in sorted(time_analysis.items(), key=lambda x: -x[1]):
                width = percentage if total > 0 else 0
                html_parts.append(f"<div class='time-item'>{category}: {percentage}% <span class='time-bar' style='width:{width}%'></span></div>")
            html_parts.append("</div>")
        
        todo_list = report.get("todo_list", [])
        if todo_list:
            html_parts.append("<h2>待办事项</h2>")
            
            for todo in todo_list:
                if isinstance(todo, dict):
                    task = todo.get("task", str(todo))
                    priority = todo.get("priority", "medium")
                    html_parts.append(f"<div class='todo-item priority-{priority}'><input type='checkbox'> {task}</div>")
                else:
                    html_parts.append(f"<div class='todo-item priority-medium'><input type='checkbox'> {todo}</div>")
        
        summary = report.get("summary", "")
        if summary:
            html_parts.append(f"<h2>总结</h2><div class='summary'>{summary}</div>")
        
        html_parts.append("</body></html>")
        
        return "\n".join(html_parts)

    @staticmethod
    def to_plain_text(report: Dict) -> str:
        lines = []
        
        title = report.get("title", "工作周报")
        date = report.get("date", "")
        author = report.get("author", "")
        
        lines.append("=" * 60)
        lines.append(title.center(60))
        lines.append("=" * 60)
        lines.append("")
        
        if author or date:
            meta = []
            if author:
                meta.append(f"报告人：{author}")
            if date:
                meta.append(f"日期：{date}")
            lines.append("  ".join(meta))
            lines.append("")
        
        sections = report.get("sections", {})
        for section_name, items in sections.items():
            lines.append("-" * 40)
            lines.append(f"【{section_name}】")
            lines.append("-" * 40)
            if items:
                for item in items:
                    lines.append(f"• {item}")
            else:
                lines.append("  无")
            lines.append("")
        
        time_analysis = report.get("time_analysis", {})
        if time_analysis:
            lines.append("-" * 40)
            lines.append("【工作耗时统计】")
            lines.append("-" * 40)
            for category, percentage in sorted(time_analysis.items(), key=lambda x: -x[1]):
                lines.append(f"{category}: {percentage}%")
            lines.append("")
        
        todo_list = report.get("todo_list", [])
        if todo_list:
            lines.append("-" * 40)
            lines.append("【待办事项】")
            lines.append("-" * 40)
            
            priority_map = {"high": "高", "medium": "中", "low": "低"}
            
            for todo in todo_list:
                if isinstance(todo, dict):
                    task = todo.get("task", str(todo))
                    priority = todo.get("priority", "medium")
                    priority_text = priority_map.get(priority, priority)
                    lines.append(f"[ ] {task}（优先级：{priority_text}）")
                else:
                    lines.append(f"[ ] {todo}")
            lines.append("")
        
        summary = report.get("summary", "")
        if summary:
            lines.append("-" * 40)
            lines.append("【总结】")
            lines.append("-" * 40)
            lines.append(summary)
        
        return "\n".join(lines)

    @staticmethod
    def export(report: Dict, output_path: str, format: str = "markdown") -> None:
        path = Path(output_path)
        
        if format == "markdown":
            content = Exporter.to_markdown(report)
        elif format == "html":
            content = Exporter.to_html(report)
        elif format == "text":
            content = Exporter.to_plain_text(report)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
