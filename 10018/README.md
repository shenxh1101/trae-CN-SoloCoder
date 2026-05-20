# 个人博客系统

一个基于 Next.js + Express + MongoDB 的全栈个人博客系统。

## ✨ 功能特性

### 前端功能
- 🎨 响应式设计，支持移动端
- 📝 Markdown 文章渲染，代码高亮
- 📚 文章目录导航
- 📊 阅读进度条
- 🏷️ 标签云
- 📅 归档时间轴
- 💬 评论系统（支持匿名评论和回复）
- 🔍 文章搜索
- 📈 SEO 优化（sitemap.xml, robots.txt）

### 后台管理
- 🔐 JWT 认证登录
- ✏️ 文章创建/编辑/删除
- 🏷️ 标签管理
- 🖼️ 图片上传（Multer）
- 📊 文章浏览统计

### 技术栈
- **前端**: Next.js 14 (App Router), React 18, Tailwind CSS
- **后端**: Node.js, Express.js
- **数据库**: MongoDB
- **认证**: JWT
- **部署**: Docker, Vercel

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 一键启动
chmod +x deploy.sh
./deploy.sh
```

或手动执行：

```bash
docker-compose up -d --build
```

访问:
- 前端: http://localhost:3000
- 后台: http://localhost:3000/admin

### 方式二：本地开发

#### 1. 启动 MongoDB
```bash
# 使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:4.4
```

#### 2. 启动后端
```bash
cd backend
npm install
npm run dev
```

#### 3. 启动前端
```bash
cd frontend
npm install
npm run dev
```

## 🔧 配置说明

### 后端环境变量 (backend/.env)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/blog
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

### 前端环境变量 (frontend/.env.local)
```
API_URL=http://localhost:5000/api
SITE_URL=http://localhost:3000
```

## 📝 创建管理员账号

使用 curl 或 Postman 注册第一个管理员：

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "yourpassword"
  }'
```

## 📁 项目结构

```
.
├── backend/              # 后端服务
│   ├── models/          # 数据库模型
│   ├── routes/          # API 路由
│   ├── middleware/      # 中间件
│   ├── server.js        # 入口文件
│   └── package.json
├── frontend/            # 前端应用
│   ├── app/             # Next.js App Router
│   ├── components/      # React 组件
│   ├── lib/             # 工具函数
│   └── package.json
├── docker-compose.yml   # Docker 编排
├── deploy.sh            # 一键部署脚本
└── README.md
```

## 🐳 部署到 Vercel

1. 修改 `frontend/vercel.json` 中的 API 地址
2. 连接 Git 仓库到 Vercel
3. 配置环境变量
4. 部署！

## 📄 API 文档

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 文章
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:slug` - 获取文章详情
- `GET /api/articles/archive` - 获取归档
- `POST /api/articles` - 创建文章（需要认证）
- `PUT /api/articles/:id` - 更新文章（需要认证）
- `DELETE /api/articles/:id` - 删除文章（需要认证）

### 评论
- `GET /api/comments/:articleId` - 获取评论
- `POST /api/comments/:articleId` - 发表评论
- `DELETE /api/comments/:id` - 删除评论（需要认证）

### 标签
- `GET /api/tags` - 获取所有标签
- `POST /api/tags` - 创建标签（需要认证）
- `PUT /api/tags/:id` - 更新标签（需要认证）
- `DELETE /api/tags/:id` - 删除标签（需要认证）

### 上传
- `POST /api/upload` - 上传图片（需要认证）

## 📝 License

MIT
