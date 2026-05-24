import unittest
import os
import tempfile
import shutil
import json
from datetime import date, datetime

from taskmanager.models import Task, TaskStatus, Priority, RepeatFrequency
from taskmanager.storage import Storage


class TestStorage(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="taskmanager_storage_test_")
        self.storage = Storage(base_dir=self.temp_dir)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_initialization(self):
        self.assertTrue(os.path.exists(self.temp_dir))
        self.assertTrue(os.path.exists(os.path.join(self.temp_dir, "tasks.json")))
        self.assertTrue(os.path.exists(os.path.join(self.temp_dir, "trash")))
        self.assertTrue(os.path.exists(os.path.join(self.temp_dir, "config.json")))
        self.assertTrue(os.path.exists(os.path.join(self.temp_dir, "backups")))

    def test_initial_config(self):
        config = self.storage.get_config()
        self.assertIn("theme", config)
        self.assertEqual(config["theme"], "dark")

    def test_add_and_load_task(self):
        task = Task(title="测试任务", description="测试描述")
        self.storage.add_task(task)

        tasks = self.storage.load_tasks()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].id, task.id)
        self.assertEqual(tasks[0].title, "测试任务")
        self.assertEqual(tasks[0].description, "测试描述")

    def test_update_task(self):
        task = Task(title="原始标题")
        self.storage.add_task(task)

        updated_task = Task(
            id=task.id,
            title="更新后的标题",
            description="新描述",
            priority=Priority.HIGH,
        )
        updated_task.created_at = task.created_at
        result = self.storage.update_task(updated_task)

        self.assertTrue(result)
        tasks = self.storage.load_tasks()
        self.assertEqual(tasks[0].title, "更新后的标题")
        self.assertEqual(tasks[0].description, "新描述")
        self.assertEqual(tasks[0].priority, Priority.HIGH)

    def test_update_nonexistent_task(self):
        task = Task(id="nonexistent", title="不存在的任务")
        result = self.storage.update_task(task)
        self.assertFalse(result)

    def test_delete_task_and_trash(self):
        task = Task(title="要删除的任务")
        self.storage.add_task(task)

        deleted = self.storage.delete_task(task.id)
        self.assertIsNotNone(deleted)
        self.assertEqual(deleted.id, task.id)

        tasks = self.storage.load_tasks()
        self.assertEqual(len(tasks), 0)

        trash = self.storage.list_trash()
        self.assertEqual(len(trash), 1)
        self.assertEqual(trash[0].id, task.id)

    def test_delete_nonexistent_task(self):
        deleted = self.storage.delete_task("nonexistent")
        self.assertIsNone(deleted)

    def test_get_task_by_id(self):
        task = Task(title="查找任务")
        self.storage.add_task(task)

        found = self.storage.get_task_by_id(task.id)
        self.assertIsNotNone(found)
        self.assertEqual(found.title, "查找任务")

        not_found = self.storage.get_task_by_id("nonexistent")
        self.assertIsNone(not_found)

    def test_restore_from_trash(self):
        task = Task(title="要恢复的任务")
        self.storage.add_task(task)
        self.storage.delete_task(task.id)

        self.assertEqual(len(self.storage.load_tasks()), 0)
        self.assertEqual(len(self.storage.list_trash()), 1)

        restored = self.storage.restore_task(task.id)
        self.assertIsNotNone(restored)
        self.assertEqual(restored.id, task.id)

        self.assertEqual(len(self.storage.load_tasks()), 1)
        self.assertEqual(len(self.storage.list_trash()), 0)

    def test_empty_trash(self):
        for i in range(3):
            task = Task(title=f"任务{i}")
            self.storage.add_task(task)
            self.storage.delete_task(task.id)

        self.assertEqual(len(self.storage.list_trash()), 3)
        count = self.storage.empty_trash()
        self.assertEqual(count, 3)
        self.assertEqual(len(self.storage.list_trash()), 0)

    def test_update_config(self):
        self.storage.update_config("theme", "light")
        config = self.storage.get_config()
        self.assertEqual(config["theme"], "light")

        self.storage.update_config("custom_key", "custom_value")
        config = self.storage.get_config()
        self.assertEqual(config["custom_key"], "custom_value")

    def test_import_tasks_merge(self):
        original = Task(title="原有任务")
        self.storage.add_task(original)

        import_data = [
            Task(title="导入任务1", priority=Priority.HIGH).to_dict(),
            Task(title="导入任务2", tags=["import"]).to_dict(),
        ]

        count = self.storage.import_tasks(import_data, merge=True)
        self.assertEqual(count, 2)

        tasks = self.storage.load_tasks()
        self.assertEqual(len(tasks), 3)

    def test_import_tasks_replace(self):
        original = Task(title="原有任务")
        self.storage.add_task(original)

        import_data = [
            Task(title="新任务1").to_dict(),
            Task(title="新任务2").to_dict(),
        ]

        count = self.storage.import_tasks(import_data, merge=False)
        self.assertEqual(count, 2)

        tasks = self.storage.load_tasks()
        self.assertEqual(len(tasks), 2)
        self.assertTrue(all(t.title.startswith("新任务") for t in tasks))

    def test_import_tasks_id_conflict(self):
        task = Task(id="conflict123", title="原有任务")
        self.storage.add_task(task)

        import_data = [
            Task(id="conflict123", title="导入任务").to_dict(),
        ]

        count = self.storage.import_tasks(import_data, merge=True)
        self.assertEqual(count, 1)

        tasks = self.storage.load_tasks()
        self.assertEqual(len(tasks), 2)
        ids = {t.id for t in tasks}
        self.assertIn("conflict123", ids)
        self.assertEqual(len(ids), 2)

    def test_export_tasks_json(self):
        for i in range(3):
            task = Task(title=f"导出任务{i}")
            self.storage.add_task(task)

        export_file = os.path.join(self.temp_dir, "export_test.json")
        self.storage.export_tasks_json(export_file)

        self.assertTrue(os.path.exists(export_file))
        with open(export_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(len(data), 3)

    def test_backup_creation(self):
        task = Task(title="备份测试")
        self.storage.add_task(task)

        backup_dir = os.path.join(self.temp_dir, "backups")
        backups = [f for f in os.listdir(backup_dir) if f.startswith("backup_")]
        self.assertGreaterEqual(len(backups), 1)

    def test_persistence(self):
        task1 = Task(title="持久化测试1", priority=Priority.HIGH)
        task2 = Task(title="持久化测试2", tags=["persist"])
        self.storage.add_task(task1)
        self.storage.add_task(task2)

        new_storage = Storage(base_dir=self.temp_dir)
        tasks = new_storage.load_tasks()

        self.assertEqual(len(tasks), 2)
        titles = {t.title for t in tasks}
        self.assertIn("持久化测试1", titles)
        self.assertIn("持久化测试2", titles)

    def test_complex_task_serialization(self):
        today = date.today()
        now = datetime.now()
        task = Task(
            title="复杂任务",
            description="多行\n描述\n测试",
            priority=Priority.URGENT,
            tags=["tag1", "tag2", "tag3"],
            due_date=today,
            status=TaskStatus.IN_PROGRESS,
            dependencies=["dep1", "dep2"],
            repeat_frequency=RepeatFrequency.WEEKLY,
            reminder_time=now,
        )

        self.storage.add_task(task)
        loaded = self.storage.get_task_by_id(task.id)

        self.assertEqual(loaded.id, task.id)
        self.assertEqual(loaded.title, task.title)
        self.assertEqual(loaded.description, task.description)
        self.assertEqual(loaded.priority, task.priority)
        self.assertEqual(loaded.tags, task.tags)
        self.assertEqual(loaded.due_date, task.due_date)
        self.assertEqual(loaded.status, task.status)
        self.assertEqual(loaded.dependencies, task.dependencies)
        self.assertEqual(loaded.repeat_frequency, task.repeat_frequency)


if __name__ == "__main__":
    unittest.main()
