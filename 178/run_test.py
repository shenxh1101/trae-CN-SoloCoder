#!/usr/bin/env python3
import subprocess
import time
import requests
import os
import signal

def main():
    app_process = None
    try:
        print("=== 启动 Flask 应用 ===")
        env = os.environ.copy()
        app_process = subprocess.Popen(
            ['python3', 'app.py'],
            cwd='/Users/mac/code/solo coder/178',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env
        )
        
        print("等待 5 秒让应用启动...")
        time.sleep(5)
        
        print("\n=== 检查应用是否启动成功 ===")
        try:
            response = requests.get('http://localhost:5000', timeout=5)
            print(f"GET http://localhost:5000 - 状态码: {response.status_code}")
            print(f"响应内容预览: {response.text[:200]}...")
        except Exception as e:
            print(f"连接失败: {e}")
            return
        
        print("\n=== 测试 POST /api/test ===")
        try:
            json_data = {"target": "127.0.0.1", "ports": "80"}
            response = requests.post(
                'http://localhost:5000/api/test',
                json=json_data,
                timeout=10
            )
            print(f"POST http://localhost:5000/api/test - 状态码: {response.status_code}")
            print(f"响应内容: {response.json()}")
        except Exception as e:
            print(f"请求失败: {e}")
        
    finally:
        print("\n=== 停止应用 ===")
        if app_process:
            app_process.terminate()
            try:
                app_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                app_process.kill()
            print("应用已停止")

if __name__ == '__main__':
    main()
