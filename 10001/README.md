# 分布式任务调度系统

一个基于 Python FastAPI + Celery + Redis + SQLite 的纯后端分布式任务调度系统。

## 功能特性

- **任务周期性调度**：支持 cron 表达式配置定时任务
- **任务依赖关系**：支持任务间的依赖关系（A完成才能执行B）
- **任务重试机制**：任务失败后最多自动重试3次（可配置）
- **任务超时控制**：支持为每个任务设置超时时间
- **API 接口**：
  - 创建任务（一次性/周期性）
  - 取消任务执行
  - 查询任务状态
  - 暂停/恢复定时任务
  - 任务执行日志查询
- **Worker 管理**：
  - 支持注册多个 Worker 节点
  - Worker 健康状态检查
  - 心跳检测机制
- **日志持久化**：所有任务执行日志持久化存储并提供查询接口

## 技术栈

- **FastAPI**：API 服务框架
- **Celery**：分布式任务队列
- **Redis**：消息代理和结果存储
- **SQLite**：元数据持久化存储
- **SQLAlchemy**：ORM 框架
- **Pydantic**：数据验证

## 快速开始

### Docker Compose 一键启动

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down
```

启动后访问：
- API 文档：http://localhost:8000/docs
- API 根路径：http://localhost:8000/

### 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 启动 Redis
redis-server

# 启动 API 服务
uvicorn app.main:app --reload

# 启动 Worker（另开终端）
celery -A app.celery_app worker --loglevel=info

# 启动 Beat（用于定时任务，另开终端）
celery -A app.celery_app beat --loglevel=info
```

## API 接口示例

### 1. 创建一次性任务

```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "加法任务",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_add",
    "parameters": {"a": 10, "b": 20},
    "timeout": 60,
    "max_retries": 3
  }'
```

### 2. 创建周期性任务

```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "每5分钟执行的任务",
    "task_type": "periodic",
    "function_path": "app.sample_tasks.sample_echo",
    "cron_expression": "*/5 * * * *",
    "parameters": {"message": "Hello, World!"},
    "timeout": 60,
    "max_retries": 3
  }'
```

### 3. 创建有依赖的任务

```bash
# 先创建任务 A
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "任务A",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_add",
    "parameters": {"a": 1, "b": 2}
  }'

# 记录返回的任务 ID，假设为 task-a-id

# 创建任务 B，依赖任务 A
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "任务B",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_multiply",
    "parameters": {"a": 3, "b": 4},
    "dependencies": ["task-a-id"]
  }'
```

### 4. 查询任务状态

```bash
curl "http://localhost:8000/api/tasks/{task_id}/status"
```

### 5. 暂停/恢复任务

```bash
# 暂停任务
curl -X POST "http://localhost:8000/api/tasks/{task_id}/pause"

# 恢复任务
curl -X POST "http://localhost:8000/api/tasks/{task_id}/resume"
```

### 6. 取消任务执行

```bash
curl -X POST "http://localhost:8000/api/tasks/executions/{execution_id}/cancel"
```

### 7. 查看任务执行日志

```bash
curl "http://localhost:8000/api/tasks/executions/{execution_id}/logs"
```

### 8. 查看 Worker 状态

```bash
# 查看所有 Worker
curl "http://localhost:8000/api/workers"

# 查看 Worker 健康状态
curl "http://localhost:8000/api/workers/health"
```

## Cron 表达式格式

```
* * * * * *
| | | | | |
| | | | | +--- 星期 (0 - 6) (周日=0)
| | | | +----- 月份 (1 - 12)
| | | +------- 日期 (1 - 31)
| | +--------- 小时 (0 - 23)
| +----------- 分钟 (0 - 59)
+------------- 秒 (0 - 59) [可选]
```

常用示例：
- `* * * * *`：每分钟执行
- `*/5 * * * *`：每5分钟执行
- `0 * * * *`：每小时整点执行
- `0 0 * * *`：每天凌晨执行
- `0 9 * * 1-5`：工作日早上9点执行

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── config.py              # 配置文件
│   ├── database.py            # 数据库连接
│   ├── models.py              # 数据模型
│   ├── schemas.py             # Pydantic 模式
│   ├── main.py                # FastAPI 主应用
│   ├── celery_app.py          # Celery 配置
│   ├── tasks.py               # Celery 任务定义
│   ├── scheduler.py           # 调度核心逻辑
│   ├── scheduler_service.py   # 调度服务
│   ├── worker_manager.py      # Worker 管理
│   ├── worker_entry.py        # Worker 入口
│   ├── sample_tasks.py        # 示例任务
│   └── routers/
│       ├── __init__.py
│       ├── tasks.py           # 任务 API 路由
│       └── workers.py         # Worker API 路由
├── worker_runner.py           # Worker 启动脚本
├── requirements.txt           # Python 依赖
├── Dockerfile                 # Docker 镜像构建
├── docker-compose.yml         # Docker Compose 配置
├── .env.example               # 环境变量示例
└── README.md                  # 项目文档
```

## 配置说明

主要配置项（可通过环境变量修改）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| REDIS_HOST | redis | Redis 主机地址 |
| REDIS_PORT | 6379 | Redis 端口 |
| CELERY_BROKER_URL | redis://redis:6379/0 | Celery 消息代理 |
| CELERY_RESULT_BACKEND | redis://redis:6379/0 | Celery 结果存储 |
| SQLALCHEMY_DATABASE_URL | sqlite:///data/task_scheduler.db | 数据库连接 |
| MAX_RETRIES | 3 | 最大重试次数 |
| DEFAULT_TIMEOUT | 300 | 默认超时时间（秒） |
| WORKER_HEARTBEAT_INTERVAL | 10 | Worker 心跳间隔（秒） |
| WORKER_HEARTBEAT_TIMEOUT | 30 | Worker 心跳超时（秒） |

## 自定义任务

要添加自定义任务，只需在任意 Python 文件中定义函数，并通过 API 注册：

```python
# my_tasks.py
def my_custom_task(param1, param2):
    result = do_something(param1, param2)
    return {"result": result}
```

然后通过 API 创建任务：

```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的自定义任务",
    "task_type": "one_shot",
    "function_path": "my_tasks.my_custom_task",
    "parameters": {"param1": "value1", "param2": "value2"}
  }'
```

## 故障排查

### 任务没有执行
1. 检查 Worker 是否运行：`docker-compose ps worker-1`
2. 检查 Worker 日志：`docker-compose logs -f worker-1`
3. 检查 Redis 是否正常：`docker-compose ps redis`

### 定时任务没有触发
1. 检查 Scheduler 是否运行：访问 `http://localhost:8000/health`
2. 确认 cron 表达式是否正确
3. 检查任务是否被暂停

### 依赖任务没有执行
1. 确认依赖任务已经成功完成
2. 检查 API 返回的依赖关系是否正确设置
