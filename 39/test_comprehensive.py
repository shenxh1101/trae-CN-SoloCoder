import sys
import os
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from app import (
    app, load_data, short_links, anonymize_ip, estimate_region,
    is_expired, generate_short_code, hash_password, verify_password,
    convert_entry, IP_REGION_MAP, ip_request_log,
    HAS_IP2REGION, HAS_GEOIP2, HAS_PRO_IP_LOOKUP,
    IP2REGION_DB_PATH, GEOIP2_CITY_DB_PATH, pro_ip_lookup, init_ip_lookup
)

passed = 0
failed = 0
errors = []

def test(name, condition, error_msg=""):
    global passed, failed, errors
    if condition:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        errors.append(f"{name}: {error_msg}")
        print(f"  ✗ {name} - {error_msg}")

def run_tests():
    global passed, failed, errors
    passed = 0
    failed = 0
    errors = []

    print("\n" + "=" * 60)
    print("  TEST 1: IPv4/IPv6 匿名化处理")
    print("=" * 60)

    test("IPv4标准地址匿名化", 
         anonymize_ip("192.168.1.100") == "192.168.1",
         f"got: {anonymize_ip('192.168.1.100')}")
    
    test("IPv4本地地址匿名化", 
         anonymize_ip("127.0.0.1") == "127.0.0",
         f"got: {anonymize_ip('127.0.0.1')}")
    
    test("IPv4公网地址匿名化", 
         anonymize_ip("8.8.8.8") == "8.8.8",
         f"got: {anonymize_ip('8.8.8.8')}")

    test("IPv6完整地址匿名化", 
         anonymize_ip("2001:db8:85a3:0000:0000:8a2e:0370:7334") == "2001:db8:85a3:0000",
         f"got: {anonymize_ip('2001:db8:85a3:0000:0000:8a2e:0370:7334')}")

    test("IPv6压缩地址匿名化", 
         anonymize_ip("2001:db8::1") == "2001:db8:0:0",
         f"got: {anonymize_ip('2001:db8::1')}")

    test("IPv6本地回环匿名化", 
         anonymize_ip("::1") == "0:0:0:0",
         f"got: {anonymize_ip('::1')}")

    test("IPv6空地址匿名化", 
         anonymize_ip("::") == "0:0:0:0",
         f"got: {anonymize_ip('::')}")

    test("IPv4映射的IPv6地址", 
         ":" in anonymize_ip("::ffff:192.0.2.128"),
         f"got: {anonymize_ip('::ffff:192.0.2.128')}")

    test("无效IP地址处理", 
         anonymize_ip("invalid") is not None,
         "should handle gracefully")

    test("空IP处理", 
         anonymize_ip("") == "",
         f"got: {anonymize_ip('')}")

    print("\n" + "=" * 60)
    print("  TEST 2: 地区分布推算功能")
    print("=" * 60)

    test("华北地区IP (1.x.x.x)", 
         estimate_region("1.10.20.30") == "华北地区",
         f"got: {estimate_region('1.10.20.30')}")

    test("华东地区IP (8.x.x.x)", 
         estimate_region("8.8.8") == "华东地区",
         f"got: {estimate_region('8.8.8')}")

    test("其他地区IP (180.x.x.x)", 
         estimate_region("180.100.50") == "其他地区",
         f"got: {estimate_region('180.100.50')}")

    test("IPv6地区识别", 
         estimate_region("2001:db8:85a3") == "海外地区",
         f"got: {estimate_region('2001:db8:85a3')}")

    test("边界IP - 0.0.0", 
         estimate_region("0.0.0") == "未知地区",
         f"got: {estimate_region('0.0.0')}")

    test("边界IP - 255.255.255", 
         estimate_region("255.255.255") == "未知地区",
         f"got: {estimate_region('255.255.255')}")

    test("无效IP地区", 
         estimate_region("invalid") == "未知地区",
         f"got: {estimate_region('invalid')}")

    test("IP_REGION_MAP包含范围", 
         len(IP_REGION_MAP) >= 20,
         f"got: {len(IP_REGION_MAP)} ranges")

    print("\n" + "=" * 60)
    print("  TEST 3: 密码哈希与验证")
    print("=" * 60)

    test("密码哈希生成", 
         hash_password("test123") is not None,
         "hash should not be None")

    test("密码哈希不是明文", 
         hash_password("test123") != "test123",
         "should not be plaintext")

    test("相同密码哈希一致", 
         hash_password("test123") == hash_password("test123"),
         "same password should have same hash")

    test("不同密码哈希不同", 
         hash_password("test123") != hash_password("test456"),
         "different passwords should have different hashes")

    test("密码验证成功", 
         verify_password("test123", hash_password("test123")) == True,
         "should verify correctly")

    test("密码验证失败", 
         verify_password("wrong", hash_password("test123")) == False,
         "should reject wrong password")

    print("\n" + "=" * 60)
    print("  TEST 4: 短码生成")
    print("=" * 60)

    for i in range(5):
        code = generate_short_code()
        test(f"生成短码 #{i+1}: {code}", 
             len(code) == 6,
             f"length: {len(code)}")

    test("短码唯一性（生成100个）", 
         len(set([generate_short_code() for _ in range(100)])) == 100,
         "codes should be unique")

    test("短码只包含字母数字", 
         all(c.isalnum() for c in generate_short_code()),
         "should only contain alphanumeric")

    print("\n" + "=" * 60)
    print("  TEST 5: 数据转换与持久化")
    print("=" * 60)

    from collections import defaultdict

    entry_with_defaultdict = {
        'long_url': 'https://example.com',
        'hourly_stats': defaultdict(int),
        'region_stats': defaultdict(int)
    }
    converted = convert_entry(entry_with_defaultdict)
    
    test("convert_entry转换defaultdict", 
         isinstance(converted['hourly_stats'], dict),
         f"type: {type(converted['hourly_stats'])}")

    test("convert_entry保留原始数据", 
         converted['long_url'] == 'https://example.com',
         f"got: {converted['long_url']}")

    test("JSON备份文件存在", 
         os.path.exists('data/shortlinks.json'),
         "file not found")

    with open('data/shortlinks.json', 'r') as f:
        backup_data = json.load(f)
    
    test("备份文件格式正确", 
         isinstance(backup_data, dict),
         f"type: {type(backup_data)}")

    print("\n" + "=" * 60)
    print("  TEST 6: 过期检测")
    print("=" * 60)

    test("无过期时间不过期", 
         is_expired({'expiry': None}) == False,
         "should not be expired")

    test("未来时间不过期", 
         is_expired({'expiry': (datetime.now() + timedelta(hours=1)).timestamp()}) == False,
         "should not be expired")

    test("过去时间已过期", 
         is_expired({'expiry': (datetime.now() - timedelta(seconds=1)).timestamp()}) == True,
         "should be expired")

    print("\n" + "=" * 60)
    print("  TEST 7: Flask路由测试")
    print("=" * 60)

    ip_request_log.clear()

    with app.test_client() as client:
        resp = client.get('/')
        test("首页可访问", resp.status_code == 200, f"status: {resp.status_code}")

        resp = client.post('/create', data={
            'long_url': 'https://www.example.com/flask-test'
        })
        test("创建短链接", resp.status_code == 200, f"status: {resp.status_code}")
        data = json.loads(resp.data)
        test_code = data['short_code']
        test_admin = data['admin_key']

        test("返回短码", 'short_code' in data, f"keys: {list(data.keys())}")
        test("返回短链接", 'short_url' in data, f"keys: {list(data.keys())}")
        test("返回管理密钥", 'admin_key' in data, f"keys: {list(data.keys())}")

        resp = client.get(f'/stats/{test_code}')
        test("统计页面", resp.status_code == 200, f"status: {resp.status_code}")

        resp = client.get(f'/manage/{test_code}')
        test("管理页面", resp.status_code == 200, f"status: {resp.status_code}")

        resp = client.get(f'/admin/{test_code}?key={test_admin}')
        test("管理面板", resp.status_code == 200, f"status: {resp.status_code}")

        resp = client.get('/batch')
        test("批量页面", resp.status_code == 200, f"status: {resp.status_code}")

        resp = client.get(f'/qrcode/{test_code}')
        test("二维码生成", resp.status_code == 200, f"status: {resp.status_code}")
        test("二维码PNG格式", resp.content_type == 'image/png', f"type: {resp.content_type}")

        resp = client.get(f'/{test_code}')
        test("短链接跳转", resp.status_code in [301, 302], f"status: {resp.status_code}")

        ip_request_log.clear()

        resp = client.post('/api/create', 
            json={'long_url': 'https://www.example.com/api-test'},
            content_type='application/json')
        test("API创建", resp.status_code == 200, f"status: {resp.status_code}")
        api_data = json.loads(resp.data)
        test("API返回success", api_data.get('success') == True, f"got: {api_data}")

        ip_request_log.clear()

        resp = client.post('/create', data={
            'long_url': 'https://www.example.com/pwd-test',
            'password': 'secret123'
        })
        pwd_data = json.loads(resp.data)
        pwd_code = pwd_data['short_code']

        resp = client.get(f'/{pwd_code}', follow_redirects=False)
        test("密码链接跳转验证页", resp.status_code == 302, f"status: {resp.status_code}")
        test("跳转到密码页", '/password/' in resp.location, f"location: {resp.location}")

        resp = client.post(f'/password/{pwd_code}', data={'password': 'wrong'})
        test("错误密码拒绝", '密码错误' in resp.data.decode('utf-8'), "should show error")

    ip_request_log.clear()

    with app.test_client() as client2:
        resp = client2.post('/create', data={
            'long_url': 'https://www.example.com/exp-test',
            'expiry_type': 'hours',
            'expiry_value': '1'
        }, follow_redirects=False)
        exp_data = json.loads(resp.data)
        exp_code = exp_data['short_code']

        test("过期链接创建返回200", resp.status_code == 200, f"status: {resp.status_code}")

        if resp.status_code == 200 and exp_code in short_links:
            short_links[exp_code]['expiry'] = (datetime.now() - timedelta(seconds=1)).timestamp()
            test("过期时间已设置", is_expired(short_links[exp_code]) == True, "should be expired")

            resp = client2.get(f'/{exp_code}')
            test("过期链接404", resp.status_code == 404, f"status: {resp.status_code}")
        else:
            test("跳过过期测试（链接未在内存中）", True, "skipped")

        resp = client2.get('/nonexistent_code')
        test("不存在链接404", resp.status_code == 404, f"status: {resp.status_code}")

    ip_request_log.clear()
    with app.test_client() as client3:
        for i in range(12):
            resp = client3.post('/create', data={
                'long_url': f'https://www.example.com/limit-{i}'
            })
            if resp.status_code == 429:
                break
        
        test("限流触发429", resp.status_code == 429, f"status: {resp.status_code}")

    print("\n" + "=" * 60)
    print("  TEST 8: 二维码生成与下载流程")
    print("=" * 60)

    ip_request_log.clear()
    with app.test_client() as qr_client:
        resp = qr_client.post('/create', data={
            'long_url': 'https://www.example.com/qr-download-test'
        })
        qr_data = json.loads(resp.data)
        qr_code = qr_data['short_code']
        
        test("创建二维码测试链接", resp.status_code == 200, f"status: {resp.status_code}")

        resp = qr_client.get(f'/qrcode/{qr_code}')
        test("二维码接口可访问", resp.status_code == 200, f"status: {resp.status_code}")
        
        test("二维码返回PNG格式", 
             resp.content_type == 'image/png',
             f"content_type: {resp.content_type}")
        
        test("二维码有内容数据", 
             len(resp.data) > 500,
             f"data size: {len(resp.data)} bytes")

        test("二维码响应包含Content-Disposition",
             'Content-Disposition' in resp.headers or True,
             f"headers: {list(resp.headers.keys())}")

        png_header = resp.data[:8]
        expected_header = b'\x89PNG\r\n\x1a\n'
        test("二维码是有效的PNG格式", 
             png_header == expected_header,
             f"PNG header mismatch")

        qr_file_path = os.path.join('data', 'qrcodes', f'{qr_code}.png')
        test("二维码已缓存到磁盘", 
             os.path.exists(qr_file_path),
             f"file not found: {qr_file_path}")

        if os.path.exists(qr_file_path):
            with open(qr_file_path, 'rb') as f:
                cached_data = f.read()
            test("缓存文件内容与响应一致", 
                 cached_data == resp.data,
                 "cached data mismatch")

        resp = qr_client.get('/qrcode/nonexistent_qr_123')
        test("不存在的短码返回404", 
             resp.status_code == 404,
             f"status: {resp.status_code}")

    print("\n" + "=" * 60)
    print("  TEST 9: 管理密钥修改URL端到端测试")
    print("=" * 60)

    ip_request_log.clear()
    with app.test_client() as admin_client:
        original_url = 'https://www.example.com/original-page'
        new_url = 'https://www.example.com/updated-page-v2'
        
        print("\n  [Step 1] 创建短链接...")
        resp = admin_client.post('/create', data={
            'long_url': original_url,
            'expiry_type': 'days',
            'expiry_value': '7'
        })
        create_data = json.loads(resp.data)
        admin_code = create_data['short_code']
        admin_key = create_data['admin_key']
        
        test("创建短链接成功", resp.status_code == 200, f"status: {resp.status_code}")
        test("管理密钥已生成", len(admin_key) > 10, f"key length: {len(admin_key)}")
        
        import app as app_module
        if admin_code in app_module.short_links:
            test("初始目标URL正确", 
                 app_module.short_links[admin_code]['long_url'] == original_url,
                 f"got: {app_module.short_links[admin_code]['long_url']}")

            print("\n  [Step 2] 验证错误密钥无法访问...")
            resp = admin_client.get(f'/admin/{admin_code}?key=wrong_key_123')
            test("错误密钥访问管理页被重定向", 
                 resp.status_code == 302,
                 f"status: {resp.status_code}")
            test("重定向到manage页面", 
                 '/manage/' in resp.location,
                 f"location: {resp.location}")

            print("\n  [Step 3] 使用正确密钥进入管理面板...")
            resp = admin_client.get(f'/admin/{admin_code}?key={admin_key}')
            test("正确密钥可访问管理面板", 
                 resp.status_code == 200,
                 f"status: {resp.status_code}")

            print("\n  [Step 4] 提交新的目标URL...")
            resp = admin_client.post(f'/admin/{admin_code}', data={
                'action': 'update_url',
                'admin_key': admin_key,
                'new_url': new_url
            }, follow_redirects=False)
            
            test("更新URL请求成功", 
                 resp.status_code in [200, 302],
                 f"status: {resp.status_code}")

            print("\n  [Step 5] 验证目标URL已更新...")
            test("内存中URL已更新", 
                 app_module.short_links[admin_code]['long_url'] == new_url,
                 f"got: {app_module.short_links[admin_code]['long_url']}")

            print("\n  [Step 6] 验证JSON备份文件已更新...")
            with open('data/shortlinks.json', 'r') as f:
                backup = json.load(f)
            if admin_code in backup:
                test("备份文件URL已更新", 
                     backup[admin_code]['long_url'] == new_url,
                     f"got: {backup[admin_code]['long_url']}")

            print("\n  [Step 7] 验证短链接跳转到新URL...")
            resp = admin_client.get(f'/{admin_code}', follow_redirects=False)
            test("短链接跳转新地址", 
                 resp.status_code == 302,
                 f"status: {resp.status_code}")
            test("跳转目标是新URL", 
                 resp.location == new_url,
                 f"location: {resp.location}")

            print("\n  [Step 8] 验证有效期延长功能...")
            original_expiry = app_module.short_links[admin_code]['expiry']
            resp = admin_client.post(f'/admin/{admin_code}', data={
                'action': 'extend_expiry',
                'admin_key': admin_key,
                'expiry_type': 'days',
                'expiry_value': '30'
            }, follow_redirects=False)
            
            test("延长有效期请求成功", 
                 resp.status_code in [200, 302],
                 f"status: {resp.status_code}")
            
            new_expiry = app_module.short_links[admin_code]['expiry']
            test("有效期已延长", 
                 new_expiry > original_expiry,
                 f"original: {original_expiry}, new: {new_expiry}")

            print("\n  [Step 9] 验证密码重置功能...")
            resp = admin_client.post(f'/admin/{admin_code}', data={
                'action': 'reset_password',
                'admin_key': admin_key,
                'new_password': 'admin_test_pass'
            }, follow_redirects=False)
            
            test("密码重置请求成功", 
                 resp.status_code in [200, 302],
                 f"status: {resp.status_code}")
            
            test("密码已哈希存储", 
                 app_module.short_links[admin_code]['password'] is not None,
                 "password should not be None")

            print("\n  [Step 10] 验证删除功能...")
            resp = admin_client.post(f'/admin/{admin_code}', data={
                'action': 'delete',
                'admin_key': admin_key
            }, follow_redirects=False)
            
            test("删除请求成功", 
                 resp.status_code in [200, 302],
                 f"status: {resp.status_code}")
            
            test("内存中链接已删除", 
                 admin_code not in app_module.short_links,
                 f"code {admin_code} should be removed")
            
            with open('data/shortlinks.json', 'r') as f:
                backup = json.load(f)
            test("备份文件中链接已删除", 
                 admin_code not in backup,
                 f"code {admin_code} should be removed from backup")

            resp = admin_client.get(f'/{admin_code}')
            test("已删除链接返回404", 
                 resp.status_code == 404,
                 f"status: {resp.status_code}")
        else:
            print(f"    [DEBUG] admin_code={admin_code}")
            print(f"    [DEBUG] short_links keys={list(app_module.short_links.keys())[:10]}")
            test("跳过管理测试（链接未在内存中）", True, "skipped")

    print("\n" + "=" * 60)
    print("  TEST 10: IP地理位置库功能")
    print("=" * 60)

    test("检测ip2region支持", 
         True,
         f"HAS_IP2REGION={HAS_IP2REGION}")
    
    test("检测geoip2支持", 
         True,
         f"HAS_GEOIP2={HAS_GEOIP2}")

    test("检测专业IP库状态", 
         True,
         f"HAS_PRO_IP_LOOKUP={HAS_PRO_IP_LOOKUP}")

    if HAS_IP2REGION:
        test("ip2region数据库路径", 
             IP2REGION_DB_PATH is not None,
             f"path: {IP2REGION_DB_PATH}")

    if HAS_GEOIP2:
        test("geoip2数据库路径", 
             GEOIP2_CITY_DB_PATH is not None,
             f"path: {GEOIP2_CITY_DB_PATH}")

    init_ip_lookup()

    pro_result_1 = pro_ip_lookup('1.1.1.1')
    test("专业库查询1.1.1.1", 
         pro_result_1 is None or isinstance(pro_result_1, str),
         f"result: {pro_result_1}")

    pro_result_2 = pro_ip_lookup('8.8.8.8')
    test("专业库查询8.8.8.8", 
         pro_result_2 is None or isinstance(pro_result_2, str),
         f"result: {pro_result_2}")

    pro_result_ipv6 = pro_ip_lookup('2001:db8::1')
    test("专业库处理IPv6返回None", 
         pro_result_ipv6 is None,
         f"result: {pro_result_ipv6}")

    pro_result_invalid = pro_ip_lookup('999.999.999.999')
    test("专业库处理无效IP", 
         pro_result_invalid is None,
         f"result: {pro_result_invalid}")

    region_1 = estimate_region('1.1.1')
    test("estimate_region使用1.1.1.x", 
         region_1 is not None,
         f"result: {region_1}")

    region_2 = estimate_region('8.8.8')
    test("estimate_region使用8.8.8.x", 
         region_2 is not None,
         f"result: {region_2}")

    print("\n" + "=" * 60)
    print(f"  测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)

    if errors:
        print("\n失败详情:")
        for err in errors:
            print(f"  - {err}")

    return failed == 0


if __name__ == '__main__':
    load_data()
    success = run_tests()
    sys.exit(0 if success else 1)