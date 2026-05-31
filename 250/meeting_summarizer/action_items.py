import re
from typing import List, Dict, Optional, Tuple
from fuzzywuzzy import fuzz, process
from .models import ActionItem, Priority
from .utils import generate_id


class ActionItemProcessor:
    @staticmethod
    def prioritize(action_items: List[ActionItem]) -> List[ActionItem]:
        priority_order = {Priority.HIGH: 0, Priority.MEDIUM: 1, Priority.LOW: 2}
        return sorted(action_items, key=lambda x: (priority_order[x.priority], x.task))

    @staticmethod
    def find_duplicates(
        action_items: List[ActionItem],
        threshold: int = 75,
        match_assignee: bool = False
    ) -> List[ActionItem]:
        processed = []
        duplicate_map = {}

        for item in action_items:
            item.is_duplicate = False
            item.duplicate_of = None

        for i, item in enumerate(action_items):
            if item.id in duplicate_map:
                continue

            is_duplicate = False
            duplicate_of_id = None
            max_similarity = 0

            for existing in processed:
                task_similarity = fuzz.token_set_ratio(item.task, existing.task)

                assignee_match = True
                if match_assignee and item.assignee and existing.assignee:
                    assignee_match = (item.assignee == existing.assignee)

                if task_similarity >= threshold and assignee_match:
                    is_duplicate = True
                    duplicate_of_id = existing.id
                    max_similarity = task_similarity
                    break

                description_similarity = 0
                if item.description and existing.description:
                    description_similarity = fuzz.token_set_ratio(
                        item.description, existing.description
                    )

                combined_similarity = (task_similarity + description_similarity) / 2
                if combined_similarity >= threshold and assignee_match:
                    is_duplicate = True
                    duplicate_of_id = existing.id
                    max_similarity = combined_similarity
                    break

            if is_duplicate and duplicate_of_id:
                item.is_duplicate = True
                item.duplicate_of = duplicate_of_id
                duplicate_map[item.id] = duplicate_of_id

            processed.append(item)

        return processed

    @staticmethod
    def find_related(
        action_items: List[ActionItem],
        threshold: int = 60
    ) -> Dict[str, List[str]]:
        related_groups = {}

        tasks = [item.task for item in action_items]

        for i, item in enumerate(action_items):
            related = []
            other_tasks = [t for j, t in enumerate(tasks) if j != i]

            if other_tasks:
                matches = process.extract(item.task, other_tasks, limit=5)
                for match_task, score in matches:
                    if score >= threshold:
                        for other in action_items:
                            if other.task == match_task and other.id != item.id:
                                related.append(other.id)
                                break

            if related:
                related_groups[item.id] = related

        return related_groups

    @staticmethod
    def merge_duplicates(
        action_items: List[ActionItem],
        smart_merge: bool = True
    ) -> List[ActionItem]:
        if not action_items:
            return []

        action_items = ActionItemProcessor.find_duplicates(action_items)

        id_to_item = {item.id: item for item in action_items}
        merged_ids = set()
        result = []

        for item in action_items:
            if item.id in merged_ids:
                continue

            if item.is_duplicate and item.duplicate_of:
                original = id_to_item.get(item.duplicate_of)
                if original and smart_merge:
                    ActionItemProcessor._merge_into(original, item)
                    merged_ids.add(item.id)
                    continue

            result.append(item)
            merged_ids.add(item.id)

        return result

    @staticmethod
    def _merge_into(target: ActionItem, source: ActionItem) -> None:
        if source.description and not target.description:
            target.description = source.description
        elif source.description and source.description not in target.description:
            target.description = target.description + "; " + source.description

        if source.due_date and not target.due_date:
            target.due_date = source.due_date

        if source.assignee and not target.assignee:
            target.assignee = source.assignee

        for topic in source.related_topics:
            if topic not in target.related_topics:
                target.related_topics.append(topic)

        priority_order = {Priority.HIGH: 0, Priority.MEDIUM: 1, Priority.LOW: 2}
        if priority_order.get(source.priority, 2) < priority_order.get(target.priority, 2):
            target.priority = source.priority

    @staticmethod
    def group_by_assignee(action_items: List[ActionItem]) -> Dict[str, List[ActionItem]]:
        groups = {}
        for item in action_items:
            assignee = item.assignee or "未分配"
            if assignee not in groups:
                groups[assignee] = []
            groups[assignee].append(item)
        return groups

    @staticmethod
    def group_by_priority(action_items: List[ActionItem]) -> Dict[str, List[ActionItem]]:
        groups = {}
        for item in action_items:
            priority = item.priority.value
            if priority not in groups:
                groups[priority] = []
            groups[priority].append(item)
        return groups

    @staticmethod
    def group_by_due_date(action_items: List[ActionItem]) -> Dict[str, List[ActionItem]]:
        groups = {}
        for item in action_items:
            due_date = item.due_date or "未设置"
            if due_date not in groups:
                groups[due_date] = []
            groups[due_date].append(item)
        return dict(sorted(groups.items()))

    @staticmethod
    def update_priority(action_item: ActionItem, new_priority: Priority) -> ActionItem:
        action_item.priority = new_priority
        return action_item

    @staticmethod
    def update_assignee(action_item: ActionItem, new_assignee: str) -> ActionItem:
        action_item.assignee = new_assignee
        return action_item

    @staticmethod
    def update_due_date(action_item: ActionItem, new_due_date: str) -> ActionItem:
        action_item.due_date = new_due_date
        return action_item

    @staticmethod
    def re_rank_by_semantic_importance(
        action_items: List[ActionItem],
        priorities: Dict[str, str]
    ) -> List[ActionItem]:
        for item in action_items:
            if item.id in priorities:
                try:
                    item.priority = Priority(priorities[item.id])
                except ValueError:
                    pass

        return ActionItemProcessor.prioritize(action_items)

    @staticmethod
    def get_statistics(action_items: List[ActionItem]) -> Dict:
        if not action_items:
            return {
                "total": 0,
                "by_priority": {"high": 0, "medium": 0, "low": 0},
                "with_assignee": 0,
                "with_due_date": 0
            }

        by_priority = ActionItemProcessor.group_by_priority(action_items)
        by_assignee = ActionItemProcessor.group_by_assignee(action_items)

        return {
            "total": len(action_items),
            "by_priority": {
                "high": len(by_priority.get("high", [])),
                "medium": len(by_priority.get("medium", [])),
                "low": len(by_priority.get("low", []))
            },
            "with_assignee": len([a for a in action_items if a.assignee]),
            "with_due_date": len([a for a in action_items if a.due_date]),
            "assignees_count": len(by_assignee),
            "assignees": list(by_assignee.keys())
        }

    @staticmethod
    def detect_conflicts(action_items: List[ActionItem]) -> List[Tuple[ActionItem, ActionItem, str]]:
        conflicts = []

        for i, item1 in enumerate(action_items):
            for item2 in action_items[i+1:]:
                if item1.assignee and item2.assignee and item1.assignee == item2.assignee:
                    if item1.due_date and item2.due_date and item1.due_date == item2.due_date:
                        conflicts.append((
                            item1, item2,
                            f"同一人({item1.assignee})在同一天({item1.due_date})有多个任务"
                        ))

        return conflicts

    @staticmethod
    def bulk_update_assignee(
        action_items: List[ActionItem],
        old_assignee: str,
        new_assignee: str
    ) -> List[ActionItem]:
        for item in action_items:
            if item.assignee == old_assignee:
                item.assignee = new_assignee
        return action_items
