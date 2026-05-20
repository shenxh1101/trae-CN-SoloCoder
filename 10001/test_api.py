#!/usr/bin/env python3
"""
分布式任务调度系统 - API 测试脚本
使用方法:
    1. 先启动服务: docker-compose up -d
    2. 等待服务就绪后运行: python test_api.py
"""

import requests
import time
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"


def print_separator(title=""):
    line = "=" * 60
    if title:
        print(f"\n{line}\n{title}\n{line}")
    else:
        print(f"\n{line}")


def test_health_check():
    """测试健康检查接口"""
    print_separator("1. 健康检查测试")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "健康检查失败"
        print("✓ 健康检查通过")
        return True
    except Exception as e:
        print(f"✗ 健康检查失败: {e}")
        return False


def test_create_one_shot_task():
    """测试创建一次性任务"""
    print_separator("2. 创建一次性任务测试")
    try:
        task_data = {
            "name": "测试加法任务",
            "description": "测试两个数字相加",
            "task_type": "one_shot",
            "function_path": "app.sample_tasks.sample_add",
            "parameters": {"a": 10, "b": 20},
            "timeout": 60,
            "max_retries": 3,
            "priority": 5
        }
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_data)
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "创建任务失败"
        assert "id" in result, "任务ID不存在"
        print("✓ 一次性任务创建成功")
        return result["id"]
    except Exception as e:
        print(f"✗ 创建任务失败: {e}")
        return None


def test_create_periodic_task():
    """测试创建周期性任务"""
    print_separator("3. 创建周期性任务测试")
    try:
        task_data = {
            "name": "测试定时任务",
            "description": "每分钟执行一次的测试任务",
            "task_type": "periodic",
            "function_path": "app.sample_tasks.sample_echo",
            "cron_expression": "* * * * *",
            "parameters": {"message": "Hello from periodic task!"},
            "timeout": 60,
            "max_retries": 3,
            "priority": 5
        }
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_data)
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "创建周期性任务失败"
        assert "next_run_at" in result, "下次执行时间不存在"
        print("✓ 周期性任务创建成功")
        return result["id"]
    except Exception as e:
        print(f"✗ 创建周期性任务失败: {e}")
        return None


def test_get_task_status(task_id):
    """测试查询任务状态"""
    print_separator("4. 查询任务状态测试")
    try:
        response = requests.get(f"{BASE_URL}/api/tasks/{task_id}/status")
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "查询任务状态失败"
        print("✓ 任务状态查询成功")
        return result
    except Exception as e:
        print(f"✗ 查询任务状态失败: {e}")
        return None


def test_list_tasks():
    """测试列出所有任务"""
    print_separator("5. 列出所有任务测试")
    try:
        response = requests.get(f"{BASE_URL}/api/tasks")
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"任务数量: {len(result)}")
        for task in result[:3]:
            print(f"  - {task['name']} ({task['id']}): {task['status']}")
        assert response.status_code == 200, "列出任务失败"
        print("✓ 任务列表查询成功")
        return result
    except Exception as e:
        print(f"✗ 列出任务失败: {e}")
        return None


def test_pause_and_resume_task(task_id):
    """测试暂停和恢复任务"""
    print_separator("6. 暂停/恢复任务测试")
    try:
        response = requests.post(f"{BASE_URL}/api/tasks/{task_id}/pause")
        print(f"暂停 - 状态码: {response.status_code}")
        print(f"暂停 - 响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "暂停任务失败"
        print("✓ 任务暂停成功")
        
        time.sleep(1)
        
        response = requests.post(f"{BASE_URL}/api/tasks/{task_id}/resume")
        print(f"恢复 - 状态码: {response.status_code}")
        print(f"恢复 - 响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "恢复任务失败"
        print("✓ 任务恢复成功")
        return True
    except Exception as e:
        print(f"✗ 暂停/恢复任务失败: {e}")
        return False


def test_task_dependencies():
    """测试任务依赖关系"""
    print_separator("7. 任务依赖关系测试")
    try:
        task_a_data = {
            "name": "任务A",
            "task_type": "one_shot",
            "function_path": "app.sample_tasks.sample_add",
            "parameters": {"a": 1, "b": 2},
            "timeout": 60,
            "max_retries": 3
        }
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_a_data)
        task_a_id = response.json()["id"]
        print(f"创建任务A: {task_a_id}")
        
        time.sleep(3)
        
        task_b_data = {
            "name": "任务B (依赖任务A)",
            "task_type": "one_shot",
            "function_path": "app.sample_tasks.sample_multiply",
            "parameters": {"a": 3, "b": 4},
            "timeout": 60,
            "max_retries": 3,
            "dependencies": [task_a_id]
        }
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_b_data)
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "创建依赖任务失败"
        assert result["dependencies"] == [task_a_id], "依赖关系设置错误"
        print("✓ 任务依赖关系创建成功")
        return task_a_id, result["id"]
    except Exception as e:
        print(f"✗ 任务依赖关系测试失败: {e}")
        return None, None


def test_get_task_executions(task_id):
    """测试获取任务执行历史"""
    print_separator("8. 获取任务执行历史测试")
    try:
        response = requests.get(f"{BASE_URL}/api/tasks/{task_id}/executions")
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"执行记录数量: {len(result)}")
        for exec in result[:3]:
            print(f"  - {exec['id']}: {exec['status']} (worker: {exec.get('worker_id', 'N/A')})")
        assert response.status_code == 200, "获取执行历史失败"
        print("✓ 任务执行历史查询成功")
        return result
    except Exception as e:
        print(f"✗ 获取执行历史失败: {e}")
        return None


def test_get_execution_logs(execution_id):
    """测试获取执行日志"""
    print_separator("9. 获取执行日志测试")
    try:
        response = requests.get(f"{BASE_URL}/api/tasks/executions/{execution_id}/logs")
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"日志数量: {len(result)}")
        for log in result[:5]:
            print(f"  [{log['level']}] {log['timestamp']}: {log['message'][:80]}...")
        assert response.status_code == 200, "获取执行日志失败"
        print("✓ 执行日志查询成功")
        return result
    except Exception as e:
        print(f"✗ 获取执行日志失败: {e}")
        return None


def test_worker_list():
    """测试获取Worker列表"""
    print_separator("10. 获取Worker列表测试")
    try:
        response = requests.get(f"{BASE_URL}/api/workers")
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"Worker数量: {len(result)}")
        for worker in result:
            print(f"  - {worker['name']} ({worker['id']}): {worker['status']}")
        assert response.status_code == 200, "获取Worker列表失败"
        print("✓ Worker列表查询成功")
        return result
    except Exception as e:
        print(f"✗ 获取Worker列表失败: {e}")
        return None


def test_worker_health():
    """测试Worker健康检查"""
    print_separator("11. Worker健康检查测试")
    try:
        response = requests.get(f"{BASE_URL}/api/workers/health")
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"Worker健康状态:")
        for health in result:
            print(f"  - {health['worker_id']}: {'健康' if health['is_healthy'] else '不健康'} "
                  f"(心跳年龄: {health['heartbeat_age']:.1f}s)")
        assert response.status_code == 200, "获取Worker健康状态失败"
        print("✓ Worker健康检查成功")
        return result
    except Exception as e:
        print(f"✗ 获取Worker健康状态失败: {e}")
        return None


def test_retry_mechanism():
    """测试重试机制"""
    print_separator("12. 重试机制测试")
    try:
        task_data = {
            "name": "测试重试任务",
            "description": "这个任务会失败并触发重试",
            "task_type": "one_shot",
            "function_path": "app.sample_tasks.sample_failure",
            "parameters": {},
            "timeout": 30,
            "max_retries": 3,
            "priority": 5
        }
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_data)
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"任务ID: {result['id']}")
        print("✓ 重试测试任务创建成功（等待重试...）")
        return result["id"]
    except Exception as e:
        print(f"✗ 创建重试测试任务失败: {e}")
        return None


def test_timeout_mechanism():
    """测试超时机制"""
    print_separator("13. 超时机制测试")
    try:
        task_data = {
            "name": "测试超时任务",
            "description": "这个任务会超时",
            "task_type": "one_shot",
            "function_path": "app.sample_tasks.sample_long_running_task",
            "parameters": {"duration": 120},
            "timeout": 10,
            "max_retries": 1,
            "priority": 5
        }
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_data)
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"任务ID: {result['id']}")
        print("✓ 超时测试任务创建成功（等待超时...）")
        return result["id"]
    except Exception as e:
        print(f"✗ 创建超时测试任务失败: {e}")
        return None


def test_trigger_task(task_id):
    """测试手动触发任务"""
    print_separator("14. 手动触发任务测试")
    try:
        response = requests.post(f"{BASE_URL}/api/tasks/{task_id}/trigger")
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "触发任务失败"
        print("✓ 任务手动触发成功")
        return result
    except Exception as e:
        print(f"✗ 触发任务失败: {e}")
        return None


def test_cancel_execution(execution_id):
    """测试取消任务执行"""
    print_separator("15. 取消任务执行测试")
    try:
        response = requests.post(f"{BASE_URL}/api/tasks/executions/{execution_id}/cancel")
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        assert response.status_code == 200, "取消执行失败"
        print("✓ 任务执行取消成功")
        return result
    except Exception as e:
        print(f"✗ 取消执行失败: {e}")
        return None


def wait_for_execution(task_id, timeout=30):
    """等待任务执行完成"""
    print(f"等待任务 {task_id} 执行...", end="", flush=True)
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"{BASE_URL}/api/tasks/{task_id}/executions")
            executions = response.json()
            if executions:
                latest = executions[0]
                if latest["status"] in ["success", "failed", "timeout", "dependency_failed", "cancelled"]:
                    print(f" 完成! 状态: {latest['status']}")
                    return latest
        except Exception as e:
            pass
        print(".", end="", flush=True)
        time.sleep(2)
    print(" 超时!")
    return None


def main():
    print("=" * 60)
    print("分布式任务调度系统 - API 测试套件")
    print("=" * 60)
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API地址: {BASE_URL}")
    
    test_results = {}
    
    if not test_health_check():
        print("\n✗ 健康检查失败，请确保服务已启动")
        print("请先运行: docker-compose up -d")
        return
    
    one_shot_task_id = test_create_one_shot_task()
    test_results["create_one_shot"] = one_shot_task_id is not None
    
    periodic_task_id = test_create_periodic_task()
    test_results["create_periodic"] = periodic_task_id is not None
    
    if one_shot_task_id:
        test_results["get_status"] = test_get_task_status(one_shot_task_id) is not None
    
    test_results["list_tasks"] = test_list_tasks() is not None
    
    if one_shot_task_id:
        test_results["pause_resume"] = test_pause_and_resume_task(one_shot_task_id)
    
    task_a_id, task_b_id = test_task_dependencies()
    test_results["dependencies"] = task_a_id is not None and task_b_id is not None
    
    print("\n等待任务执行完成...")
    time.sleep(5)
    
    if one_shot_task_id:
        executions = test_get_task_executions(one_shot_task_id)
        test_results["get_executions"] = executions is not None
        
        if executions:
            logs = test_get_execution_logs(executions[0]["id"])
            test_results["get_logs"] = logs is not None
    
    workers = test_worker_list()
    test_results["worker_list"] = workers is not None
    
    health = test_worker_health()
    test_results["worker_health"] = health is not None
    
    retry_task_id = test_retry_mechanism()
    test_results["retry_task"] = retry_task_id is not None
    
    timeout_task_id = test_timeout_mechanism()
    test_results["timeout_task"] = timeout_task_id is not None
    
    if periodic_task_id:
        trigger_result = test_trigger_task(periodic_task_id)
        test_results["trigger_task"] = trigger_result is not None
    
    print_separator("测试总结")
    passed = sum(1 for v in test_results.values() if v)
    total = len(test_results)
    print(f"通过: {passed}/{total}")
    for test_name, result in test_results.items():
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {test_name}: {status}")
    
    print(f"\n测试完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n提示:")
    print("- 重试和超时测试需要等待较长时间，可以单独查看结果")
    print("- 可以通过 http://localhost:8000/docs 查看完整的API文档")
    print("- 查看实时日志: docker-compose logs -f api worker-1 worker-2")


if __name__ == "__main__":
    main()
