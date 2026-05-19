# Collaborative Docs - 多人协作文档编辑器

一个类似简化版 Google Docs 的多人协作文档编辑器，支持实时协同编辑、版本历史、评论功能等。

## 功能特性

### ✨ 核心功能
- **实时协同编辑** - 多人同时编辑文档，内容实时同步
- **光标位置同步** - 实时显示其他用户的光标位置
- **撤销/重做** - 支持至少5层撤销/重做操作
- **版本历史** - 保存文档历史版本，可回退到任意版本
- **评论系统** - 选中文字添加评论，支持回复评论
- **权限管理** - 支持公开/私有文档，只读/可编辑权限
- **分享链接** - 生成带权限的分享链接
- **在线用户** - 显示当前文档的在线用户列表

### 🛠 技术栈
- **前端**: React 18 + React Router + Socket.io Client
- **后端**: Node.js + Express + Socket.io
- **数据库**: PostgreSQL
- **认证**: JWT (JSON Web Tokens)

## 项目结构

```
collaborative-docs/
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/     # 可复用组件
│   │   ├── context/        # React Context
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 和 Socket 服务
│   │   └── styles/         # 样式文件
│   └── package.json
├── server/                 # Node.js 后端
│   ├── config/             # 配置文件
│   ├── middleware/         # 中间件
│   ├── routes/             # API 路由
│   ├── socket/             # Socket.io 处理
│   └── server.js           # 服务器入口
├── database/               # 数据库
│   └── init.sql            # 数据库初始化脚本
└── package.json            # 根目录配置
```

## 快速开始

详细的安装和启动指南请参考 [SETUP.md](file:///Users/mac/Documents/10000/SETUP.md)。

**快速步骤：**

1. 创建并初始化 PostgreSQL 数据库
2. 配置后端环境变量 (server/.env)
3. 安装依赖: `npm run install:all`
4. 启动应用: `npm run dev`
5. 访问: http://localhost:3000

## API 接口

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 文档
- `GET /api/documents` - 获取用户文档列表
- `POST /api/documents` - 创建新文档
- `GET /api/documents/:id` - 获取文档详情
- `PUT /api/documents/:id` - 更新文档
- `DELETE /api/documents/:id` - 删除文档
- `POST /api/documents/:id/versions` - 保存版本
- `POST /api/documents/:id/restore/:versionId` - 恢复版本

### 评论
- `GET /api/comments/document/:documentId` - 获取文档评论
- `POST /api/comments/document/:documentId` - 添加评论/回复
- `PUT /api/comments/:id` - 更新评论
- `DELETE /api/comments/:id` - 删除评论

### 分享
- `GET /api/shares/document/:documentId` - 获取分享设置
- `POST /api/shares/document/:documentId` - 更新分享设置/生成链接
- `GET /api/shares/token/:token` - 验证分享链接
- `DELETE /api/shares/token/:token` - 撤销分享链接
- `DELETE /api/shares/document/:documentId/user/:userId` - 撤销用户权限

## Socket.io 事件

### 客户端发送
- `join-document` - 加入文档
- `leave-document` - 离开文档
- `edit` - 编辑文档
- `cursor-move` - 光标移动
- `selection` - 文本选中
- `save-document` - 保存文档
- `comment-added` - 评论添加

### 服务器发送
- `document-state` - 文档初始状态
- `user-joined` - 用户加入
- `user-left` - 用户离开
- `edit` - 文档编辑
- `cursor-move` - 光标移动
- `selection` - 文本选中
- `comment-added` - 评论添加
- `document-saved` - 保存确认

## 测试账号

数据库初始化脚本包含以下测试用户（密码均为 `password123`）：

- alice@example.com
- bob@example.com
- charlie@example.com

## 快捷键

- `Ctrl+Z` / `Cmd+Z` - 撤销
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` - 重做
- `Ctrl+S` / `Cmd+S` - 保存文档

## 许可协议

MIT License
