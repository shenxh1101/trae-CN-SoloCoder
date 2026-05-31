import re
import json
from typing import Dict, Any, List, Optional
from .models import (
    MeetingSummary,
    MeetingType,
    ActionItem,
    DiscussionPoint,
    ControversialIssue,
    Priority
)
from .llm_client import LLMClient
from .meeting_types import MeetingTypeConfig
from .utils import generate_id, extract_names, extract_dates, parse_priority, is_stop_word


class MeetingExtractor:
    def __init__(self, llm_client: LLMClient = None, feedback_manager=None):
        self.llm_client = llm_client or LLMClient()
        self.feedback_manager = feedback_manager

    def extract(
        self,
        transcript: str,
        meeting_type: MeetingType = MeetingType.GENERAL,
        title: str = None,
        force_rule: bool = False
    ) -> MeetingSummary:
        if not force_rule and self.llm_client.is_available():
            summary = self._extract_with_llm(transcript, meeting_type, title)
        else:
            summary = self._extract_without_llm(transcript, meeting_type, title)

        if self.feedback_manager:
            summary = self.feedback_manager.apply_preferences_to_summary(summary)

        return summary

    def _build_llm_prompt(
        self,
        transcript: str,
        meeting_type: MeetingType
    ) -> tuple:
        type_prompt = MeetingTypeConfig.get_prompt(meeting_type)

        name_aliases = {}
        priority_keywords = {}
        if self.feedback_manager:
            name_aliases = self.feedback_manager.get_name_aliases()
            priority_keywords = self.feedback_manager.get_priority_keywords()

        aliases_text = ""
        if name_aliases:
            aliases_text = "\n人名别名映射（请使用规范名称）:\n"
            for alias, canonical in name_aliases.items():
                aliases_text += f"  - {alias} -> {canonical}\n"

        priority_text = ""
        if priority_keywords:
            priority_text = "\n优先级关键词映射:\n"
            for keyword, priority in priority_keywords.items():
                priority_text += f"  - {keyword} -> {priority}\n"

        system_prompt = f"""你是一个专业的会议纪要专家。你的任务是从会议转录文本中提取关键信息。

{type_prompt}

{aliases_text}
{priority_text}

请以严格的JSON格式输出，包含以下字段：
{{
    "title": "会议标题（简短概括）",
    "main_topic": "会议核心主题",
    "participants": ["参会人姓名列表，使用规范名称"],
    "date": "会议日期，格式YYYY-MM-DD，如无法识别则为null",
    "duration_minutes": "会议时长（分钟），数字或null",
    "key_discussion_points": [
        {{
            "topic": "讨论主题",
            "summary": "讨论内容摘要（2-3句话）",
            "participants": ["参与讨论的人员"]
        }}
    ],
    "controversial_issues": [
        {{
            "topic": "争议问题",
            "opposing_views": ["不同观点列表"],
            "resolution": "最终解决方案或null"
        }}
    ],
    "decisions": ["最终做出的决定列表"],
    "action_items": [
        {{
            "task": "任务描述（清晰具体）",
            "assignee": "负责人姓名或null",
            "due_date": "截止日期YYYY-MM-DD或null",
            "priority": "high/medium/low之一",
            "description": "任务详细说明或null",
            "related_topics": ["关联的讨论主题"]
        }}
    ]
}}

提取要求：
1. 只提取明确提到的信息，不要臆测
2. 行动点必须是明确分配的任务
3. 争议问题是指有不同意见的讨论
4. 决议是指最终达成一致的决定
5. 日期格式严格为YYYY-MM-DD
6. 优先级：high=紧急/重要，medium=正常，low=可选/后续
7. 人名请使用规范名称，注意别名映射
"""

        user_prompt = f"""会议转录文本：
{transcript}

请提取会议信息，输出JSON格式。"""

        return system_prompt, user_prompt

    def _extract_with_llm(
        self,
        transcript: str,
        meeting_type: MeetingType,
        title: str = None
    ) -> MeetingSummary:
        system_prompt, user_prompt = self._build_llm_prompt(transcript, meeting_type)

        try:
            result = self.llm_client.generate_json(system_prompt, user_prompt)

            if "error" in result:
                print(f"LLM提取失败，回退到规则模式: {result.get('error')}")
                return self._extract_without_llm(transcript, meeting_type, title)

            return self._parse_llm_result(result, transcript, meeting_type, title)
        except Exception as e:
            print(f"LLM提取异常: {e}")
            return self._extract_without_llm(transcript, meeting_type, title)

    def _parse_llm_result(
        self,
        result: Dict[str, Any],
        transcript: str,
        meeting_type: MeetingType,
        title: str = None
    ) -> MeetingSummary:
        participants = result.get("participants", [])
        if not participants or not isinstance(participants, list):
            participants = extract_names(transcript)

        discussion_points = []
        dp_list = result.get("key_discussion_points", [])
        if isinstance(dp_list, list):
            for dp in dp_list:
                if isinstance(dp, dict):
                    discussion_points.append(DiscussionPoint(
                        topic=dp.get("topic", ""),
                        summary=dp.get("summary", ""),
                        participants=dp.get("participants", [])
                    ))

        controversial_issues = []
        ci_list = result.get("controversial_issues", [])
        if isinstance(ci_list, list):
            for ci in ci_list:
                if isinstance(ci, dict):
                    controversial_issues.append(ControversialIssue(
                        topic=ci.get("topic", ""),
                        opposing_views=ci.get("opposing_views", []),
                        resolution=ci.get("resolution")
                    ))

        action_items = []
        ai_list = result.get("action_items", [])
        if isinstance(ai_list, list):
            for idx, ai in enumerate(ai_list):
                if isinstance(ai, dict):
                    action_id = generate_id(ai.get("task", ""), str(idx))
                    priority = ai.get("priority", "medium")
                    try:
                        priority_enum = Priority(priority)
                    except ValueError:
                        priority_enum = Priority.MEDIUM

                    assignee = ai.get("assignee")
                    if assignee and self.feedback_manager:
                        aliases = self.feedback_manager.get_name_aliases()
                        assignee = aliases.get(assignee, assignee)

                    action_items.append(ActionItem(
                        id=action_id,
                        task=ai.get("task", ""),
                        assignee=assignee,
                        due_date=ai.get("due_date"),
                        priority=priority_enum,
                        description=ai.get("description"),
                        related_topics=ai.get("related_topics", []),
                        source_line=idx
                    ))

        decisions = result.get("decisions", [])
        if not isinstance(decisions, list):
            decisions = []

        duration = result.get("duration_minutes")
        if duration:
            try:
                duration = int(duration)
            except (ValueError, TypeError):
                duration = None

        return MeetingSummary(
            title=title or result.get("title", "会议纪要"),
            meeting_type=meeting_type,
            date=result.get("date"),
            participants=participants,
            duration_minutes=duration,
            main_topic=result.get("main_topic", ""),
            key_discussion_points=discussion_points,
            controversial_issues=controversial_issues,
            decisions=decisions,
            action_items=action_items,
            raw_transcript=transcript
        )

    def _extract_action_item(self, line: str, line_idx: int, current_topic: str) -> ActionItem:
        task = line
        assignee = None
        due_date = None

        known_names = {"张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十",
                       "小明", "小红", "小华", "小李", "小王", "老张", "老王",
                       "Tom", "Jerry", "Alice", "Bob", "Charlie", "David", "Eve", "Frank"}

        if self.feedback_manager:
            aliases = self.feedback_manager.get_name_aliases()
            for alias, canonical in aliases.items():
                known_names.add(alias)
                known_names.add(canonical)

        assignee_patterns = [
            r'([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)\s*负责',
            r'([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)\s*需要',
            r'([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)\s*跟进',
            r'([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)\s*完成',
            r'请\s*([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)',
            r'安排\s*([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)',
            r'由\s*([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)',
            r'指派\s*([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)',
        ]

        for pattern in assignee_patterns:
            match = re.search(pattern, line)
            if match:
                name = match.group(1)
                if name in known_names:
                    assignee = name
                    break
                elif not is_stop_word(name) and len(name) >= 2 and not re.search(r'[的是在了和与]', name):
                    assignee = name
                    break

        if not assignee:
            speaker_match = re.match(r'^([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)\s*[：:]', line)
            if speaker_match:
                name = speaker_match.group(1)
                if name in known_names:
                    assignee = name
                elif not is_stop_word(name) and len(name) >= 2 and not re.search(r'[的是在了和与]', name):
                    assignee = name

        if not assignee:
            names_in_line = extract_names(line)
            for name in names_in_line:
                if name in known_names:
                    assignee = name
                    break
            if not assignee and names_in_line:
                for name in names_in_line:
                    if not is_stop_word(name) and len(name) >= 2 and not re.search(r'[的是在了和与]', name):
                        assignee = name
                        break

        if assignee and self.feedback_manager:
            aliases = self.feedback_manager.get_name_aliases()
            assignee = aliases.get(assignee, assignee)

        dates_in_line = extract_dates(line)
        if dates_in_line:
            due_date = dates_in_line[0]

        clean_task_patterns = [
            r'^[\d\.\)]+\s*',
            r'^[\u4e00-\u9fa5]{2,4}\s*[：:]\s*',
            r'^(?:好的|好|行|可以|没问题)[，,。.]\s*',
        ]
        for pattern in clean_task_patterns:
            task = re.sub(pattern, '', task)

        task = task.strip()
        if len(task) > 200:
            task = task[:200] + "..."

        priority = parse_priority(line)
        if self.feedback_manager:
            priority_keywords = self.feedback_manager.get_priority_keywords()
            for keyword, prio in priority_keywords.items():
                if keyword.lower() in line.lower():
                    priority = Priority(prio)
                    break

        action_id = generate_id(task, str(line_idx))
        return ActionItem(
            id=action_id,
            task=task,
            assignee=assignee,
            due_date=due_date,
            priority=priority,
            related_topics=[current_topic] if current_topic else [],
            source_line=line_idx
        )

    def _extract_without_llm(
        self,
        transcript: str,
        meeting_type: MeetingType,
        title: str = None
    ) -> MeetingSummary:
        all_names = extract_names(transcript)
        known_names = {"张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十",
                       "小明", "小红", "小华", "小李", "小王", "老张", "老王",
                       "Tom", "Jerry", "Alice", "Bob", "Charlie", "David", "Eve", "Frank"}

        if self.feedback_manager:
            aliases = self.feedback_manager.get_name_aliases()
            for alias, canonical in aliases.items():
                known_names.add(alias)
                known_names.add(canonical)

        participants = sorted([n for n in all_names if n in known_names])
        if not participants:
            participants = all_names[:10]

        dates = extract_dates(transcript)

        lines = transcript.split('\n')
        discussion_points = []
        action_items = []
        decisions = []
        controversial_issues = []

        action_keywords = ["需要", "应该", "必须", "负责", "跟进", "完成", "TODO", "todo", "action", "ACTION", "请", "安排", "指派"]
        decision_keywords = ["决定", "同意", "通过", "确定", "结论", "决议", "推迟", "上线"]
        controversy_keywords = ["但是", "然而", "不同意", "反对", "问题是", "不过", "争议", "风险", "困难"]

        current_topic = ""
        current_speaker = ""

        for idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            speaker_match = re.match(r'^([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)\s*[：:]', line)
            if speaker_match:
                current_speaker = speaker_match.group(1)

            explicit_action_pattern = r'^[\d\.\)]+\s*.*(?:负责|需要|跟进|完成|请|安排)'
            if re.match(explicit_action_pattern, line) or any(kw in line for kw in action_keywords):
                action_item = self._extract_action_item(line, idx, current_topic)
                if action_item.task and len(action_item.task) > 5:
                    action_items.append(action_item)

            if any(kw in line for kw in decision_keywords):
                clean_line = line
                for name in known_names:
                    clean_line = re.sub(r'^' + re.escape(name) + r'\s*[：:]\s*', '', clean_line)
                if clean_line and len(clean_line) > 5:
                    decisions.append(clean_line)

            if any(kw in line for kw in controversy_keywords):
                clean_line = line
                for name in known_names:
                    clean_line = re.sub(r'^' + re.escape(name) + r'\s*[：:]\s*', '', clean_line)
                controversial_issues.append(ControversialIssue(
                    topic=clean_line[:50],
                    opposing_views=[clean_line],
                    resolution=None
                ))

            if len(line) > 30 and idx % 6 == 0:
                clean_line = line
                for name in known_names:
                    clean_line = re.sub(r'^' + re.escape(name) + r'\s*[：:]\s*', '', clean_line)
                current_topic = clean_line[:40]
                discussion_points.append(DiscussionPoint(
                    topic=current_topic,
                    summary=clean_line,
                    participants=[current_speaker] if current_speaker else []
                ))

        explicit_actions_section = False
        for idx, line in enumerate(lines):
            line = line.strip()
            if "行动项" in line or "行动点" in line or "Action Item" in line or "TODO" in line:
                explicit_actions_section = True
                continue
            if explicit_actions_section and re.match(r'^[\d\.\)]+\s*', line):
                action_item = self._extract_action_item(line, idx, current_topic)
                if action_item.task and len(action_item.task) > 5:
                    exists = any(a.task == action_item.task for a in action_items)
                    if not exists:
                        action_items.append(action_item)

        main_topic = lines[0].strip() if lines else "未命名会议"
        if len(main_topic) > 100:
            main_topic = main_topic[:100] + "..."

        explicit_date = None
        date_match = re.search(r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})', main_topic)
        if date_match:
            year, month, day = date_match.groups()
            explicit_date = f"{year}-{int(month):02d}-{int(day):02d}"

        meeting_date = explicit_date or (dates[0] if dates else None)

        return MeetingSummary(
            title=title or "会议纪要",
            meeting_type=meeting_type,
            date=meeting_date,
            participants=participants,
            duration_minutes=None,
            main_topic=main_topic,
            key_discussion_points=discussion_points,
            controversial_issues=controversial_issues,
            decisions=decisions,
            action_items=action_items,
            raw_transcript=transcript
        )

    def re_rank_action_items_with_llm(self, summary: MeetingSummary) -> MeetingSummary:
        if not self.llm_client.is_available() or not summary.action_items:
            return summary

        try:
            action_items_json = json.dumps([
                {"id": ai.id, "task": ai.task, "description": ai.description or ""}
                for ai in summary.action_items
            ], ensure_ascii=False)

            system_prompt = """你是一个任务优先级评估专家。请根据任务的紧急程度、重要性、截止时间等因素，
对以下行动点进行优先级评估。输出JSON格式，包含每个任务的ID和推荐的优先级（high/medium/low）。

输出格式示例：
{
    "priorities": [
        {"id": "xxx", "priority": "high", "reason": "理由"}
    ]
}
"""

            user_prompt = f"行动点列表：\n{action_items_json}\n\n请评估优先级。"

            result = self.llm_client.generate_json(system_prompt, user_prompt)

            if "error" not in result:
                priorities = result.get("priorities", [])
                priority_map = {p.get("id"): p.get("priority") for p in priorities if p.get("id")}

                for ai in summary.action_items:
                    if ai.id in priority_map:
                        try:
                            ai.priority = Priority(priority_map[ai.id])
                        except ValueError:
                            pass
        except Exception as e:
            print(f"优先级重排序失败: {e}")

        return summary
