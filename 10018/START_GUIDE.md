# 🚀 博客系统启动指南

## 第2轮功能更新完成 ✅

### 新增功能

1. **代码高亮** ✅
   - 集成 highlight.js，使用 GitHub Dark 主题
   - 支持 180+ 编程语言语法高亮
   - 文件位置: [ArticleClient.js](file:///Users/mac/Documents/未命名文件夹%2013/frontend/app/articles/[slug]/ArticleClient.js)

2. **SSG 静态生成** ✅
   - 使用 `generateStaticParams()` 预渲染所有文章
   - 60秒增量重新验证 (ISR)
   - 文件位置: [page.js](file:///Users/mac/Documents/未命名文件夹%2013/frontend/app/articles/[slug]/page.js)

3. **文章访问权限控制** ✅
   - 支持 `public`（公开）和 `private`（私密）两种模式
   - 私密文章仅登录用户可见
   - 文件位置: [Article.js](file:///Users/mac/Documents/未命名文件夹%2013/backend/models/Article.js)

4. **文章摘要自动生成** ✅
   - 保存文章时自动从内容提取前200字符
   - 去除 Markdown 语法标记
   - 文件位置: [Article.js](file:///Users/mac/Documents/未命名文件夹%2013/backend/models/Article.js#L65-L71)

5. **阅读量统计** ✅
   - 每次访问文章自动增加阅读量
   - 提供独立的统计接口
   - 文件位置: [articles.js](file:///Users/mac/Documents/未命名文件夹%2013/backend/routes/articles.js#L106-L118)

---

## 快速启动

### 方式一：使用 Docker（推荐）

```bash
# 1. 确保已安装 Docker 和 Docker Compose
docker --version
docker-compose --version

# 2. 一键启动
./deploy.sh

# 或手动执行
docker-compose up -d --build
```

### 方式二：本地开发

#### 前置要求
- Node.js >= 18
- MongoDB >= 4.4

#### 步骤

**1. 启动 MongoDB**
```bash
# 使用 Docker 启动 MongoDB
docker run -d -p 27017:27017 --name blog-mongodb mongo:4.4

# 或使用本地 MongoDB
mongod
```

**2. 启动后端服务**
```bash
cd backend
npm install
npm run dev
```
后端将在 http://localhost:5000 启动

**3. 启动前端服务**
```bash
cd frontend
npm install
npm run dev
```
前端将在 http://localhost:3000 启动

---

## 创建管理员账号

服务启动后，使用以下命令创建第一个管理员：

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "yourpassword123"
  }'
```

---

## 功能验证清单

### 前端功能
- [x] 首页文章列表
- [x] 文章搜索
- [x] 标签筛选
- [x] 文章详情页（Markdown渲染）
- [x] 代码高亮显示
- [x] 目录导航
- [x] 阅读进度条
- [x] 标签云
- [x] 归档时间轴
- [x] 评论系统（匿名+回复）
- [x] 私密文章访问控制
- [x] SEO (sitemap.xml, robots.txt)

### 后台管理
- [x] JWT 登录认证
- [x] 文章创建/编辑/删除
- [x] 文章可见性设置（公开/私密）
- [x] 标签管理
- [x] 图片上传
- [x] 阅读量统计

---

## API 测试

使用 curl 测试 API 接口：

```bash
# 1. 健康检查
curl http://localhost:5000/api/health

# 2. 获取文章列表
curl http://localhost:5000/api/articles

# 3. 获取标签列表
curl http://localhost:5000/api/tags

# 4. 登录获取 Token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "yourpassword123"}'

# 5. 使用 Token 创建文章（替换 YOUR_TOKEN）
curl -X POST http://localhost:5000/api/articles \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_TOKEN" \
  -d '{
    "title": "测试文章",
    "content": "# Hello World\n\n这是一篇测试文章。\n\n```javascript\nconsole.log('Hello World!');\n```",
    "status": "published",
    "visibility": "public"
  }'
```

---

## 项目结构

```
.
├── backend/                    # Express 后端
│   ├── models/                # 数据库模型
│   │   ├── Article.js         # 文章模型（含摘要生成）
│   │   ├── User.js            # 用户模型
│   │   ├── Comment.js         # 评论模型
│   │   └── Tag.js             # 标签模型
│   ├── routes/                # API 路由
│   │   ├── auth.js            # 认证接口
│   │   ├── articles.js        # 文章接口（含阅读量统计）
│   │   ├── comments.js        # 评论接口
│   │   ├── tags.js            # 标签接口
│   │   └── upload.js          # 图片上传接口
│   ├── middleware/
│   │   └── auth.js            # JWT 认证中间件
│   ├── server.js              # 入口文件
│   └── package.json
│
├── frontend/                   # Next.js 前端
│   ├── app/                   # App Router 页面
│   │   ├── articles/[slug]/   # 文章详情页（SSG）
│   │   ├── admin/             # 后台管理
│   │   ├── tags/              # 标签页面
│   │   ├── archive/           # 归档页面
│   │   ├── login/             # 登录页面
│   │   ├── sitemap.js         # SEO sitemap
│   │   └── robots.js          # SEO robots
│   ├── components/            # React 组件
│   ├── lib/
│   │   └── api.js             # API 封装
│   └── package.json
│
├── docker-compose.yml         # Docker 编排
├── deploy.sh                  # 一键部署脚本
└── README.md                  # 项目文档
```

---

## 常见问题

### Q: 前端无法连接后端？
A: 检查 `frontend/.env.local` 中的 `API_URL` 是否正确，确保后端服务已启动。

### Q: MongoDB 连接失败？
A: 检查 MongoDB 是否运行，确认 `backend/.env` 中的 `MONGO_URI` 配置正确。

### Q: 私密文章如何访问？
A: 需要先登录后台管理系统，登录后即可查看私密文章。

### Q: 如何修改网站标题和描述？
A: 编辑 `frontend/app/layout.js` 中的 metadata。

---

## 技术栈

- **前端**: Next.js 14 (App Router) + React 18 + Tailwind CSS
- **后端**: Node.js + Express.js
- **数据库**: MongoDB
- **认证**: JWT (JSON Web Token)
- **Markdown**: marked + highlight.js
- **文件上传**: Multer
- **部署**: Docker + Docker Compose

---

## 下一步

1. 启动服务并创建管理员账号
2. 访问 http://localhost:3000 查看前端
3. 访问 http://localhost:3000/admin 进入后台管理
4. 创建第一篇文章，测试所有功能
5. 部署到生产环境（Vercel + MongoDB Atlas）
