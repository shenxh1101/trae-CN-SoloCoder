import unittest
import tempfile
import shutil
from datetime import date, timedelta, datetime

from taskmanager.models import (
    Task,
    TaskStatus,
    Priority,
    RepeatFrequency,
    PRIORITY_ORDER,
)
from taskmanager.task_manager import TaskManager, SortField
from taskmanager.storage import Storage


class TestTaskManager(unittest.TestCase):
    """TaskManager核心功能测试"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="taskmanager_tm_test_")
        self.storage = Storage(base_dir=self.temp_dir)
        self.tm = TaskManager(self.storage)
        self.today = date.today()

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_add_task_basic(self):
        task = self.tm.add_task(
            title="测试任务",
            description="测试描述",
            priority=Priority.HIGH,
            tags=["test", "add"],
        )

        self.assertIsNotNone(task.id)
        self.assertEqual(task.title, "测试任务")
        self.assertEqual(task.description, "测试描述")
        self.assertEqual(task.priority, Priority.HIGH)
        self.assertEqual(task.tags, ["test", "add"])
        self.assertEqual(task.status, TaskStatus.PENDING)

    def test_add_task_with_due_date(self):
        tomorrow = self.today + timedelta(days=1)
        task = self.tm.add_task(
            title="截止日期测试",
            due_date=tomorrow,
        )

        self.assertEqual(task.due_date, tomorrow)

    def test_add_task_with_dependencies(self):
        task_a = self.tm.add_task(title="任务A")
        task_b = self.tm.add_task(
            title="任务B",
            dependencies=[task_a.id],
        )

        self.assertEqual(task_b.dependencies, [task_a.id])

    def test_update_task_fields(self):
        task = self.tm.add_task(title="原始标题")

        updated = self.tm.update_task(
            task.id,
            title="新标题",
            description="新描述",
            priority=Priority.URGENT,
            tags=["new"],
        )

        self.assertEqual(updated.title, "新标题")
        self.assertEqual(updated.description, "新描述")
        self.assertEqual(updated.priority, Priority.URGENT)
        self.assertEqual(updated.tags, ["new"])

    def test_update_task_updates_timestamp(self):
        task = self.tm.add_task(title="时间戳测试")
        old_updated = task.updated_at

        import time
        time.sleep(0.01)

        updated = self.tm.update_task(task.id, title="新标题")
        self.assertGreater(updated.updated_at, old_updated)

    def test_update_nonexistent_task(self):
        result = self.tm.update_task("nonexistent", title="测试")
        self.assertIsNone(result)

    def test_delete_task(self):
        task = self.tm.add_task(title="要删除的任务")
        deleted = self.tm.delete_task(task.id)

        self.assertEqual(deleted.id, task.id)
        self.assertIsNone(self.storage.get_task_by_id(task.id))

    def test_delete_nonexistent_task(self):
        deleted = self.tm.delete_task("nonexistent")
        self.assertIsNone(deleted)

    def test_set_status(self):
        task = self.tm.add_task(title="状态测试")

        self.tm.set_status(task.id, TaskStatus.IN_PROGRESS)
        task = self.storage.get_task_by_id(task.id)
        self.assertEqual(task.status, TaskStatus.IN_PROGRESS)

        self.tm.set_status(task.id, TaskStatus.COMPLETED)
        task = self.storage.get_task_by_id(task.id)
        self.assertEqual(task.status, TaskStatus.COMPLETED)
        self.assertIsNotNone(task.completed_at)

    def test_mark_in_progress_unblocked(self):
        task = self.tm.add_task(title="无依赖任务")
        result = self.tm.mark_in_progress(task.id)

        self.assertIsNotNone(result)
        self.assertEqual(result.status, TaskStatus.IN_PROGRESS)

    def test_mark_in_progress_blocked(self):
        task_a = self.tm.add_task(title="任务A")
        task_b = self.tm.add_task(title="任务B", dependencies=[task_a.id])

        with self.assertRaises(ValueError):
            self.tm.mark_in_progress(task_b.id)

    def test_mark_completed(self):
        task = self.tm.add_task(title="完成测试")
        result = self.tm.mark_completed(task.id)

        self.assertEqual(result.status, TaskStatus.COMPLETED)
        self.assertIsNotNone(result.completed_at)

    def test_mark_on_hold(self):
        task = self.tm.add_task(title="搁置测试")
        result = self.tm.mark_on_hold(task.id)

        self.assertEqual(result.status, TaskStatus.ON_HOLD)

    def test_list_tasks_all(self):
        for i in range(5):
            self.tm.add_task(title=f"任务{i}")

        tasks = self.tm.list_tasks()
        self.assertEqual(len(tasks), 5)

    def test_list_tasks_by_status(self):
        self.tm.add_task(title="待处理1")
        self.tm.add_task(title="待处理2")
        completed = self.tm.add_task(title="已完成")
        self.tm.mark_completed(completed.id)

        pending = self.tm.list_tasks(status=TaskStatus.PENDING)
        self.assertEqual(len(pending), 2)

        done = self.tm.list_tasks(status=TaskStatus.COMPLETED)
        self.assertEqual(len(done), 1)
        self.assertEqual(done[0].title, "已完成")

    def test_sort_by_priority(self):
        self.tm.add_task(title="低优先级", priority=Priority.LOW)
        self.tm.add_task(title="高优先级", priority=Priority.HIGH)
        self.tm.add_task(title="紧急", priority=Priority.URGENT)

        tasks = self.tm.list_tasks(sort_by=SortField.PRIORITY, reverse=True)
        self.assertEqual(tasks[0].priority, Priority.URGENT)
        self.assertEqual(tasks[1].priority, Priority.HIGH)
        self.assertEqual(tasks[2].priority, Priority.LOW)

    def test_sort_by_due_date(self):
        today = date.today()
        self.tm.add_task(title="明天", due_date=today + timedelta(days=1))
        self.tm.add_task(title="今天", due_date=today)
        self.tm.add_task(title="下周", due_date=today + timedelta(days=7))

        tasks = self.tm.list_tasks(sort_by=SortField.DUE_DATE, reverse=False)
        self.assertEqual(tasks[0].title, "今天")
        self.assertEqual(tasks[1].title, "明天")
        self.assertEqual(tasks[2].title, "下周")

    def test_sort_by_created_at(self):
        self.tm.add_task(title="第一个")
        import time
        time.sleep(0.01)
        self.tm.add_task(title="第二个")
        time.sleep(0.01)
        self.tm.add_task(title="第三个")

        tasks = self.tm.list_tasks(sort_by=SortField.CREATED_AT, reverse=False)
        self.assertEqual(tasks[0].title, "第一个")
        self.assertEqual(tasks[1].title, "第二个")
        self.assertEqual(tasks[2].title, "第三个")

    def test_sort_by_title(self):
        self.tm.add_task(title="C任务")
        self.tm.add_task(title="A任务")
        self.tm.add_task(title="B任务")

        tasks = self.tm.list_tasks(sort_by=SortField.TITLE, reverse=False)
        self.assertEqual(tasks[0].title, "A任务")
        self.assertEqual(tasks[1].title, "B任务")
        self.assertEqual(tasks[2].title, "C任务")

    def test_search_by_tags_match_all(self):
        self.tm.add_task(title="任务1", tags=["工作", "重要"])
        self.tm.add_task(title="任务2", tags=["工作", "普通"])
        self.tm.add_task(title="任务3", tags=["个人", "重要"])

        result = self.tm.search_by_tags(["工作", "重要"], match_all=True)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].title, "任务1")

    def test_search_by_tags_match_any(self):
        self.tm.add_task(title="任务1", tags=["工作", "重要"])
        self.tm.add_task(title="任务2", tags=["个人", "普通"])

        result = self.tm.search_by_tags(["工作", "个人"], match_all=False)
        self.assertEqual(len(result), 2)

    def test_search_case_insensitive(self):
        self.tm.add_task(title="任务", tags=["WORK", "Important"])

        result = self.tm.search_by_tags(["work", "important"], match_all=True)
        self.assertEqual(len(result), 1)

    def test_get_overdue_tasks(self):
        today = date.today()
        self.tm.add_task(title="已逾期", due_date=today - timedelta(days=3))
        self.tm.add_task(title="今日", due_date=today)
        self.tm.add_task(title="未逾期", due_date=today + timedelta(days=1))

        overdue = self.tm.get_overdue_tasks()
        self.assertEqual(len(overdue), 1)
        self.assertEqual(overdue[0].title, "已逾期")

    def test_get_overdue_excludes_completed(self):
        today = date.today()
        task = self.tm.add_task(title="已完成的逾期", due_date=today - timedelta(days=3))
        self.tm.mark_completed(task.id)

        overdue = self.tm.get_overdue_tasks()
        self.assertEqual(len(overdue), 0)

    def test_get_today_tasks(self):
        today = date.today()
        self.tm.add_task(title="今日任务", due_date=today)
        self.tm.add_task(title="明日任务", due_date=today + timedelta(days=1))

        today_tasks = self.tm.get_today_tasks()
        self.assertEqual(len(today_tasks), 1)
        self.assertEqual(today_tasks[0].title, "今日任务")

    def test_get_today_report(self):
        today = date.today()
        self.tm.add_task(title="已逾期", due_date=today - timedelta(days=1))
        self.tm.add_task(title="今日到期", due_date=today)
        in_progress = self.tm.add_task(title="进行中")
        self.tm.mark_in_progress(in_progress.id)

        report = self.tm.get_today_report()
        self.assertIn("overdue", report)
        self.assertIn("due_today", report)
        self.assertIn("in_progress", report)
        self.assertIn("pending", report)

        self.assertEqual(len(report["overdue"]), 1)
        self.assertEqual(len(report["due_today"]), 1)
        self.assertEqual(len(report["in_progress"]), 1)

    def test_add_dependency(self):
        task_a = self.tm.add_task(title="A")
        task_b = self.tm.add_task(title="B")

        result = self.tm.add_dependency(task_b.id, task_a.id)
        self.assertIn(task_a.id, result.dependencies)

    def test_add_circular_dependency(self):
        task_a = self.tm.add_task(title="A")
        task_b = self.tm.add_task(title="B", dependencies=[task_a.id])

        with self.assertRaises(ValueError):
            self.tm.add_dependency(task_a.id, task_b.id)

    def test_add_self_dependency(self):
        task = self.tm.add_task(title="A")
        with self.assertRaises(ValueError):
            self.tm.add_dependency(task.id, task.id)

    def test_remove_dependency(self):
        task_a = self.tm.add_task(title="A")
        task_b = self.tm.add_task(title="B", dependencies=[task_a.id])

        result = self.tm.remove_dependency(task_b.id, task_a.id)
        self.assertEqual(result.dependencies, [])

    def test_get_task_dependencies(self):
        task_a = self.tm.add_task(title="A")
        task_b = self.tm.add_task(title="B")
        task_c = self.tm.add_task(title="C", dependencies=[task_a.id, task_b.id])

        deps = self.tm.get_task_dependencies(task_c.id)
        self.assertEqual(len(deps), 2)
        dep_titles = {t.title for t in deps}
        self.assertIn("A", dep_titles)
        self.assertIn("B", dep_titles)

    def test_get_blocked_tasks(self):
        task_a = self.tm.add_task(title="A")
        task_b = self.tm.add_task(title="B", dependencies=[task_a.id])
        task_c = self.tm.add_task(title="C", dependencies=[task_a.id])

        blocked = self.tm.get_blocked_tasks(task_a.id)
        self.assertEqual(len(blocked), 2)

    def test_check_reminders(self):
        now = datetime.now()
        past_time = now - timedelta(minutes=5)
        future_time = now + timedelta(hours=1)

        self.tm.add_task(
            title="已到期提醒",
            reminder_time=past_time,
        )
        self.tm.add_task(
            title="未到期提醒",
            reminder_time=future_time,
        )
        self.tm.add_task(
            title="无提醒",
        )

        due = self.tm.check_reminders()
        self.assertEqual(len(due), 1)
        self.assertEqual(due[0].title, "已到期提醒")

        due_again = self.tm.check_reminders()
        self.assertEqual(len(due_again), 0)

    def test_check_reminders_excludes_completed(self):
        now = datetime.now()
        past_time = now - timedelta(minutes=5)

        task = self.tm.add_task(
            title="已完成",
            reminder_time=past_time,
        )
        self.tm.mark_completed(task.id)

        due = self.tm.check_reminders()
        self.assertEqual(len(due), 0)

    def test_get_all_tags(self):
        self.tm.add_task(title="A", tags=["tag1", "tag2"])
        self.tm.add_task(title="B", tags=["tag2", "tag3"])
        self.tm.add_task(title="C", tags=[])

        tags = self.tm.get_all_tags()
        self.assertIsInstance(tags, set)
        self.assertEqual(len(tags), 3)
        self.assertIn("tag1", tags)
        self.assertIn("tag2", tags)
        self.assertIn("tag3", tags)


if __name__ == "__main__":
    unittest.main()
