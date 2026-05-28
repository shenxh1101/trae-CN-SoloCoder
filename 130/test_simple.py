#!/usr/bin/env python3
import requests
import time
import os
import sys

BASE_URL = "http://localhost:8888"
ADMIN_URL = f"{BASE_URL}/admin/api"

def test_ip_whitelist():
    print("\n=== 测试IP白名单 ===")
    
    rule = {
        "name": "IP测试",
        "source_path": "/ip-test",
        "target_url": "https://httpbin.org/ip",
        "enabled": True,
        "ip_whitelist": ["1.2.3.4"]
    }
    
    r = requests.post(f"{ADMIN_URL}/rules", json=rule)
    print(f"添加规则: {r.status_code}")
    
    r = requests.get(f"{BASE_URL}/ip-test")
    print(f"访问被拒绝 (预期403): {r.status_code}")
    if r.status_code == 403:
        print("✓ IP白名单生效")
    else:
        print("✗ IP白名单未生效")

def test_api_key():
    print("\n=== 测试API密钥 ===")
    
    rule = {
        "name": "API密钥测试",
        "source_path": "/key-test",
        "target_url": "https://httpbin.org/headers",
        "enabled": True,
        "api_key": "secret123"
    }
    
    r = requests.post(f"{ADMIN_URL}/rules", json=rule)
    print(f"添加规则: {r.status_code}")
    
    r = requests.get(f"{BASE_URL}/key-test")
    print(f"无密钥访问 (预期401): {r.status_code}")
    
    r = requests.get(f"{BASE_URL}/key-test", headers={"X-API-Key": "secret123"})
    print(f"正确密钥访问 (预期200): {r.status_code}")
    if r.status_code == 200:
        print("✓ API密钥验证生效")
    else:
        print("✗ API密钥验证未生效")

def test_response_modify():
    print("\n=== 测试响应体修改 ===")
    
    rule = {
        "name": "响应修改测试",
        "source_path": "/modify-test",
        "target_url": "https://httpbin.org/headers",
        "enabled": True,
        "response_replacements": [
            {"old": "httpbin.org", "new": "myproxy.local"}
        ]
    }
    
    r = requests.post(f"{ADMIN_URL}/rules", json=rule)
    print(f"添加规则: {r.status_code}")
    
    r = requests.get(f"{BASE_URL}/modify-test")
    print(f"状态码: {r.status_code}")
    
    if "myproxy.local" in r.text:
        print("✓ 响应体替换生效")
    else:
        print("✗ 响应体替换未生效")
        print(f"响应预览: {r.text[:200]}")

def test_load_balance():
    print("\n=== 测试负载均衡 ===")
    
    rule = {
        "name": "负载均衡测试",
        "source_path": "/lb-test",
        "target_url": "https://httpbin.org/anything/s1",
        "target_urls": [
            "https://httpbin.org/anything/s1",
            "https://httpbin.org/anything/s2",
            "https://httpbin.org/anything/s3"
        ],
        "enabled": True
    }
    
    r = requests.post(f"{ADMIN_URL}/rules", json=rule)
    print(f"添加规则: {r.status_code}")
    
    urls = []
    for i in range(4):
        r = requests.get(f"{BASE_URL}/lb-test")
        try:
            data = r.json()
            urls.append(data.get('url', ''))
            print(f"请求{i+1}: {urls[-1]}")
        except:
            print(f"请求{i+1}失败: {r.status_code}")
            print(f"响应: {r.text[:200]}")
    
    if len(set(urls[:3])) > 1:
        print("✓ 负载均衡轮询生效")
    else:
        print("✗ 负载均衡可能未生效")

def test_basic_proxy():
    print("\n=== 测试基础代理 ===")
    
    rule = {
        "name": "基础测试",
        "source_path": "/httpbin",
        "target_url": "https://httpbin.org",
        "enabled": True
    }
    
    r = requests.post(f"{ADMIN_URL}/rules", json=rule)
    print(f"添加规则: {r.status_code}")
    
    r = requests.get(f"{BASE_URL}/httpbin/get")
    print(f"GET请求: {r.status_code}")
    
    r = requests.post(f"{BASE_URL}/httpbin/post", json={"test": "data"})
    print(f"POST请求: {r.status_code}")
    
    if r.status_code == 200:
        print("✓ 基础代理功能正常")

def main():
    print("API代理服务功能测试")
    
    try:
        r = requests.get(f"{BASE_URL}/admin/api/rules")
        if r.status_code != 200:
            print("服务未正常响应")
            return
    except:
        print("无法连接到服务，请确保服务已启动")
        return
    
    test_basic_proxy()
    test_ip_whitelist()
    test_api_key()
    test_response_modify()
    test_load_balance()
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    main()
