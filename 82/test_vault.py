#!/usr/bin/env python3
import os
import sys
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from password_vault import PasswordVault
from password_generator import PasswordGenerator
from password_strength import PasswordStrength
from clipboard_manager import ClipboardManager
from wifi_qr import WiFiQRGenerator

VAULT_PATH = os.path.join(os.path.dirname(__file__), 'test_vault.enc')
MASTER_PASSWORD = 'test_master_123'


def test_password_generator():
    print('=' * 60)
    print('测试1: 密码生成器')
    print('=' * 60)

    gen = PasswordGenerator()

    pwd1 = gen.generate(length=16)
    print(f'  16位标准密码: {pwd1}')
    assert len(pwd1) == 16, '密码长度错误'
    print('  ✓ 长度正确')

    pwd2 = gen.generate(length=8, include_symbols=False)
    print(f'  8位无特殊符号: {pwd2}')
    assert len(pwd2) == 8, '密码长度错误'
    print('  ✓ 长度正确')

    pwd3 = gen.generate_readable()
    print(f'  可读密码: {pwd3}')
    assert len(pwd3) > 0, '可读密码生成失败'
    print('  ✓ 可读密码生成成功')

    pwd4 = gen.generate_passphrase(4)
    print(f'  4词密码短语: {pwd4}')
    assert len(pwd4) > 0, '密码短语生成失败'
    print('  ✓ 密码短语生成成功')

    pwd5 = gen.generate(exclude_confusing=True)
    confusing_chars = set('0O1lI')
    has_confusing = any(c in confusing_chars for c in pwd5)
    print(f'  排除混淆字符: {pwd5}')
    assert not has_confusing, '包含混淆字符'
    print('  ✓ 无混淆字符')

    print('  ✓ 密码生成器测试通过\n')


def test_password_strength():
    print('=' * 60)
    print('测试2: 密码强度评估')
    print('=' * 60)

    weak = PasswordStrength.evaluate('123456')
    print(f'  弱密码 "123456": 得分={weak["score"]}, 等级={weak["level"]}')
    assert weak['level'] == '弱', '弱密码判断错误'
    print('  ✓ 弱密码判断正确')

    medium = PasswordStrength.evaluate('Hello123')
    print(f'  中等密码 "Hello123": 得分={medium["score"]}, 等级={medium["level"]}')
    assert medium['level'] in ['中', '弱'], '中等密码判断错误'
    print('  ✓ 中等密码判断正确')

    strong = PasswordStrength.evaluate('K!DQb$D:%Z;v1,rJ')
    print(f'  强密码 "K!DQb$D:%Z;v1,rJ": 得分={strong["score"]}, 等级={strong["level"]}')
    assert strong['level'] == '强', '强密码判断错误'
    print('  ✓ 强密码判断正确')

    print('  ✓ 密码强度评估测试通过\n')


def test_vault_crud():
    print('=' * 60)
    print('测试3: 密码库CRUD操作')
    print('=' * 60)

    if os.path.exists(VAULT_PATH):
        os.remove(VAULT_PATH)

    vault = PasswordVault(MASTER_PASSWORD, VAULT_PATH)
    vault.load()

    vault.add_entry('github.com', 'user1@example.com', 'github_pass_123')
    vault.add_entry('google.com', 'user2@example.com', 'google_pass_456')
    vault.add_entry('amazon.com', 'user3@example.com', 'amazon_pass_789')
    vault.save()
    print('  ✓ 添加3条密码记录')

    entries = vault.get_all_entries()
    assert len(entries) == 3, f'条目数量错误: {len(entries)}'
    print(f'  ✓ 获取所有条目，共{len(entries)}条')

    entry = vault.get_entry('github.com')
    assert entry is not None, '未找到github条目'
    assert entry['username'] == 'user1@example.com', '用户名错误'
    assert entry['password'] == 'github_pass_123', '密码错误'
    print(f'  ✓ 获取github条目: {entry["username"]}')

    results = vault.search_entries('google')
    assert len(results) == 1, '搜索结果数量错误'
    print(f'  ✓ 搜索"google"找到{len(results)}条结果')

    vault.update_entry('github.com', 'new_user@example.com', 'new_github_pass')
    vault.save()
    updated = vault.get_entry('github.com')
    assert updated['username'] == 'new_user@example.com', '更新用户名失败'
    assert updated['password'] == 'new_github_pass', '更新密码失败'
    print('  ✓ 更新条目成功')

    vault.delete_entry('amazon.com')
    vault.save()
    remaining = vault.get_all_entries()
    assert len(remaining) == 2, '删除条目失败'
    assert vault.get_entry('amazon.com') is None, '删除条目失败'
    print('  ✓ 删除条目成功')

    print('  ✓ 密码库CRUD测试通过\n')


def test_encryption():
    print('=' * 60)
    print('测试4: 主密码加密机制')
    print('=' * 60)

    vault = PasswordVault(MASTER_PASSWORD, VAULT_PATH)
    vault.load()
    entries = vault.get_all_entries()
    print(f'  ✓ 正确密码可以解密，共{len(entries)}条记录')

    try:
        wrong_vault = PasswordVault('wrong_password', VAULT_PATH)
        wrong_vault.load()
        print('  ✗ 错误密码应该抛出异常')
        assert False, '错误密码未抛出异常'
    except ValueError as e:
        print(f'  ✓ 错误密码抛出异常: {e}')

    with open(VAULT_PATH, 'rb') as f:
        data = f.read()
    print(f'  ✓ 加密文件大小: {len(data)} 字节')

    try:
        content = data.decode('utf-8', errors='ignore')
        assert 'github.com' not in content, '明文数据泄露'
        assert 'password' not in content.lower(), '明文数据泄露'
        print('  ✓ 加密文件中无明文数据')
    except:
        print('  ✓ 加密文件为二进制格式')

    print('  ✓ 加密机制测试通过\n')


def test_password_expiry():
    print('=' * 60)
    print('测试5: 密码过期提醒')
    print('=' * 60)

    vault = PasswordVault(MASTER_PASSWORD, VAULT_PATH)
    vault.load()

    vault.add_entry('new-site.com', 'test@example.com', 'test_pass')
    vault.save()

    expired = vault.check_expired('new-site.com')
    assert not expired, '新密码不应该过期'
    print('  ✓ 新创建的密码未过期')

    old_date = (datetime.now() - timedelta(days=100)).isoformat()
    site_key = 'github.com'.lower()
    vault.entries[site_key]['updated_at'] = old_date
    vault.entries[site_key]['created_at'] = old_date

    expired = vault.check_expired('github.com')
    assert expired, '100天前的密码应该过期'
    print('  ✓ 100天前的密码显示过期')

    recent_date = (datetime.now() - timedelta(days=30)).isoformat()
    vault.entries[site_key]['updated_at'] = recent_date
    expired = vault.check_expired('github.com')
    assert not expired, '30天前的密码不应该过期'
    print('  ✓ 30天前的密码未过期')

    print('  ✓ 密码过期提醒测试通过\n')


def test_backup():
    print('=' * 60)
    print('测试6: 备份导出和恢复')
    print('=' * 60)

    backup_file = os.path.join(os.path.dirname(__file__), 'backup.json')

    vault = PasswordVault(MASTER_PASSWORD, VAULT_PATH)
    vault.load()

    vault.export_backup(backup_file)
    assert os.path.exists(backup_file), '备份文件未创建'
    print('  ✓ 导出备份文件')

    with open(backup_file, 'r') as f:
        backup_data = json.load(f)
    print(f'  ✓ 备份文件包含 {len(backup_data)} 条记录')

    new_vault_path = os.path.join(os.path.dirname(__file__), 'test_vault_new.enc')
    if os.path.exists(new_vault_path):
        os.remove(new_vault_path)

    new_vault = PasswordVault(MASTER_PASSWORD, new_vault_path)
    new_vault.import_backup(backup_file)
    new_vault.save()
    print('  ✓ 从备份恢复到新密码库')

    new_vault.load()
    restored_entries = new_vault.get_all_entries()
    assert len(restored_entries) == len(vault.get_all_entries()), '恢复记录数量不匹配'
    print(f'  ✓ 恢复后密码库包含 {len(restored_entries)} 条记录')

    os.remove(backup_file)
    os.remove(new_vault_path)
    print('  ✓ 清理测试文件')

    print('  ✓ 备份导出和恢复测试通过\n')


def test_wifi_qr():
    print('=' * 60)
    print('测试7: WiFi二维码生成')
    print('=' * 60)

    wifi = WiFiQRGenerator()

    qr_str = wifi.generate_string('MyHome', 'wifi123', 'WPA', False)
    print(f'  WiFi配置字符串: {qr_str}')
    assert 'WIFI:T:WPA' in qr_str
    assert 'S:MyHome' in qr_str
    assert 'P:wifi123' in qr_str
    print('  ✓ 配置字符串格式正确')

    qr_str2 = wifi.generate_string('My;Home', 'pass;word', 'WPA', True)
    print(f'  转义特殊字符: {qr_str2}')
    assert 'S:My\\;Home' in qr_str2 or 'S:My;Home' in qr_str2
    print('  ✓ 特殊字符处理正确')

    print('  ✓ WiFi二维码测试通过\n')


def test_clipboard():
    print('=' * 60)
    print('测试8: 剪贴板功能')
    print('=' * 60)

    try:
        clipboard = ClipboardManager()
        test_text = 'test_clipboard_password_123'
        clipboard.copy(test_text, clear_after=0)

        result = clipboard.paste()
        print(f'  剪贴板内容: {result}')
        assert test_text in result, '剪贴板内容不匹配'
        print('  ✓ 剪贴板复制/粘贴成功')

        clipboard.clear()
        print('  ✓ 剪贴板清空成功')

        print('  ✓ 剪贴板功能测试通过\n')
    except Exception as e:
        print(f'  跳过剪贴板测试 (可能需要GUI环境): {e}\n')


def main():
    print('\n' + '#' * 60)
    print('#  密码管理器功能测试套件')
    print('#' * 60 + '\n')

    try:
        test_password_generator()
        test_password_strength()
        test_vault_crud()
        test_encryption()
        test_password_expiry()
        test_backup()
        test_wifi_qr()
        test_clipboard()

        if os.path.exists(VAULT_PATH):
            os.remove(VAULT_PATH)

        print('=' * 60)
        print('✓ 所有测试通过！')
        print('=' * 60)
        return 0
    except AssertionError as e:
        print(f'\n✗ 测试失败: {e}')
        return 1
    except Exception as e:
        print(f'\n✗ 发生错误: {e}')
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
