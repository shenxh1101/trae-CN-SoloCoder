#!/usr/bin/env python3
import sys
import os

app_path = '/Users/mac/code/solo coder/178/app.py'

try:
    with open(app_path, 'r', encoding='utf-8') as f:
        source = f.read()
    compile(source, app_path, 'exec')
    print("✅ 语法验证成功！app.py 语法正确")
except SyntaxError as e:
    print(f"❌ 语法错误：{e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ 验证失败：{e}")
    sys.exit(1)

print("\n📋 检查依赖包安装情况：")
packages = [
    'flask',
    'flask_socketio',
    'apscheduler',
    'socketio',
    'eventlet'
]

for pkg in packages:
    try:
        __import__(pkg)
        print(f"  ✅ {pkg} 已安装")
    except ImportError:
        print(f"  ❌ {pkg} 未安装")
