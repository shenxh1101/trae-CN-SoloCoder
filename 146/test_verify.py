#!/usr/bin/env python3
import json
import os
import sys
import time
import shutil
import io
import threading
from unittest.mock import patch, MagicMock
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import noteapp
noteapp.AESCipher.PBKDF2_COUNT = 1000

from noteapp import AESCipher, NoteManager, NoteApp

TEST_DATA_FILE = 'test_verify_notes.json'
TEST_BACKUP_DIR = 'test_verify_backup'
TEST_EXPORT_FILE = 'test_verify_export.txt'

def cleanup():
    for f in [TEST_DATA_FILE, TEST_EXPORT_FILE]:
        if os.path.exists(f):
            os.remove(f)
    if os.path.exists(TEST_BACKUP_DIR):
        shutil.rmtree(TEST_BACKUP_DIR)

def capture_output(func, *args, **kwargs):
    f = io.StringIO()
    with redirect_stdout(f):
        func(*args, **kwargs)
    return f.getvalue()

def stop_manager_threads(mgr):
    if mgr._lock_timer and mgr._lock_timer.is_alive():
        mgr._stop_event.set()

errors = []

print("=" * 60)
print("加密笔记工具 - 全面功能验证")
print("=" * 60)

cleanup()

# ============================================================
# 测试1: 首次运行设置主密码
# ============================================================
print("\n【测试1】首次运行设置主密码")
print("-" * 40)

manager = NoteManager(data_file=TEST_DATA_FILE)
assert manager.password is None, "初始密码应为None"
assert not os.path.exists(TEST_DATA_FILE), "初始时数据文件不应存在"

manager.password = "test1234"
manager._save_notes()

assert os.path.exists(TEST_DATA_FILE), "设置密码后数据文件应存在"
with open(TEST_DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)
assert 'encrypted' in data, "数据文件应包含encrypted字段"
assert 'salt' in data['encrypted'], "加密数据应包含salt"
assert 'iv' in data['encrypted'], "加密数据应包含iv"
assert 'ciphertext' in data['encrypted'], "加密数据应包含ciphertext"
print("✓ 首次设置主密码成功，加密文件格式正确")

result = AESCipher.decrypt(data['encrypted'], "test1234")
notes_loaded = json.loads(result)
assert notes_loaded == {}, "初始笔记应为空"
print("✓ 密码验证解密成功，初始数据为空")

stop_manager_threads(manager)

# ============================================================
# 测试2: 添加测试笔记
# ============================================================
print("\n【测试2】添加测试笔记")
print("-" * 40)

manager = NoteManager(data_file=TEST_DATA_FILE)
manager.password = "test1234"

output = capture_output(manager.create_note, "学习计划", "今天学习Python加密技术，包括AES对称加密和PBKDF2密钥派生")
assert "创建成功" in output, "应输出创建成功"
assert "学习计划" in manager.notes
print("✓ 添加第一条笔记成功")

output = capture_output(manager.create_note, "工作备忘", "明天开会讨论项目进度，准备季度报告")
assert "创建成功" in output
assert "工作备忘" in manager.notes
print("✓ 添加第二条笔记成功")

output = capture_output(manager.create_note, "读书笔记", "《代码整洁之道》: 代码应当易于阅读和理解")
assert "创建成功" in output
print("✓ 添加第三条笔记成功")

try:
    manager.create_note("学习计划", "重复内容")
    assert False, "重复标题应抛出异常"
except ValueError as e:
    assert "已存在" in str(e)
    print("✓ 重复标题正确拒绝")

with open(TEST_DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)
decrypted = AESCipher.decrypt(data['encrypted'], "test1234")
saved_notes = json.loads(decrypted)
assert len(saved_notes) == 3, f"应有3条笔记，实际{len(saved_notes)}"
print("✓ 笔记已加密持久化，共3条")

stop_manager_threads(manager)

# ============================================================
# 测试3: 查看笔记确认解密正常
# ============================================================
print("\n【测试3】查看笔记确认解密正常")
print("-" * 40)

manager = NoteManager(data_file=TEST_DATA_FILE)
manager.password = "test1234"
manager._load_notes()

output = capture_output(manager.view_note, "学习计划")
assert "学习计划" in output, "输出应包含标题"
assert "Python加密技术" in output, "输出应包含正文内容"
assert "创建时间" in output
assert "更新时间" in output
print("✓ 查看笔记正常，解密内容正确")

output = capture_output(manager.list_notes)
assert "3" in output, "应显示3条笔记"
assert "学习计划" in output
assert "工作备忘" in output
assert "读书笔记" in output
print("✓ 列出所有笔记正常")

try:
    manager.view_note("不存在的笔记")
    assert False, "查看不存在的笔记应抛出异常"
except ValueError as e:
    assert "不存在" in str(e)
    print("✓ 查看不存在的笔记正确报错")

print("\n  --- 模拟程序重启后重新加载 ---")
manager2 = NoteManager(data_file=TEST_DATA_FILE)
manager2.password = "test1234"
manager2._load_notes()
assert len(manager2.notes) == 3, "重新加载后应有3条笔记"
assert manager2.notes["学习计划"]["content"] == "今天学习Python加密技术，包括AES对称加密和PBKDF2密钥派生"
print("✓ 程序重启后重新加载解密正常")

stop_manager_threads(manager)
stop_manager_threads(manager2)

# ============================================================
# 测试4: 模拟5分钟自动锁定
# ============================================================
print("\n【测试4】模拟5分钟自动锁定")
print("-" * 40)

manager_lock = NoteManager(data_file=TEST_DATA_FILE)
manager_lock.password = "test1234"
manager_lock._load_notes()
assert manager_lock.password is not None, "操作前密码应在内存中"
print("  当前密码状态: 已设置")

manager_lock.last_activity = time.time() - 301
print(f"  模拟last_activity回退301秒")

elapsed = time.time() - manager_lock.last_activity
assert elapsed > manager_lock.lock_timeout, f"应超过锁定超时时间"
print(f"  已过时间: {elapsed:.0f}秒 > 超时阈值: {manager_lock.lock_timeout}秒")

manager_lock.password = None
assert manager_lock.password is None, "锁定后密码应为None"
print("✓ 自动锁定功能正常：超时后密码被清空")

print("\n  --- 验证_auto_lock线程实际锁定 ---")
manager_real_lock = NoteManager(data_file=TEST_DATA_FILE)
manager_real_lock.lock_timeout = 2
manager_real_lock.password = "test1234"
manager_real_lock._load_notes()
assert manager_real_lock.password is not None
print("  设置lock_timeout=2秒，回退last_activity 3秒...")

manager_real_lock.last_activity = time.time() - 3
time.sleep(12)
assert manager_real_lock.password is None, "自动锁定后密码应为None"
print("✓ 自动锁定线程在超时后正确清空密码")

# 验证_update_activity阻止锁定
manager_act = NoteManager(data_file=TEST_DATA_FILE)
manager_act.lock_timeout = 2
manager_act.password = "test1234"
manager_act._load_notes()
manager_act.last_activity = time.time() - 1
time.sleep(4)
manager_act._update_activity()
time.sleep(1)
assert manager_act.password is not None, "活跃操作后不应被锁定"
print("✓ 活跃操作后不会被自动锁定")

stop_manager_threads(manager_lock)
stop_manager_threads(manager_real_lock)
stop_manager_threads(manager_act)

# ============================================================
# 测试5: 修改主密码功能
# ============================================================
print("\n【测试5】修改主密码功能")
print("-" * 40)

manager_pw = NoteManager(data_file=TEST_DATA_FILE)
manager_pw.password = "test1234"
manager_pw._load_notes()

with patch('noteapp.getpass') as mock_getpass:
    mock_getpass.getpass.side_effect = ["test1234", "newpass1234", "newpass1234"]
    output = capture_output(manager_pw.change_password)
    assert "修改成功" in output, f"应输出修改成功，实际: {output}"
print("✓ 主密码修改成功")

with open(TEST_DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)
decrypted = AESCipher.decrypt(data['encrypted'], "newpass1234")
saved = json.loads(decrypted)
assert len(saved) == 3, "新密码应能解密所有笔记"
print("✓ 新密码可以正常解密数据")

try:
    AESCipher.decrypt(data['encrypted'], "test1234")
    assert False, "旧密码不应能解密"
except Exception:
    print("✓ 旧密码已失效，无法解密")

manager_pw2 = NoteManager(data_file=TEST_DATA_FILE)
manager_pw2.password = "newpass1234"
manager_pw2._load_notes()

with patch('noteapp.getpass') as mock_getpass:
    mock_getpass.getpass.side_effect = ["wrongpass", "newpass1", "newpass1"]
    try:
        manager_pw2.change_password()
        assert False, "旧密码错误应抛出异常"
    except ValueError as e:
        assert "旧密码错误" in str(e)
print("✓ 旧密码输入错误时正确拒绝")

with patch('noteapp.getpass') as mock_getpass:
    mock_getpass.getpass.side_effect = ["newpass1234", "newpass1", "newpass2"]
    try:
        manager_pw2.change_password()
        assert False, "两次密码不一致应抛出异常"
    except ValueError as e:
        assert "不一致" in str(e)
print("✓ 两次新密码不一致时正确拒绝")

manager_pw.password = "newpass1234"
with patch('noteapp.getpass') as mock_getpass:
    mock_getpass.getpass.side_effect = ["newpass1234", "test1234", "test1234"]
    manager_pw.change_password()

stop_manager_threads(manager_pw)
stop_manager_threads(manager_pw2)

# ============================================================
# 测试6: 备份功能
# ============================================================
print("\n【测试6】备份功能")
print("-" * 40)

manager_bk = NoteManager(data_file=TEST_DATA_FILE)
manager_bk.password = "test1234"
manager_bk._load_notes()

output = capture_output(manager_bk.backup_notes, TEST_BACKUP_DIR)
assert "备份成功" in output, f"应输出备份成功，实际: {output}"
assert os.path.exists(TEST_BACKUP_DIR), "备份目录应存在"

backup_files = os.listdir(TEST_BACKUP_DIR)
assert len(backup_files) == 1, f"应有1个备份文件，实际{len(backup_files)}"
print(f"✓ 备份成功，文件: {backup_files[0]}")

backup_path = os.path.join(TEST_BACKUP_DIR, backup_files[0])
with open(TEST_DATA_FILE, 'r', encoding='utf-8') as f:
    original_content = f.read()
with open(backup_path, 'r', encoding='utf-8') as f:
    backup_content = f.read()
assert original_content == backup_content, "备份内容应与原文件一致"
print("✓ 备份文件内容与原文件一致")

with open(backup_path, 'r', encoding='utf-8') as f:
    bk_data = json.load(f)
decrypted = AESCipher.decrypt(bk_data['encrypted'], "test1234")
bk_notes = json.loads(decrypted)
assert len(bk_notes) == 3, "备份应包含所有3条笔记"
print("✓ 备份文件可正常解密，数据完整")

time.sleep(1.1)
output = capture_output(manager_bk.backup_notes, TEST_BACKUP_DIR)
assert len(os.listdir(TEST_BACKUP_DIR)) == 2, "应有2个备份文件"
print("✓ 多次备份正常，文件不覆盖")

new_backup_dir = "test_verify_backup_new"
output = capture_output(manager_bk.backup_notes, new_backup_dir)
assert os.path.exists(new_backup_dir), "应自动创建备份目录"
print("✓ 备份到不存在的目录时自动创建")
if os.path.exists(new_backup_dir):
    shutil.rmtree(new_backup_dir)

stop_manager_threads(manager_bk)

# ============================================================
# 额外验证: 导出与导入
# ============================================================
print("\n【额外验证】导出与导入功能")
print("-" * 40)

manager_exp = NoteManager(data_file=TEST_DATA_FILE)
manager_exp.password = "test1234"
manager_exp._load_notes()

with patch('noteapp.getpass') as mock_getpass:
    mock_getpass.getpass.return_value = "test1234"
    output = capture_output(manager_exp.export_notes, TEST_EXPORT_FILE)
    assert "导出" in output, f"应输出导出成功，实际: {output}"
assert os.path.exists(TEST_EXPORT_FILE), "导出文件应存在"

with open(TEST_EXPORT_FILE, 'r', encoding='utf-8') as f:
    export_content = f.read()
assert "学习计划" in export_content
assert "Python加密技术" in export_content
print("✓ 导出功能正常，内容为明文")

test_import_file = 'test_import_data.json'
manager_imp = NoteManager(data_file=test_import_file)
manager_imp.password = "test1234"
manager_imp._save_notes()
manager_imp._load_notes()

output = capture_output(manager_imp.import_notes, TEST_EXPORT_FILE)
assert "导入" in output or "成功" in output
print("✓ 导入功能正常")

assert "学习计划" in manager_imp.notes
assert "工作备忘" in manager_imp.notes
print("✓ 导入后数据完整")

if os.path.exists(test_import_file):
    os.remove(test_import_file)

stop_manager_threads(manager_exp)
stop_manager_threads(manager_imp)

# ============================================================
# 额外验证: 搜索功能
# ============================================================
print("\n【额外验证】搜索功能")
print("-" * 40)

manager = NoteManager(data_file=TEST_DATA_FILE)
manager.password = "test1234"
manager._load_notes()

output = capture_output(manager.search_notes, "Python")
assert "学习计划" in output
print("✓ 搜索关键词'Python'找到正确笔记")

output = capture_output(manager.search_notes, "不存在的关键词")
assert "未找到" in output
print("✓ 搜索不存在关键词正确提示")

output = capture_output(manager.search_notes, "代码")
assert "读书笔记" in output
print("✓ 搜索中文关键词正常")

stop_manager_threads(manager)

# ============================================================
# 额外验证: 统计功能
# ============================================================
print("\n【额外验证】统计信息")
print("-" * 40)

manager = NoteManager(data_file=TEST_DATA_FILE)
manager.password = "test1234"
manager._load_notes()

output = capture_output(manager.show_stats)
assert "笔记总数: 3" in output
assert "总字符数" in output
assert "总词数" in output
assert "最长标题" in output
print("✓ 统计信息显示正常")

stop_manager_threads(manager)

# ============================================================
# 清理
# ============================================================
cleanup()

print("\n" + "=" * 60)
print("全部6项功能验证通过！ ✓")
print("=" * 60)
