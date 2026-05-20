# 短链接服务

一个基于 Go + Gin + Redis + SQLite 的短链接生成服务。

## 功能特性

- 生成6位随机字符短码
- 支持自定义短码（6-10位字母数字字符）
- 访问短链接301重定向到原URL
- 统计访问次数、独立IP数、最近24小时访问趋势
- API接口：生成、更新、删除、获取统计
- 限流保护：每个IP每分钟最多生成10个短链接
- 访问日志写入SQLite
- 定时清理任务：自动清理30天前的访问日志

## 技术栈

- Go 1.21+
- Gin Web框架
- Redis（缓存和限流）
- SQLite（持久化存储）
- GORM（ORM）
- robfig/cron（定时任务）

## 快速开始

### 前置要求

- Go 1.21+
- Redis 6.0+

### 安装依赖

```bash
go mod tidy
```

### 运行

```bash
go run main.go
```

服务默认在 `http://localhost:8080` 启动。

## API 接口

### 1. 生成短链接

**POST** `/api/shorten`

请求体：
```json
{
  "url": "https://example.com/very/long/url",
  "custom_code": "mycode"
}
```

- `url` (必填): 原始URL
- `custom_code` (可选): 自定义短码（6-10位字母数字）

响应：
```json
{
  "short_code": "abc123",
  "original_url": "https://example.com/very/long/url",
  "short_url": "localhost:8080/abc123"
}
```

### 2. 更新短链接目标URL

**PUT** `/api/:code`

请求体：
```json
{
  "url": "https://newexample.com"
}
```

### 3. 删除短链接

**DELETE** `/api/:code`

### 4. 获取统计数据

**GET** `/api/:code/stats`

响应：
```json
{
  "short_code": "abc123",
  "total_visits": 100,
  "unique_ips": 50,
  "last_24h_trend": {
    "2024-01-01 10:00": 5,
    "2024-01-01 11:00": 8
  }
}
```

### 5. 访问短链接

**GET** `/:code`

301重定向到原始URL。

## 配置

可以在 `config/config.go` 中修改配置：

- `ServerPort`: 服务端口
- `RedisAddr`: Redis地址
- `SQLitePath`: SQLite数据库文件路径
- `RateLimit`: 每分钟限流数量
- `LogRetentionDays`: 日志保留天数
- `ShortCodeLength`: 随机短码长度

## 项目结构

```
├── main.go                 # 应用入口
├── config/
│   └── config.go          # 配置管理
├── internal/
│   ├── handler/           # HTTP处理器
│   ├── service/           # 业务逻辑
│   ├── repository/        # 数据访问层
│   ├── model/             # 数据模型
│   └── middleware/        # 中间件
└── pkg/
    ├── redis/             # Redis客户端
    └── sqlite/            # SQLite客户端
```
