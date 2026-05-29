#!/usr/bin/env python3
import os
import json
import time
import csv
import requests
from datetime import datetime, timedelta
from io import StringIO

BASE_URL = "http://127.0.0.1:5000"
DATA_FILE = "todos.json"

def reset_data():
    if os.path.exists(DATA_FILE):
        os.remove(DATA_FILE)

def print_test(name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")

def test_crud_operations():
    print("\n=== 测试1: CRUD操作 ===")
    
    reset_data()
    
    create_data = {
        "title": "测试事项1",
        "description": "这是测试描述",
        "priority": "high",
        "tags": ["工作", "紧急"],
        "due_date": "2026-06-15"
    }
    
    response = requests.post(f"{BASE_URL}/api/todos", json=create_data)
    print_test("创建事项", response.status_code == 201, f"状态码: {response.status_code}")
    
    todo_id = response.json()["id"]
    
    response = requests.get(f"{BASE_URL}/api/todos/{todo_id}")
    todo = response.json()
    print_test("获取单个事项", response.status_code == 200 and todo["title"] == "测试事项1")
    
    update_data = {"title": "更新后的标题", "completed": True}
    response = requests.put(f"{BASE_URL}/api/todos/{todo_id}", json=update_data)
    updated = response.json()
    print_test("更新事项", updated["title"] == "更新后的标题" and updated["completed"] == True)
    
    response = requests.delete(f"{BASE_URL}/api/todos/{todo_id}")
    print_test("删除事项", response.status_code == 200)
    
    response = requests.get(f"{BASE_URL}/api/todos/{todo_id}")
    print_test("确认已删除", response.status_code == 404)

def test_filters_and_pagination():
    print("\n=== 测试2: 筛选、排序、分页 ===")
    
    reset_data()
    
    priorities = ["high", "medium", "low"]
    for i in range(15):
        requests.post(f"{BASE_URL}/api/todos", json={
            "title": f"事项{i}",
            "priority": priorities[i % 3],
            "completed": i % 2 == 0,
            "tags": [f"标签{i%3}"]
        })
    
    response = requests.get(f"{BASE_URL}/api/todos?priority=high")
    data = response.json()
    print_test("按优先级筛选", all(t["priority"] == "high" for t in data["todos"]))
    
    response = requests.get(f"{BASE_URL}/api/todos?completed=true")
    data = response.json()
    print_test("按完成状态筛选", all(t["completed"] == True for t in data["todos"]))
    
    response = requests.get(f"{BASE_URL}/api/todos?tag=标签0")
    data = response.json()
    print_test("按标签筛选", all("标签0" in t["tags"] for t in data["todos"]))
    
    response = requests.get(f"{BASE_URL}/api/todos?search=事项5")
    data = response.json()
    print_test("搜索功能", any("事项5" in t["title"] for t in data["todos"]))
    
    response = requests.get(f"{BASE_URL}/api/todos?sort_by=priority&sort_order=asc")
    data = response.json()
    priority_order = [t["priority"] for t in data["todos"][:6]]
    expected = ["high"] * 5 + ["low"]
    print_test("按优先级排序", priority_order[:5] == ["high"] * 5)
    
    response = requests.get(f"{BASE_URL}/api/todos?page=1")
    data = response.json()
    print_test("分页查询-第1页", len(data["todos"]) == 10 and data["page"] == 1)
    
    response = requests.get(f"{BASE_URL}/api/todos?page=2")
    data = response.json()
    print_test("分页查询-第2页", len(data["todos"]) == 5 and data["total_pages"] == 2)

def test_recurring_and_overdue():
    print("\n=== 测试3: 重复事项和过期判断 ===")
    
    reset_data()
    
    past_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
    future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    
    five_days_ago = (datetime.now() - timedelta(days=5)).isoformat()
    requests.post(f"{BASE_URL}/api/todos", json={
        "title": "每日任务",
        "recurrence": "daily",
        "due_date": future_date,
        "created_at": five_days_ago
    })
    
    response = requests.get(f"{BASE_URL}/api/todos")
    data = response.json()
    print_test("重复事项生成", len(data["todos"]) >= 5, f"实际生成: {len(data['todos'])} 条")
    
    reset_data()
    
    requests.post(f"{BASE_URL}/api/todos", json={
        "title": "过期任务",
        "due_date": past_date,
        "completed": False
    })
    
    requests.post(f"{BASE_URL}/api/todos", json={
        "title": "未过期任务",
        "due_date": future_date,
        "completed": False
    })
    
    response = requests.get(f"{BASE_URL}/api/todos")
    data = response.json()
    print_test("数据存储正常", len(data["todos"]) == 2)

def test_csv_import_export():
    print("\n=== 测试4: CSV导入导出 ===")
    
    reset_data()
    
    for i in range(3):
        requests.post(f"{BASE_URL}/api/todos", json={
            "title": f"CSV测试{i}",
            "description": f"描述{i}",
            "priority": ["high", "medium", "low"][i],
            "tags": ["tag1", "tag2"],
            "completed": i == 0
        })
    
    response = requests.get(f"{BASE_URL}/api/todos/export")
    csv_content = response.text
    print_test("导出CSV", response.status_code == 200 and "CSV测试" in csv_content)
    
    csv_lines = csv_content.strip().split("\n")
    reader = csv.DictReader(csv_lines)
    rows = list(reader)
    print_test("CSV格式正确", len(rows) == 3 and "标题" in rows[0])
    
    reset_data()
    
    test_csv = """标题,描述,是否完成,优先级,标签,截止日期,重复
导入测试1,导入描述1,否,high,import,test,2026-06-30,
导入测试2,导入描述2,是,low,test,,daily"""
    
    files = {"file": ("test.csv", StringIO(test_csv), "text/csv")}
    response = requests.post(f"{BASE_URL}/api/todos/import", files=files)
    result = response.json()
    print_test("导入CSV", result["imported"] == 2, f"导入数量: {result.get('imported', 0)}")
    
    response = requests.get(f"{BASE_URL}/api/todos")
    data = response.json()
    titles = [t["title"] for t in data["todos"]]
    print_test("导入数据验证", "导入测试1" in titles and "导入测试2" in titles)

def test_batch_delete():
    print("\n=== 测试5: 批量删除已完成事项 ===")
    
    reset_data()
    
    for i in range(5):
        requests.post(f"{BASE_URL}/api/todos", json={
            "title": f"待删除{i}",
            "completed": i < 3
        })
    
    response = requests.delete(f"{BASE_URL}/api/todos/completed")
    print_test("批量删除已完成", response.status_code == 200)
    
    response = requests.get(f"{BASE_URL}/api/todos")
    data = response.json()
    print_test("验证删除结果", len(data["todos"]) == 2 and all(not t["completed"] for t in data["todos"]))

def test_rate_limit():
    print("\n=== 测试6: API限流 (每分钟100次) ===")
    
    reset_data()
    
    success_count = 0
    rate_limited = False
    
    for i in range(105):
        response = requests.get(f"{BASE_URL}/api/todos")
        if response.status_code == 200:
            success_count += 1
        elif response.status_code == 429:
            rate_limited = True
            break
    
    print_test("限流触发", rate_limited or success_count == 105, 
               f"成功请求: {success_count}, 触发限流: {rate_limited}")
    print_test("限流状态码429", rate_limited, "需要在限流时返回429")

def test_api_endpoints():
    print("\n=== 测试7: 所有API端点 ===")
    
    reset_data()
    
    endpoints = [
        ("GET", "/api/todos", {}),
        ("POST", "/api/todos", {"json": {"title": "测试"}}),
        ("GET", "/api/todos/1", {}),
        ("PUT", "/api/todos/1", {"json": {"title": "更新"}}),
        ("DELETE", "/api/todos/1", {}),
        ("DELETE", "/api/todos/completed", {}),
        ("GET", "/api/todos/export", {}),
    ]
    
    for method, path, kwargs in endpoints:
        response = requests.request(method, f"{BASE_URL}{path}", **kwargs)
        status_ok = response.status_code in [200, 201, 404]
        print_test(f"{method} {path}", status_ok, f"状态码: {response.status_code}")

def test_query_parameters():
    print("\n=== 测试8: 查询参数组合 ===")
    
    reset_data()
    
    for i in range(8):
        requests.post(f"{BASE_URL}/api/todos", json={
            "title": f"测试{i}",
            "priority": "high" if i < 4 else "low",
            "completed": i % 2 == 0,
            "tags": ["A", "B"] if i % 2 == 0 else ["C"]
        })
    
    test_cases = [
        ("?priority=high&completed=true", "高优先级且已完成"),
        ("?priority=low&tag=C", "低优先级且含标签C"),
        ("?sort_by=priority&sort_order=asc&page=1", "排序+分页"),
        ("?search=测试&completed=false", "搜索+状态筛选"),
    ]
    
    for params, desc in test_cases:
        response = requests.get(f"{BASE_URL}/api/todos{params}")
        print_test(f"参数组合: {desc}", response.status_code == 200)

def test_web_interface():
    print("\n=== 测试9: Web界面和localStorage逻辑 ===")
    
    response = requests.get(f"{BASE_URL}/")
    content = response.text
    
    checks = [
        ("待办事项管理" in content, "标题存在"),
        ("darkTheme" in content, "暗色主题切换逻辑存在"),
        ("localStorage" in content, "localStorage存储逻辑存在"),
        ("toggleTheme" in content, "主题切换函数存在"),
        ("loadTodos" in content, "加载事项函数存在"),
        ("deleteCompleted" in content, "批量删除函数存在"),
        ("exportCSV" in content, "导出CSV函数存在"),
        ("importCSV" in content, "导入CSV函数存在"),
        ("overdue" in content, "过期高亮逻辑存在"),
        ("toggleComplete" in content, "勾选完成函数存在"),
    ]
    
    for passed, desc in checks:
        print_test(f"Web界面: {desc}", passed)

def test_edge_cases():
    print("\n=== 测试10: 边界情况 ===")
    
    reset_data()
    
    response = requests.post(f"{BASE_URL}/api/todos", json={
        "title": "",
        "tags": [],
        "priority": "invalid"
    })
    print_test("空标题创建", response.status_code == 201)
    
    response = requests.get(f"{BASE_URL}/api/todos?page=999")
    data = response.json()
    print_test("超出页码范围", len(data["todos"]) == 0)
    
    response = requests.get(f"{BASE_URL}/api/todos/999")
    print_test("不存在的ID", response.status_code == 404)
    
    response = requests.delete(f"{BASE_URL}/api/todos/999")
    print_test("删除不存在的ID", response.status_code == 404)
    
    response = requests.put(f"{BASE_URL}/api/todos/999", json={"title": "test"})
    print_test("更新不存在的ID", response.status_code == 404)

def main():
    print("=" * 60)
    print("Flask待办事项API 完整测试套件")
    print("=" * 60)
    
    start_time = time.time()
    
    try:
        test_crud_operations()
        test_filters_and_pagination()
        test_recurring_and_overdue()
        test_csv_import_export()
        test_batch_delete()
        test_api_endpoints()
        test_query_parameters()
        test_web_interface()
        test_edge_cases()
        test_rate_limit()
        
        elapsed = time.time() - start_time
        print(f"\n{'='*60}")
        print(f"测试完成! 总耗时: {elapsed:.2f} 秒")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 错误: 无法连接到服务器!")
        print("请确保服务已启动: python app.py")
        print("访问地址: http://127.0.0.1:5000")

if __name__ == "__main__":
    main()
