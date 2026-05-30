# 🤖 AI代码重构建议生成器

一个功能强大的命令行工具，用于分析代码质量并生成智能重构建议。

## ✨ 功能特性

| 功能 | 状态 | 描述 |
|------|------|------|
| 🔍 代码复杂度分析 | ✅ | 圈复杂度、可维护性指数、重复度、耦合度 |
| 🎯 智能重构建议 | ✅ | 12种重构类型，包含before/after示例 |
| 📁 批量分析 | ✅ | 整个项目目录扫描，生成优先级列表 |
| 💬 用户反馈系统 | ✅ | 采纳/拒绝建议，本地持久化存储 |
| 🔗 Git集成 | ✅ | 只扫描未提交的变更文件 |
| 📄 Markdown报告 | ✅ | 完整的重构建议报告导出 |
| 🔎 智能过滤 | ✅ | 按类型、优先级、阈值过滤建议 |
| 📉 复杂度预估 | ✅ | 显示应用建议后的复杂度降低值 |
| 🔄 模拟重构 | ✅ | 重命名、格式化diff展示，不修改文件 |

## 🚀 快速开始

### 方式一：标准安装（推荐）

```bash
# 克隆或下载项目后
cd ai-refactor

# 安装依赖
pip install -r requirements.txt

# 开发模式安装（推荐）
pip install -e .
```

### 方式二：离线安装（网络受限环境）

如果网络环境受限，无法直接通过pip安装，可以使用以下方案：

#### 方案A：使用国内镜像源

```bash
# 使用清华镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 或使用阿里云镜像
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
```

#### 方案B：纯Python模式（无需额外依赖）

本工具已内置 fallback 实现，即使不安装 `radon` 和 `gitpython` 也能正常运行：

```bash
# 仅安装核心依赖（click和rich通常已预装或容易安装）
pip install click rich

# 运行工具（功能完整，只是复杂度计算使用内置算法）
python ai_refactor.py analyze sample_code.py
```

#### 方案C：离线包安装

1. 在有网络的机器上下载依赖包：
```bash
pip download -r requirements.txt -d ./packages
```

2. 将 `packages` 目录拷贝到目标机器，然后：
```bash
pip install --no-index --find-links=./packages -r requirements.txt
```

### 方式三：直接运行（无需安装）

```bash
# 直接运行主程序
python ai_refactor.py --help
```

## 📖 命令详解

### 1. 单个文件分析

```bash
# 基础分析
ai-refactor analyze path/to/file.py

# 显示diff差异
ai-refactor analyze file.py --show-diff

# 按类型过滤
ai-refactor analyze file.py --type split_long_function

# 按优先级过滤
ai-refactor analyze file.py --priority high

# 自定义阈值
ai-refactor analyze file.py --threshold 15 --line-threshold 60
```

### 2. 批量项目分析

```bash
# 当前目录所有Python文件
ai-refactor batch .

# 递归扫描子目录
ai-refactor batch . --recursive

# 只分析Git未提交的变更
ai-refactor batch . --git-only

# 自定义文件匹配模式
ai-refactor batch src --pattern "*.py" --pattern "*.pyw"

# 导出Markdown报告
ai-refactor batch . --export refactor_report.md

# 只显示前10个优先级最高的文件
ai-refactor batch . --top-n 10
```

### 3. Git集成模式

```bash
# 仅扫描有变更的文件（适合Code Review）
ai-refactor batch . --git-only --export code_review.md
```

### 4. 用户反馈系统

```bash
# 采纳建议
ai-refactor feedback sugg_0001 sugg_0002 --accept

# 拒绝建议
ai-refactor feedback sugg_0003 sugg_0004 --reject

# 查看反馈统计
ai-refactor stats
```

反馈数据存储在 `~/.ai-refactor/feedback/feedback.json`

### 5. 模拟重构（安全模式）

```bash
# 模拟重命名变量/函数
ai-refactor simulate-rename file.py old_var new_var

# 模拟代码格式化
ai-refactor simulate-format file.py
```

⚠️ 这些命令只显示diff差异，**不会修改原文件**。

### 6. 导出完整报告

```bash
ai-refactor export-report . --output full_report.md --recursive
```

## 🎨 重构建议类型

| 类型 | 优先级 | 说明 |
|------|--------|------|
| `extract_function` | 中-高 | 提取重复代码为独立函数 |
| `split_long_function` | 中-高 | 拆分过长函数（>50行） |
| `merge_similar_if` | 中 | 合并相似的if分支 |
| `simplify_conditionals` | 中 | 简化条件逻辑 |
| `reduce_coupling` | 中 | 降低模块间耦合度 |
| `improve_naming` | 低 | 改进变量/函数命名 |
| `extract_class` | 高 | 从大类中提取新类 |
| `replace_magic_number` | 低 | 替换魔法数字 |
| `optimize_imports` | 低 | 优化导入语句顺序 |
| `remove_duplication` | 中-高 | 消除代码重复 |
| `rename_variable` | 低 | 重命名变量 |
| `move_function` | 中 | 移动函数到更合适的位置 |

## ⚙️ 配置参数

### 全局阈值选项

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--threshold, -t` | 10 | 圈复杂度告警阈值 |
| `--line-threshold, -l` | 50 | 函数行数告警阈值 |
| `--dup-threshold, -d` | 0.3 | 重复度告警阈值 (0.0-1.0) |

### 过滤选项

| 选项 | 有效值 | 说明 |
|------|--------|------|
| `--type` | 见重构类型表 | 只显示特定类型的建议 |
| `--priority` | high/medium/low | 只显示特定优先级的建议 |

## 📊 代码指标说明

### 圈复杂度 (Cyclomatic Complexity)

衡量代码的逻辑复杂度：
- **1-10**: 良好 ✅
- **11-20**: 中等 ⚠️
- **21+**: 高风险 ❌ 建议重构

### 可维护性指数 (Maintainability Index)

综合衡量代码的可维护性：
- **70-100**: 高可维护性 ✅
- **50-69**: 中等 ⚠️
- **0-49**: 低可维护性 ❌

### 重复度 (Duplication Score)

代码重复程度：
- **0-20%**: 良好 ✅
- **20-40%**: 中等 ⚠️
- **40%+**: 高重复 ❌

### 耦合度 (Coupling Score)

模块间依赖程度：
- **0-30%**: 低耦合 ✅
- **30-60%**: 中等 ⚠️
- **60%+**: 高耦合 ❌

## 🔧 开发指南

### 项目结构

```
ai-refactor/
├── ai_refactor.py          # 主程序入口
├── sample_code.py          # 测试示例代码
├── setup.py                # 安装配置
├── requirements.txt        # 依赖列表
└── README.md               # 本文档
```

### 运行测试

```bash
# 分析示例代码
python ai_refactor.py analyze sample_code.py

# 批量分析
python ai_refactor batch . --top-n 5

# 测试所有命令
python ai_refactor --help
python ai_refactor stats
```

## 🤝 常见问题

### Q: 安装radon失败怎么办？
A: 工具内置了纯Python的复杂度计算fallback，即使不装radon也能正常使用。你也可以尝试使用国内镜像源：
```bash
pip install radon -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q: Git功能不工作？
A: 确保：1) 当前目录是Git仓库 2) 已安装gitpython（或使用纯Python模式，Git功能会被自动禁用）

### Q: 反馈数据存在哪里？
A: 所有用户反馈都存储在 `~/.ai-refactor/feedback/feedback.json`，可以手动备份或编辑。

### Q: 如何重置所有反馈？
A: 删除 `~/.ai-refactor/feedback/feedback.json` 文件即可。

## 📝 更新日志

### v1.0.0 (2026-05-31)
- ✅ 初始版本发布
- ✅ 12种重构建议类型
- ✅ Git集成支持
- ✅ 用户反馈系统
- ✅ Markdown报告导出
- ✅ 模拟重构和diff展示

## 📄 许可证

MIT License - 可自由使用和修改。

## 🤖 关于

AI代码重构建议生成器 - 让代码质量改进更简单！
