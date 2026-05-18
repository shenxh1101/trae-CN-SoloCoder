# 团队协作任务管理应用

一个基于 React + Express + better-sqlite3 的团队协作任务管理小型 Web 应用。

## 功能特性

### 项目管理
- 创建新项目（名称、描述）
- 项目列表展示，支持按名称搜索
- 删除项目（级联删除项目下所有任务和评论）
- 项目卡片显示未完成任务数量和完成进度

### 任务管理
- 任务卡片包含：标题、描述、指派人、截止日期、优先级、状态
- 支持编辑所有任务字段
- 任务状态快速切换（未开始、进行中、已完成）
- 按状态和指派人筛选任务
- 任务总数实时显示

### 用户系统
- 首页设置当前用户（保存到 localStorage）
- 所有历史用户自动保存到数据库
- 创建任务时自动将当前用户设为创建人
- 指派人可从已有用户列表中选择

### 评论功能
- 任务详情页可添加评论
- 评论显示评论人、内容和时间（倒序排列）
- 仅评论人可删除自己的评论

### 数据仪表盘
- 统计卡片：未开始、进行中、已完成任务数量，项目总数，任务总数
- 柱状图展示各项目完成进度（按项目分组）
- 未来7天即将到期的任务清单（按截止日期排序）

## 技术栈

- **前端**: React 18 + React Router + Recharts
- **后端**: Express.js
- **数据库**: better-sqlite3
- **构建工具**: Vite

## 项目结构

```
.
├── server/                 # 后端服务
│   ├── controllers/        # 控制器层
│   │   ├── users.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── comments.js
│   │   └── dashboard.js
│   ├── routes/             # 路由层
│   │   ├── users.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── comments.js
│   │   └── dashboard.js
│   ├── database.js         # 数据库初始化
│   └── index.js            # 服务入口
├── client/                 # 前端应用
│   └── src/
│       ├── components/     # 共享组件
│       ├── contexts/       # React Context
│       ├── pages/          # 页面组件
│       ├── services/       # API 服务
│       ├── utils/          # 工具函数
│       ├── App.jsx
│       ├── App.css
│       └── main.jsx
├── data/                   # 数据库文件目录（自动创建）
└── package.json
```

## 安装运行

### 方式一：一键安装启动
```bash
# 安装所有依赖
npm run install:all

# 同时启动前后端（开发模式）
npm run dev
```

### 方式二：分别安装启动

**安装后端依赖：**
```bash
cd server
npm install
```

**安装前端依赖：**
```bash
cd client
npm install
```

**启动后端服务（端口 3001）：**
```bash
cd server
npm start
# 或开发模式
npm run dev
```

**启动前端开发服务（端口 5173）：**
```bash
cd client
npm run dev
```

**生产构建：**
```bash
cd client
npm run build
```

## API 接口文档

### 用户接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/users | 获取所有用户 |
| GET | /api/users/:id | 获取指定用户 |
| POST | /api/users | 创建用户 |

### 项目接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects | 获取所有项目 |
| GET | /api/projects/search?q=xxx | 搜索项目 |
| GET | /api/projects/:id | 获取项目详情 |
| POST | /api/projects | 创建项目 |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |

### 任务接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects/:projectId/tasks | 获取项目任务列表（支持 status/assignee_id 筛选） |
| GET | /api/tasks/:id | 获取任务详情 |
| POST | /api/projects/:projectId/tasks | 创建任务 |
| PUT | /api/tasks/:id | 更新任务 |
| DELETE | /api/tasks/:id | 删除任务 |
| GET | /api/tasks/upcoming | 获取即将到期任务 |

### 评论接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks/:taskId/comments | 获取任务评论 |
| POST | /api/tasks/:taskId/comments | 创建评论 |
| DELETE | /api/comments/:id | 删除评论 |

### 仪表盘接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/dashboard/stats | 获取仪表盘统计数据 |

## 数据库表结构

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | TEXT | 用户名，唯一 |
| created_at | DATETIME | 创建时间 |

### projects 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 项目名称 |
| description | TEXT | 项目描述 |
| created_at | DATETIME | 创建时间 |

### tasks 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| project_id | INTEGER | 项目ID（外键，级联删除） |
| title | TEXT | 任务标题 |
| description | TEXT | 任务描述 |
| assignee_id | INTEGER | 指派人ID（外键） |
| creator_id | INTEGER | 创建人ID（外键） |
| due_date | DATE | 截止日期 |
| priority | TEXT | 优先级（high/medium/low） |
| status | TEXT | 状态（todo/in_progress/done） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### comments 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| task_id | INTEGER | 任务ID（外键，级联删除） |
| user_id | INTEGER | 用户ID（外键） |
| content | TEXT | 评论内容 |
| created_at | DATETIME | 创建时间 |

## 使用说明

1. **设置用户**: 首次访问请点击导航栏的"设置"，输入您的用户名。用户信息会保存到本地，创建任务和评论时会自动关联。

2. **创建项目**: 在项目列表页点击"新建项目"按钮，填写项目名称和描述。

3. **添加任务**: 进入项目详情页，点击"新建任务"，填写任务信息。可以随时编辑或删除任务。

4. **筛选任务**: 在项目详情页可以按状态和指派人筛选任务，方便快速定位。

5. **添加评论**: 进入任务详情页，可以发表评论。只有评论人可以删除自己的评论。

6. **查看进度**: 在仪表盘页面可以查看整体进度统计和即将到期的任务。

## 注意事项

- 数据库文件会自动创建在 `data/` 目录下
- 删除项目会同时删除该项目下的所有任务和评论，请谨慎操作
- 前端开发服务器已配置代理，所有 `/api` 请求会转发到后端 3001 端口
- 生产部署时可将前端构建产物作为静态资源由 Express 服务提供
