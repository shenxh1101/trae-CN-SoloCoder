# Task Executor - 命令行任务执行工具

一个功能丰富的Python命令行任务执行工具，用于定义和执行自定义任务脚本。

## 功能特性

- ✅ **任务管理**：创建、编辑、删除和列出任务
- ✅ **执行模式**：支持串行和并行执行
- ✅ **实时输出**：命令执行时实时显示输出
- ✅ **失败处理**：失败时可选择停止或继续执行
- ✅ **依赖管理**：任务间依赖，自动按顺序执行
- ✅ **任务组**：将多个任务组合，一键执行
- ✅ **定时任务**：支持Cron表达式的定时执行
- ✅ **执行日志**：记录每次执行的详细信息
- ✅ **导入导出**：支持JSON格式的配置导入导出
- ✅ **参数化任务**：支持${param}形式的参数替换
- ✅ **执行统计**：显示成功/失败次数和总耗时
- ✅ **环境变量**：为任务设置独立的环境变量
- ✅ **备份功能**：执行前自动备份指定文件或目录

## 项目结构

```
task_executor/
├── __init__.py          # 包初始化
├── models.py            # 数据模型定义
├── task_manager.py      # 任务管理器
├── executor.py          # 任务执行引擎
├── scheduler.py         # 定时任务调度器
└── cli.py               # 命令行接口
main.py                  # 程序入口
test_demo.py             # 测试用例
```

## 快速开始

### 查看帮助

```bash
python main.py --help
python main.py task --help
```

### 任务管理

#### 添加任务

```bash
# 简单任务
python main.py task add --name "build" --commands "npm install" "npm run build" --working-dir "./project"

# 带参数的任务
python main.py task add --name "deploy" --commands "echo 'Deploying ${env}'" "scp build/ server:/var/www/${env}"

# 并行执行任务
python main.py task add --name "test-parallel" --commands "echo 'A'" "echo 'B'" "echo 'C'" --mode parallel

# 带备份的任务
python main.py task add --name "deploy-safe" --commands "rm -rf /data/*" "cp new/* /data/" --backup "/data/config.json" "/data/database.db"

# 带环境变量的任务
python main.py task add --name "custom-env" --commands "echo $APP_ENV" --env APP_ENV=production

# 带依赖的任务
python main.py task add --name "full-deploy" --commands "echo 'Deploy complete!'" --deps build test
```

#### 列出任务

```bash
python main.py task list
python main.py task list --verbose
```

#### 查看任务详情

```bash
python main.py task show --name build
```

#### 编辑任务

```bash
python main.py task edit --name build --commands "yarn install" "yarn build"
```

#### 删除任务

```bash
python main.py task delete --name old-task
```

### 执行任务

```bash
# 执行任务
python main.py task run --name build

# 执行时传入参数
python main.py task run --name deploy --params env=production

# 不执行依赖
python main.py task run --name build --no-deps
```

### 任务组管理

```bash
# 创建任务组
python main.py group add --name "pipeline" --tasks lint test build deploy --description "完整CI/CD流水线"

# 列出任务组
python main.py group list

# 执行任务组
python main.py group run --name pipeline

# 删除任务组
python main.py group delete --name pipeline
```

### 定时任务

```bash
# 添加定时任务（每分钟执行一次）
python main.py schedule add --task backup --cron "* * * * *"

# 每天凌晨2点执行
python main.py schedule add --task cleanup --cron "0 2 * * *"

# 每周一早上9点执行
python main.py schedule add --task weekly-report --cron "0 9 * * 1"

# 列出定时任务
python main.py schedule list

# 启动调度器
python main.py schedule start

# 执行一次定时检查
python main.py schedule start --once

# 删除定时任务
python main.py schedule delete --name "backup_* * * * *"
```

### Cron表达式格式

```
* * * * *
│ │ │ │ │
│ │ │ │ └── 星期 (0-6, 0=周日)
│ │ │ └──── 月份 (1-12)
│ │ └────── 日期 (1-31)
│ └──────── 小时 (0-23)
└────────── 分钟 (0-59)
```

### 日志和统计

```bash
# 查看执行日志
python main.py log
python main.py log --task build
python main.py log --full
python main.py log --limit 10

# 查看执行统计
python main.py stats
python main.py stats --task build
```

### 导入导出

```bash
# 导出所有配置
python main.py export --file tasks.json

# 导出指定任务
python main.py export --file selected_tasks.json --tasks build deploy

# 导入配置
python main.py import --file tasks.json

# 导入并覆盖已存在的任务
python main.py import --file tasks.json --overwrite
```

## 作为Python库使用

```python
from task_executor import TaskManager, TaskExecutor, Task, ExecutionMode, OnFailure

# 初始化管理器
manager = TaskManager(data_dir="~/.task_executor")

# 创建任务
task = Task(
    name="my-task",
    commands=["echo 'Hello World'", "ls -la"],
    working_dir=".",
    execution_mode=ExecutionMode.SEQUENTIAL,
    on_failure=OnFailure.STOP,
    env_vars={"MY_VAR": "value"},
    parameters={"date": "2024-01-01"}
)
manager.add_task(task)

# 执行任务
executor = TaskExecutor(manager)
log = executor.execute_task("my-task", parameters={"date": "2024-12-31"})
print(f"状态: {log.status}")
print(f"输出: {log.output}")
```

## 数据存储位置

所有数据默认存储在 `~/.task_executor/` 目录下：

- `tasks.json` - 任务配置
- `groups.json` - 任务组配置
- `schedules.json` - 定时任务配置
- `logs.json` - 执行日志
- `stats.json` - 执行统计
- `backups/` - 备份文件目录

## 运行测试

```bash
python test_demo.py
```

## 许可证

MIT License
