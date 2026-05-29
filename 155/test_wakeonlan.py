#!/usr/bin/env python3
"""测试网络唤醒工具的各个功能模块"""

import os
import sys
import json
import tempfile
import ipaddress
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from wakeonlan import WOLManager, CONFIG_FILE, LOG_FILE


def test_mac_validation():
    """测试MAC地址验证"""
    print("=== 测试 MAC 地址验证 ===")
    wol = WOLManager()
    
    test_cases = [
        ("00:11:22:33:44:55", "00:11:22:33:44:55"),
        ("00-11-22-33-44-55", "00:11:22:33:44:55"),
        ("001122334455", "00:11:22:33:44:55"),
        ("aa:bb:cc:dd:ee:ff", "AA:BB:CC:DD:EE:FF"),
        ("00:11:22:33:44", None),
        ("00:11:22:33:44:GG", None),
        ("invalid", None),
    ]
    
    all_pass = True
    for input_mac, expected in test_cases:
        result = wol._validate_mac(input_mac)
        passed = result == expected
        status = "✓" if passed else "✗"
        print(f"  {status} {input_mac} -> {result} (expected: {expected})")
        if not passed:
            all_pass = False
    
    return all_pass


def test_magic_packet():
    """测试魔术包创建"""
    print("\n=== 测试魔术包创建 ===")
    wol = WOLManager()
    
    mac = "00:11:22:33:44:55"
    packet = wol._create_magic_packet(mac)
    
    expected_header = b'\xff' * 6
    expected_mac = bytes.fromhex(mac.replace(':', ''))
    
    if packet[:6] != expected_header:
        print("  ✗ 魔术包头不正确")
        return False
    
    for i in range(16):
        offset = 6 + i * 6
        if packet[offset:offset+6] != expected_mac:
            print(f"  ✗ 第 {i+1} 次MAC重复不正确")
            return False
    
    if len(packet) != 102:
        print(f"  ✗ 魔术包长度不正确: {len(packet)} (应为 102)")
        return False
    
    print("  ✓ 魔术包创建成功")
    return True


def test_broadcast_calculation():
    """测试广播地址计算"""
    print("\n=== 测试广播地址计算 ===")
    wol = WOLManager()
    
    test_cases = [
        ("192.168.1.100", "255.255.255.0", "192.168.1.255"),
        ("10.0.0.5", "255.0.0.0", "10.255.255.255"),
        ("172.16.10.50", "255.255.0.0", "172.16.255.255"),
    ]
    
    all_pass = True
    for ip, mask, expected in test_cases:
        result = wol.calculate_broadcast(ip, mask)
        passed = result == expected
        status = "✓" if passed else "✗"
        print(f"  {status} {ip}/{mask} -> {result} (expected: {expected})")
        if not passed:
            all_pass = False
    
    return all_pass


def test_device_management():
    """测试设备管理功能"""
    print("\n=== 测试设备管理 ===")
    
    original_config = None
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            original_config = f.read()
    
    try:
        if CONFIG_FILE.exists():
            os.remove(CONFIG_FILE)
        
        wol = WOLManager()
        
        print("  添加设备...")
        assert wol.add_device("TestPC", "00:11:22:33:44:55", "192.168.1.255")
        assert wol.add_device("TestServer", "AA:BB:CC:DD:EE:FF", "192.168.1.255")
        print("    ✓ 设备添加成功")
        
        print("  列出设备...")
        devices = wol.list_devices()
        assert len(devices) == 2
        assert devices[0][0] == "TestPC"
        assert devices[1][0] == "TestServer"
        print("    ✓ 设备列表正确")
        
        print("  获取设备...")
        device = wol.get_device("TestPC")
        assert device is not None
        assert device['mac'] == "00:11:22:33:44:55"
        print("    ✓ 设备获取成功")
        
        print("  删除设备...")
        assert wol.remove_device("TestPC")
        devices = wol.list_devices()
        assert len(devices) == 1
        print("    ✓ 设备删除成功")
        
        print("  测试无效MAC...")
        assert not wol.add_device("BadMAC", "invalid", "192.168.1.1")
        print("    ✓ 无效MAC被正确拒绝")
        
        return True
        
    finally:
        if original_config is not None:
            with open(CONFIG_FILE, 'w') as f:
                f.write(original_config)
        elif CONFIG_FILE.exists():
            os.remove(CONFIG_FILE)


def test_csv_import():
    """测试CSV导入功能"""
    print("\n=== 测试CSV导入 ===")
    
    original_config = None
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            original_config = f.read()
    
    try:
        if CONFIG_FILE.exists():
            os.remove(CONFIG_FILE)
        
        wol = WOLManager()
        
        csv_content = """name,mac,ip
PC1,00:11:22:33:44:55,192.168.1.255
PC2,AA-BB-CC-DD-EE-FF,192.168.1.255
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_path = f.name
        
        try:
            success = wol.import_csv(temp_path)
            assert success
            
            devices = wol.list_devices()
            assert len(devices) == 2
            assert devices[0][0] == "PC1"
            assert devices[1][0] == "PC2"
            
            print("  ✓ CSV导入成功")
            return True
        finally:
            os.unlink(temp_path)
            
    finally:
        if original_config is not None:
            with open(CONFIG_FILE, 'w') as f:
                f.write(original_config)
        elif CONFIG_FILE.exists():
            os.remove(CONFIG_FILE)


def test_json_export():
    """测试JSON导出功能"""
    print("\n=== 测试JSON导出 ===")
    
    original_config = None
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            original_config = f.read()
    
    try:
        if CONFIG_FILE.exists():
            os.remove(CONFIG_FILE)
        
        wol = WOLManager()
        wol.add_device("ExportTest", "00:11:22:33:44:55", "192.168.1.1")
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name
        
        try:
            success = wol.export_json(temp_path)
            assert success
            
            with open(temp_path, 'r') as f:
                data = json.load(f)
            
            assert "ExportTest" in data
            assert data["ExportTest"]["mac"] == "00:11:22:33:44:55"
            
            print("  ✓ JSON导出成功")
            return True
        finally:
            os.unlink(temp_path)
            
    finally:
        if original_config is not None:
            with open(CONFIG_FILE, 'w') as f:
                f.write(original_config)
        elif CONFIG_FILE.exists():
            os.remove(CONFIG_FILE)


def test_ping():
    """测试Ping功能（可能需要网络）"""
    print("\n=== 测试Ping功能 ===")
    wol = WOLManager()
    
    print("  Ping localhost (127.0.0.1)...")
    result = wol.ping_device("127.0.0.1", timeout=2)
    if result:
        print("    ✓ Ping localhost 成功")
    else:
        print("    ⚠ Ping localhost 失败（可能系统不允许）")
    
    print("  Ping 无效地址 (192.0.2.99)...")
    result = wol.ping_device("192.0.2.99", timeout=1)
    if not result:
        print("    ✓ 无效地址Ping正确返回失败")
    else:
        print("    ⚠ 无效地址Ping意外成功（网络环境特殊）")
    
    return True


def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("Wake-on-LAN 工具功能测试")
    print("=" * 60)
    
    tests = [
        ("MAC地址验证", test_mac_validation),
        ("魔术包创建", test_magic_packet),
        ("广播地址计算", test_broadcast_calculation),
        ("设备管理", test_device_management),
        ("CSV导入", test_csv_import),
        ("JSON导出", test_json_export),
        ("Ping功能", test_ping),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n  ✗ 测试出错: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    passed = 0
    for name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"  {name}: {status}")
        if result:
            passed += 1
    
    print(f"\n总计: {passed}/{len(tests)} 测试通过")
    
    return passed == len(tests)


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
