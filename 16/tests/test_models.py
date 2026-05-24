import unittest
from datetime import datetime, date, timedelta

from taskmanager.models import (
    Task,
    TaskStatus,
    Priority,
    RepeatFrequency,
    PRIORITY_ORDER,
)


class TestTaskModel(unittest.TestCase):
    def setUp(self):
        self.today = date.today()
        self.tomorrow = self.today + timedelta(days=1)
        self.yesterday = self.today - timedelta(days=1)

    def test_task_creation_defaults(self):
        task = Task(title="测试任务")
        self.assertEqual(task.title, "测试任务")
        self.assertEqual(task.description, "")
        self.assertEqual(task.priority, Priority.MEDIUM)
        self.assertEqual(task.status, TaskStatus.PENDING)
        self.assertEqual(task.tags, [])
        self.assertIsNone(task.due_date)
        self.assertEqual(task.dependencies, [])
        self.assertEqual(task.repeat_frequency, RepeatFrequency.NONE)
        self.assertIsNone(task.reminder_time)
        self.assertIsNotNone(task.id)
        self.assertIsNotNone(task.created_at)
        self.assertIsNotNone(task.updated_at)
        self.assertIsNone(task.completed_at)
        self.assertFalse(task.reminder_sent)
        self.assertFalse(task.is_template)
        self.assertIsNone(task.original_task_id)

    def test_task_creation_with_params(self):
        task = Task(
            title="完整测试",
            description="任务描述",
            priority=Priority.HIGH,
            tags=["工作", "重要"],
            due_date=self.tomorrow,
            dependencies=["dep1", "dep2"],
            repeat_frequency=RepeatFrequency.DAILY,
            reminder_time=datetime.now(),
        )
        self.assertEqual(task.title, "完整测试")
        self.assertEqual(task.description, "任务描述")
        self.assertEqual(task.priority, Priority.HIGH)
        self.assertEqual(task.tags, ["工作", "重要"])
        self.assertEqual(task.due_date, self.tomorrow)
        self.assertEqual(task.dependencies, ["dep1", "dep2"])
        self.assertEqual(task.repeat_frequency, RepeatFrequency.DAILY)
        self.assertIsNotNone(task.reminder_time)

    def test_task_to_dict_and_back(self):
        original = Task(
            title="序列化测试",
            description="测试JSON序列化",
            priority=Priority.URGENT,
            tags=["test", "json"],
            due_date=self.tomorrow,
            status=TaskStatus.IN_PROGRESS,
            repeat_frequency=RepeatFrequency.WEEKLY,
        )

        data = original.to_dict()
        self.assertIsInstance(data, dict)
        self.assertEqual(data["title"], "序列化测试")
        self.assertEqual(data["priority"], "urgent")
        self.assertEqual(data["status"], "in_progress")
        self.assertEqual(data["repeat_frequency"], "weekly")
        self.assertEqual(data["due_date"], self.tomorrow.isoformat())

        restored = Task.from_dict(data)
        self.assertEqual(restored.id, original.id)
        self.assertEqual(restored.title, original.title)
        self.assertEqual(restored.priority, original.priority)
        self.assertEqual(restored.due_date, original.due_date)
        self.assertEqual(restored.tags, original.tags)

    def test_task_is_overdue(self):
        overdue_task = Task(title="逾期任务", due_date=self.yesterday)
        self.assertTrue(overdue_task.is_overdue())

        not_overdue = Task(title="未逾期", due_date=self.tomorrow)
        self.assertFalse(not_overdue.is_overdue())

        completed_task = Task(
            title="已完成",
            due_date=self.yesterday,
            status=TaskStatus.COMPLETED,
        )
        self.assertFalse(completed_task.is_overdue())

        no_date_task = Task(title="无截止日期")
        self.assertFalse(no_date_task.is_overdue())

    def test_task_is_due_today(self):
        today_task = Task(title="今日任务", due_date=self.today)
        self.assertTrue(today_task.is_due_today())

        tomorrow_task = Task(title="明日任务", due_date=self.tomorrow)
        self.assertFalse(tomorrow_task.is_due_today())

        no_date_task = Task(title="无截止日期")
        self.assertFalse(no_date_task.is_due_today())

    def test_task_can_start(self):
        task = Task(title="测试任务", dependencies=["dep1", "dep2"])

        self.assertFalse(task.can_start([]))
        self.assertFalse(task.can_start(["dep1"]))
        self.assertTrue(task.can_start(["dep1", "dep2"]))
        self.assertTrue(task.can_start(["dep1", "dep2", "dep3"]))

    def test_task_get_blocked_tasks(self):
        task_a = Task(id="a1", title="任务A")
        task_b = Task(id="b2", title="任务B", dependencies=["a1"])
        task_c = Task(id="c3", title="任务C", dependencies=["a1"])
        task_d = Task(id="d4", title="任务D", dependencies=["b2"])

        all_tasks = [task_a, task_b, task_c, task_d]

        blocked = task_a.get_blocked_tasks(all_tasks)
        self.assertEqual(len(blocked), 2)
        blocked_ids = {t.id for t in blocked}
        self.assertIn("b2", blocked_ids)
        self.assertIn("c3", blocked_ids)

        blocked_b = task_b.get_blocked_tasks(all_tasks)
        self.assertEqual(len(blocked_b), 1)
        self.assertEqual(blocked_b[0].id, "d4")

    def test_priority_order(self):
        self.assertEqual(PRIORITY_ORDER[Priority.URGENT], 4)
        self.assertEqual(PRIORITY_ORDER[Priority.HIGH], 3)
        self.assertEqual(PRIORITY_ORDER[Priority.MEDIUM], 2)
        self.assertEqual(PRIORITY_ORDER[Priority.LOW], 1)

    def test_task_repr(self):
        task = Task(id="test123", title="测试", status=TaskStatus.PENDING)
        repr_str = repr(task)
        self.assertIn("test123", repr_str)
        self.assertIn("测试", repr_str)
        self.assertIn("pending", repr_str)


class TestEnums(unittest.TestCase):
    def test_task_status_values(self):
        self.assertEqual(TaskStatus.PENDING.value, "pending")
        self.assertEqual(TaskStatus.IN_PROGRESS.value, "in_progress")
        self.assertEqual(TaskStatus.COMPLETED.value, "completed")
        self.assertEqual(TaskStatus.ON_HOLD.value, "on_hold")

    def test_priority_values(self):
        self.assertEqual(Priority.LOW.value, "low")
        self.assertEqual(Priority.MEDIUM.value, "medium")
        self.assertEqual(Priority.HIGH.value, "high")
        self.assertEqual(Priority.URGENT.value, "urgent")

    def test_repeat_frequency_values(self):
        self.assertEqual(RepeatFrequency.NONE.value, "none")
        self.assertEqual(RepeatFrequency.DAILY.value, "daily")
        self.assertEqual(RepeatFrequency.WEEKLY.value, "weekly")
        self.assertEqual(RepeatFrequency.MONTHLY.value, "monthly")


if __name__ == "__main__":
    unittest.main()
