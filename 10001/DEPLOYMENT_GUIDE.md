# 分布式任务调度系统 - 部署指南

## 环境限制说明

**当前沙箱环境限制（已确认）：**
- ❌ Docker 未安装
- ❌ 网络SSL证书问题，无法使用pip安装包
- ✅ Python 3.13.3 可用
- ✅ SQLite 内置可用
- ✅ Redis 已安装并运行（端口6379）

**因此，无法在当前环境执行：**
- `docker-compose up -d`
- `pip install -r requirements.txt`
- `python3 test_api.py`（需要requests库）

---

## 本地部署步骤

在支持Docker的本地环境执行以下步骤：

### 前置要求

```bash
# 必需软件
- Docker Desktop 24.0+ 或 Docker Engine 24.0+
- Docker Compose v2+
- Python 3.11+（可选，用于运行测试脚本）

# 检查安装
docker --version
docker compose version
python3 --version
```

### 一键部署

```bash
# 1. 进入项目目录
cd /path/to/10001

# 2. 启动所有服务（首次构建需要5-10分钟）
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 预期输出：
# NAME                    STATUS    PORTS
# task-scheduler-redis    Up        0.0.0.0:6379->6379/tcp
# task-scheduler-api      Up        0.0.0.0:8000->8000/tcp
# task-scheduler-worker-1 Up
# task-scheduler-worker-2 Up
```

### 等待服务就绪

```bash
# 等待30秒让所有服务完全启动
sleep 30

# 检查健康状态
curl http://localhost:8000/health

# 预期输出：
# {"status": "healthy", "scheduler_running": true}
```

### 运行功能测试

```bash
# 1. 安装测试依赖
pip3 install requests

# 2. 运行API测试
python3 test_api.py

# 3. 查看测试结果
# 预期：15/15 测试通过
```

### 访问API文档

```bash
# Swagger UI
open http://localhost:8000/docs

# ReDoc
open http://localhost:8000/redoc
```

---

## 常见问题排查

### 问题1: 服务启动失败

```bash
# 查看详细日志
docker-compose logs api
docker-compose logs worker-1

# 重启服务
docker-compose restart
```

### 问题2: Redis连接失败

```bash
# 检查Redis是否正常
docker-compose exec redis redis-cli ping

# 预期输出: PONG
```

### 问题3: 任务没有执行

```bash
# 查看Worker日志
docker-compose logs -f worker-1

# 检查任务状态
curl http://localhost:8000/api/tasks

# 查看调度器状态
curl http://localhost:8000/health
```

### 问题4: 依赖包安装失败

```bash
# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 或者升级pip
pip install --upgrade pip
```

---

## 手动功能验证步骤

如果测试脚本无法运行，可以手动执行以下验证：

### 验证1: 创建一次性任务

```bash
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "手动测试任务",
    "task_type": "one_shot",
    "function_path": "app.sample_tasks.sample_add",
    "parameters": {"a": 10, "b": 20}
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "任务ID: $TASK_ID"
```

### 验证2: 查询任务状态

```bash
# 等待5秒
sleep 5

curl "http://localhost:8000/api/tasks/$TASK_ID/status" | python3 -m json.tool

# 预期输出包含: "status": "success"
```

### 验证3: 查看执行日志

```bash
EXEC_ID=$(curl "http://localhost:8000/api/tasks/$TASK_ID/executions" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

curl "http://localhost:8000/api/tasks/executions/$EXEC_ID/logs" | python3 -m json.tool
```

### 验证4: 创建周期性任务

```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "每分钟执行任务",
    "task_type": "periodic",
    "function_path": "app.sample_tasks.sample_echo",
    "cron_expression": "* * * * *",
    "parameters": {"message": "Hello from cron!"}
  }' | python3 -m json.tool
```

### 验证5: Worker健康检查

```bash
curl "http://localhost:8000/api/workers/health" | python3 -m json.tool

# 预期输出包含2个健康的Worker
```

---

## 服务管理命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看所有服务状态
docker-compose ps

# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f api
docker-compose logs -f worker-1

# 重新构建镜像
docker-compose build

# 清理并重新开始
docker-compose down -v
docker-compose up -d --build
```

---

## 数据持久化

```bash
# 数据存储位置
./data/                  # SQLite数据库文件
./data/task_scheduler.db # 任务数据、执行记录、日志

# 备份数据
cp ./data/task_scheduler.db ./backup/task_scheduler_$(date +%Y%m%d).db

# 恢复数据
cp ./backup/task_scheduler_20240101.db ./data/task_scheduler.db
docker-compose restart
```

---

## 性能调优

### Worker并发数调整

修改 `docker-compose.yml`：

```yaml
worker-1:
  environment:
    - WORKER_CONCURRENCY=4  # 增加并发数
```

### 任务超时调整

在创建任务时指定：

```json
{
  "name": "长耗时任务",
  "timeout": 600,  # 10分钟超时
  "max_retries": 2
}
```

---

## 监控和告警

### 健康检查端点

```bash
# API健康检查
curl http://localhost:8000/health

# Worker健康检查
curl http://localhost:8000/api/workers/health
```

### 日志级别调整

修改 `app/main.py` 中的日志级别：

```python
logging.basicConfig(
    level=logging.DEBUG,  # 修改为 DEBUG 查看更详细日志
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
```

---

## 生产环境部署建议

1. **使用外部Redis服务**：替换为Redis Cluster或Sentinel
2. **数据库**：将SQLite替换为PostgreSQL或MySQL
3. **监控**：集成Prometheus + Grafana
4. **日志**：集成ELK Stack或Loki
5. **反向代理**：使用Nginx或Traefik
6. **HTTPS**：配置SSL证书
7. **认证**：添加API Key或OAuth2认证

---

## 下一步

部署完成后，建议执行：

1. ✅ 运行完整测试套件：`python3 test_api.py`
2. ✅ 验证所有核心功能（见上文手动验证步骤）
3. ✅ 备份初始数据库
4. ✅ 配置监控和告警
5. ✅ 阅读 [API_EXAMPLES.md](file:///Users/mac/Documents/10001/API_EXAMPLES.md) 了解更多使用场景
