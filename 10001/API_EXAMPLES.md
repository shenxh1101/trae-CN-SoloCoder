# 分布式任务调度系统 - API 使用示例

## 基础信息

- **API 地址**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

---

## 1. 任务管理 API

### 1.1 创建一次性任务

```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "加法运算任务",
    "description": "计算两个数字的和",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_add",
    "parameters": {"a": 10, "b": 20},
    "timeout": 60,
    "max_retries": 3,
    "priority": 5
  }'
```

**响应示例:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "加法运算任务",
  "status": "pending",
  "task_type": "one_shot",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 1.2 创建周期性任务

```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "每5分钟执行的任务",
    "description": "周期性数据同步任务",
    "task_type": "periodic",
    "function_path": "app.sample_tasks.sample_echo",
    "cron_expression": "*/5 * * * *",
    "parameters": {"message": "Scheduled task executed!"},
    "timeout": 120,
    "max_retries": 3,
    "priority": 3
  }'
```

**Cron 表达式格式:**
```
* * * * *
| | | | |
| | | | +--- 星期 (0 - 6, 周日=0)
| | | +----- 月份 (1 - 12)
| | +------- 日期 (1 - 31)
| +--------- 小时 (0 - 23)
+----------- 分钟 (0 - 59)
```

**常用示例:**
- `* * * * *` - 每分钟
- `*/5 * * * *` - 每5分钟
- `0 * * * *` - 每小时
- `0 0 * * *` - 每天凌晨
- `0 9 * * 1-5` - 工作日早上9点

---

### 1.3 创建有依赖关系的任务

```bash
# 先创建任务 A
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "数据提取任务",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_add",
    "parameters": {"a": 1, "b": 2}
  }'

# 记录返回的任务ID，例如: task-a-id

# 创建任务 B，依赖任务 A 成功完成
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "数据处理任务",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_multiply",
    "parameters": {"a": 3, "b": 4},
    "dependencies": ["task-a-id"]
  }'
```

---

### 1.4 查询任务列表

```bash
# 获取所有任务
curl "http://localhost:8000/api/tasks"

# 分页获取任务
curl "http://localhost:8000/api/tasks?skip=0&limit=10"

# 按状态过滤
curl "http://localhost:8000/api/tasks?status=success"

# 按类型过滤
curl "http://localhost:8000/api/tasks?task_type=periodic"
```

---

### 1.5 查询任务详情

```bash
curl "http://localhost:8000/api/tasks/{task_id}"
```

---

### 1.6 查询任务状态

```bash
curl "http://localhost:8000/api/tasks/{task_id}/status"
```

**响应示例:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "last_execution_id": "exec-123",
  "last_execution_status": "success",
  "last_run_at": "2024-01-15T10:30:05Z",
  "next_run_at": "2024-01-15T10:35:00Z"
}
```

---

### 1.7 手动触发任务

```bash
curl -X POST "http://localhost:8000/api/tasks/{task_id}/trigger"
```

---

### 1.8 暂停任务

```bash
curl -X POST "http://localhost:8000/api/tasks/{task_id}/pause"
```

---

### 1.9 恢复任务

```bash
curl -X POST "http://localhost:8000/api/tasks/{task_id}/resume"
```

---

### 1.10 更新任务

```bash
curl -X PUT "http://localhost:8000/api/tasks/{task_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新后的任务名称",
    "cron_expression": "*/10 * * * *",
    "timeout": 300
  }'
```

---

### 1.11 删除任务

```bash
curl -X DELETE "http://localhost:8000/api/tasks/{task_id}"
```

---

## 2. 任务执行 API

### 2.1 获取任务执行历史

```bash
curl "http://localhost:8000/api/tasks/{task_id}/executions"
```

**响应示例:**
```json
[
  {
    "id": "exec-123",
    "task_id": "task-456",
    "status": "success",
    "worker_id": "worker1-12345",
    "start_time": "2024-01-15T10:30:00Z",
    "end_time": "2024-01-15T10:30:02Z",
    "result": {"status": "success", "result": 30},
    "retry_attempt": 0
  }
]
```

---

### 2.2 取消任务执行

```bash
curl -X POST "http://localhost:8000/api/tasks/executions/{execution_id}/cancel"
```

---

### 2.3 获取执行日志

```bash
# 获取所有日志
curl "http://localhost:8000/api/tasks/executions/{execution_id}/logs"

# 按级别过滤
curl "http://localhost:8000/api/tasks/executions/{execution_id}/logs?level=ERROR"

# 分页获取
curl "http://localhost:8000/api/tasks/executions/{execution_id}/logs?skip=0&limit=100"
```

**响应示例:**
```json
[
  {
    "id": 1,
    "execution_id": "exec-123",
    "level": "INFO",
    "message": "Starting task execution: 加法运算任务",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "execution_id": "exec-123",
    "level": "INFO",
    "message": "Task executed successfully: {'status': 'success', 'result': 30}",
    "timestamp": "2024-01-15T10:30:02Z"
  }
]
```

---

## 3. Worker 管理 API

### 3.1 获取所有 Worker

```bash
curl "http://localhost:8000/api/workers"
```

**响应示例:**
```json
[
  {
    "id": "worker-123",
    "name": "worker-1",
    "hostname": "worker-host-1",
    "pid": 12345,
    "status": "online",
    "queues": ["default"],
    "concurrency": 2,
    "last_heartbeat": "2024-01-15T10:30:00Z",
    "registered_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### 3.2 获取 Worker 健康状态

```bash
# 获取所有 Worker 健康状态
curl "http://localhost:8000/api/workers/health"

# 获取单个 Worker 健康状态
curl "http://localhost:8000/api/workers/{worker_id}/health"
```

**响应示例:**
```json
[
  {
    "worker_id": "worker-123",
    "status": "online",
    "is_healthy": true,
    "last_heartbeat": "2024-01-15T10:30:00Z",
    "heartbeat_age": 5.2
  }
]
```

---

### 3.3 清理过期 Worker

```bash
curl -X POST "http://localhost:8000/api/workers/cleanup"
```

---

## 4. 完整使用场景示例

### 场景1: 创建一个数据处理流水线

```bash
#!/bin/bash

# 1. 创建数据提取任务
echo "创建数据提取任务..."
TASK_EXTRACT=$(curl -s -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "数据提取",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_add",
    "parameters": {"a": 10, "b": 20},
    "timeout": 60
  }' | jq -r '.id')

echo "提取任务ID: $TASK_EXTRACT"

# 2. 创建数据转换任务（依赖提取任务）
echo "创建数据转换任务..."
TASK_TRANSFORM=$(curl -s -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "数据转换",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_multiply",
    "parameters": {"a": 2, "b": 3},
    "timeout": 120,
    "dependencies": ["'"$TASK_EXTRACT"'"]
  }' | jq -r '.id')

echo "转换任务ID: $TASK_TRANSFORM"

# 3. 等待任务完成
echo "等待任务执行..."
sleep 10

# 4. 查看执行状态
echo "提取任务状态:"
curl "http://localhost:8000/api/tasks/$TASK_EXTRACT/status" | jq .

echo "转换任务状态:"
curl "http://localhost:8000/api/tasks/$TASK_TRANSFORM/status" | jq .
```

---

### 场景2: 创建定时报表任务

```bash
# 创建每天凌晨2点执行的报表任务
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "每日销售报表",
    "description": "生成每日销售数据报表",
    "task_type": "periodic",
    "function_path": "app.sample_tasks.sample_echo",
    "cron_expression": "0 2 * * *",
    "parameters": {"message": "Generating daily sales report"},
    "timeout": 300,
    "max_retries": 3,
    "priority": 8
  }'
```

---

### 场景3: 测试重试机制

```bash
# 创建一个会失败的任务，观察重试行为
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "重试测试任务",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_failure",
    "parameters": {},
    "timeout": 30,
    "max_retries": 3
  }'

# 等待2分钟后查看执行历史，应该能看到3次重试记录
curl "http://localhost:8000/api/tasks/{task_id}/executions"
```

---

### 场景4: 测试超时机制

```bash
# 创建一个会超时的任务
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "超时测试任务",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_long_running_task",
    "parameters": {"duration": 120},
    "timeout": 10,
    "max_retries": 1
  }'

# 等待15秒后查看状态，应该显示 timeout
curl "http://localhost:8000/api/tasks/{task_id}/status"
```

---

## 5. Python API 调用示例

```python
import requests
import time

BASE_URL = "http://localhost:8000"

def create_task(name, function_path, params, task_type="one_shot", cron=None):
    task_data = {
        "name": name,
        "task_type": task_type,
        "function_path": function_path,
        "parameters": params,
        "timeout": 60,
        "max_retries": 3
    }
    if cron:
        task_data["cron_expression"] = cron
    
    response = requests.post(f"{BASE_URL}/api/tasks", json=task_data)
    return response.json()

def wait_for_task(task_id, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        response = requests.get(f"{BASE_URL}/api/tasks/{task_id}/status")
        status = response.json()
        if status["status"] in ["success", "failed", "timeout"]:
            return status
        time.sleep(2)
    return None

# 使用示例
if __name__ == "__main__":
    # 创建任务
    task = create_task(
        "Python API 测试任务",
        "app.sample_tasks.sample_add",
        {"a": 100, "b": 200}
    )
    print(f"创建任务: {task['id']}")
    
    # 等待完成
    status = wait_for_task(task["id"])
    print(f"任务状态: {status}")
    
    # 获取执行日志
    executions = requests.get(f"{BASE_URL}/api/tasks/{task['id']}/executions").json()
    if executions:
        logs = requests.get(f"{BASE_URL}/api/tasks/executions/{executions[0]['id']}/logs").json()
        print(f"日志数量: {len(logs)}")
```

---

## 6. 常见问题排查

### 任务没有执行
1. 检查 Worker 是否运行: `docker-compose ps worker-1 worker-2`
2. 检查 Worker 日志: `docker-compose logs -f worker-1`
3. 检查 Redis 是否正常: `docker-compose exec redis redis-cli ping`

### 定时任务没有触发
1. 检查调度器状态: `curl http://localhost:8000/health`
2. 确认 cron 表达式格式正确
3. 检查任务是否被暂停

### 依赖任务没有执行
1. 确认依赖任务已经成功完成
2. 查看执行日志中的依赖检查信息

### 任务总是失败
1. 检查 function_path 是否正确
2. 确认函数参数是否匹配
3. 查看执行日志中的错误详情
