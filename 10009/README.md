# 🎉 抽奖系统

一个完整的抽奖系统全栈应用，支持用户登录、抽奖、奖品管理等功能。

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus
- **后端**: Go + Gin + GORM
- **数据库**: MySQL 8.0 + Redis 7
- **部署**: Docker Compose

## 功能特性

### 用户端
- 手机号 + 验证码登录（模拟）
- 每日最多抽奖 3 次
- 奖品列表展示
- 实时中奖记录滚动显示
- 个人抽奖记录查看

### 管理端
- 奖品 CRUD 管理（名称、库存、概率、排序、启用/禁用）
- 抽奖记录查询（支持手机号搜索、中奖筛选）
- 中奖名单导出（JSON格式）
- 概率总和验证

### 核心特性
- Redis 分布式锁防止并发超抽
- 数据库事务保证库存扣减原子性
- 抽奖算法保证总概率可配置
- 库存为 0 时奖品自动不可中
- CORS 跨域支持

## 快速启动

### 环境要求
- Docker >= 20.10
- Docker Compose >= 2.0

### 一键启动

```bash
docker-compose up -d --build
```

### 访问地址

- 用户端: http://localhost
- 管理端: http://localhost/admin

### 管理后台登录
- Token: `admin-token-12345`

## 项目结构

```
.
├── backend/              # Go 后端
│   ├── cmd/           # 入口文件
│   ├── internal/      # 业务代码
│   │   ├── config/   # 配置
│   │   ├── handlers/ # API 处理器
│   │   ├── middleware/ # 中间件
│   │   └── models/  # 数据模型
│   ├── pkg/         # 公共包
│   │   ├── database/ # MySQL 数据库
│   │   └── redis/  # Redis 缓存
│   ├── Dockerfile
│   └── go.mod
├── frontend/          # Vue 3 前端
│   ├── src/
│   │   ├── views/    # 页面组件
│   │   ├── api/      # API 接口
│   │   └── router/   # 路由配置
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API 接口

### 认证接口
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/login` - 登录

### 用户接口
- `GET /api/user/profile` - 获取用户信息
- `POST /api/user/draw` - 抽奖
- `GET /api/user/my-records` - 我的记录

### 公共接口
- `GET /api/prizes` - 获取奖品列表
- `GET /api/records/recent` - 最近中奖记录

### 管理接口
- `GET /api/admin/prizes` - 获取所有奖品
- `POST /api/admin/prizes` - 创建奖品
- `PUT /api/admin/prizes/:id` - 更新奖品
- `DELETE /api/admin/prizes/:id` - 删除奖品
- `GET /api/admin/records` - 获取抽奖记录
- `GET /api/admin/records/export` - 导出中奖名单
- `POST /api/admin/prizes/validate-probability` - 验证概率

## 默认奖品配置

| 奖品 | 库存 | 概率 |
|------|------|------|
| iPhone 15 | 1 | 1% |
| AirPods Pro | 5 | 5% |
| 100元优惠券 | 50 | 14% |
| 10元优惠券 | 200 | 30% |
| 谢谢参与 | 10000 | 50% |

总概率: 100%

## 停止服务

```bash
docker-compose down
```

## 停止并清除数据

```bash
docker-compose down -v
```

## 验证指南

详细的功能验证请参考 [VERIFICATION.md](VERIFICATION.md)，包含：
- 抽奖算法验证
- Redis分布式锁验证
- 并发超抽测试
- SSE实时推送测试
- API测试命令

