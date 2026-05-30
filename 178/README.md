# 端口连通性测试工具 (Port Tester)

一个功能完善的Flask端口连通性测试工具，类似tcping，支持Web界面、批量测试、定时任务、实时告警等功能。

## 功能特性

- ✅ **单次端口测试**: 输入目标IP/域名和端口，返回连接状态和耗时
- ✅ **多端口支持**: 同时测试多个端口（如 80,443,22）
- ✅ **超时设置**: 自定义连接超时时间（默认3秒）
- ✅ **批量测试**: 上传文本文件批量测试多个目标端口
- ✅ **CSV导出**: 测试结果可导出为CSV文件
- ✅ **定时任务**: 支持cron表达式设置定时测试
- ✅ **测试历史**: 显示最近20次测试记录
- ✅ **REST API**: 提供JSON格式的API接口
- ✅ **图表展示**: 使用Chart.js展示响应时间折线图
- ✅ **趋势分析**: 显示24小时成功率百分比
- ✅ **实时告警**: WebSocket推送连续3次失败告警
- ✅ **日志记录**: 所有测试结果自动记录到日志文件

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动服务

```bash
python app.py
```

服务将在 `http://localhost:5000` 启动

## 使用说明

### Web界面

1. **单次测试**: 在"单次测试"标签页输入目标和端口，点击开始测试
2. **批量测试**: 在"批量测试"标签页上传测试文件（每行格式：`目标:端口`）
3. **定时任务**: 在"定时任务"标签页设置cron表达式
4. **图表分析**: 在"图表分析"标签页查看响应时间趋势

### 批量测试文件格式

创建一个文本文件，每行一个目标，格式如下：
```
google.com:80
google.com:443
192.168.1.1:22
baidu.com:80
```

### REST API 使用

**POST /api/test**

请求示例：
```bash
curl -X POST http://localhost:5000/api/test \
  -H "Content-Type: application/json" \
  -d '{"target": "google.com", "ports": "80,443", "timeout": 3}'
```

响应示例：
```json
{
  "results": [
    {
      "success": true,
      "target": "google.com",
      "port": 80,
      "latency_ms": 45.23,
      "error": null
    }
  ]
}
```

### Cron表达式说明

采用标准的5字段cron格式：
```
*    *    *    *    *
|    |    |    |    |
|    |    |    |    +--- 星期 (0-6, 0=周日)
|    |    |    +-------- 月份 (1-12)
|    |    +------------- 日期 (1-31)
|    +------------------ 小时 (0-23)
+----------------------- 分钟 (0-59)
```

常用示例：
- `0 * * * *` - 每小时整点执行
- `*/5 * * * *` - 每5分钟执行
- `0 9 * * 1-5` - 工作日早上9点执行
- `0 0 1 * *` - 每月1日零点执行

## 项目结构

```
.
├── app.py              # 主应用文件
├── requirements.txt    # Python依赖
├── templates/
│   └── index.html      # Web前端页面
└── logs/               # 日志目录（自动创建）
    ├── test_results.log    # 测试日志
    ├── test_history.json   # 历史记录
    └── scheduled_jobs.json # 定时任务配置
```

## 扩展邮件告警

如需启用邮件告警，修改 `app.py` 中的 `send_email_alert` 函数：

```python
def send_email_alert(target, port, fail_count):
    import smtplib
    from email.mime.text import MIMEText
    
    msg = MIMEText(f'告警: {target}:{port} 连续{fail_count}次失败!')
    msg['Subject'] = '端口测试告警'
    msg['From'] = 'alert@example.com'
    msg['To'] = 'admin@example.com'
    
    with smtplib.SMTP('smtp.example.com', 587) as s:
        s.starttls()
        s.login('username', 'password')
        s.send_message(msg)
```

## 技术栈

- **后端**: Flask + Flask-SocketIO + APScheduler
- **前端**: 原生JavaScript + Chart.js
- **实时通信**: Socket.IO
- **任务调度**: APScheduler (cron支持)

## License

MIT
