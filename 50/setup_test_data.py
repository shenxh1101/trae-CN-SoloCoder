import urllib.request
import json
from datetime import datetime, timedelta

BASE = 'http://localhost:5001'

def create_task(username, title, desc, pri, status, due):
    try:
        data = json.dumps({
            "title": title, "description": desc, "priority": pri,
            "status": status, "due_date": due
        }).encode('utf-8')
        req = urllib.request.Request(
            f'{BASE}/api/tasks/{username}',
            data=data, headers={'Content-Type': 'application/json'}, method='POST'
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  错误: {e}")
        return None

yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
last_week = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
next_week = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

print("=== 创建demo用户测试数据 ===")
demo_tasks = [
    ("完成项目文档", "编写完整的用户手册和API文档", "high", "todo", next_week),
    ("修复登录Bug", "修复用户反馈的登录超时问题", "high", "in_progress", tomorrow),
    ("代码审查", "审查新功能的代码质量", "medium", "todo", next_week),
    ("更新依赖包", "升级第三方依赖到最新版本", "low", "todo", next_week),
    ("部署测试环境", "在测试服务器部署最新版本", "medium", "in_progress", next_week),
    ("单元测试", "为新功能编写单元测试", "high", "completed", yesterday),
    ("数据库优化", "优化慢查询SQL语句", "medium", "completed", last_week),
    ("紧急修复任务", "这是一个已过期的紧急任务！", "high", "todo", yesterday),
    ("搜索测试任务123", "用于测试搜索功能", "medium", "todo", next_week),
    ("UI设计评审", "评审新功能的UI设计方案", "medium", "todo", last_week),
]

for title, desc, pri, status, due in demo_tasks:
    result = create_task('demo', title, desc, pri, status, due)
    if result and result['success']:
        print(f"  ✓ {title}")

print("\n=== 创建user1用户测试数据 ===")
user1_tasks = [
    ("用户1的专属任务", "只有user1能看到这个任务", "high", "todo", next_week),
    ("用户1的第二个任务", "多用户数据隔离测试", "medium", "in_progress", tomorrow),
]
for title, desc, pri, status, due in user1_tasks:
    result = create_task('user1', title, desc, pri, status, due)
    if result and result['success']:
        print(f"  ✓ {title}")

print("\n=== user2用户不创建任务（用于对比） ===")

print("\n=== 验证数据 ===")
for u in ['demo', 'user1', 'user2']:
    try:
        with urllib.request.urlopen(f'{BASE}/api/stats/{u}') as resp:
            s = json.loads(resp.read().decode())['data']['stats']
            print(f"  {u}: 总{s['total']}个任务, 待办{s['byStatus']['todo']}, 进行中{s['byStatus']['in_progress']}, 已完成{s['byStatus']['completed']}, 过期{s['overdue']}")
    except Exception as e:
        print(f"  {u}: 错误 {e}")

print("\n=== 测试数据创建完成 ===")
print("\n浏览器测试地址:")
print("  demo用户:  http://localhost:5001/todo/demo")
print("  user1用户: http://localhost:5001/todo/user1")
print("  user2用户: http://localhost:5001/todo/user2")
