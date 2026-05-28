#!/usr/bin/env python3
import requests
import time
import json
import os

BASE_URL = "http://localhost:8888"
ADMIN_URL = f"{BASE_URL}/admin/api"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_cache_feature():
    print_section("测试1: 缓存功能")
    
    rule_data = {
        "name": "缓存测试规则",
        "source_path": "/cache-test",
        "target_url": "https://httpbin.org/delay/1",
        "enabled": True,
        "cache_enabled": True,
        "cache_ttl": 10
    }
    
    print("添加缓存规则...")
    r = requests.post(f"{ADMIN_URL}/rules", json=rule_data)
    print(f"规则添加: {r.status_code}")
    
    print("\n第一次请求（未缓存，应该较慢）...")
    start = time.time()
    r1 = requests.get(f"{BASE_URL}/cache-test")
    t1 = time.time() - start
    print(f"状态码: {r1.status_code}, 耗时: {t1:.2f}秒")
    
    print("\n第二次请求（应该命中缓存，较快）...")
    start = time.time()
    r2 = requests.get(f"{BASE_URL}/cache-test")
    t2 = time.time() - start
    print(f"状态码: {r2.status_code}, 耗时: {t2:.2f}秒")
    
    if t2 < t1 * 0.5:
        print(f"✓ 缓存命中！第二次请求快了 {(t1-t2)*1000:.0f}ms")
    else:
        print(f"✗ 缓存可能未生效，两次请求耗时相近")
    
    print("\n等待TTL过期...")
    time.sleep(11)
    
    print("第三次请求（缓存过期，应该较慢）...")
    start = time.time()
    r3 = requests.get(f"{BASE_URL}/cache-test")
    t3 = time.time() - start
    print(f"状态码: {r3.status_code}, 耗时: {t3:.2f}秒")
    
    if t3 > t2:
        print("✓ TTL生效，缓存已过期")
    else:
        print("✗ TTL可能未生效")

def test_access_control():
    print_section("测试2: 访问控制 - IP白名单")
    
    rule_data = {
        "name": "IP白名单测试",
        "source_path": "/ip-test",
        "target_url": "https://httpbin.org/ip",
        "enabled": True,
        "ip_whitelist": ["1.2.3.4"]
    }
    
    print("添加IP白名单规则（只允许1.2.3.4）...")
    r = requests.post(f"{ADMIN_URL}/rules", json=rule_data)
    print(f"规则添加: {r.status_code}")
    
    print("\n测试访问（真实IP 127.0.0.1，不在白名单）...")
    r = requests.get(f"{BASE_URL}/ip-test")
    print(f"状态码: {r.status_code}")
    
    if r.status_code == 403:
        print("✓ IP白名单生效，非白名单IP被拒绝")
    else:
        print(f"✗ IP白名单未生效，状态码: {r.status_code}")
    
    print_section("测试2b: 访问控制 - API密钥")
    
    rule_data2 = {
        "name": "API密钥测试",
        "source_path": "/api-key-test",
        "target_url": "https://httpbin.org/headers",
        "enabled": True,
        "api_key": "test-secret-123"
    }
    
    print("添加API密钥规则...")
    r = requests.post(f"{ADMIN_URL}/rules", json=rule_data2)
    print(f"规则添加: {r.status_code}")
    
    print("\n无密钥访问...")
    r = requests.get(f"{BASE_URL}/api-key-test")
    print(f"状态码: {r.status_code}")
    if r.status_code == 401:
        print("✓ 无密钥访问被正确拒绝")
    else:
        print(f"✗ API密钥验证未生效")
    
    print("\n错误密钥访问...")
    r = requests.get(f"{BASE_URL}/api-key-test", headers={"X-API-Key": "wrong-key"})
    print(f"状态码: {r.status_code}")
    if r.status_code == 401:
        print("✓ 错误密钥访问被正确拒绝")
    else:
        print(f"✗ API密钥验证未生效")
    
    print("\n正确密钥访问...")
    r = requests.get(f"{BASE_URL}/api-key-test", headers={"X-API-Key": "test-secret-123"})
    print(f"状态码: {r.status_code}")
    if r.status_code == 200:
        print("✓ 正确密钥访问成功")
    else:
        print(f"✗ 正确密钥也被拒绝了")

def test_rate_limit():
    print_section("测试3: 请求限流")
    
    print("快速发送多个请求测试限流...")
    print("（配置: 每分钟100次，这里快速发送测试）")
    
    for i in range(105):
        r = requests.get(f"{BASE_URL}/httpbin/get")
        if r.status_code == 429:
            print(f"✓ 第 {i+1} 次请求触发限流，返回429")
            break
    else:
        print("✗ 未触发限流，可能限流阈值太高或未生效")

def test_response_modification():
    print_section("测试4: 响应体修改")
    
    rule_data = {
        "name": "响应修改测试",
        "source_path": "/modify-test",
        "target_url": "https://httpbin.org/anything",
        "enabled": True,
        "response_replacements": [
            {"old": "httpbin.org", "new": "myproxy.local"},
            {"old": "\"method\": \"GET\"", "new": "\"method\": \"PROXIED\""}
        ]
    }
    
    print("添加响应体替换规则...")
    r = requests.post(f"{ADMIN_URL}/rules", json=rule_data)
    print(f"规则添加: {r.status_code}")
    
    print("\n发送请求并检查响应...")
    r = requests.get(f"{BASE_URL}/modify-test")
    content = r.text
    
    print(f"状态码: {r.status_code}")
    
    if "myproxy.local" in content:
        print("✓ 第一个替换规则生效 (httpbin.org → myproxy.local)")
    else:
        print("✗ 第一个替换规则未生效")
    
    if "\"method\": \"PROXIED\"" in content:
        print("✓ 第二个替换规则生效 (GET → PROXIED)")
    else:
        print("✗ 第二个替换规则未生效")

def test_load_balancing():
    print_section("测试5: 负载均衡（轮询）")
    
    rule_data = {
        "name": "负载均衡测试",
        "source_path": "/lb-test",
        "target_urls": [
            "https://httpbin.org/anything/server1",
            "https://httpbin.org/anything/server2",
            "https://httpbin.org/anything/server3"
        ],
        "enabled": True
    }
    
    print("添加多目标URL规则（3个服务器）...")
    r = requests.post(f"{ADMIN_URL}/rules", json=rule_data)
    print(f"规则添加: {r.status_code}")
    
    print("\n发送5次请求，检查轮询...")
    urls = []
    for i in range(5):
        r = requests.get(f"{BASE_URL}/lb-test")
        data = r.json()
        urls.append(data.get('url', ''))
        print(f"请求 {i+1}: {urls[-1]}")
    
    print(f"\n轮询模式: {urls}")
    if urls[0] != urls[1] and urls[1] != urls[2]:
        print("✓ 负载均衡轮询生效")
    else:
        print("✗ 负载均衡可能未生效")

def test_https():
    print_section("测试6: HTTPS证书配置")
    
    print("生成自签名证书...")
    try:
        import subprocess
        result = subprocess.run(
            ["python", "generate_cert.py"],
            cwd="/Users/mac/code/solo coder/130",
            capture_output=True,
            text=True
        )
        print(result.stdout)
        
        cert_path = "data/certs/cert.pem"
        key_path = "data/certs/key.pem"
        
        if os.path.exists(cert_path) and os.path.exists(key_path):
            print("✓ 证书生成成功")
        else:
            print("✗ 证书文件不存在")
    except Exception as e:
        print(f"✗ 证书生成失败: {e}")

def test_admin_panel_features():
    print_section("测试7: 管理界面API功能")
    
    print("测试获取规则列表...")
    r = requests.get(f"{ADMIN_URL}/rules")
    if r.status_code == 200:
        rules = r.json()
        print(f"✓ 获取规则成功，共 {len(rules)} 条规则")
    else:
        print(f"✗ 获取规则失败: {r.status_code}")
    
    print("\n测试获取日志...")
    r = requests.get(f"{ADMIN_URL}/logs?limit=10")
    if r.status_code == 200:
        logs = r.json()
        print(f"✓ 获取日志成功，共 {len(logs)} 条")
        if logs:
            print(f"  最新日志: {logs[0].get('path', 'N/A')} - {logs[0].get('status_code', 0)}")
    else:
        print(f"✗ 获取日志失败: {r.status_code}")
    
    print("\n测试导出规则...")
    r = requests.get(f"{ADMIN_URL}/rules/export")
    if r.status_code == 200 and 'application/json' in r.headers.get('Content-Type', ''):
        print("✓ 规则导出成功")
    else:
        print(f"✗ 规则导出失败")
    
    print("\n测试清空缓存...")
    r = requests.delete(f"{ADMIN_URL}/cache")
    if r.status_code == 200:
        print("✓ 缓存清空成功")
    else:
        print(f"✗ 缓存清空失败")

def main():
    print("API代理服务功能全面测试")
    print("服务地址:", BASE_URL)
    
    # 先添加基础测试规则
    print("\n初始化: 添加基础测试规则...")
    basic_rule = {
        "name": "基础测试",
        "source_path": "/httpbin",
        "target_url": "https://httpbin.org",
        "enabled": True
    }
    requests.post(f"{ADMIN_URL}/rules", json=basic_rule)
    
    try:
        test_cache_feature()
        test_access_control()
        test_rate_limit()
        test_response_modification()
        test_load_balancing()
        test_https()
        test_admin_panel_features()
        
        print_section("测试完成")
        print("所有功能测试已执行！")
        
    except Exception as e:
        print(f"\n测试出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
