import json
import csv
from io import StringIO
from typing import List
from jinja2 import Template
from .models import MeetingSummary, ActionItem, BatchAnalysis


class OutputFormatter:
    MARKDOWN_TEMPLATE = """# {{ summary.title }}

**会议类型**: {{ summary.meeting_type.value }}
**日期**: {{ summary.date or '未记录' }}
**参会人员**: {{ summary.participants | join(', ') }}
**时长**: {{ summary.duration_minutes or '未记录' }} 分钟

## 会议主题

{{ summary.main_topic }}

## 关键讨论点

{% for dp in summary.key_discussion_points %}
### {{ dp.topic }}
{{ dp.summary }}
{% if dp.participants %}_参与人: {{ dp.participants | join(', ') }}_{% endif %}

{% endfor %}

## 争议问题

{% if summary.controversial_issues %}
{% for ci in summary.controversial_issues %}
### {{ ci.topic }}
{% for view in ci.opposing_views %}
- {{ view }}
{% endfor %}
{% if ci.resolution %}**解决方案**: {{ ci.resolution }}{% endif %}

{% endfor %}
{% else %}
无争议问题。
{% endif %}

## 最终决议

{% if summary.decisions %}
{% for decision in summary.decisions %}
- {{ decision }}
{% endfor %}
{% else %}
无明确决议。
{% endif %}

## 行动点 (Action Items)

| 优先级 | 任务 | 负责人 | 截止日期 |
|--------|------|--------|----------|
{% for ai in sorted_action_items %}| {{ ai.priority.value | upper }} | {{ ai.task }} | {{ ai.assignee or '未分配' }} | {{ ai.due_date or '未设置' }} |
{% endfor %}

{% for ai in sorted_action_items %}
### {{ ai.task }}
- **ID**: {{ ai.id }}
- **负责人**: {{ ai.assignee or '未分配' }}
- **截止日期**: {{ ai.due_date or '未设置' }}
- **优先级**: {{ ai.priority.value | upper }}
{% if ai.description %}- **描述**: {{ ai.description }}{% endif %}
{% if ai.related_topics %}- **相关主题**: {{ ai.related_topics | join(', ') }}{% endif %}
{% if ai.is_duplicate %}- **注意**: 这是重复项，关联 ID: {{ ai.duplicate_of }}{% endif %}

{% endfor %}

---
_由 AI 会议纪要工具自动生成_
"""

    @staticmethod
    def to_markdown(summary: MeetingSummary) -> str:
        sorted_action_items = sorted(
            summary.action_items,
            key=lambda x: {"high": 0, "medium": 1, "low": 2}[x.priority.value]
        )
        template = Template(OutputFormatter.MARKDOWN_TEMPLATE)
        return template.render(summary=summary, sorted_action_items=sorted_action_items)

    @staticmethod
    def to_json(summary: MeetingSummary, indent: int = 2) -> str:
        data = json.loads(summary.model_dump_json(exclude={"raw_transcript"}))
        return json.dumps(data, ensure_ascii=False, indent=indent)

    @staticmethod
    def to_csv(action_items: List[ActionItem]) -> str:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "优先级", "任务", "负责人", "截止日期", "描述", "相关主题", "是否重复", "关联ID"])
        for ai in action_items:
            writer.writerow([
                ai.id,
                ai.priority.value,
                ai.task,
                ai.assignee or "",
                ai.due_date or "",
                ai.description or "",
                "; ".join(ai.related_topics),
                ai.is_duplicate,
                ai.duplicate_of or ""
            ])
        return output.getvalue()

    @staticmethod
    def save_markdown(summary: MeetingSummary, filepath: str) -> None:
        content = OutputFormatter.to_markdown(summary)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

    @staticmethod
    def save_json(summary: MeetingSummary, filepath: str) -> None:
        content = OutputFormatter.to_json(summary)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

    @staticmethod
    def save_csv(action_items: List[ActionItem], filepath: str) -> None:
        content = OutputFormatter.to_csv(action_items)
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            f.write(content)


class BatchOutputFormatter:
    BATCH_MARKDOWN_TEMPLATE = """# 会议汇总分析报告

## 概览

- **会议总数**: {{ analysis.total_meetings }}
- **行动点总数**: {{ analysis.total_action_items }}

## 行动点分布

### 按负责人

{% for assignee, count in analysis.action_items_by_assignee.items() %}
- {{ assignee }}: {{ count }} 个行动点
{% endfor %}

### 按优先级

{% for priority, count in analysis.action_items_by_priority.items() %}
- {{ priority | upper }}: {{ count }} 个行动点
{% endfor %}

## 常见主题

{% for topic in analysis.common_topics %}
- {{ topic }}
{% endfor %}

## 各会议详情

{% for meeting in analysis.meetings %}
### {{ meeting.title }}
- **日期**: {{ meeting.date or '未记录' }}
- **参会人员**: {{ meeting.participants | join(', ') }}
- **行动点数量**: {{ meeting.action_items | length }}

{% endfor %}

---
_由 AI 会议纪要工具自动生成_
"""

    @staticmethod
    def to_markdown(analysis: BatchAnalysis) -> str:
        template = Template(BatchOutputFormatter.BATCH_MARKDOWN_TEMPLATE)
        return template.render(analysis=analysis)

    @staticmethod
    def to_json(analysis: BatchAnalysis, indent: int = 2) -> str:
        data = json.loads(analysis.model_dump_json(exclude={"meetings__raw_transcript"}))
        return json.dumps(data, ensure_ascii=False, indent=indent)

    @staticmethod
    def save_markdown(analysis: BatchAnalysis, filepath: str) -> None:
        content = BatchOutputFormatter.to_markdown(analysis)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

    @staticmethod
    def save_json(analysis: BatchAnalysis, filepath: str) -> None:
        content = BatchOutputFormatter.to_json(analysis)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
