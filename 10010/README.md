# 在线问卷调查系统

一个功能完整的在线问卷调查系统，支持创建多种题型、逻辑跳转、匿名填写、数据统计和Excel导出。

## 技术栈

### 后端
- Django 4.2.7
- Django REST Framework 3.14.0
- Django REST Framework SimpleJWT (JWT认证)
- MySQL
- drf-yasg (Swagger API文档)
- openpyxl (Excel导出)
- qrcode (二维码生成)

### 前端
- React 18
- Ant Design 5
- React Router 6
- ECharts (图表)
- Vite

## 项目结构

```
.
├── backend/                 # Django后端
│   ├── accounts/           # 用户认证模块
│   ├── surveys/            # 问卷核心模块
│   ├── config/             # 项目配置
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/               # React前端
    ├── src/
    │   ├── api/           # API封装
    │   ├── components/    # 公共组件
    │   ├── pages/         # 页面组件
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

## 功能特性

### 用户端
- 用户注册/登录 (JWT认证)
- 创建/编辑/删除问卷
- 支持4种题型：单选题、多选题、文本题、评分题
- 逻辑跳转（根据单选题选项跳转到指定题目或结束问卷）
- 问卷预览
- 发布问卷并生成唯一链接和二维码
- 查看问卷回收情况和统计图表
- 导出问卷结果为Excel

### 填写端（无需登录）
- 匿名填写问卷
- 支持填写者信息（选填）
- 逻辑跳转自动跳转

### 管理端
- 查看所有问卷列表
- 查看所有问卷的回收份数
- 查看所有问卷的平均完成时间
- 查看活跃用户数

### API文档
- Swagger UI: http://localhost:8000/swagger/
- ReDoc: http://localhost:8000/redoc/

## 快速开始

### 1. 启动后端服务

#### 准备数据库
确保MySQL已启动，并创建数据库：
```sql
CREATE DATABASE survey_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 配置环境变量
```bash
cd backend
cp .env.example .env
# 编辑.env文件，配置数据库连接信息
```

#### 安装依赖并启动
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser  # 创建管理员账号
python manage.py runserver
```

后端服务将运行在 http://localhost:8000

### 2. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

前端服务将运行在 http://localhost:3000

### 3. 访问系统

- 前端首页: http://localhost:3000
- 后端API: http://localhost:8000/api/
- Swagger文档: http://localhost:8000/swagger/
- Django Admin: http://localhost:8000/admin/

## API端点

### 认证相关
- `POST /api/auth/register/` - 用户注册
- `POST /api/auth/login/` - 用户登录
- `POST /api/auth/refresh/` - 刷新Token
- `GET /api/auth/me/` - 获取当前用户信息

### 问卷相关
- `GET /api/surveys/` - 获取问卷列表
- `POST /api/surveys/` - 创建问卷
- `GET /api/surveys/{id}/` - 获取问卷详情
- `PUT /api/surveys/{id}/` - 更新问卷
- `DELETE /api/surveys/{id}/` - 删除问卷
- `POST /api/surveys/{id}/publish/` - 发布问卷
- `POST /api/surveys/{id}/close/` - 关闭问卷
- `GET /api/surveys/{id}/public/` - 获取公开问卷（无需登录）
- `POST /api/surveys/{id}/submit/` - 提交问卷回答（无需登录）
- `GET /api/surveys/{id}/stats/` - 获取问卷统计数据
- `GET /api/surveys/{id}/responses/` - 获取问卷回答列表
- `GET /api/surveys/{id}/export/` - 导出Excel

### 管理员相关
- `GET /api/admin/overview/` - 获取全局统计数据

## 主要页面说明

1. **登录/注册页** - 用户认证入口
2. **工作台** - 显示问卷统计概览和最近问卷
3. **我的问卷** - 问卷列表管理（创建、编辑、发布、删除、分享、统计）
4. **问卷编辑器** - 创建和编辑问卷，支持添加多种题型和逻辑跳转
5. **问卷预览** - 预览问卷填写效果
6. **统计分析** - 图表展示问卷结果，支持导出Excel
7. **管理面板** - 管理员查看全局数据
8. **问卷填写页** - 公开访问，无需登录即可填写

## 数据库模型

- **User** - 用户表
- **Survey** - 问卷表
- **Question** - 题目表
- **Option** - 选项表
- **LogicJump** - 逻辑跳转表
- **SurveyResponse** - 问卷回答记录表
- **Answer** - 答案明细表
