#!/usr/bin/env python3
import os
import sys
import json
import tempfile
import shutil
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from task_executor import (
    TaskManager,
    TaskExecutor,
    Task,
    TaskGroup,
    ExecutionMode,
    OnFailure,
    TaskStatus
)
from task_executor.models import ExecutionLog, ScheduledTask, TaskStats


def test_models_serialization():
    print("\n" + "=" * 60)
    print("测试 1: models.py - 序列化/反序列化")
    print("=" * 60)

    task = Task(
        name="test_task",
        commands=["echo hello", "ls -la"],
        working_dir="/tmp",
        execution_mode=ExecutionMode.SEQUENTIAL,
        on_failure=OnFailure.CONTINUE,
        dependencies=["dep1", "dep2"],
        env_vars={"VAR1": "value1"},
        parameters={"param1": "default1"},
        backup_paths=["/path/to/file"],
        description="测试任务"
    )

    task_dict = task.to_dict()
    assert isinstance(task_dict, dict)
    assert task_dict["name"] == "test_task"
    assert task_dict["execution_mode"] == "sequential"
    assert task_dict["on_failure"] == "continue"

    task2 = Task.from_dict(task_dict)
    assert task2.name == task.name
    assert task2.commands == task.commands
    assert task2.working_dir == task.working_dir
    assert task2.execution_mode == task.execution_mode
    assert task2.on_failure == task.on_failure
    assert task2.dependencies == task.dependencies
    assert task2.env_vars == task.env_vars
    assert task2.parameters == task.parameters
    assert task2.backup_paths == task.backup_paths

    group = TaskGroup(name="test_group", tasks=["task1", "task2"], description="测试组")
    group_dict = group.to_dict()
    group2 = TaskGroup.from_dict(group_dict)
    assert group2.name == group.name
    assert group2.tasks == group.tasks

    log = ExecutionLog(
        task_name="test",
        start_time=datetime.now().isoformat(),
        end_time=datetime.now().isoformat(),
        status=TaskStatus.SUCCESS,
        output="test output",
        exit_code=0
    )
    log_dict = log.to_dict()
    log2 = ExecutionLog.from_dict(log_dict)
    assert log2.task_name == log.task_name
    assert log2.status == log.status

    print("✓ models.py 序列化测试通过")


def test_task_manager_crud():
    print("\n" + "=" * 60)
    print("测试 2: task_manager.py - 任务CRUD操作")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)

        task1 = Task(name="task1", commands=["echo 1"], description="第一个任务")
        task2 = Task(name="task2", commands=["echo 2"], description="第二个任务")

        assert manager.add_task(task1) == True
        assert manager.add_task(task2) == True
        assert manager.add_task(task1) == False

        tasks = manager.list_tasks()
        assert len(tasks) == 2

        got_task = manager.get_task("task1")
        assert got_task is not None
        assert got_task.name == "task1"

        task1.commands = ["echo updated"]
        assert manager.update_task(task1) == True
        updated = manager.get_task("task1")
        assert updated.commands == ["echo updated"]

        assert manager.delete_task("task1") == True
        assert manager.get_task("task1") is None
        assert manager.delete_task("task1") == False

        assert manager.update_task(Task(name="nonexistent", commands=[])) == False

        print("✓ task_manager.py CRUD测试通过")


def test_task_manager_groups():
    print("\n" + "=" * 60)
    print("测试 3: task_manager.py - 任务组管理")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)

        task1 = Task(name="task1", commands=["echo 1"])
        task2 = Task(name="task2", commands=["echo 2"])
        manager.add_task(task1)
        manager.add_task(task2)

        group = TaskGroup(name="group1", tasks=["task1", "task2"], description="测试组")
        assert manager.add_group(group) == True
        assert manager.add_group(group) == False

        groups = manager.list_groups()
        assert len(groups) == 1

        got_group = manager.get_group("group1")
        assert got_group is not None
        assert got_group.name == "group1"

        group.tasks = ["task1"]
        assert manager.update_group(group) == True
        updated = manager.get_group("group1")
        assert updated.tasks == ["task1"]

        assert manager.delete_group("group1") == True
        assert manager.get_group("group1") is None

        try:
            manager.add_group(TaskGroup(name="bad", tasks=["nonexistent"]))
            assert False, "应该抛出异常"
        except ValueError:
            pass

        print("✓ task_manager.py 任务组测试通过")


def test_dependency_management():
    print("\n" + "=" * 60)
    print("测试 4: 依赖管理 - A依赖B，执行A时B先执行")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task_b = Task(
            name="task_B",
            commands=[f"echo 'Task B executed' > {tmpdir}/b_executed.txt"]
        )
        manager.add_task(task_b)

        task_a = Task(
            name="task_A",
            commands=[f"echo 'Task A executed' > {tmpdir}/a_executed.txt"],
            dependencies=["task_B"]
        )
        manager.add_task(task_a)

        dep_order = manager.resolve_dependencies("task_A")
        print(f"依赖执行顺序: {dep_order}")
        assert dep_order == ["task_B", "task_A"], f"期望 ['task_B', 'task_A']，实际 {dep_order}"

        log = executor.execute_task("task_A")
        assert log.status == TaskStatus.SUCCESS

        assert os.path.exists(f"{tmpdir}/b_executed.txt"), "Task B 应该先执行"
        assert os.path.exists(f"{tmpdir}/a_executed.txt"), "Task A 应该执行"

        with open(f"{tmpdir}/b_executed.txt") as f:
            assert "Task B executed" in f.read()
        with open(f"{tmpdir}/a_executed.txt") as f:
            assert "Task A executed" in f.read()

        print("✓ 依赖管理测试通过")


def test_backup_functionality():
    print("\n" + "=" * 60)
    print("测试 5: 备份功能 - 执行前备份文件")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        file_to_backup = os.path.join(tmpdir, "important.txt")
        with open(file_to_backup, "w") as f:
            f.write("重要数据需要备份")

        backup_dir = os.path.join(tmpdir, "backups")

        task = Task(
            name="backup_test",
            commands=["echo '执行任务'"],
            backup_paths=[file_to_backup]
        )
        manager.add_task(task)

        log = executor.execute_task("backup_test")
        assert log.status == TaskStatus.SUCCESS

        task_backup_dir = os.path.join(manager.data_dir, "backups", "backup_test")
        assert os.path.exists(task_backup_dir), "备份目录应该存在"

        backup_folders = os.listdir(task_backup_dir)
        assert len(backup_folders) > 0, "应该有备份文件夹"

        latest_backup = max(backup_folders)
        backup_file = os.path.join(task_backup_dir, latest_backup, "important.txt")
        assert os.path.exists(backup_file), "备份文件应该存在"

        with open(backup_file) as f:
            content = f.read()
            assert "重要数据需要备份" in content

        print("✓ 备份功能测试通过")


def test_parameterized_tasks():
    print("\n" + "=" * 60)
    print("测试 6: 参数化任务 - ${date} 参数替换")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task = Task(
            name="param_task",
            commands=["echo 'Date: ${date}'", "echo 'User: ${user}'"],
            parameters={"date": "2024-01-01", "user": "default"}
        )
        manager.add_task(task)

        log1 = executor.execute_task("param_task", {"date": "2024-12-25", "user": "Alice"})
        assert log1.status == TaskStatus.SUCCESS
        assert "Date: 2024-12-25" in log1.output, f"输出应该包含替换后的值，实际输出: {log1.output}"
        assert "User: Alice" in log1.output

        log2 = executor.execute_task("param_task", {"date": "2025-06-15", "user": "Bob"})
        assert log2.status == TaskStatus.SUCCESS
        assert "Date: 2025-06-15" in log2.output
        assert "User: Bob" in log2.output

        log3 = executor.execute_task("param_task", {"date": "2023-03-20"})
        assert log3.status == TaskStatus.SUCCESS
        assert "Date: 2023-03-20" in log3.output
        assert "User: default" in log3.output

        print("✓ 参数化任务测试通过")


def test_environment_variables():
    print("\n" + "=" * 60)
    print("测试 7: 环境变量 - 自定义环境变量传递")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task = Task(
            name="env_task",
            commands=["echo $MY_APP_NAME", "echo $MY_APP_VERSION"],
            env_vars={
                "MY_APP_NAME": "TaskExecutor",
                "MY_APP_VERSION": "1.0.0"
            }
        )
        manager.add_task(task)

        log = executor.execute_task("env_task")
        assert log.status == TaskStatus.SUCCESS
        assert "TaskExecutor" in log.output, f"环境变量 MY_APP_NAME 应该被正确传递，实际输出: {log.output}"
        assert "1.0.0" in log.output, f"环境变量 MY_APP_VERSION 应该被正确传递，实际输出: {log.output}"

        task2 = Task(
            name="env_override",
            commands=["echo $PATH"],
            env_vars={"PATH": "/custom/bin:$PATH"}
        )
        manager.add_task(task2)

        log2 = executor.execute_task("env_override")
        assert log2.status == TaskStatus.SUCCESS
        assert "/custom/bin" in log2.output

        print("✓ 环境变量测试通过")


def test_import_export_roundtrip():
    print("\n" + "=" * 60)
    print("测试 8: 导入/导出双向测试 - 数据完整性验证")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager1 = TaskManager(data_dir=os.path.join(tmpdir, "source"))

        task1 = Task(
            name="export_task1",
            commands=["echo 'Task 1'"],
            working_dir="/tmp",
            execution_mode=ExecutionMode.PARALLEL,
            on_failure=OnFailure.CONTINUE,
            dependencies=[],
            env_vars={"ENV1": "val1"},
            parameters={"PARAM1": "p1"},
            backup_paths=["/some/path"],
            description="导出任务1"
        )
        task2 = Task(
            name="export_task2",
            commands=["echo 'Task 2'"],
            description="导出任务2"
        )
        manager1.add_task(task1)
        manager1.add_task(task2)

        group = TaskGroup(
            name="export_group",
            tasks=["export_task1", "export_task2"],
            description="导出组"
        )
        manager1.add_group(group)

        export_file = os.path.join(tmpdir, "export.json")
        manager1.export_tasks(export_file)

        assert os.path.exists(export_file)

        with open(export_file) as f:
            export_data = json.load(f)
            assert "tasks" in export_data
            assert "groups" in export_data
            assert len(export_data["tasks"]) == 2
            assert len(export_data["groups"]) == 1

        manager2 = TaskManager(data_dir=os.path.join(tmpdir, "target"))
        result = manager2.import_tasks(export_file)

        assert result["tasks_added"] == 2
        assert result["groups_added"] == 1

        imported_task1 = manager2.get_task("export_task1")
        assert imported_task1 is not None
        assert imported_task1.name == task1.name
        assert imported_task1.commands == task1.commands
        assert imported_task1.working_dir == task1.working_dir
        assert imported_task1.execution_mode == task1.execution_mode
        assert imported_task1.on_failure == task1.on_failure
        assert imported_task1.env_vars == task1.env_vars
        assert imported_task1.parameters == task1.parameters
        assert imported_task1.backup_paths == task1.backup_paths
        assert imported_task1.description == task1.description

        imported_group = manager2.get_group("export_group")
        assert imported_group is not None
        assert imported_group.name == group.name
        assert imported_group.tasks == group.tasks
        assert imported_group.description == group.description

        result2 = manager2.import_tasks(export_file, overwrite=False)
        assert result2["tasks_added"] == 0
        assert result2["tasks_skipped"] == 2

        task1.commands = ["echo 'Updated'"]
        manager1.update_task(task1)
        manager1.export_tasks(export_file)

        result3 = manager2.import_tasks(export_file, overwrite=True)
        assert result3["tasks_added"] == 2

        updated = manager2.get_task("export_task1")
        assert updated.commands == ["echo 'Updated'"]

        print("✓ 导入/导出双向测试通过")


def test_task_edit_delete():
    print("\n" + "=" * 60)
    print("测试 9: task edit 和 delete 命令测试")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)

        task = Task(
            name="edit_test",
            commands=["echo 'original'"],
            working_dir="/tmp",
            execution_mode=ExecutionMode.SEQUENTIAL,
            on_failure=OnFailure.STOP,
            description="原始描述"
        )
        manager.add_task(task)

        task.commands = ["echo 'modified'"]
        task.working_dir = "/home"
        task.execution_mode = ExecutionMode.PARALLEL
        task.on_failure = OnFailure.CONTINUE
        task.description = "修改后的描述"
        task.env_vars = {"NEW_VAR": "new_value"}
        task.dependencies = ["other_task"]
        task.backup_paths = ["/backup/path"]

        assert manager.update_task(task) == True

        updated = manager.get_task("edit_test")
        assert updated.commands == ["echo 'modified'"]
        assert updated.working_dir == "/home"
        assert updated.execution_mode == ExecutionMode.PARALLEL
        assert updated.on_failure == OnFailure.CONTINUE
        assert updated.description == "修改后的描述"
        assert updated.env_vars == {"NEW_VAR": "new_value"}
        assert updated.dependencies == ["other_task"]
        assert updated.backup_paths == ["/backup/path"]

        assert manager.delete_task("edit_test") == True
        assert manager.get_task("edit_test") is None

        assert manager.delete_task("nonexistent") == False
        assert manager.update_task(Task(name="nonexistent", commands=[])) == False

        print("✓ task edit 和 delete 测试通过")


def test_group_edit_execute():
    print("\n" + "=" * 60)
    print("测试 10: 任务组创建、编辑、执行功能")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task1 = Task(name="g_task1", commands=[f"echo 'G1' > {tmpdir}/g1.txt"])
        task2 = Task(name="g_task2", commands=[f"echo 'G2' > {tmpdir}/g2.txt"])
        task3 = Task(name="g_task3", commands=[f"echo 'G3' > {tmpdir}/g3.txt"])
        manager.add_task(task1)
        manager.add_task(task2)
        manager.add_task(task3)

        group = TaskGroup(name="test_group", tasks=["g_task1", "g_task2"], description="初始组")
        manager.add_group(group)

        groups = manager.list_groups()
        assert len(groups) == 1

        group.tasks = ["g_task1", "g_task2", "g_task3"]
        group.description = "修改后的组"
        manager.update_group(group)

        updated = manager.get_group("test_group")
        assert len(updated.tasks) == 3
        assert updated.description == "修改后的组"

        logs = executor.execute_group("test_group")
        assert len(logs) == 3
        assert all(log.status == TaskStatus.SUCCESS for log in logs)

        assert os.path.exists(f"{tmpdir}/g1.txt")
        assert os.path.exists(f"{tmpdir}/g2.txt")
        assert os.path.exists(f"{tmpdir}/g3.txt")

        print("✓ 任务组创建、编辑、执行测试通过")


def test_parameter_edge_cases():
    print("\n" + "=" * 60)
    print("测试 11: 参数化任务替换边界情况")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = TaskManager(data_dir=tmpdir)
        executor = TaskExecutor(manager)

        task = Task(
            name="edge_cases",
            commands=[
                "echo '${valid_param}'",
                "echo 'No params here'",
                "echo '${empty}${}'"
            ]
        )
        manager.add_task(task)

        log = executor.execute_task("edge_cases", {"valid_param": "replaced", "empty": ""})
        assert log.status == TaskStatus.SUCCESS

        assert "replaced" in log.output
        assert "No params here" in log.output

        task2 = Task(
            name="empty_test",
            commands=["", "   ", None]
        )
        manager.add_task(task2)

        log2 = executor.execute_task("empty_test")
        assert log2.status == TaskStatus.SUCCESS

        print("✓ 参数化任务边界情况测试通过")


def main():
    print("\n" + "🚀" * 20)
    print("开始运行综合测试套件...")
    print("🚀" * 20)

    tests_passed = 0
    tests_failed = 0
    failed_tests = []

    test_functions = [
        test_models_serialization,
        test_task_manager_crud,
        test_task_manager_groups,
        test_dependency_management,
        test_backup_functionality,
        test_parameterized_tasks,
        test_environment_variables,
        test_import_export_roundtrip,
        test_task_edit_delete,
        test_group_edit_execute,
        test_parameter_edge_cases,
    ]

    for test_func in test_functions:
        try:
            test_func()
            tests_passed += 1
        except AssertionError as e:
            print(f"\n❌ 测试失败: {e}")
            tests_failed += 1
            failed_tests.append(test_func.__name__)
        except Exception as e:
            print(f"\n❌ 测试异常: {e}")
            import traceback
            traceback.print_exc()
            tests_failed += 1
            failed_tests.append(test_func.__name__)

    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"通过: {tests_passed}")
    print(f"失败: {tests_failed}")
    if failed_tests:
        print(f"失败的测试: {', '.join(failed_tests)}")
    print("=" * 60)

    return tests_failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
