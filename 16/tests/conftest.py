import pytest
import tempfile
import shutil
import os

from taskmanager import Storage, TaskManager, UIRenderer, Notifier


@pytest.fixture
def temp_storage():
    """创建临时存储目录，测试后自动清理"""
    temp_dir = tempfile.mkdtemp(prefix="taskmanager_test_")
    storage = Storage(base_dir=temp_dir)
    yield storage
    shutil.rmtree(temp_dir)


@pytest.fixture
def temp_task_manager(temp_storage):
    """创建临时TaskManager实例"""
    return TaskManager(temp_storage)


@pytest.fixture
def ui_renderer():
    """创建UI渲染器"""
    return UIRenderer("dark")


@pytest.fixture
def notifier(ui_renderer):
    """创建通知器"""
    return Notifier(ui_renderer)
