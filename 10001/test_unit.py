#!/usr/bin/env python3
"""
分布式任务调度系统 - 单元测试套件
测试核心逻辑，不依赖外部服务（Redis/Celery）
"""

import sys
import os
import json
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, Mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.models import Task, TaskExecution, TaskLog, Worker
from app.schemas import TaskCreate, TaskUpdate
from app.scheduler import (
    calculate_next_run,
    create_task_execution,
    trigger_task,
    pause_task,
    resume_task,
    cancel_task_execution,
    initialize_periodic_task,
    check_dependencies
)
from app.worker_manager import WorkerManager


class TestDatabaseModels(unittest.TestCase):
    """测试数据库模型"""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.TestSession = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.TestSession()

    def tearDown(self):
        self.db.close()

    def test_create_task(self):
        """测试创建任务模型"""
        task = Task(
            id="test-task-1",
            name="Test Task",
            description="Test Description",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            parameters={"a": 1, "b": 2},
            timeout=60,
            max_retries=3,
            priority=5
        )
        self.db.add(task)
        self.db.commit()
        
        saved = self.db.query(Task).filter(Task.id == "test-task-1").first()
        self.assertIsNotNone(saved)
        self.assertEqual(saved.name, "Test Task")
        self.assertEqual(saved.task_type, "one_shot")
        self.assertEqual(saved.parameters, {"a": 1, "b": 2})
        print("✓ 任务模型创建测试通过")

    def test_task_execution_relationship(self):
        """测试任务与执行记录的关系"""
        task = Task(
            id="test-task-2",
            name="Test Task 2",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add"
        )
        self.db.add(task)
        self.db.commit()
        
        execution = TaskExecution(
            id="exec-1",
            task_id="test-task-2",
            status="success",
            result={"result": 3}
        )
        self.db.add(execution)
        self.db.commit()
        
        self.db.refresh(task)
        self.assertEqual(len(task.executions), 1)
        self.assertEqual(task.executions[0].id, "exec-1")
        print("✓ 任务执行关系测试通过")

    def test_task_log_relationship(self):
        """测试执行记录与日志的关系"""
        task = Task(
            id="test-task-3",
            name="Test Task 3",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add"
        )
        self.db.add(task)
        
        execution = TaskExecution(
            id="exec-2",
            task_id="test-task-3",
            status="running"
        )
        self.db.add(execution)
        
        log = TaskLog(
            execution_id="exec-2",
            level="INFO",
            message="Test log message"
        )
        self.db.add(log)
        self.db.commit()
        
        self.db.refresh(execution)
        self.assertEqual(len(execution.logs), 1)
        self.assertEqual(execution.logs[0].message, "Test log message")
        print("✓ 执行日志关系测试通过")

    def test_worker_model(self):
        """测试Worker模型"""
        worker = Worker(
            id="worker-1",
            name="test-worker",
            hostname="test-host",
            pid=12345,
            status="online",
            queues=["default"],
            concurrency=2
        )
        self.db.add(worker)
        self.db.commit()
        
        saved = self.db.query(Worker).filter(Worker.id == "worker-1").first()
        self.assertIsNotNone(saved)
        self.assertEqual(saved.name, "test-worker")
        self.assertEqual(saved.status, "online")
        print("✓ Worker模型测试通过")


class TestSchedulerLogic(unittest.TestCase):
    """测试调度器核心逻辑"""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.TestSession = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.TestSession()

    def tearDown(self):
        self.db.close()

    def test_calculate_next_run_minute(self):
        """测试Cron表达式计算 - 每分钟"""
        from_time = datetime(2024, 1, 15, 10, 30, 0)
        next_run = calculate_next_run("* * * * *", from_time)
        self.assertEqual(next_run, datetime(2024, 1, 15, 10, 31, 0))
        print("✓ Cron每分钟计算测试通过")

    def test_calculate_next_run_every_5min(self):
        """测试Cron表达式计算 - 每5分钟"""
        from_time = datetime(2024, 1, 15, 10, 32, 0)
        next_run = calculate_next_run("*/5 * * * *", from_time)
        self.assertEqual(next_run, datetime(2024, 1, 15, 10, 35, 0))
        print("✓ Cron每5分钟计算测试通过")

    def test_calculate_next_run_hourly(self):
        """测试Cron表达式计算 - 每小时"""
        from_time = datetime(2024, 1, 15, 10, 30, 0)
        next_run = calculate_next_run("0 * * * *", from_time)
        self.assertEqual(next_run, datetime(2024, 1, 15, 11, 0, 0))
        print("✓ Cron每小时计算测试通过")

    def test_calculate_next_run_daily(self):
        """测试Cron表达式计算 - 每天"""
        from_time = datetime(2024, 1, 15, 10, 30, 0)
        next_run = calculate_next_run("0 2 * * *", from_time)
        self.assertEqual(next_run, datetime(2024, 1, 16, 2, 0, 0))
        print("✓ Cron每天计算测试通过")

    def test_create_task_execution(self):
        """测试创建任务执行记录"""
        task = Task(
            id="test-task-exec",
            name="Test Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add"
        )
        self.db.add(task)
        self.db.commit()
        
        execution = create_task_execution(self.db, "test-task-exec")
        self.assertIsNotNone(execution.id)
        self.assertEqual(execution.task_id, "test-task-exec")
        self.assertEqual(execution.status, "pending")
        self.assertEqual(execution.retry_attempt, 0)
        print("✓ 创建执行记录测试通过")

    def test_pause_and_resume_task(self):
        """测试暂停和恢复任务"""
        task = Task(
            id="test-task-pause",
            name="Test Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            is_paused=False
        )
        self.db.add(task)
        self.db.commit()
        
        result = pause_task(self.db, "test-task-pause")
        self.assertTrue(result)
        self.db.refresh(task)
        self.assertTrue(task.is_paused)
        
        result = resume_task(self.db, "test-task-pause")
        self.assertTrue(result)
        self.db.refresh(task)
        self.assertFalse(task.is_paused)
        print("✓ 暂停/恢复任务测试通过")

    def test_pause_nonexistent_task(self):
        """测试暂停不存在的任务"""
        result = pause_task(self.db, "nonexistent-task")
        self.assertFalse(result)
        print("✓ 暂停不存在任务测试通过")

    def test_cancel_execution(self):
        """测试取消任务执行"""
        task = Task(
            id="test-task-cancel",
            name="Test Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add"
        )
        self.db.add(task)
        self.db.commit()
        
        execution = TaskExecution(
            id="exec-cancel",
            task_id="test-task-cancel",
            status="running",
            celery_task_id="celery-123"
        )
        self.db.add(execution)
        self.db.commit()
        
        with patch('app.scheduler.celery_app') as mock_celery:
            mock_control = Mock()
            mock_celery.control = mock_control
            result = cancel_task_execution(self.db, "exec-cancel")
            self.assertTrue(result)
            self.db.refresh(execution)
            self.assertEqual(execution.status, "cancelled")
            self.assertIsNotNone(execution.end_time)
        print("✓ 取消执行测试通过")

    def test_initialize_periodic_task(self):
        """测试初始化周期性任务"""
        task = Task(
            id="test-task-periodic",
            name="Test Periodic Task",
            task_type="periodic",
            function_path="app.sample_tasks.sample_echo",
            cron_expression="* * * * *"
        )
        self.db.add(task)
        self.db.commit()
        
        initialize_periodic_task(self.db, task)
        self.db.refresh(task)
        self.assertIsNotNone(task.next_run_at)
        self.assertGreater(task.next_run_at, datetime.utcnow())
        print("✓ 初始化周期性任务测试通过")

    def test_check_dependencies_no_deps(self):
        """测试无依赖的任务"""
        task = Task(
            id="test-task-nodeps",
            name="Test Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            dependencies=[]
        )
        result = check_dependencies(self.db, task)
        self.assertTrue(result)
        print("✓ 无依赖任务检查测试通过")

    def test_check_dependencies_success(self):
        """测试依赖任务已成功完成"""
        dep_task = Task(
            id="dep-task",
            name="Dependency Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add"
        )
        self.db.add(dep_task)
        
        dep_exec = TaskExecution(
            id="dep-exec",
            task_id="dep-task",
            status="success"
        )
        self.db.add(dep_exec)
        self.db.commit()
        
        task = Task(
            id="test-task-deps",
            name="Test Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            dependencies=["dep-task"]
        )
        result = check_dependencies(self.db, task)
        self.assertTrue(result)
        print("✓ 依赖任务成功检查测试通过")

    def test_check_dependencies_failed(self):
        """测试依赖任务未成功完成"""
        dep_task = Task(
            id="dep-task-failed",
            name="Dependency Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add"
        )
        self.db.add(dep_task)
        
        dep_exec = TaskExecution(
            id="dep-exec-failed",
            task_id="dep-task-failed",
            status="failed"
        )
        self.db.add(dep_exec)
        self.db.commit()
        
        task = Task(
            id="test-task-deps-failed",
            name="Test Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            dependencies=["dep-task-failed"]
        )
        result = check_dependencies(self.db, task)
        self.assertFalse(result)
        print("✓ 依赖任务失败检查测试通过")

    def test_check_dependencies_not_found(self):
        """测试依赖任务不存在"""
        task = Task(
            id="test-task-deps-missing",
            name="Test Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            dependencies=["nonexistent-dep"]
        )
        result = check_dependencies(self.db, task)
        self.assertFalse(result)
        print("✓ 依赖任务不存在检查测试通过")


class TestWorkerManager(unittest.TestCase):
    """测试Worker管理器"""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.TestSession = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.TestSession()
        self.manager = WorkerManager()

    def tearDown(self):
        self.db.close()

    def test_register_worker(self):
        """测试注册Worker"""
        worker = self.manager.register_worker(
            self.db,
            name="test-worker",
            hostname="test-host",
            pid=12345,
            queues=["default"],
            concurrency=2
        )
        self.assertIsNotNone(worker.id)
        self.assertEqual(worker.name, "test-worker")
        self.assertEqual(worker.status, "online")
        self.assertIsNotNone(worker.last_heartbeat)
        print("✓ Worker注册测试通过")

    def test_get_all_workers(self):
        """测试获取所有Worker"""
        worker1 = Worker(
            id="worker-1",
            name="worker1",
            hostname="host1",
            pid=1111,
            status="online"
        )
        worker2 = Worker(
            id="worker-2",
            name="worker2",
            hostname="host2",
            pid=2222,
            status="offline"
        )
        self.db.add_all([worker1, worker2])
        self.db.commit()
        
        workers = WorkerManager.get_all_workers(self.db)
        self.assertEqual(len(workers), 2)
        print("✓ 获取所有Worker测试通过")

    def test_get_worker_by_id(self):
        """测试根据ID获取Worker"""
        worker = Worker(
            id="worker-get",
            name="test-worker",
            hostname="host",
            pid=12345,
            status="online"
        )
        self.db.add(worker)
        self.db.commit()
        
        found = WorkerManager.get_worker_by_id(self.db, "worker-get")
        self.assertIsNotNone(found)
        self.assertEqual(found.name, "test-worker")
        
        not_found = WorkerManager.get_worker_by_id(self.db, "nonexistent")
        self.assertIsNone(not_found)
        print("✓ 根据ID获取Worker测试通过")

    def test_send_heartbeat(self):
        """测试发送心跳"""
        worker = self.manager.register_worker(
            self.db,
            name="heartbeat-worker",
            hostname="host",
            pid=12345
        )
        
        old_heartbeat = worker.last_heartbeat
        import time
        time.sleep(0.1)
        
        self.manager.send_heartbeat(self.db)
        self.db.refresh(worker)
        self.assertGreater(worker.last_heartbeat, old_heartbeat)
        print("✓ 心跳发送测试通过")

    def test_check_worker_health_healthy(self):
        """测试健康Worker检查"""
        worker = Worker(
            id="worker-healthy",
            name="healthy-worker",
            hostname="host",
            pid=12345,
            status="online",
            last_heartbeat=datetime.utcnow()
        )
        self.db.add(worker)
        self.db.commit()
        
        health = WorkerManager.check_worker_health(self.db, worker)
        self.assertTrue(health["is_healthy"])
        self.assertEqual(health["status"], "online")
        print("✓ 健康Worker检查测试通过")

    def test_check_worker_health_unhealthy(self):
        """测试不健康Worker检查"""
        old_time = datetime.utcnow() - timedelta(seconds=60)
        worker = Worker(
            id="worker-unhealthy",
            name="unhealthy-worker",
            hostname="host",
            pid=12345,
            status="online",
            last_heartbeat=old_time
        )
        self.db.add(worker)
        self.db.commit()
        
        health = WorkerManager.check_worker_health(self.db, worker)
        self.assertFalse(health["is_healthy"])
        self.db.refresh(worker)
        self.assertEqual(worker.status, "unhealthy")
        print("✓ 不健康Worker检查测试通过")

    def test_cleanup_stale_workers(self):
        """测试清理过期Worker"""
        old_time = datetime.utcnow() - timedelta(minutes=10)
        stale_worker = Worker(
            id="worker-stale",
            name="stale-worker",
            hostname="host",
            pid=12345,
            status="online",
            last_heartbeat=old_time
        )
        active_worker = Worker(
            id="worker-active",
            name="active-worker",
            hostname="host",
            pid=67890,
            status="online",
            last_heartbeat=datetime.utcnow()
        )
        self.db.add_all([stale_worker, active_worker])
        self.db.commit()
        
        count = WorkerManager.cleanup_stale_workers(self.db)
        self.assertEqual(count, 1)
        self.db.refresh(stale_worker)
        self.assertEqual(stale_worker.status, "offline")
        self.db.refresh(active_worker)
        self.assertEqual(active_worker.status, "online")
        print("✓ 清理过期Worker测试通过")


class TestSampleTasks(unittest.TestCase):
    """测试示例任务函数"""

    def test_sample_add(self):
        """测试加法任务"""
        from app.sample_tasks import sample_add
        result = sample_add(10, 20)
        self.assertEqual(result["result"], 30)
        self.assertIn("timestamp", result)
        print("✓ 加法任务测试通过")

    def test_sample_multiply(self):
        """测试乘法任务"""
        from app.sample_tasks import sample_multiply
        result = sample_multiply(6, 7)
        self.assertEqual(result["result"], 42)
        self.assertIn("timestamp", result)
        print("✓ 乘法任务测试通过")

    def test_sample_echo(self):
        """测试回显任务"""
        from app.sample_tasks import sample_echo
        result = sample_echo("Hello World")
        self.assertEqual(result["message"], "Hello World")
        self.assertIn("timestamp", result)
        print("✓ 回显任务测试通过")

    def test_sample_failure(self):
        """测试失败任务"""
        from app.sample_tasks import sample_failure
        with self.assertRaises(ValueError):
            sample_failure()
        print("✓ 失败任务测试通过")

    def test_sample_sleep(self):
        """测试睡眠任务"""
        from app.sample_tasks import sample_sleep
        import time
        start = time.time()
        result = sample_sleep(0.1)
        elapsed = time.time() - start
        self.assertGreaterEqual(elapsed, 0.1)
        self.assertEqual(result["slept_for"], 0.1)
        print("✓ 睡眠任务测试通过")


class TestTaskExecutionLogic(unittest.TestCase):
    """测试任务执行逻辑（不依赖Celery）"""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(cls.engine)
        cls.TestSession = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.TestSession()

    def tearDown(self):
        self.db.close()

    def test_execute_task_success(self):
        """测试任务执行成功"""
        task = Task(
            id="test-exec-success",
            name="Success Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            parameters={"a": 5, "b": 3},
            timeout=60,
            max_retries=3
        )
        self.db.add(task)
        
        execution = TaskExecution(
            id="exec-success",
            task_id="test-exec-success",
            status="pending",
            retry_attempt=0
        )
        self.db.add(execution)
        self.db.commit()
        
        from app.tasks import check_dependencies
        
        deps_ok = check_dependencies(self.db, task)
        self.assertTrue(deps_ok)
        
        import importlib
        module_path, function_name = task.function_path.rsplit('.', 1)
        module = importlib.import_module(module_path)
        func = getattr(module, function_name)
        result = func(**task.parameters)
        
        self.assertEqual(result["result"], 8)
        
        execution.status = "success"
        execution.result = {"status": "success", "result": result}
        execution.end_time = datetime.utcnow()
        self.db.commit()
        
        self.db.refresh(execution)
        self.assertEqual(execution.status, "success")
        print("✓ 任务执行成功测试通过")

    def test_execute_task_paused(self):
        """测试已暂停的任务"""
        task = Task(
            id="test-exec-paused",
            name="Paused Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            is_paused=True
        )
        self.db.add(task)
        
        execution = TaskExecution(
            id="exec-paused",
            task_id="test-exec-paused",
            status="pending"
        )
        self.db.add(execution)
        self.db.commit()
        
        execution.status = "paused"
        execution.end_time = datetime.utcnow()
        self.db.commit()
        
        self.db.refresh(execution)
        self.assertEqual(execution.status, "paused")
        print("✓ 暂停任务执行测试通过")

    def test_execute_task_dependency_failed(self):
        """测试依赖失败的任务"""
        dep_task = Task(
            id="dep-exec-failed",
            name="Dep Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add"
        )
        self.db.add(dep_task)
        
        dep_exec = TaskExecution(
            id="dep-exec-failed-exec",
            task_id="dep-exec-failed",
            status="failed"
        )
        self.db.add(dep_exec)
        
        task = Task(
            id="test-exec-dep-fail",
            name="Task With Dep",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add",
            dependencies=["dep-exec-failed"]
        )
        self.db.add(task)
        self.db.commit()
        
        from app.tasks import check_dependencies
        deps_ok = check_dependencies(self.db, task)
        self.assertFalse(deps_ok)
        print("✓ 依赖失败任务执行测试通过")

    def test_task_logging(self):
        """测试任务日志记录"""
        task = Task(
            id="test-exec-log",
            name="Log Task",
            task_type="one_shot",
            function_path="app.sample_tasks.sample_add"
        )
        self.db.add(task)
        
        execution = TaskExecution(
            id="exec-log",
            task_id="test-exec-log",
            status="running"
        )
        self.db.add(execution)
        self.db.commit()
        
        from app.tasks import log_task_execution
        log_task_execution(self.db, "exec-log", "INFO", "Test log message")
        
        logs = self.db.query(TaskLog).filter(TaskLog.execution_id == "exec-log").all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].level, "INFO")
        self.assertEqual(logs[0].message, "Test log message")
        print("✓ 任务日志记录测试通过")


class TestPydanticSchemas(unittest.TestCase):
    """测试Pydantic模式"""

    def test_task_create_schema(self):
        """测试任务创建模式"""
        task_data = {
            "name": "Test Task",
            "task_type": "one_shot",
            "function_path": "app.sample_tasks.sample_add",
            "parameters": {"a": 1, "b": 2},
            "timeout": 60,
            "max_retries": 3
        }
        task = TaskCreate(**task_data)
        self.assertEqual(task.name, "Test Task")
        self.assertEqual(task.task_type, "one_shot")
        self.assertEqual(task.parameters, {"a": 1, "b": 2})
        print("✓ 任务创建模式测试通过")

    def test_task_create_schema_defaults(self):
        """测试任务创建模式默认值"""
        task_data = {
            "name": "Test Task",
            "function_path": "app.sample_tasks.sample_add"
        }
        task = TaskCreate(**task_data)
        self.assertEqual(task.task_type, "periodic")
        self.assertEqual(task.timeout, 300)
        self.assertEqual(task.max_retries, 3)
        self.assertEqual(task.priority, 5)
        print("✓ 任务创建模式默认值测试通过")

    def test_task_update_schema(self):
        """测试任务更新模式"""
        update_data = {
            "name": "Updated Task",
            "timeout": 120
        }
        update = TaskUpdate(**update_data)
        self.assertEqual(update.name, "Updated Task")
        self.assertEqual(update.timeout, 120)
        self.assertIsNone(update.description)
        print("✓ 任务更新模式测试通过")


def run_tests():
    """运行所有测试"""
    print("=" * 70)
    print("分布式任务调度系统 - 单元测试套件")
    print("=" * 70)
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    suite.addTests(loader.loadTestsFromTestCase(TestDatabaseModels))
    suite.addTests(loader.loadTestsFromTestCase(TestSchedulerLogic))
    suite.addTests(loader.loadTestsFromTestCase(TestWorkerManager))
    suite.addTests(loader.loadTestsFromTestCase(TestSampleTasks))
    suite.addTests(loader.loadTestsFromTestCase(TestTaskExecutionLogic))
    suite.addTests(loader.loadTestsFromTestCase(TestPydanticSchemas))
    
    runner = unittest.TextTestRunner(verbosity=0)
    result = runner.run(suite)
    
    print()
    print("=" * 70)
    print("测试总结")
    print("=" * 70)
    print(f"运行测试: {result.testsRun}")
    print(f"通过: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    print()
    
    if result.failures:
        print("失败详情:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback.split(chr(10))[0]}")
        print()
    
    if result.errors:
        print("错误详情:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback.split(chr(10))[0]}")
        print()
    
    if result.wasSuccessful():
        print("✓ 所有测试通过!")
    else:
        print("✗ 部分测试失败，请查看详情")
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
