import os
import glob
from typing import List, Dict
from collections import Counter
from .models import MeetingSummary, BatchAnalysis, MeetingType
from .extractor import MeetingExtractor
from .utils import read_file
from .action_items import ActionItemProcessor


class BatchProcessor:
    def __init__(self, extractor: MeetingExtractor = None):
        self.extractor = extractor or MeetingExtractor()

    def process_directory(
        self,
        directory: str,
        meeting_type: MeetingType = MeetingType.GENERAL,
        pattern: str = "*.txt",
        use_llm: bool = True
    ) -> List[MeetingSummary]:
        file_pattern = os.path.join(directory, pattern)
        files = glob.glob(file_pattern)
        return self.process_files(files, meeting_type, use_llm)

    def process_files(
        self,
        filepaths: List[str],
        meeting_type: MeetingType = MeetingType.GENERAL,
        use_llm: bool = True
    ) -> List[MeetingSummary]:
        summaries = []
        for filepath in filepaths:
            try:
                transcript = read_file(filepath)
                title = os.path.splitext(os.path.basename(filepath))[0]
                summary = self.extractor.extract(
                    transcript=transcript,
                    meeting_type=meeting_type,
                    title=title,
                    force_rule=not use_llm
                )
                summaries.append(summary)
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
        return summaries

    def analyze(self, summaries: List[MeetingSummary]) -> BatchAnalysis:
        all_action_items = []
        all_participants = []
        all_topics = []

        for summary in summaries:
            all_action_items.extend(summary.action_items)
            all_participants.extend(summary.participants)
            all_topics.append(summary.main_topic)
            for dp in summary.key_discussion_points:
                all_topics.append(dp.topic)

        action_items_by_assignee = {}
        for ai in all_action_items:
            assignee = ai.assignee or "未分配"
            action_items_by_assignee[assignee] = action_items_by_assignee.get(assignee, 0) + 1

        action_items_by_priority = {}
        for ai in all_action_items:
            priority = ai.priority.value
            action_items_by_priority[priority] = action_items_by_priority.get(priority, 0) + 1

        topic_counter = Counter(all_topics)
        common_topics = [topic for topic, _ in topic_counter.most_common(10)]

        return BatchAnalysis(
            total_meetings=len(summaries),
            total_action_items=len(all_action_items),
            action_items_by_assignee=action_items_by_assignee,
            action_items_by_priority=action_items_by_priority,
            common_topics=common_topics,
            meetings=summaries
        )

    def get_all_action_items(self, summaries: List[MeetingSummary]) -> List:
        all_items = []
        for summary in summaries:
            all_items.extend(summary.action_items)
        return ActionItemProcessor.prioritize(all_items)

    def find_person_action_items(self, summaries: List[MeetingSummary], person: str):
        items = []
        for summary in summaries:
            for ai in summary.action_items:
                if ai.assignee and person.lower() in ai.assignee.lower():
                    items.append((summary, ai))
        return items
