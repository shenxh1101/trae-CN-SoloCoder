#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, init_app, socketio
import json

def main():
    print("=" * 60)
    print("Flask 应用端点测试")
    print("=" * 60)
    
    print("\n1. 初始化应用...")
    init_app()
    
    app.config['TESTING'] = True
    client = app.test_client()
    
    print("\n2. 测试 GET http://localhost:5000")
    print("-" * 40)
    try:
        response = client.get('/')
        print(f"状态码: {response.status_code}")
        print(f"响应类型: {response.content_type}")
        if response.status_code == 200:
            print("✓ 测试通过")
        else:
            print("✗ 测试失败")
    except Exception as e:
        print(f"错误: {e}")
        print("✗ 测试失败")
    
    print("\n3. 测试 POST http://localhost:5000/api/test")
    print("-" * 40)
    print("请求 JSON: {\"target\":\"127.0.0.1\", \"ports\":\"80\"}")
    try:
        response = client.post(
            '/api/test',
            json={"target": "127.0.0.1", "ports": "80"},
            content_type='application/json'
        )
        print(f"状态码: {response.status_code}")
        print(f"响应内容:")
        data = response.get_json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
        if response.status_code == 200:
            print("✓ 测试通过")
        else:
            print("✗ 测试失败")
    except Exception as e:
        print(f"错误: {e}")
        print("✗ 测试失败")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == '__main__':
    main()
