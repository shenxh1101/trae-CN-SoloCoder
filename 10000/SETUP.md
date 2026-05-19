# 多人协作文档编辑器 - 完整安装启动指南

本文档提供从零开始运行本项目的完整步骤。

## 📋 系统要求

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm >= 8.0.0

## 🚀 快速开始（推荐）

### 步骤 1: 克隆并进入项目

```bash
cd /Users/mac/Documents/10000
```

### 步骤 2: 设置 PostgreSQL 数据库

**方法 1: 使用命令行**

```bash
# 创建数据库
createdb collaborative_docs

# 执行初始化脚本
psql -d collaborative_docs -f database/init.sql
```

**方法 2: 使用 psql 交互模式**

```sql
-- 连接到 PostgreSQL
psql

-- 创建数据库
CREATE DATABASE collaborative_docs;

-- 连接到新数据库
\c collaborative_docs

-- 执行初始化脚本
\i database/init.sql
```

**验证数据库**

```bash
psql -d collaborative_docs -c "\dt"
```

你应该看到以下表：
- users
- documents
- document_versions
- document_shares
- comments

### 步骤 3: 配置后端环境变量

```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/collaborative_docs
JWT_SECRET=your_secure_jwt_secret_key_here
NODE_ENV=development
```

**生成安全的 JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 步骤 4: 安装所有依赖

在项目根目录执行：

```bash
cd /Users/mac/Documents/10000
npm run install:all
```

这个命令会：
1. 安装根目录依赖（concurrently）
2. 安装前端依赖（client/package.json）
3. 安装后端依赖（server/package.json）

**手动安装（如果上面的命令失败）:**

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client && npm install && cd ..

# 安装后端依赖
cd server && npm install && cd ..
```

### 步骤 5: 启动应用

**开发模式（同时启动前后端）:**

```bash
npm run dev
```

这将启动：
- 后端服务器: http://localhost:5000
- 前端开发服务器: http://localhost:3000

**分别启动:**

```bash
# 终端 1 - 启动后端
cd server && npm run dev

# 终端 2 - 启动前端
cd client && npm start
```

### 步骤 6: 访问应用

打开浏览器访问: http://localhost:3000

## 🔑 测试账号

数据库初始化后包含以下测试用户（密码均为 `password123`）：

| 邮箱 | 用户名 | 密码 |
|------|--------|------|
| alice@example.com | alice | password123 |
| bob@example.com | bob | password123 |
| charlie@example.com | charlie | password123 |

## 📦 脚本说明

根目录 [package.json](file:///Users/mac/Documents/10000/package.json) 中的脚本：

| 命令 | 说明 |
|------|------|
| `npm run install:all` | 安装所有依赖（根目录 + 前端 + 后端） |
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run dev:server` | 仅启动后端开发服务器 |
| `npm run dev:client` | 仅启动前端开发服务器 |
| `npm run build` | 构建前端生产版本 |
| `npm run start` | 启动后端生产服务器 |

前端 [client/package.json](file:///Users/mac/Documents/10000/client/package.json) 中的脚本：

| 命令 | 说明 |
|------|------|
| `npm start` | 启动前端开发服务器 (端口 3000) |
| `npm run build` | 构建生产版本到 build/ 目录 |
| `npm test` | 运行测试 |

后端 [server/package.json](file:///Users/mac/Documents/10000/server/package.json) 中的脚本：

| 命令 | 说明 |
|------|------|
| `npm start` | 启动生产服务器 |
| `npm run dev` | 启动开发服务器 (使用 nodemon 自动重启) |

## 🧪 功能测试指南

### 测试实时协同编辑

1. 打开两个浏览器窗口（或无痕模式）
2. 使用不同账号登录
3. 打开同一个文档
4. 在一个窗口中编辑内容，观察另一个窗口是否实时更新

### 测试光标同步

1. 两个用户同时打开同一个文档
2. 移动一个用户的光标，观察另一个用户界面上是否显示远程光标

### 测试撤销/重做

1. 在编辑器中输入一些内容
2. 按 `Ctrl+Z` 撤销
3. 按 `Ctrl+Shift+Z` 重做
4. 确认最多支持 5 层历史记录

### 测试版本历史

1. 编辑文档后点击 "Save Version"
2. 输入版本描述
3. 在右侧 History 标签页查看版本列表
4. 点击 "Restore" 恢复到历史版本

### 测试评论功能

1. 在文档中选中一段文字
2. 在弹出的评论框中输入评论
3. 在右侧 Comments 标签页查看评论
4. 点击 "Reply" 回复评论

### 测试分享功能

1. 以文档所有者身份打开文档
2. 点击 "Share" 按钮
3. 开启 "Public Access" 或生成分享链接
4. 复制链接，使用其他账号访问验证权限

### 测试权限管理

1. 所有者分享文档给用户 A，设置为只读
2. 用户 A 打开文档，确认无法编辑
3. 所有者修改权限为可编辑
4. 用户 A 刷新页面，确认可以编辑

## 🔧 常见问题排查

### 数据库连接失败

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案:**
- 确认 PostgreSQL 正在运行: `brew services start postgresql` (macOS)
- 检查端口是否正确，默认是 5432
- 确认用户名和密码正确

### 前端无法连接后端

```
Proxy error: Could not proxy request /api/auth/login from localhost:3000 to http://localhost:5000
```

**解决方案:**
- 确认后端服务器正在运行（端口 5000）
- 检查前端 [package.json](file:///Users/mac/Documents/10000/client/package.json) 中的 proxy 配置

### Socket.io 连接失败

**解决方案:**
- 确认后端服务器正在运行
- 检查浏览器控制台的错误信息
- 确认 JWT token 有效（重新登录）

### 依赖安装失败

```
npm ERR! code ECONNRESET
```

**解决方案:**
- 检查网络连接
- 使用淘宝镜像: `npm config set registry https://registry.npmmirror.com`
- 清除缓存: `npm cache clean --force`
- 删除 node_modules 后重新安装

## 📝 环境变量说明

后端需要以下环境变量（在 [server/.env](file:///Users/mac/Documents/10000/server/.env) 中配置）:

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| PORT | 否 | 服务器端口，默认 5000 | 5000 |
| DATABASE_URL | 是 | PostgreSQL 连接字符串 | postgresql://user:pass@localhost:5432/db |
| JWT_SECRET | 是 | JWT 签名密钥 | 随机字符串 |
| NODE_ENV | 否 | 运行环境 | development / production |

## 🏭 生产部署

### 构建前端

```bash
cd client
npm run build
```

### 配置静态文件服务

在 [server/server.js](file:///Users/mac/Documents/10000/server/server.js) 中添加：

```javascript
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});
```

### 设置环境变量

确保生产环境设置以下变量：
- `NODE_ENV=production`
- `DATABASE_URL` 指向生产数据库
- `JWT_SECRET` 使用强随机密钥

### 启动生产服务器

```bash
cd server
npm start
```

## 📚 相关文档

- [README.md](file:///Users/mac/Documents/10000/README.md) - 项目介绍和 API 文档
- [database/init.sql](file:///Users/mac/Documents/10000/database/init.sql) - 数据库初始化脚本
