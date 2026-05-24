import unittest
from datetime import date

from taskmanager.models import Task, TaskStatus, Priority
from taskmanager.task_manager import TaskManager
from taskmanager.storage import Storage


class TestTaskDependencies(unittest.TestCase):
    """任务依赖关系完整测试"""

    def setUp(self):
        import tempfile
        import shutil

        self.temp_dir = tempfile.mkdtemp(prefix="taskmanager_deps_test_")
        self.storage = Storage(base_dir=self.temp_dir)
        self.tm = TaskManager(self.storage)
        self.temp_dir_ref = tempfile
        self.shutil_ref = shutil

    def tearDown(self):
        self.shutil_ref.rmtree(self.temp_dir)

    def test_scenario_1_basic_dependency_blocking(self):
        """
        场景1：创建任务A和任务B，设置B依赖A
        验证B在A未完成时无法标记为进行中
        """
        print("\n" + "=" * 60)
        print("场景1: 基本依赖阻塞测试")
        print("=" * 60)

        task_a = self.tm.add_task(
            title="任务A: 需求分析",
            description="完成项目需求分析",
            priority=Priority.HIGH,
            tags=["需求", "项目"],
        )
        print(f"✓ 创建任务A: {task_a.title} (ID: {task_a.id})")

        task_b = self.tm.add_task(
            title="任务B: 系统设计",
            description="基于需求完成系统设计",
            priority=Priority.HIGH,
            tags=["设计", "项目"],
            dependencies=[task_a.id],
        )
        print(f"✓ 创建任务B: {task_b.title} (ID: {task_b.id}), 依赖任务A")

        print("\n--- 验证任务状态 ---")
        self.assertEqual(task_a.status, TaskStatus.PENDING)
        self.assertEqual(task_b.status, TaskStatus.PENDING)
        print(f"  任务A状态: {task_a.status.value}")
        print(f"  任务B状态: {task_b.status.value}")

        print("\n--- 尝试在A未完成时启动B ---")
        with self.assertRaises(ValueError) as context:
            self.tm.mark_in_progress(task_b.id)

        error_msg = str(context.exception)
        self.assertIn("阻塞", error_msg)
        self.assertIn(task_a.title, error_msg)
        print(f"✗ 预期错误: {error_msg}")

        print("\n--- 验证任务B状态仍为待处理 ---")
        task_b_reload = self.storage.get_task_by_id(task_b.id)
        self.assertEqual(task_b_reload.status, TaskStatus.PENDING)
        print(f"  任务B状态: {task_b_reload.status.value} (未改变)")

        print("\n场景1完成 ✓")

    def test_scenario_2_dependency_unblocking(self):
        """
        场景2：验证A完成后B可以正常开始
        """
        print("\n" + "=" * 60)
        print("场景2: 依赖解除测试")
        print("=" * 60)

        task_a = self.tm.add_task(title="任务A: 准备工作")
        task_b = self.tm.add_task(
            title="任务B: 主要工作",
            dependencies=[task_a.id],
        )
        print(f"✓ 创建任务A: {task_a.title} (ID: {task_a.id})")
        print(f"✓ 创建任务B: {task_b.title} (ID: {task_b.id}), 依赖任务A")

        print("\n--- 先启动并完成任务A ---")
        self.tm.mark_in_progress(task_a.id)
        task_a = self.storage.get_task_by_id(task_a.id)
        self.assertEqual(task_a.status, TaskStatus.IN_PROGRESS)
        print(f"  任务A → 进行中")

        self.tm.mark_completed(task_a.id)
        task_a = self.storage.get_task_by_id(task_a.id)
        self.assertEqual(task_a.status, TaskStatus.COMPLETED)
        print(f"  任务A → 已完成")

        print("\n--- 验证任务B依赖已解除 ---")
        deps = self.tm.get_task_dependencies(task_b.id)
        self.assertEqual(len(deps), 1)
        self.assertEqual(deps[0].status, TaskStatus.COMPLETED)
        print(f"  任务B的依赖任务A状态: {deps[0].status.value}")

        print("\n--- 现在启动任务B ---")
        result = self.tm.mark_in_progress(task_b.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.status, TaskStatus.IN_PROGRESS)
        print(f"✓ 任务B已成功启动!")
        print(f"  任务B状态: {result.status.value}")

        print("\n场景2完成 ✓")

    def test_scenario_3_circular_dependency_detection(self):
        """
        场景3：测试循环依赖检测
        """
        print("\n" + "=" * 60)
        print("场景3: 循环依赖检测测试")
        print("=" * 60)

        task_a = self.tm.add_task(title="任务A")
        task_b = self.tm.add_task(title="任务B")
        task_c = self.tm.add_task(title="任务C")
        print(f"✓ 创建任务A (ID: {task_a.id})")
        print(f"✓ 创建任务B (ID: {task_b.id})")
        print(f"✓ 创建任务C (ID: {task_c.id})")

        print("\n--- 设置A → B → C依赖链 ---")
        self.tm.add_dependency(task_b.id, task_a.id)
        print(f"  添加依赖: B → A")
        self.tm.add_dependency(task_c.id, task_b.id)
        print(f"  添加依赖: C → B")

        print("\n--- 尝试创建循环依赖 C → A (会形成 A→B→C→A) ---")
        with self.assertRaises(ValueError) as context:
            self.tm.add_dependency(task_a.id, task_c.id)

        error_msg = str(context.exception)
        self.assertIn("循环依赖", error_msg)
        print(f"✗ 预期错误: {error_msg}")

        print("\n--- 验证直接循环检测 ---")
        with self.assertRaises(ValueError) as context:
            self.tm.add_dependency(task_a.id, task_a.id)

        print(f"✗ 预期错误: {context.exception}")

        print("\n场景3完成 ✓")

    def test_scenario_4_multiple_dependencies(self):
        """
        场景4：多依赖任务测试
        """
        print("\n" + "=" * 60)
        print("场景4: 多依赖任务测试")
        print("=" * 60)

        task_a = self.tm.add_task(title="任务A: 前置条件1")
        task_b = self.tm.add_task(title="任务B: 前置条件2")
        task_c = self.tm.add_task(title="任务C: 前置条件3")
        task_d = self.tm.add_task(
            title="任务D: 需要A、B、C都完成",
            dependencies=[task_a.id, task_b.id, task_c.id],
        )
        print(f"✓ 创建任务A、B、C、D")
        print(f"  任务D依赖: A({task_a.id}), B({task_b.id}), C({task_c.id})")

        print("\n--- 只完成A和B，尝试启动D ---")
        self.tm.mark_completed(task_a.id)
        self.tm.mark_completed(task_b.id)
        print(f"  任务A → 已完成")
        print(f"  任务B → 已完成")

        with self.assertRaises(ValueError):
            self.tm.mark_in_progress(task_d.id)
        print(f"✗ 任务D仍被阻塞 (C未完成)")

        print("\n--- 完成C后启动D ---")
        self.tm.mark_completed(task_c.id)
        print(f"  任务C → 已完成")

        result = self.tm.mark_in_progress(task_d.id)
        self.assertIsNotNone(result)
        print(f"✓ 任务D已成功启动!")

        print("\n场景4完成 ✓")

    def test_scenario_5_remove_dependency(self):
        """
        场景5：移除依赖测试
        """
        print("\n" + "=" * 60)
        print("场景5: 移除依赖测试")
        print("=" * 60)

        task_a = self.tm.add_task(title="任务A")
        task_b = self.tm.add_task(title="任务B", dependencies=[task_a.id])
        print(f"✓ 创建任务A和B，B依赖A")

        print("\n--- 验证B被A阻塞 ---")
        with self.assertRaises(ValueError):
            self.tm.mark_in_progress(task_b.id)
        print(f"✗ B被A阻塞")

        print("\n--- 移除B对A的依赖 ---")
        result = self.tm.remove_dependency(task_b.id, task_a.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.dependencies, [])
        print(f"✓ 依赖已移除")

        print("\n--- 验证B现在可以独立启动 ---")
        result = self.tm.mark_in_progress(task_b.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.status, TaskStatus.IN_PROGRESS)
        print(f"✓ 任务B已成功启动!")

        print("\n场景5完成 ✓")

    def test_scenario_6_dependency_show(self):
        """
        场景6：显示依赖和被阻塞任务
        """
        print("\n" + "=" * 60)
        print("场景6: 依赖关系显示测试")
        print("=" * 60)

        task_a = self.tm.add_task(title="任务A: 根节点")
        task_b = self.tm.add_task(title="任务B", dependencies=[task_a.id])
        task_c = self.tm.add_task(title="任务C", dependencies=[task_a.id])
        task_d = self.tm.add_task(title="任务D", dependencies=[task_b.id])

        print("\n--- 查看任务A的阻塞关系 ---")
        blocked = self.tm.get_blocked_tasks(task_a.id)
        self.assertEqual(len(blocked), 2)
        blocked_titles = {t.title for t in blocked}
        self.assertIn("任务B", blocked_titles)
        self.assertIn("任务C", blocked_titles)
        print(f"  任务A阻塞的任务: {', '.join(t.title for t in blocked)}")

        print("\n--- 查看任务B的依赖和阻塞 ---")
        deps = self.tm.get_task_dependencies(task_b.id)
        self.assertEqual(len(deps), 1)
        self.assertEqual(deps[0].id, task_a.id)
        self.assertIn("任务A", deps[0].title)
        print(f"  任务B的依赖: {deps[0].title}")

        blocked_by_b = self.tm.get_blocked_tasks(task_b.id)
        self.assertEqual(len(blocked_by_b), 1)
        self.assertEqual(blocked_by_b[0].title, "任务D")
        print(f"  任务B阻塞的任务: {blocked_by_b[0].title}")

        print("\n场景6完成 ✓")

    def test_scenario_7_completed_task_not_blocking_new(self):
        """
        场景7：已完成任务不阻塞新任务
        """
        print("\n" + "=" * 60)
        print("场景7: 已完成任务不阻塞")
        print("=" * 60)

        task_a = self.tm.add_task(title="已完成的任务")
        self.tm.mark_completed(task_a.id)
        print(f"✓ 创建并完成任务A")

        task_b = self.tm.add_task(
            title="新任务",
            dependencies=[task_a.id],
        )
        print(f"✓ 创建任务B，依赖已完成的任务A")

        print("\n--- 验证B可以直接启动 ---")
        result = self.tm.mark_in_progress(task_b.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.status, TaskStatus.IN_PROGRESS)
        print(f"✓ 任务B已成功启动 (因为A已完成)")

        print("\n场景7完成 ✓")


if __name__ == "__main__":
    unittest.main(verbosity=2)
