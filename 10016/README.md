# 网站监控告警系统

一个基于 Python asyncio + aiohttp 的高性能网站监控告警系统，支持并发检查、多通道告警通知和统计分析。

## ✨ 功能特性

- **并发监控**：使用 `asyncio` + `aiohttp` 实现异步并发检查，高效监控多个网站
- **灵活配置**：每个网站独立配置 URL、预期状态码、响应时间阈值、检查间隔
- **智能告警**：连续失败 N 次（默认 3 次）触发告警，恢复自动通知，支持告警冷却
- **多通道通知**：
  - 控制台输出（默认启用）
  - 邮件通知（SMTP）
  - 钉钉机器人 Webhook（支持加签安全机制）
- **统计分析**：可用性百分比、平均/最小/最大响应时间、成功/失败次数统计
- **优雅退出**：处理 SIGTERM/SIGINT 信号，正常保存日志并输出最终统计
- **日志管理**：按天轮转，自动保留指定天数日志
- **彩色输出**：控制台日志彩色显示，清晰区分不同级别

## 📦 安装

### 环境要求
- Python 3.8+

### 安装依赖
```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

## 🚀 快速开始

### 1. 配置监控网站

编辑 `config.yaml` 文件：

```yaml
websites:
  - name: "Google"
    url: "https://www.google.com"
    expected_status: 200
    max_response_time: 3
    interval: 30

  - name: "GitHub"
    url: "https://github.com"
    expected_status: 200
    max_response_time: 5
    interval: 60

failure_threshold: 3

notifications:
  console:
    enabled: true

  email:
    enabled: false
    smtp_host: "smtp.example.com"
    smtp_port: 587
    smtp_username: "your_email@example.com"
    smtp_password: "your_password"
    use_tls: true
    from_addr: "your_email@example.com"
    to_addrs:
      - "admin@example.com"

  webhook:
    enabled: false
    url: "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"
    type: "dingtalk"
    secret: "YOUR_SECRET"

logging:
  log_file: "monitor.log"
  log_level: "INFO"
  retention_days: 30

stats:
  output_interval: 3600
```

### 2. 启动监控

```bash
# 使用默认配置
python main.py

# 指定配置文件
python main.py -c your_config.yaml
```

### 3. 查看统计报告

```bash
# 查看最近 24 小时的统计报告
python main.py --stats 24

# 查看最近 1 小时的统计报告
python main.py --stats 1
```

## 📖 配置说明

### 网站配置（websites）

| 参数 | 类型 | 说明 |
|------|------|------|
| name | string | 网站名称，用于标识 |
| url | string | 要监控的 URL（支持 HTTP/HTTPS） |
| expected_status | int | 预期的 HTTP 状态码（如 200） |
| max_response_time | float | 最大响应时间阈值（秒） |
| interval | int | 检查间隔（秒） |

### 通知配置（notifications）

#### 控制台通知
- `enabled`：是否启用控制台通知（默认 true）

#### 邮件通知
- `enabled`：是否启用邮件通知
- `smtp_host`：SMTP 服务器地址
- `smtp_port`：SMTP 端口（通常 25/465/587）
- `smtp_username`：SMTP 用户名
- `smtp_password`：SMTP 密码
- `use_tls`：是否使用 TLS 加密
- `from_addr`：发件人邮箱
- `to_addrs`：收件人邮箱列表

#### Webhook 通知（钉钉）
- `enabled`：是否启用 Webhook 通知
- `url`：Webhook URL
- `type`：Webhook 类型（目前支持 dingtalk）
- `secret`：钉钉机器人加签密钥（可选）

### 日志配置（logging）
- `log_file`：日志文件路径
- `log_level`：日志级别（DEBUG/INFO/WARNING/ERROR/CRITICAL）
- `retention_days`：日志保留天数

### 统计配置（stats）
- `output_interval`：统计报告输出间隔（秒）

## 🧪 运行测试

```bash
# 运行所有单元测试
python -m unittest test_monitor.py -v

# 运行指定测试类
python -m unittest test_monitor.TestNotifier -v

# 运行指定测试方法
python -m unittest test_monitor.TestNotifier.test_format_alert_message_failure -v
```

## 📊 项目结构

```
.
├── main.py              # 主入口程序
├── config.py            # 配置加载模块
├── monitor.py           # 核心监控逻辑
├── notifier.py          # 告警通知模块
├── stats.py             # 统计和日志模块
├── test_monitor.py      # 单元测试
├── config.yaml          # 配置文件示例
├── requirements.txt     # Python 依赖
└── README.md            # 项目文档
```

## 🎯 核心模块说明

### config.py
- 使用 dataclass 定义配置结构
- 支持从 YAML 文件加载配置
- 提供类型安全的配置访问

### monitor.py
- `WebsiteMonitor` 类：监控主类
- `check_website()`：异步检查单个网站
- `monitor_website()`：单个网站的监控循环
- `_process_result()`：处理检查结果，触发告警逻辑

### notifier.py
- `Notifier` 类：通知管理类
- 支持多通道并行通知
- 告警冷却机制，避免重复告警
- 钉钉机器人加签支持

### stats.py
- `CheckResult`：检查结果数据结构
- `WebsiteStats`：单个网站统计
- `StatsManager`：统计管理类
- `ProgressBar`：进度条工具类
- `ColorFormatter`：彩色日志格式化器

## 🔧 高级用法

### 自定义告警阈值
```yaml
failure_threshold: 5  # 连续失败 5 次才告警
```

### 配置多个通知渠道
```yaml
notifications:
  console:
    enabled: true
  email:
    enabled: true
    # ... 邮件配置
  webhook:
    enabled: true
    # ... Webhook 配置
```

### 调整日志级别
```yaml
logging:
  log_level: "DEBUG"  # 调试模式，输出更多信息
```

## 📝 日志格式

日志输出格式：
```
2026-05-20 10:30:00 | INFO     | ✓ Google          | 状态:   200 | 耗时:    0.25s | 成功
2026-05-20 10:30:05 | WARNING  | ✗ Example         | 状态:   500 | 耗时:    2.15s | 失败 | 状态码异常
```

日志级别颜色：
- DEBUG：青色
- INFO：绿色
- WARNING：黄色
- ERROR：红色
- CRITICAL：红底白字

## 🐛 常见问题

### Q: 如何添加新的监控网站？
A: 编辑 `config.yaml`，在 `websites` 列表中添加新的网站配置即可。

### Q: 如何暂时禁用某个通知渠道？
A: 将对应通知渠道的 `enabled` 设置为 `false`。

### Q: 钉钉机器人收不到消息怎么办？
A: 
1. 检查 Webhook URL 和 secret 是否正确
2. 确认服务器 IP 是否在钉钉机器人的白名单中
3. 查看日志中是否有 Webhook 发送失败的错误信息

### Q: 如何修改告警触发的失败次数？
A: 修改 `failure_threshold` 配置项，默认为 3 次。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
