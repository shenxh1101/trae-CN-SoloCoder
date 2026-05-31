import csv
from io import StringIO
from typing import List
from .models import ActionItem


class TodoistExporter:
    @staticmethod
    def to_csv(action_items: List[ActionItem]) -> str:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "TYPE", "CONTENT", "DESCRIPTION", "PRIORITY", "INDENT",
            "AUTHOR", "RESPONSIBLE", "DATE", "DATE_LANG", "TIMEZONE"
        ])

        priority_map = {"high": 4, "medium": 3, "low": 2}

        for ai in action_items:
            if ai.is_duplicate:
                continue

            priority = priority_map.get(ai.priority.value, 3)
            description = ai.description or ""
            if ai.related_topics:
                description += f"\n相关主题: {', '.join(ai.related_topics)}"

            writer.writerow([
                "task",
                ai.task,
                description,
                priority,
                1,
                "",
                ai.assignee or "",
                ai.due_date or "",
                "zh_CN",
                "Asia/Shanghai"
            ])

        return output.getvalue()

    @staticmethod
    def save(action_items: List[ActionItem], filepath: str) -> None:
        content = TodoistExporter.to_csv(action_items)
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            f.write(content)


class MicrosoftToDoExporter:
    @staticmethod
    def to_csv(action_items: List[ActionItem]) -> str:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Subject", "Start Date", "Due Date", "Reminder on/off",
            "Reminder Date", "Reminder Time", "Categories",
            "Importance", "Status", "Description"
        ])

        importance_map = {"high": "High", "medium": "Normal", "low": "Low"}

        for ai in action_items:
            if ai.is_duplicate:
                continue

            importance = importance_map.get(ai.priority.value, "Normal")
            categories = "; ".join(ai.related_topics) if ai.related_topics else "Meeting"
            description = ai.description or ""
            if ai.assignee:
                description += f"\n负责人: {ai.assignee}"

            writer.writerow([
                ai.task,
                "",
                ai.due_date or "",
                "FALSE",
                "",
                "",
                categories,
                importance,
                "Not Started",
                description
            ])

        return output.getvalue()

    @staticmethod
    def save(action_items: List[ActionItem], filepath: str) -> None:
        content = MicrosoftToDoExporter.to_csv(action_items)
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
