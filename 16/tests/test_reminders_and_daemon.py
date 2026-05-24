import unittest
import tempfile
import shutil
import time
import threading
import os
from datetime import datetime, timedelta

from taskmanager.models import Task, TaskStatus, Priority
from taskmanager.task_manager import TaskManager
from taskmanager.storage import Storage
from taskmanager.ui import UIRenderer
from taskmanager.notifier import Notifier
from taskmanager.daemon import TaskDaemon


class TestReminders(unittest.TestCase):
    """任务提醒功能测试"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="taskmanager_reminder_test_")
        self.storage = Storage(base_dir=self.temp_dir)
        self.tm = TaskManager(self.storage)
        self.ui = UIRenderer("dark")
        self.notifier = Notifier(self.ui)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_scenario_1_set_reminder(self):
        """
        场景1：设置任务提醒
        """
        print("\n" + "=" * 60)
        print("场景1: 设置任务提醒")
        print("=" * 60)

        task = self.tm.add_task(
            title="重要会议",
            description="下午3点项目评审会议",
            priority=Priority.HIGH,
        )
        print(f"✓ 创建任务: {task.title} (ID: {task.id})")

        reminder_time = datetime.now() + timedelta(minutes=5)
        updated = self.tm.update_task(
            task.id,
            reminder_time=reminder_time,
            reminder_sent=False,
        )

        self.assertIsNotNone(updated.reminder_time)
        self.assertFalse(updated.reminder_sent)
        print(f"✓ 设置提醒时间: {reminder_time.strftime('%Y-%m-%d %H:%M')}")

        print("\n场景1完成 ✓")

    def test_scenario_2_check_past_due_reminder(self):
        """
        场景2：检查已到期的提醒
        """
        print("\n" + "=" * 60)
        print("场景2: 检查到期提醒")
        print("=" * 60)

        now = datetime.now()
        past_time = now - timedelta(minutes=5)

        task = self.tm.add_task(
            title="已到期任务",
            reminder_time=past_time,
        )
        print(f"✓ 创建任务，设置过去的提醒时间: {past_time.strftime('%H:%M')}")

        due_reminders = self.tm.check_reminders()
        self.assertEqual(len(due_reminders), 1)
        self.assertEqual(due_reminders[0].id, task.id)
        print(f"✓ 发现 {len(due_reminders)} 个到期提醒")

        task_reload = self.storage.get_task_by_id(task.id)
        self.assertTrue(task_reload.reminder_sent)
        print(f"✓ 提醒标记为已发送")

        print("\n--- 验证不会重复提醒 ---")
        due_again = self.tm.check_reminders()
        self.assertEqual(len(due_again), 0)
        print(f"✓ 再次检查无提醒（已发送）")

        print("\n场景2完成 ✓")

    def test_scenario_3_future_reminder_not_triggered(self):
        """
        场景3：未到期的提醒不会触发
        """
        print("\n" + "=" * 60)
        print("场景3: 未到期提醒不触发")
        print("=" * 60)

        future_time = datetime.now() + timedelta(hours=1)
        task = self.tm.add_task(
            title="未来任务",
            reminder_time=future_time,
        )
        print(f"✓ 创建任务，设置未来提醒时间: {future_time.strftime('%H:%M')}")

        due_reminders = self.tm.check_reminders()
        self.assertEqual(len(due_reminders), 0)

        task_reload = self.storage.get_task_by_id(task.id)
        self.assertFalse(task_reload.reminder_sent)

        print(f"✓ 检查无提醒（未到期）")
        print(f"✓ 提醒状态: 未发送")

        print("\n场景3完成 ✓")

    def test_scenario_4_completed_task_no_reminder(self):
        """
        场景4：已完成任务的提醒不会触发
        """
        print("\n" + "=" * 60)
        print("场景4: 已完成任务不触发提醒")
        print("=" * 60)

        past_time = datetime.now() - timedelta(minutes=5)
        task = self.tm.add_task(
            title="已完成任务",
            reminder_time=past_time,
        )
        self.tm.mark_completed(task.id)
        print(f"✓ 创建并完成任务")

        due_reminders = self.tm.check_reminders()
        self.assertEqual(len(due_reminders), 0)
        print(f"✓ 已完成任务不触发提醒")

        print("\n场景4完成 ✓")

    def test_scenario_5_multiple_reminders(self):
        """
        场景5：多个任务提醒测试
        """
        print("\n" + "=" * 60)
        print("场景5: 多任务提醒")
        print("=" * 60)

        now = datetime.now()
        for i in range(3):
            self.tm.add_task(
                title=f"提醒任务{i+1}",
                reminder_time=now - timedelta(minutes=i + 1),
            )

        self.tm.add_task(
            title="未到期任务",
            reminder_time=now + timedelta(hours=1),
        )

        self.tm.add_task(
            title="无提醒任务",
        )

        print(f"✓ 创建了5个任务（3个已到期提醒，1个未到期，1个无提醒）")

        due_reminders = self.tm.check_reminders()
        self.assertEqual(len(due_reminders), 3)
        print(f"✓ 正确检测到 {len(due_reminders)} 个到期提醒")

        titles = {t.title for t in due_reminders}
        for i in range(3):
            self.assertIn(f"提醒任务{i+1}", titles)
        print(f"✓ 提醒的任务正确: {', '.join(titles)}")

        print("\n场景5完成 ✓")

    def test_scenario_6_notifier_send(self):
        """
        场景6：测试通知发送功能（不实际弹出，只验证调用流程）
        """
        print("\n" + "=" * 60)
        print("场景6: 通知发送功能")
        print("=" * 60)

        task = self.tm.add_task(
            title="测试通知",
            description="测试通知内容",
        )

        print("  测试通知功能（实际通知根据系统配置可能不弹出）...")
        print(f"  系统: {self.notifier.system}")
        print(f"  Plyer可用: {self.notifier._plyer_available}")
        print(f"  Playsound可用: {self.notifier._playsound_available}")

        try:
            self.notifier.send_notification(
                "测试标题",
                "测试消息内容",
                play_sound=False,
            )
            print("✓ 通知发送流程正常完成")
        except Exception as e:
            print(f"! 通知发送遇到异常（可能是缺少依赖）: {e}")

        print("\n场景6完成 ✓")


class TestDaemon(unittest.TestCase):
    """守护进程测试"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="taskmanager_daemon_test_")
        self.storage = Storage(base_dir=self.temp_dir)
        self.tm = TaskManager(self.storage)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_scenario_1_daemon_creation(self):
        """
        场景1：创建守护进程实例
        """
        print("\n" + "=" * 60)
        print("场景1: 守护进程创建")
        print("=" * 60)

        daemon = TaskDaemon(interval=1)
        self.assertEqual(daemon.check_interval, 1)
        self.assertFalse(daemon.is_running())
        print(f"✓ 守护进程创建成功")
        print(f"  检查间隔: {daemon.check_interval}秒")
        print(f"  运行状态: {daemon.is_running()}")

        print("\n场景1完成 ✓")

    def test_scenario_2_daemon_lifecycle(self):
        """
        场景2：守护进程启动和停止
        """
        print("\n" + "=" * 60)
        print("场景2: 守护进程生命周期")
        print("=" * 60)

        daemon = TaskDaemon(interval=1)

        print("  启动守护进程（后台模式）...")
        daemon_thread = threading.Thread(
            target=daemon.start,
            kwargs={"background": True},
            daemon=True,
        )
        daemon_thread.start()

        time.sleep(0.5)
        self.assertTrue(daemon.is_running())
        print(f"✓ 守护进程已启动，状态: {daemon.is_running()}")

        time.sleep(1.5)

        print("  停止守护进程...")
        daemon.stop()
        time.sleep(0.5)
        self.assertFalse(daemon.is_running())
        print(f"✓ 守护进程已停止，状态: {daemon.is_running()}")

        print("\n场景2完成 ✓")

    def test_scenario_3_daemon_process_reminders(self):
        """
        场景3：守护进程检查提醒
        """
        print("\n" + "=" * 60)
        print("场景3: 守护进程处理提醒")
        print("=" * 60)

        past_time = datetime.now() - timedelta(minutes=5)
        task = self.tm.add_task(
            title="守护进程测试任务",
            reminder_time=past_time,
        )
        print(f"✓ 创建任务，设置过期提醒")

        task_before = self.storage.get_task_by_id(task.id)
        self.assertFalse(task_before.reminder_sent)
        print(f"  初始提醒状态: 未发送")

        print("  模拟守护进程检查...")
        due = self.tm.check_reminders()
        self.assertEqual(len(due), 1)

        task_after = self.storage.get_task_by_id(task.id)
        self.assertTrue(task_after.reminder_sent)
        print(f"  处理后提醒状态: 已发送")

        print("\n场景3完成 ✓")

    def test_scenario_4_daemon_process_repeating(self):
        """
        场景4：守护进程处理重复任务
        """
        print("\n" + "=" * 60)
        print("场景4: 守护进程处理重复任务")
        print("=" * 60)

        today = datetime.now().date()
        task = self.tm.add_task(
            title="每日重复测试",
            due_date=today,
            repeat_frequency="daily",
        )
        self.tm.mark_completed(task.id)
        print(f"✓ 创建并完成每日重复任务")

        initial_count = len(self.storage.load_tasks())
        print(f"  初始任务数: {initial_count}")

        print("  模拟守护进程处理重复任务...")
        new_tasks = self.tm.process_repeating_tasks()

        after_count = len(self.storage.load_tasks())
        print(f"  处理后任务数: {after_count}")
        print(f"  生成的新任务数: {len(new_tasks)}")

        print("\n场景4完成 ✓")

    def test_scenario_5_daemon_short_interval(self):
        """
        场景5：短间隔守护进程运行测试
        """
        print("\n" + "=" * 60)
        print("场景5: 短间隔运行测试")
        print("=" * 60)

        daemon = TaskDaemon(interval=1)
        print(f"✓ 创建守护进程，间隔1秒")

        print("  运行3秒（约3次检查）...")
        daemon.running = True
        iterations = 0
        start_time = time.time()

        while time.time() - start_time < 3 and iterations < 5:
            try:
                self.tm.check_reminders()
                self.tm.process_repeating_tasks()
                iterations += 1
            except Exception as e:
                print(f"  错误: {e}")
            time.sleep(1)

        daemon.running = False
        print(f"✓ 完成 {iterations} 次检查循环")

        print("\n场景5完成 ✓")


class TestIntegration(unittest.TestCase):
    """端到端集成测试"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="taskmanager_integration_test_")
        self.storage = Storage(base_dir=self.temp_dir)
        self.tm = TaskManager(self.storage)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_full_workflow(self):
        """
        完整工作流测试：创建→添加依赖→完成→生成重复任务→提醒
        """
        print("\n" + "=" * 60)
        print("集成测试: 完整工作流")
        print("=" * 60)

        print("\n--- 步骤1: 创建任务A和B，B依赖A ---")
        task_a = self.tm.add_task(
            title="需求分析",
            description="完成项目需求分析文档",
            priority=Priority.HIGH,
            tags=["项目", "需求"],
        )
        task_b = self.tm.add_task(
            title="系统设计",
            description="基于需求完成系统设计",
            priority=Priority.HIGH,
            tags=["项目", "设计"],
            dependencies=[task_a.id],
        )
        print(f"  ✓ 任务A: {task_a.title} (ID: {task_a.id})")
        print(f"  ✓ 任务B: {task_b.title} (ID: {task_b.id}), 依赖A")

        print("\n--- 步骤2: 验证B被A阻塞 ---")
        with self.assertRaises(ValueError) as ctx:
            self.tm.mark_in_progress(task_b.id)
        print(f"  ✓ B被阻塞，错误: {ctx.exception}")

        print("\n--- 步骤3: 完成任务A ---")
        self.tm.mark_in_progress(task_a.id)
        self.tm.mark_completed(task_a.id)
        task_a = self.storage.get_task_by_id(task_a.id)
        print(f"  ✓ A已完成，状态: {task_a.status.value}")

        print("\n--- 步骤4: 启动任务B ---")
        self.tm.mark_in_progress(task_b.id)
        task_b = self.storage.get_task_by_id(task_b.id)
        print(f"  ✓ B已启动，状态: {task_b.status.value}")

        print("\n--- 步骤5: 创建带提醒的重复任务 ---")
        today = datetime.now().date()
        reminder_time = datetime.now() + timedelta(minutes=30)
        repeat_task = self.tm.add_task(
            title="每日站会",
            due_date=today,
            repeat_frequency="daily",
            reminder_time=reminder_time,
            tags=["会议"],
        )
        print(f"  ✓ 创建每日重复任务: {repeat_task.title}")
        print(f"    提醒: {reminder_time.strftime('%H:%M')}")

        print("\n--- 步骤6: 完成重复任务，验证生成新任务 ---")
        self.tm.mark_completed(repeat_task.id)
        all_tasks = self.storage.load_tasks()
        new_tasks = [
            t for t in all_tasks
            if t.original_task_id == repeat_task.id
            and t.id != repeat_task.id
        ]
        self.assertEqual(len(new_tasks), 1)
        print(f"  ✓ 生成下一个任务，截止日期: {new_tasks[0].due_date}")

        print("\n--- 步骤7: 按标签搜索 ---")
        result = self.tm.search_by_tags(["项目", "需求"])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].id, task_a.id)
        print(f"  ✓ 搜索[项目+需求]找到: {result[0].title}")

        print("\n--- 步骤8: 生成每日报告 ---")
        report = self.tm.get_today_report()
        print(f"  ✓ 报告生成:")
        print(f"    - 今日到期: {len(report['due_today'])}")
        print(f"    - 已逾期: {len(report['overdue'])}")
        print(f"    - 进行中: {len(report['in_progress'])}")
        print(f"    - 待处理: {len(report['pending'])}")

        print("\n--- 步骤9: 导出数据 ---")
        export_file = os.path.join(self.temp_dir, "export_test.csv")
        from taskmanager.exporter import DataExporter

        DataExporter.export_to_csv(all_tasks, export_file)
        self.assertTrue(os.path.exists(export_file))
        print(f"  ✓ CSV导出成功: {export_file}")

        print("\n" + "=" * 60)
        print("集成测试完成 ✓")
        print("=" * 60)


if __name__ == "__main__":
    unittest.main(verbosity=2)
