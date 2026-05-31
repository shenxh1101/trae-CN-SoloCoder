# AI周报自动生成器

一个基于Python和大语言模型的命令行周报自动生成工具，支持多种输入源和输出格式。

## ✨ 功能特性

- 🤖 **AI智能生成**：从简单的工作要点自动生成结构化周报
- 📊 **多章节结构**：包含本周完成、进行中工作、遇到的问题、下周计划等
- ⚖️ **详略可调**：支持简要版和详细版两种风格
- 👥 **团队批量生成**：从CSV文件批量生成团队成员周报
- 📝 **Git日志提取**：自动从git commit日志提取工作要点
- 📄 **多格式导出**：支持Markdown、HTML、纯文本格式
- ⭐ **评分反馈**：用户可对生成结果评分，系统学习偏好
- ⏱️ **耗时统计**：自动分析工作耗时占比
- ✅ **待办提取**：自动提取下周待办事项列表

## 🚀 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 配置API密钥

复制 `.env.example` 为 `.env` 并配置你的OpenAI兼容API：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
```

### 安装命令行工具

```bash
pip install -e .
```

## 📖 使用指南

### 1. 单人周报生成

#### 交互式输入
```bash
weekly-report generate
```

#### 命令行直接指定要点
```bash
weekly-report generate -i "修复登录bug、上线推荐模块、参加需求评审"
```

#### 指定风格和输出格式
```bash
weekly-report generate -i "修复bug" -s brief -f html -o report.html
```

#### 可选参数
- `-i, --items`: 工作要点，顿号分隔
- `-s, --style`: 风格：brief(简要) / detailed(详细)
- `-n, --name`: 报告人姓名
- `-f, --format`: 输出格式：markdown / html / text / console
- `-o, --output`: 输出文件路径
- `-c, --context`: 额外上下文信息
- `--no-ask-rating`: 跳过评分询问

### 2. 团队批量生成

准备CSV文件 `team.csv`：

```csv
姓名,工作要点,备注
张三,修复登录bug、上线推荐模块,负责用户模块
李四,参加需求评审、设计数据库架构,负责后端架构
王五,编写测试用例、进行代码review,负责测试
```

批量生成：

```bash
weekly-report batch -c team.csv -o ./reports --generate-summary
```

### 3. 从Git日志生成

导出git日志：

```bash
git log --since="7 days ago" > git.log
```

生成周报：

```bash
weekly-report git -l git.log -a "张三" -d 7
```

### 4. 偏好管理

查看评分统计和偏好：

```bash
weekly-report preference
```

导出偏好数据：

```bash
weekly-report preference -o prefs.json
```

清除评分历史：

```bash
weekly-report preference --clear
```

### 5. 查看使用示例

```bash
weekly-report example
```

## 📁 项目结构

```
.
├── weekly_report/
│   ├── __init__.py          # 包初始化
│   ├── cli.py               # 命令行接口
│   ├── config.py            # 配置管理
│   ├── llm_client.py        # LLM客户端
│   ├── report_generator.py  # 周报生成核心
│   ├── data_parser.py       # 数据解析（CSV、Git）
│   ├── exporter.py          # 多格式导出
│   ├── preference_learner.py # 偏好学习
│   └── analyzer.py          # 耗时统计和待办提取
├── requirements.txt         # 依赖列表
├── setup.py                 # 安装配置
├── config.json              # 默认配置
├── .env.example             # 环境变量示例
└── README.md                # 项目文档
```

## 🎨 输出示例

### Markdown格式

```markdown
# 工作周报

**报告人**：张三  **日期**：2024年01月15日

## 本周完成

- 修复登录模块存在的验证码验证bug，确保用户能够正常登录系统
- 完成推荐模块的开发和测试工作，已于周三成功上线
- 参加产品需求评审会议，讨论下季度产品规划

## 工作耗时统计

- 开发: 60% ████████████░░░░░░░░
- 会议: 20% ████░░░░░░░░░░░░░░░░
- 测试: 20% ████░░░░░░░░░░░░░░░░

## 待办事项

- [ ] 完成推荐模块的性能优化（优先级：🔴 高）
- [ ] 编写推荐模块的技术文档（优先级：🟡 中）
```

## ⚙️ 配置说明

配置文件位于 `~/.weekly_report_config.json`，包含：

- `default_style`: 默认风格 (detailed/brief)
- `preference`: 用户偏好设置
- `time_categories`: 耗时统计分类
- `report_sections`: 报告章节
- `ratings`: 评分历史记录

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
