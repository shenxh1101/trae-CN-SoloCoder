#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from task_executor import (
    TaskManager,
    TaskExecutor,
    Task,
    TaskGroup,
    ExecutionMode,
    OnFailure
)


def test_task_crud():
    print("=" * 60)
    print("测试: 任务CRUD操作")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)

        task = Task(
            name="test_task",
            commands=["echo 'Hello World'", "echo 'Test command'"],
            working_dir=".",
            execution_mode=ExecutionMode.SEQUENTIAL,
            on_failure=OnFailure.STOP,
            description="测试任务"
        )

        assert manager.add_task(task) == True, "添加任务失败"
        assert manager.add_task(task) == False, "重复添加任务应该失败"

        tasks = manager.list_tasks()
        assert len(tasks) == 1, "任务列表应该有1个任务"
        assert tasks[0].name == "test_task", "任务名称不匹配"

        task.commands = ["echo 'Updated'"]
        assert manager.update_task(task) == True, "更新任务失败"

        updated_task = manager.get_task("test_task")
        assert updated_task.commands == ["echo 'Updated'"], "任务更新失败"

        assert manager.delete_task("test_task") == True, "删除任务失败"
        assert manager.get_task("test_task") is None, "任务应该已被删除"
        assert manager.delete_task("test_task") == False, "删除不存在的任务应该失败"

        print("✓ 任务CRUD操作测试通过")


def test_task_execution():
    print("\n" + "=" * 60)
    print("测试: 任务执行")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task = Task(
            name="exec_test",
            commands=["echo 'Test 1'", "echo 'Test 2'"],
            execution_mode=ExecutionMode.SEQUENTIAL,
            on_failure=OnFailure.STOP
        )
        manager.add_task(task)

        log = executor.execute_task("exec_test")
        assert log.status.value == "success", f"任务执行状态应为success，实际为{log.status}"
        assert "Test 1" in log.output, "输出应包含Test 1"
        assert "Test 2" in log.output, "输出应包含Test 2"

        print("✓ 任务执行测试通过")


def test_parallel_execution():
    print("\n" + "=" * 60)
    print("测试: 并行执行")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task = Task(
            name="parallel_test",
            commands=["echo 'Parallel 1'", "echo 'Parallel 2'", "echo 'Parallel 3'"],
            execution_mode=ExecutionMode.PARALLEL,
            on_failure=OnFailure.CONTINUE
        )
        manager.add_task(task)

        log = executor.execute_task("parallel_test")
        assert log.status.value == "success", f"并行执行状态应为success，实际为{log.status}"

        print("✓ 并行执行测试通过")


def test_parameters():
    print("\n" + "=" * 60)
    print("测试: 参数化任务")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task = Task(
            name="param_test",
            commands=["echo 'Hello ${name}'", "echo 'Date: ${date}'"],
            parameters={"name": "DefaultUser", "date": "2024-01-01"}
        )
        manager.add_task(task)

        log = executor.execute_task("param_test", {"name": "Alice", "date": "2024-12-31"})
        assert "Hello Alice" in log.output, "参数name替换失败"
        assert "Date: 2024-12-31" in log.output, "参数date替换失败"

        print("✓ 参数化任务测试通过")


def test_environment_variables():
    print("\n" + "=" * 60)
    print("测试: 环境变量")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task = Task(
            name="env_test",
            commands=["echo $MY_CUSTOM_VAR"],
            env_vars={"MY_CUSTOM_VAR": "test_value_123"}
        )
        manager.add_task(task)

        log = executor.execute_task("env_test")
        assert "test_value_123" in log.output, "环境变量设置失败"

        print("✓ 环境变量测试通过")


def test_dependencies():
    print("\n" + "=" * 60)
    print("测试: 依赖管理")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        dep_task = Task(
            name="dependency",
            commands=["echo 'Dependency executed'"]
        )
        manager.add_task(dep_task)

        main_task = Task(
            name="main_task",
            commands=["echo 'Main task'"],
            dependencies=["dependency"]
        )
        manager.add_task(main_task)

        order = manager.resolve_dependencies("main_task")
        assert order == ["dependency", "main_task"], f"依赖顺序错误: {order}"

        log = executor.execute_task("main_task")
        assert log.status.value == "success", "带依赖的任务执行失败"

        print("✓ 依赖管理测试通过")


def test_task_group():
    print("\n" + "=" * 60)
    print("测试: 任务组")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task1 = Task(name="group_task1", commands=["echo 'Task 1'"])
        task2 = Task(name="group_task2", commands=["echo 'Task 2'"])
        manager.add_task(task1)
        manager.add_task(task2)

        group = TaskGroup(name="my_group", tasks=["group_task1", "group_task2"])
        assert manager.add_group(group) == True, "添加任务组失败"

        groups = manager.list_groups()
        assert len(groups) == 1, "任务组列表应该有1个组"

        logs = executor.execute_group("my_group")
        assert len(logs) == 2, "应该执行2个任务"
        assert all(log.status.value == "success" for log in logs), "所有任务应该成功"

        print("✓ 任务组测试通过")


def test_import_export():
    print("\n" + "=" * 60)
    print("测试: 导入导出")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager1 = TaskManager(data_dir=os.path.join(tmpdir, "dir1"))

        task1 = Task(name="export_task1", commands=["echo 'Export 1'"], description="任务1")
        task2 = Task(name="export_task2", commands=["echo 'Export 2'"], description="任务2")
        manager1.add_task(task1)
        manager1.add_task(task2)

        group = TaskGroup(name="export_group", tasks=["export_task1", "export_task2"])
        manager1.add_group(group)

        export_file = os.path.join(tmpdir, "export.json")
        manager1.export_tasks(export_file)

        assert os.path.exists(export_file), "导出文件应该存在"

        manager2 = TaskManager(data_dir=os.path.join(tmpdir, "dir2"))
        result = manager2.import_tasks(export_file)

        assert result["tasks_added"] == 2, f"应该导入2个任务，实际导入{result['tasks_added']}"
        assert result["groups_added"] == 1, f"应该导入1个组，实际导入{result['groups_added']}"

        tasks = manager2.list_tasks()
        assert len(tasks) == 2, "导入后应该有2个任务"

        print("✓ 导入导出测试通过")


def test_backup():
    print("\n" + "=" * 60)
    print("测试: 备份功能")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        test_file = os.path.join(tmpdir, "test_backup.txt")
        with open(test_file, "w") as f:
            f.write("backup test content")

        task = Task(
            name="backup_test",
            commands=["echo 'Backup test'"],
            backup_paths=[test_file]
        )
        manager.add_task(task)

        log = executor.execute_task("backup_test")
        assert log.status.value == "success", "备份任务执行失败"

        backup_dir = os.path.join(manager.data_dir, "backups", "backup_test")
        assert os.path.exists(backup_dir), "备份目录应该存在"

        backups = os.listdir(backup_dir)
        assert len(backups) > 0, "应该有备份文件"

        print("✓ 备份功能测试通过")


def test_stats():
    print("\n" + "=" * 60)
    print("测试: 统计功能")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task = Task(name="stats_test", commands=["echo 'Stats test'"])
        manager.add_task(task)

        for i in range(3):
            executor.execute_task("stats_test")

        stats = manager.get_stats("stats_test")[0]
        assert stats.success_count == 3, f"成功次数应该为3，实际为{stats.success_count}"
        assert stats.failure_count == 0, f"失败次数应该为0，实际为{stats.failure_count}"

        print("✓ 统计功能测试通过")


def test_on_failure():
    print("\n" + "=" * 60)
    print("测试: 失败处理")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task_stop = Task(
            name="fail_stop",
            commands=["echo 'Before fail'", "nonexistent_command_12345", "echo 'After fail'"],
            on_failure=OnFailure.STOP
        )
        manager.add_task(task_stop)

        log = executor.execute_task("fail_stop")
        assert log.status.value == "failed", "任务应该失败"
        assert "Before fail" in log.output, "应该包含失败前的输出"
        assert "After fail" not in log.output, "不应该包含失败后的输出"

        task_continue = Task(
            name="fail_continue",
            commands=["echo 'Before fail'", "nonexistent_command_12345", "echo 'After fail'"],
            on_failure=OnFailure.CONTINUE
        )
        manager.add_task(task_continue)

        log = executor.execute_task("fail_continue")
        assert log.status.value == "failed", "任务应该失败"
        assert "Before fail" in log.output, "应该包含失败前的输出"
        assert "After fail" in log.output, "应该包含失败后的输出"

        print("✓ 失败处理测试通过")


def main():
    print("\n" + "🚀" * 20)
    print("开始运行所有测试...")
    print("🚀" * 20 + "\n")

    try:
        test_task_crud()
        test_task_execution()
        test_parallel_execution()
        test_parameters()
        test_environment_variables()
        test_dependencies()
        test_task_group()
        test_import_export()
        test_backup()
        test_stats()
        test_on_failure()

        print("\n" + "✅" * 20)
        print("所有测试通过！")
        print("✅" * 20)
        return 0
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ 测试发生异常: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
