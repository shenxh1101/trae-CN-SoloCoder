# 抽奖系统验证指南

## 核心功能验证清单

### ✅ 1. 抽奖算法验证

**算法逻辑** ([draw.go#L87-L107](file:///Users/mac/Documents/未命名文件夹 4/backend/internal/handlers/draw.go#L87-L107)):
- 只选择 `is_enabled=true` 且 `stock > 0` 的奖品
- 计算所有有效奖品的概率总和
- 生成随机数 `[0, 总概率)`
- 累积概率匹配，命中则返回对应奖品

**默认配置概率验证**:
```
iPhone 15:       1%
AirPods Pro:    5%
100元优惠券:   14%
10元优惠券:    30%
谢谢参与:      50%
总计:         100% ✓
```

**边界情况**:
- 库存为0的奖品自动从抽奖池中排除
- 概率可任意配置，系统自动按比例计算

---

### ✅ 2. Redis分布式锁防超抽

**实现位置** ([draw.go#L29-L40](file:///Users/mac/Documents/未命名文件夹 4/backend/internal/handlers/draw.go#L29-L40)):

```go
lockKey := fmt.Sprintf("draw_lock:%d", userID)
locked, err := redis.Lock(lockKey, 5*time.Second)
if err != nil || !locked {
    c.JSON(http.StatusTooManyRequests, gin.H{"error": "操作太频繁"})
    return
}
defer redis.Unlock(lockKey)
```

**锁机制**:
- 使用 `SETNX` 原子操作加锁
- 锁过期时间 5 秒（防止死锁）
- 同一用户并发请求只有一个能获得锁
- 请求处理完成自动释放锁

---

### ✅ 3. 库存扣减原子性

**实现位置** ([draw.go#L47-L85](file:///Users/mac/Documents/未命名文件夹 4/backend/internal/handlers/draw.go#L47-L85)):

```go
err = database.DB.Transaction(func(tx *gorm.DB) error {
    // 1. 扣减库存（使用乐观锁）
    result := tx.Model(&models.Prize{}).
        Where("id = ? AND stock > 0", prize.ID).
        Update("stock", gorm.Expr("stock - 1"))
    
    if result.RowsAffected == 0 {
        return fmt.Errorf("奖品库存不足")
    }
    
    // 2. 创建抽奖记录
    return tx.Create(&record).Error
})
```

**保证**:
- 数据库事务保证库存扣减和记录创建原子性
- `stock > 0` 条件防止超卖
- 事务失败自动回滚

---

### ✅ 4. 每日抽奖次数限制

**实现位置** ([redis.go#L37-L47](file:///Users/mac/Documents/未命名文件夹 4/backend/pkg/redis/redis.go#L37-L47)):

```go
key := fmt.Sprintf("draw_count:%d:%s", userID, date)
count, _ := redis.GetUserDrawCount(userID, today)
if count >= MaxDrawPerDay {
    return error
}
```

- Redis 计数器，Key 包含用户ID和日期
- 自动过期（24小时）
- 限制每天最多 3 次

---

### ✅ 5. SSE实时中奖推送

**后端实现** ([sse.go](file:///Users/mac/Documents/未命名文件夹 4/backend/internal/handlers/sse.go)):
- 端点: `GET /api/records/stream`
- 保持长连接，实时推送中奖信息
- 支持多客户端同时连接
- 自动重连机制

**前端实现** ([Home.vue#L216-L234](file:///Users/mac/Documents/未命名文件夹 4/frontend/src/views/Home.vue#L216-L234)):
- 使用 `EventSource` 连接 SSE
- 收到消息自动添加到滚动列表
- 连接断开自动重连（3秒间隔）

---

### ✅ 6. 数据库初始化

**SQL脚本** ([init.sql](file:///Users/mac/Documents/未命名文件夹 4/mysql/init.sql)):
- 创建数据库和所有表结构
- 创建必要的索引（手机号、用户ID、奖品ID、时间等）
- 初始化5个默认奖品

**表结构**:
- `users`: 用户表
- `prizes`: 奖品表
- `records`: 抽奖记录表
- `sms_codes`: 验证码表

---

## Docker Compose 验证步骤

### 前置条件
- Docker >= 20.10
- Docker Compose >= 2.0

### 启动命令
```bash
cd "/Users/mac/Documents/未命名文件夹 4"
docker-compose up -d --build
```

### 验证服务启动
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 预期结果
| 服务 | 状态 | 端口 | 说明 |
|------|------|------|------|
| mysql | healthy | 3306 | 数据库初始化完成 |
| redis | healthy | 6379 | Redis正常运行 |
| backend | running | 8080 | API服务可用 |
| frontend | running | 80 | 前端页面可访问 |

### API 测试

#### 1. 发送验证码
```bash
curl -X POST http://localhost:8080/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000"}'
```
预期: 返回验证码（开发环境直接显示）

#### 2. 登录
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000", "code": "<验证码>"}'
```
预期: 返回 token

#### 3. 获取奖品列表
```bash
curl http://localhost:8080/api/prizes
```
预期: 返回5个奖品

#### 4. 抽奖（需要登录token）
```bash
curl -X POST http://localhost:8080/api/user/draw \
  -H "Authorization: Bearer <token>"
```
预期: 返回抽中的奖品

#### 5. SSE实时推送测试
```bash
curl -N http://localhost:8080/api/records/stream
```
预期: 保持连接，有用户中奖时收到推送

---

## 并发测试（可选）

使用 Apache Bench 或 wrk 测试并发抽奖:

```bash
# 模拟100并发用户抽奖
ab -n 1000 -c 100 -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/user/draw
```

**预期结果**:
- 数据库中奖品库存不会出现负数
- 每个用户每天最多3条抽奖记录
- 没有重复中奖（库存足够时）

---

## 管理后台验证

1. 访问 http://localhost/admin
2. 输入 Token: `admin-token-12345`
3. 验证功能:
   - [ ] 奖品列表显示正确
   - [ ] 概率验证按钮显示 100%
   - [ ] 可以添加/编辑/删除奖品
   - [ ] 抽奖记录显示正确
   - [ ] 可以导出中奖名单
