#!/usr/bin/env python3
import requests
import time
import os
import subprocess

BASE_URL = "http://localhost:8888"
ADMIN_URL = f"{BASE_URL}/admin/api"

def test_cache():
    print("\n=== 测试缓存功能 ===")
    
    rule = {
        "name": "缓存测试",
        "source_path": "/cache-test",
        "target_url": "https://httpbin.org/delay/1",
        "enabled": True,
        "cache_enabled": True,
        "cache_ttl": 15
    }
    
    r = requests.post(f"{ADMIN_URL}/rules", json=rule)
    print(f"添加规则: {r.status_code}")
    
    print("第一次请求（未缓存）...")
    start = time.time()
    r1 = requests.get(f"{BASE_URL}/cache-test")
    t1 = time.time() - start
    print(f"状态码: {r1.status_code}, 耗时: {t1:.2f}秒")
    
    print("第二次请求（命中缓存）...")
    start = time.time()
    r2 = requests.get(f"{BASE_URL}/cache-test")
    t2 = time.time() - start
    print(f"状态码: {r2.status_code}, 耗时: {t2:.2f}秒")
    
    if t2 < t1 * 0.3:
        print(f"✓ 缓存命中！快了 {(t1-t2)*1000:.0f}ms")
    else:
        print("✗ 缓存可能未生效")
        print(f"  检查缓存文件...")
        cache_dir = "data/cache"
        if os.path.exists(cache_dir):
            files = os.listdir(cache_dir)
            print(f"  缓存目录文件数: {len(files)}")

def test_rate_limit():
    print("\n=== 测试请求限流 ===")
    
    print("临时降低限流阈值...")
    import sys
    sys.path.insert(0, '.')
    from config import Config
    
    original_limit = Config.RATE_LIMIT_MAX_REQUESTS
    original_window = Config.RATE_LIMIT_WINDOW
    
    Config.RATE_LIMIT_MAX_REQUESTS = 5
    Config.RATE_LIMIT_WINDOW = 60
    
    print(f"阈值设置: 5次/分钟")
    print("发送6次请求...")
    
    for i in range(6):
        r = requests.get(f"{BASE_URL}/httpbin/get")
        if r.status_code == 429:
            print(f"✓ 第{i+1}次请求触发限流，返回429")
            break
        print(f"  请求{i+1}: {r.status_code}")
    else:
        print("✗ 未触发限流")
    
    Config.RATE_LIMIT_MAX_REQUESTS = original_limit
    Config.RATE_LIMIT_WINDOW = original_window

def test_https_cert():
    print("\n=== 测试HTTPS证书生成 ===")
    
    try:
        result = subprocess.run(
            ["python", "generate_cert.py"],
            capture_output=True,
            text=True,
            timeout=30
        )
        print(result.stdout)
        
        cert_path = "data/certs/cert.pem"
        key_path = "data/certs/key.pem"
        
        if os.path.exists(cert_path) and os.path.exists(key_path):
            print("✓ 证书生成成功")
            print(f"  证书: {cert_path}")
            print(f"  密钥: {key_path}")
        else:
            print("✗ 证书文件不存在")
    except Exception as e:
        print(f"✗ 证书生成失败: {e}")

def test_admin_api():
    print("\n=== 测试管理API ===")
    
    print("获取规则列表...")
    r = requests.get(f"{ADMIN_URL}/rules")
    if r.status_code == 200:
        rules = r.json()
        print(f"✓ 获取规则成功，共 {len(rules)} 条")
    
    print("获取日志...")
    r = requests.get(f"{ADMIN_URL}/logs?limit=5")
    if r.status_code == 200:
        logs = r.json()
        print(f"✓ 获取日志成功，共 {len(logs)} 条")
    
    print("测试清空缓存...")
    r = requests.delete(f"{ADMIN_URL}/cache")
    if r.status_code == 200:
        print("✓ 缓存清空成功")
    
    print("测试规则导出...")
    r = requests.get(f"{ADMIN_URL}/rules/export")
    if r.status_code == 200:
        print("✓ 规则导出成功")

def main():
    print("API代理高级功能测试")
    
    try:
        r = requests.get(f"{BASE_URL}/admin/api/rules")
        if r.status_code != 200:
            print("服务未正常响应")
            return
    except:
        print("无法连接到服务，请确保服务已启动")
        return
    
    test_cache()
    test_rate_limit()
    test_https_cert()
    test_admin_api()
    
    print("\n=== 所有高级测试完成 ===")

if __name__ == "__main__":
    main()
