import unittest
import tempfile
import shutil
from datetime import date, timedelta, datetime

from taskmanager.models import Task, TaskStatus, Priority, RepeatFrequency
from taskmanager.task_manager import TaskManager, Task
from taskmanager.storage import Storage


class TestRepeatingTasks(unittest.TestCase):
    """任务重复规则完整测试"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="taskmanager_repeat_test_")
        self.storage = Storage(base_dir=self.temp_dir)
        self.tm = TaskManager(self.storage)
        self.today = date.today()

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_scenario_1_create_daily_repeating_task(self):
        """
        场景1：创建每日重复任务
        """
        print("\n" + "=" * 60)
        print("场景1: 创建每日重复任务")
        print("=" * 60)

        task = self.tm.add_task(
            title="每日站会",
            description="每天早上10点开站会",
            priority=Priority.MEDIUM,
            tags=["工作", "会议"],
            due_date=self.today,
            repeat_frequency=RepeatFrequency.DAILY,
        )

        print(f"✓ 创建每日重复任务: {task.title}")
        print(f"  ID: {task.id}")
        print(f"  截止日期: {task.due_date}")
        print(f"  重复频率: {task.repeat_frequency.value}")

        self.assertEqual(task.repeat_frequency, RepeatFrequency.DAILY)
        self.assertEqual(task.due_date, self.today)
        self.assertEqual(task.title, "每日站会")

        print("\n场景1完成 ✓")

    def test_scenario_2_create_weekly_repeating_task(self):
        """
        场景2：创建每周重复任务
        """
        print("\n" + "=" * 60)
        print("场景2: 创建每周重复任务")
        print("=" * 60)

        task = self.tm.add_task(
            title="周例会",
            description="每周一开周例会",
            priority=Priority.HIGH,
            tags=["工作", "会议"],
            due_date=self.today,
            repeat_frequency=RepeatFrequency.WEEKLY,
        )

        print(f"✓ 创建每周重复任务: {task.title}")
        print(f"  ID: {task.id}")
        print(f"  截止日期: {task.due_date}")
        print(f"  重复频率: {task.repeat_frequency.value}")

        self.assertEqual(task.repeat_frequency, RepeatFrequency.WEEKLY)

        print("\n场景2完成 ✓")

    def test_scenario_3_create_monthly_repeating_task(self):
        """
        场景3：创建每月重复任务
        """
        print("\n" + "=" * 60)
        print("场景3: 创建每月重复任务")
        print("=" * 60)

        task = self.tm.add_task(
            title="月度总结",
            description="每月1号写月度总结",
            priority=Priority.URGENT,
            tags=["工作", "总结"],
            due_date=self.today,
            repeat_frequency=RepeatFrequency.MONTHLY,
        )

        print(f"✓ 创建每月重复任务: {task.title}")
        print(f"  ID: {task.id}")
        print(f"  截止日期: {task.due_date}")
        print(f"  重复频率: {task.repeat_frequency.value}")

        self.assertEqual(task.repeat_frequency, RepeatFrequency.MONTHLY)

        print("\n场景3完成 ✓")

    def test_scenario_4_completion_generates_next_task(self):
        """
        场景4：完成重复任务时自动生成下一个任务
        """
        print("\n" + "=" * 60)
        print("场景4: 完成重复任务自动生成下一个")
        print("=" * 60)

        original_task = self.tm.add_task(
            title="每日健身",
            description="每天锻炼30分钟",
            priority=Priority.LOW,
            tags=["健康"],
            due_date=self.today,
            repeat_frequency=RepeatFrequency.DAILY,
        )

        print(f"✓ 创建每日重复任务: {original_task.title} (ID: {original_task.id})")

        initial_tasks = self.storage.load_tasks()
        self.assertEqual(len(initial_tasks), 1)
        print(f"  当前任务数: {len(initial_tasks)}")

        print("\n--- 完成今日任务 ---")
        completed_task = self.tm.mark_completed(original_task.id)
        self.assertEqual(completed_task.status, TaskStatus.COMPLETED)
        self.assertIsNotNone(completed_task.completed_at)
        print(f"✓ 任务已完成: {completed_task.title}")
        print(f"  完成时间: {completed_task.completed_at}")

        print("\n--- 验证是否生成了新任务 ---")
        all_tasks = self.storage.load_tasks()
        print(f"  当前任务数: {len(all_tasks)}")

        new_tasks = [
            t for t in all_tasks
            if t.original_task_id == original_task.id
            and t.id != original_task.id
        ]

        self.assertEqual(len(new_tasks), 1)
        new_task = new_tasks[0]

        print(f"✓ 生成的新任务: {new_task.title} (ID: {new_task.id})")
        print(f"  新任务截止日期: {new_task.due_date}")
        print(f"  原任务截止日期: {original_task.due_date}")
        print(f"  原任务ID关联: {new_task.original_task_id}")

        expected_next_date = self.today + timedelta(days=1)
        self.assertEqual(new_task.due_date, expected_next_date)
        self.assertEqual(new_task.title, original_task.title)
        self.assertEqual(new_task.description, original_task.description)
        self.assertEqual(new_task.priority, original_task.priority)
        self.assertEqual(new_task.tags, original_task.tags)
        self.assertEqual(new_task.repeat_frequency, original_task.repeat_frequency)
        self.assertEqual(new_task.status, TaskStatus.PENDING)
        self.assertEqual(new_task.original_task_id, original_task.id)

        print("\n场景4完成 ✓")

    def test_scenario_5_weekly_next_date_calculation(self):
        """
        场景5：验证每周重复的下一个日期计算
        """
        print("\n" + "=" * 60)
        print("场景5: 每周重复日期计算")
        print("=" * 60)

        base_date = date(2026, 5, 1)
        task = self.tm.add_task(
            title="周周报",
            due_date=base_date,
            repeat_frequency=RepeatFrequency.WEEKLY,
        )

        print(f"✓ 创建每周任务，截止日期: {base_date}")

        self.tm.mark_completed(task.id)

        all_tasks = self.storage.load_tasks()
        new_task = [
            t for t in all_tasks
            if t.original_task_id == task.id and t.id != task.id
        ][0]

        expected_date = base_date + timedelta(weeks=1)
        self.assertEqual(new_task.due_date, expected_date)

        print(f"  下一个任务日期: {new_task.due_date}")
        print(f"  预期日期: {expected_date}")

        print("\n场景5完成 ✓")

    def test_scenario_6_monthly_next_date_calculation(self):
        """
        场景6：验证每月重复的下一个日期计算
        """
        print("\n" + "=" * 60)
        print("场景6: 每月重复日期计算")
        print("=" * 60)

        base_date = date(2026, 5, 15)
        task = self.tm.add_task(
            title="月度报告",
            due_date=base_date,
            repeat_frequency=RepeatFrequency.MONTHLY,
        )

        print(f"✓ 创建每月任务，截止日期: {base_date}")

        self.tm.mark_completed(task.id)

        all_tasks = self.storage.load_tasks()
        new_task = [
            t for t in all_tasks
            if t.original_task_id == task.id and t.id != task.id
        ][0]

        expected_date = date(2026, 6, 15)
        self.assertEqual(new_task.due_date, expected_date)

        print(f"  下一个任务日期: {new_task.due_date}")
        print(f"  预期日期: {expected_date}")

        print("\n场景6完成 ✓")

    def test_scenario_7_monthly_edge_case_month_end(self):
        """
        场景7：测试月末日期的边界情况（如1月31日→2月）
        """
        print("\n" + "=" * 60)
        print("场景7: 月末日期边界测试")
        print("=" * 60)

        base_date = date(2026, 1, 31)
        task = self.tm.add_task(
            title="月末报表",
            due_date=base_date,
            repeat_frequency=RepeatFrequency.MONTHLY,
        )

        print(f"✓ 创建每月任务，截止日期: {base_date}")

        self.tm.mark_completed(task.id)

        all_tasks = self.storage.load_tasks()
        new_task = [
            t for t in all_tasks
            if t.original_task_id == task.id and t.id != task.id
        ][0]

        print(f"  下一个任务日期: {new_task.due_date}")
        self.assertIsNotNone(new_task.due_date)
        self.assertEqual(new_task.due_date.month, 2)
        self.assertLessEqual(new_task.due_date.day, 28)
        print(f"  2月没有31号，自动调整为: {new_task.due_date.day}号")

        print("\n场景7完成 ✓")

    def test_scenario_8_daemon_process_repeating(self):
        """
        场景8：验证守护进程方法 process_repeating_tasks
        """
        print("\n" + "=" * 60)
        print("场景8: 守护进程重复任务处理")
        print("=" * 60)

        task = self.tm.add_task(
            title="每日提醒",
            due_date=self.today,
            repeat_frequency=RepeatFrequency.DAILY,
        )
        self.tm.mark_completed(task.id)

        print(f"✓ 创建并完成每日任务: {task.title}")

        initial_count = len(self.storage.load_tasks())
        print(f"  处理前任务数: {initial_count}")

        print("\n--- 调用 process_repeating_tasks ---")
        new_tasks = self.tm.process_repeating_tasks()

        after_count = len(self.storage.load_tasks())
        print(f"  处理后任务数: {after_count}")

        print("\n场景8完成 ✓")

    def test_scenario_9_no_repeat_no_generation(self):
        """
        场景9：非重复任务完成时不生成新任务
        """
        print("\n" + "=" * 60)
        print("场景9: 非重复任务不生成")
        print("=" * 60)

        task = self.tm.add_task(
            title="一次性任务",
            due_date=self.today,
            repeat_frequency=RepeatFrequency.NONE,
        )

        print(f"✓ 创建非重复任务: {task.title}")

        self.tm.mark_completed(task.id)

        all_tasks = self.storage.load_tasks()
        self.assertEqual(len(all_tasks), 1)

        print(f"  任务数保持为: {len(all_tasks)} (未生成新任务)")

        print("\n场景9完成 ✓")

    def test_scenario_10_task_data_integrity(self):
        """
        场景10：验证生成的重复任务数据完整性
        """
        print("\n" + "=" * 60)
        print("场景10: 重复任务数据完整性")
        print("=" * 60)

        original = self.tm.add_task(
            title="测试完整任务",
            description="完整描述\n多行描述",
            priority=Priority.URGENT,
            tags=["tag1", "tag2", "tag3"],
            due_date=self.today,
            repeat_frequency=RepeatFrequency.DAILY,
        )

        print(f"✓ 创建原始任务")
        print(f"  标题: {original.title}")
        print(f"  描述: {original.description[:20]}...")
        print(f"  优先级: {original.priority.value}")
        print(f"  标签: {original.tags}")

        self.tm.mark_completed(original.id)

        all_tasks = self.storage.load_tasks()
        new_task = [
            t for t in all_tasks
            if t.original_task_id == original.id and t.id != original.id
        ][0]

        print("\n--- 验证新任务数据 ---")
        self.assertEqual(new_task.title, original.title)
        self.assertEqual(new_task.description, original.description)
        self.assertEqual(new_task.priority, original.priority)
        self.assertEqual(new_task.tags, original.tags)
        self.assertEqual(new_task.repeat_frequency, original.repeat_frequency)
        self.assertNotEqual(new_task.id, original.id)
        self.assertIsNone(new_task.completed_at)
        self.assertEqual(new_task.status, TaskStatus.PENDING)
        self.assertFalse(new_task.reminder_sent)
        self.assertIsNone(new_task.reminder_time)

        print(f"  ✓ 标题匹配: {new_task.title}")
        print(f"  ✓ 描述匹配")
        print(f"  ✓ 优先级匹配: {new_task.priority.value}")
        print(f"  ✓ 标签匹配: {new_task.tags}")
        print(f"  ✓ 新ID: {new_task.id} (不同于原ID)")
        print(f"  ✓ 状态: {new_task.status.value}")

        print("\n场景10完成 ✓")


if __name__ == "__main__":
    unittest.main(verbosity=2)
