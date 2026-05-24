from typing import List, Optional, Dict, Any
from datetime import datetime, date

from .models import Task, TaskStatus, Priority, PRIORITY_ORDER
from .config import (
    get_theme,
    STATUS_LABELS,
    PRIORITY_LABELS,
    REPEAT_LABELS,
    Color,
)


class UIRenderer:
    def __init__(self, theme_name: str = "dark"):
        self.theme = get_theme(theme_name)

    def set_theme(self, theme_name: str) -> None:
        self.theme = get_theme(theme_name)

    def _get_priority_color(self, priority: Priority) -> str:
        color_map = {
            Priority.URGENT: self.theme.urgent,
            Priority.HIGH: self.theme.high,
            Priority.MEDIUM: self.theme.medium,
            Priority.LOW: self.theme.low,
        }
        return color_map.get(priority, self.theme.muted)

    def _get_status_color(self, status: TaskStatus) -> str:
        color_map = {
            TaskStatus.PENDING: self.theme.pending,
            TaskStatus.IN_PROGRESS: self.theme.in_progress,
            TaskStatus.COMPLETED: self.theme.completed,
            TaskStatus.ON_HOLD: self.theme.on_hold,
        }
        return color_map.get(status, self.theme.muted)

    def format_date(self, d: Optional[date]) -> str:
        if d is None:
            return "-"
        return d.strftime("%Y-%m-%d")

    def format_datetime(self, dt: Optional[datetime]) -> str:
        if dt is None:
            return "-"
        return dt.strftime("%Y-%m-%d %H:%M")

    def render_task_table(
        self,
        tasks: List[Task],
        title: str = "任务列表",
        show_details: bool = False,
    ) -> str:
        if not tasks:
            return self.theme.apply("暂无任务", self.theme.muted)

        lines = []

        border = self.theme.apply("═" * 100, self.theme.border)
        lines.append(border)
        lines.append(
            self.theme.apply(
                f" {title} ({len(tasks)}个任务) ",
                self.theme.header,
            )
        )
        lines.append(border)

        header = (
            f"{'ID':<10} "
            f"{'状态':<8} "
            f"{'优先级':<6} "
            f"{'标题':<30} "
            f"{'截止日期':<12} "
            f"{'标签':<20}"
        )
        lines.append(self.theme.apply(header, self.theme.header))
        lines.append(self.theme.apply("─" * 100, self.theme.border))

        for task in tasks:
            status_str = STATUS_LABELS.get(task.status.value, task.status.value)
            priority_str = PRIORITY_LABELS.get(task.priority.value, task.priority.value)
            tags_str = ", ".join(task.tags) if task.tags else "-"
            title_str = (
                task.title if len(task.title) <= 28 else task.title[:26] + "..."
            )

            due_date_str = self.format_date(task.due_date)
            if task.is_overdue():
                due_date_str = self.theme.apply(due_date_str + " ⚠", self.theme.error)

            status_colored = self.theme.apply(status_str, self._get_status_color(task.status))
            priority_colored = self.theme.apply(
                priority_str, self._get_priority_color(task.priority)
            )

            line = (
                f"{task.id:<10} "
                f"{status_colored:<12} "
                f"{priority_colored:<8} "
                f"{title_str:<30} "
                f"{due_date_str:<14} "
                f"{tags_str:<20}"
            )
            lines.append(line)

            if show_details and task.description:
                desc_lines = task.description.split("\n")
                for dl in desc_lines:
                    lines.append(
                        self.theme.apply(f"           描述: {dl}", self.theme.muted)
                    )

        lines.append(border)
        return "\n".join(lines)

    def render_task_detail(self, task: Task, all_tasks: Optional[List[Task]] = None) -> str:
        lines = []
        border = self.theme.apply("═" * 60, self.theme.border)

        lines.append(border)
        lines.append(self.theme.apply(f" 任务详情: {task.title} ", self.theme.header))
        lines.append(border)

        status_str = STATUS_LABELS.get(task.status.value, task.status.value)
        priority_str = PRIORITY_LABELS.get(task.priority.value, task.priority.value)
        repeat_str = REPEAT_LABELS.get(task.repeat_frequency.value, task.repeat_frequency.value)

        info_items = [
            ("ID", task.id),
            ("状态", self.theme.apply(status_str, self._get_status_color(task.status))),
            ("优先级", self.theme.apply(priority_str, self._get_priority_color(task.priority))),
            ("标题", task.title),
            ("描述", task.description or "-"),
            ("标签", ", ".join(task.tags) if task.tags else "-"),
            ("截止日期", self.format_date(task.due_date)),
            ("重复", repeat_str),
            ("提醒时间", self.format_datetime(task.reminder_time)),
            ("创建时间", self.format_datetime(task.created_at)),
            ("更新时间", self.format_datetime(task.updated_at)),
            ("完成时间", self.format_datetime(task.completed_at)),
        ]

        for label, value in info_items:
            lines.append(
                f"  {self.theme.apply(f'{label}:', self.theme.info)} {value}"
            )

        if task.dependencies:
            dep_titles = []
            if all_tasks:
                dep_titles = [
                    t.title for t in all_tasks if t.id in task.dependencies
                ]
            deps_str = ", ".join(dep_titles) if dep_titles else ", ".join(task.dependencies)
            lines.append(
                f"  {self.theme.apply('依赖:', self.theme.info)} {deps_str}"
            )

        if all_tasks:
            blocked = [t for t in all_tasks if task.id in t.dependencies]
            if blocked:
                blocked_str = ", ".join(t.title for t in blocked)
                lines.append(
                    f"  {self.theme.apply('阻塞:', self.theme.info)} {blocked_str}"
                )

        if task.is_overdue():
            lines.append(self.theme.apply("  ⚠ 该任务已逾期!", self.theme.error))

        lines.append(border)
        return "\n".join(lines)

    def render_daily_report(self, report_data: Dict[str, List[Task]]) -> str:
        lines = []
        today = date.today().strftime("%Y年%m月%d日")

        border = self.theme.apply("═" * 80, self.theme.border)
        lines.append(border)
        lines.append(self.theme.apply(f" 每日任务报告 - {today} ", self.theme.header))
        lines.append(border)

        sections = [
            ("逾期任务", "overdue", self.theme.error),
            ("今日到期", "due_today", self.theme.warning),
            ("进行中", "in_progress", self.theme.primary),
            ("待处理", "pending", self.theme.muted),
        ]

        for section_title, key, color in sections:
            tasks = report_data.get(key, [])
            lines.append("")
            lines.append(
                self.theme.apply(
                    f" ■ {section_title} ({len(tasks)}个)", color + Color.BOLD
                )
            )

            if not tasks:
                lines.append(self.theme.apply("    无", self.theme.muted))
            else:
                for task in tasks:
                    priority_str = PRIORITY_LABELS.get(task.priority.value, task.priority.value)
                    priority_colored = self.theme.apply(
                        f"[{priority_str}]", self._get_priority_color(task.priority)
                    )
                    due_str = (
                        self.format_date(task.due_date)
                        if task.due_date
                        else "无截止日期"
                    )
                    lines.append(
                        f"    • {priority_colored} {task.title} "
                        f"{self.theme.apply(f'(ID: {task.id}, 截止: {due_str})', self.theme.muted)}"
                    )

        total = sum(len(tasks) for tasks in report_data.values())
        completed = sum(
            1
            for tasks in report_data.values()
            for t in tasks
            if t.status == TaskStatus.COMPLETED
        )

        lines.append("")
        lines.append(border)
        lines.append(
            self.theme.apply(
                f" 总计: {total}个任务 | 已完成: {completed}个 | 待完成: {total - completed}个 ",
                self.theme.info,
            )
        )
        lines.append(border)

        return "\n".join(lines)

    def render_success(self, message: str) -> str:
        return self.theme.apply(f"✓ {message}", self.theme.success)

    def render_error(self, message: str) -> str:
        return self.theme.apply(f"✗ {message}", self.theme.error)

    def render_warning(self, message: str) -> str:
        return self.theme.apply(f"⚠ {message}", self.theme.warning)

    def render_info(self, message: str) -> str:
        return self.theme.apply(f"ℹ {message}", self.theme.info)

    def render_progress_bar(self, current: int, total: int, width: int = 30) -> str:
        if total == 0:
            filled = 0
        else:
            filled = int(width * current / total)
        bar = "█" * filled + "░" * (width - filled)
        percentage = (current / total * 100) if total > 0 else 0
        return self.theme.apply(
            f"[{bar}] {current}/{total} ({percentage:.1f}%)", self.theme.primary
        )

    def render_notification(self, title: str, message: str) -> str:
        border = self.theme.apply("*" * 60, self.theme.warning)
        return (
            f"{border}\n"
            f"{self.theme.apply(f' 🔔 {title}', self.theme.warning + Color.BOLD)}\n"
            f" {message}\n"
            f"{border}\n"
        )

    def render_tag_list(self, tags: List[str]) -> str:
        if not tags:
            return self.theme.apply("暂无标签", self.theme.muted)

        lines = [self.theme.apply("所有标签:", self.theme.header)]
        for tag in sorted(tags):
            lines.append(f"  • {self.theme.apply(tag, self.theme.highlight)}")
        return "\n".join(lines)

    def render_trash_list(self, tasks: List[Task]) -> str:
        if not tasks:
            return self.theme.apply("回收站为空", self.theme.muted)

        lines = [self.theme.apply("回收站内容:", self.theme.header)]
        for task in tasks:
            lines.append(
                f"  • [{task.id}] {task.title} "
                f"{self.theme.apply(f'(删除于: {self.format_datetime(task.updated_at)})', self.theme.muted)}"
            )
        return "\n".join(lines)
