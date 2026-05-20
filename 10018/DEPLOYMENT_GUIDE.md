# 🚀 全栈个人博客系统 - 完整部署指南

## 📋 项目概述

基于 **Next.js 14 (App Router) + Express.js + MongoDB** 的全栈个人博客系统，支持 Markdown 写作、代码高亮、标签分类、评论系统、点赞收藏等完整功能。

## ✅ 已实现功能

### 核心功能
- ✅ Markdown 文章渲染（highlight.js 代码高亮）
- ✅ SSG 静态生成 + ISR 增量更新
- ✅ 文章列表、详情页、搜索、标签云、归档
- ✅ 目录导航（自动提取标题）
- ✅ 阅读进度条
- ✅ 阅读时间估算
- ✅ 阅读量统计
- ✅ 访问权限控制（公开/私密）
- ✅ 文章摘要自动生成

### 用户功能
- ✅ JWT 认证登录/注册
- ✅ 用户个人主页
- ✅ 文章点赞/收藏
- ✅ 文章分享（复制链接 + 原生分享）

### 评论功能
- ✅ 匿名评论
- ✅ 评论回复
- ✅ 评论列表

### SEO 优化
- ✅ 动态生成 sitemap.xml
- ✅ robots.txt
- ✅ 页面 Meta 信息

### 部署支持
- ✅ Docker Compose 一键部署
- ✅ 开发环境快速启动
- ✅ 内存 MongoDB 测试方案

---

## 🚀 快速开始（开发环境）

### 方式一：内存 MongoDB 测试（无需安装数据库）

最适合快速验证功能：

```bash
# 1. 启动后端（使用内存 MongoDB）
cd backend
node server-memory.js

# 2. 启动前端（新开终端）
cd frontend
npm run dev

# 3. 运行 API 测试（新开终端）
node test-api.js
```

- API 地址: http://localhost:5001
- 前端地址: http://localhost:3000

### 方式二：本地 MongoDB 开发

```bash
# 1. 安装 MongoDB
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# 2. 启动后端
cd backend
npm run dev

# 3. 启动前端
cd frontend
npm run dev
```

---

## 🐳 Docker 部署

### 1. 安装 Docker Desktop

**macOS:**
```bash
# 方式一：Homebrew
brew install --cask docker

# 方式二：官网下载
# https://www.docker.com/products/docker-desktop
```

安装完成后，启动 Docker Desktop 应用。

### 2. 验证 Docker 安装

```bash
docker --version
docker-compose --version
# 或者
docker compose version
```

### 3. 一键部署

```bash
# 在项目根目录执行
docker-compose up -d --build
```

### 4. 查看服务状态

```bash
docker-compose ps
```

应该看到三个服务运行：
- `mongo` - MongoDB 数据库 (端口 27017)
- `backend` - Express.js API (端口 5000)
- `frontend` - Next.js 前端 (端口 3000)

### 5. 查看日志

```bash
# 所有服务日志
docker-compose logs -f

# 特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 6. 停止服务

```bash
# 停止并删除容器
docker-compose down

# 停止并删除容器和数据卷
docker-compose down -v
```

### 7. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:5000/api
- 健康检查: http://localhost:5000/api/health

---

## 📡 API 接口文档

### 认证接口
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | ❌ |
| POST | `/api/auth/login` | 用户登录 | ❌ |

### 文章接口
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/articles` | 获取文章列表 | ❌ |
| GET | `/api/articles/:slug` | 获取文章详情 | ❌ |
| POST | `/api/articles` | 创建文章 | ✅ |
| PUT | `/api/articles/:id` | 更新文章 | ✅ |
| DELETE | `/api/articles/:id` | 删除文章 | ✅ |
| POST | `/api/articles/:id/like` | 点赞文章 | ✅ |
| POST | `/api/articles/:id/favorite` | 收藏文章 | ✅ |

### 标签接口
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/tags` | 获取标签列表 | ❌ |
| POST | `/api/tags` | 创建标签 | ✅ |
| PUT | `/api/tags/:id` | 更新标签 | ✅ |
| DELETE | `/api/tags/:id` | 删除标签 | ✅ |

### 评论接口
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/comments/:articleId` | 获取评论列表 | ❌ |
| POST | `/api/comments/:articleId` | 创建评论 | ❌ |

### 用户接口
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/users/profile/:username` | 用户个人主页 | ❌ |

### 上传接口
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/upload` | 上传图片 | ✅ |

---

## 🧪 API 测试

```bash
# 确保后端服务运行后执行
node test-api.js
```

测试内容包括：
- ✅ 健康检查
- ✅ 用户注册/登录
- ✅ 标签 CRUD
- ✅ 文章 CRUD
- ✅ 文章点赞/收藏
- ✅ 评论创建/获取
- ✅ 用户个人主页
- ✅ 归档页面

---

## 📁 项目结构

```
.
├── backend/                 # Express.js 后端
│   ├── models/             # Mongoose 模型
│   │   ├── Article.js
│   │   ├── Comment.js
│   │   ├── Tag.js
│   │   └── User.js
│   ├── routes/             # API 路由
│   │   ├── articles.js
│   │   ├── auth.js
│   │   ├── comments.js
│   │   ├── tags.js
│   │   ├── upload.js
│   │   └── users.js
│   ├── middleware/         # 中间件
│   │   └── auth.js
│   ├── server.js           # 生产环境入口
│   ├── server-memory.js    # 内存 MongoDB 测试入口
│   └── package.json
├── frontend/               # Next.js 14 前端
│   ├── app/                # App Router 页面
│   │   ├── articles/[slug]/
│   │   ├── admin/
│   │   ├── tags/
│   │   ├── users/[username]/
│   │   ├── login/
│   │   ├── archive/
│   │   └── page.js         # 首页
│   ├── components/         # React 组件
│   │   ├── ArticleCard.js
│   │   ├── CommentSection.js
│   │   ├── FavoriteButton.js
│   │   ├── LikeButton.js
│   │   ├── ReadingProgress.js
│   │   ├── ShareButton.js
│   │   └── TableOfContents.js
│   ├── lib/                # 工具函数
│   │   ├── api.js
│   │   └── readingTime.js
│   └── package.json
├── docker-compose.yml      # Docker 编排
├── test-api.js            # API 测试脚本
├── start.sh              # 一键启动脚本
└── test-docker.sh        # Docker 验证脚本
```

---

## 🔧 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **Markdown**: marked.js
- **代码高亮**: highlight.js
- **HTTP 请求**: Axios

### 后端
- **框架**: Express.js
- **数据库**: MongoDB + Mongoose
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **文件上传**: Multer
- **跨域**: CORS

### 部署
- **容器化**: Docker + Docker Compose
- **CI/CD**: 支持 Vercel、Railway 等平台

---

## 🎯 功能验证清单

| 功能 | 状态 | 验证方式 |
|------|------|----------|
| 用户注册/登录 | ✅ | API 测试 |
| 文章 CRUD | ✅ | API 测试 |
| 标签 CRUD | ✅ | API 测试 |
| 评论功能 | ✅ | API 测试 |
| 文章点赞 | ✅ | API 测试 |
| 文章收藏 | ✅ | API 测试 |
| 用户个人主页 | ✅ | API 测试 |
| 代码高亮 | ✅ | 前端构建 |
| 目录导航 | ✅ | 组件实现 |
| 阅读时间估算 | ✅ | 组件实现 |
| 阅读进度条 | ✅ | 组件实现 |
| SSG 静态生成 | ✅ | 前端构建 |
| Docker 部署 | ⏳ | 需要本地环境 |

---

## 📝 常见问题

### 1. 端口被占用
```bash
# 查找占用端口的进程
lsof -i :5000
lsof -i :3000

# 杀掉进程
kill -9 <PID>
```

### 2. MongoDB 连接失败
- 确认 MongoDB 服务已启动
- 检查 `backend/.env` 中的 MONGO_URI
- 或者使用 `server-memory.js` 进行测试

### 3. 前端构建失败
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### 4. Docker 镜像构建慢
- 使用国内镜像源
- 或者使用 `--no-cache` 重新构建

---

## 🚀 下一步

1. 部署到生产环境（Vercel + MongoDB Atlas）
2. 添加更多主题样式
3. 实现 RSS 订阅
4. 添加文章搜索功能（Elasticsearch）
5. 接入第三方登录（GitHub、Google）

---

## 📄 License

MIT License
