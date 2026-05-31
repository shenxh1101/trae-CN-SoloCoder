# AI产品说明书自动撰写工具

基于大语言模型的智能产品说明书生成工具，支持多种风格、多语言、批量生成。

## 功能特性

- ✅ **AI智能生成** - 输入产品功能点和定位，自动生成完整产品说明书
- 🎨 **三种写作风格** - 专业严谨、通俗易懂、营销导向
- 🌐 **多语言支持** - 中英文双语输出
- 📦 **批量处理** - 从CSV读取多款产品，批量生成说明书
- 📄 **多格式导出** - Markdown、HTML、纯文本
- 🔧 **交互式编辑** - 预览内容，标记修改意见，重新生成
- 📐 **模板学习** - 从优秀模板中学习结构和风格
- 🎯 **广告语生成** - 自动提炼产品卖点生成广告语
- 📦 **ZIP打包** - 打包多格式文档，生成产品展示页面

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置你的API密钥：

```
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

### 3. 生成单款产品说明书

```bash
# 基础用法
python pmg.py generate --name "智能旗舰手机" \
    --features "无线充电;IP68防水;夜景拍照;5G通信" \
    --positioning "商务旗舰手机"

# 指定风格和格式
python pmg.py generate -n "智能旗舰手机" \
    -f "无线充电;IP68防水;夜景拍照;5G通信" \
    -p "商务旗舰手机" \
    -s marketing \
    -l zh \
    -fmt html

# 交互模式（支持预览和修改）
python pmg.py generate -n "智能旗舰手机" \
    -f "无线充电;IP68防水;夜景拍照" \
    -p "商务旗舰手机" \
    -i
```

## 命令详解

### 生成说明书 (`generate`)

| 参数 | 简写 | 说明 | 必填 |
|------|------|------|------|
| `--name` | `-n` | 产品名称 | ✅ |
| `--features` | `-f` | 核心功能点，分号分隔 | ✅ |
| `--positioning` | `-p` | 产品定位 | ✅ |
| `--style` | `-s` | 写作风格: professional/simple/marketing | ❌ |
| `--language` | `-l` | 语言: zh/en | ❌ |
| `--format` | `-fmt` | 输出格式: markdown/html/text | ❌ |
| `--output` | `-o` | 输出文件路径 | ❌ |
| `--template` | `-t` | 使用的模板名称 | ❌ |
| `--interactive` | `-i` | 交互模式 | ❌ |

### 批量生成 (`batch`)

```bash
python pmg.py batch -i examples/products.csv -o output/
```

**CSV文件格式示例** (`examples/products.csv`):
```csv
product_name,features,positioning,style,language,output_format
智能手表X1,心率监测;睡眠追踪;GPS定位,运动健康手表,professional,zh,markdown
```

### 模板学习 (`learn-template`)

```bash
# 分析现有模板
python pmg.py learn-template -i examples/sample_template.md -n professional

# 查看所有模板
python pmg.py list-templates

# 创建示例模板
python pmg.py create-sample-template -n default
```

### 生成广告语 (`slogan`)

```bash
python pmg.py slogan -n "智能旗舰手机" \
    -f "无线充电;IP68防水;夜景拍照" \
    -p "商务旗舰手机"
```

### 预览和编辑 (`preview`)

```bash
python pmg.py preview -i output/产品名_data.json
```

### 打包产品 (`package`)

```bash
python pmg.py package -i output/产品名_data.json \
    -img "images/product1.jpg;images/product2.jpg" \
    -f "markdown;html;text"
```

### 生成产品页面 (`product-page`)

```bash
python pmg.py product-page -i output/产品名_data.json \
    -img "images/product1.jpg"
```

## 写作风格说明

| 风格 | 说明 | 适用场景 |
|------|------|----------|
| `professional` | 专业严谨，技术术语准确，数据详实 | 企业级产品、技术设备 |
| `simple` | 通俗易懂，口语化，避免专业术语 | 消费电子、日用品 |
| `marketing` | 营销导向，有感染力，突出用户价值 | 新品发布、广告宣传 |

## 项目结构

```
.
├── cli.py              # 命令行入口
├── config.py           # 配置管理
├── llm_client.py       # LLM API客户端
├── manual_generator.py # 说明书生成核心
├── prompts.py          # 提示词模板
├── batch_processor.py  # 批量处理
├── template_learner.py # 模板学习
├── package_builder.py  # 打包和产品页面
├── preview_editor.py   # 预览和编辑
├── examples/           # 示例文件
│   ├── products.csv
│   └── sample_template.md
├── templates/          # 已学习的模板
├── output/             # 输出目录
├── requirements.txt    # 依赖包
└── .env.example        # 环境变量示例
```

## 常见问题

**Q: 支持哪些LLM API？**
A: 支持所有OpenAI兼容的API，包括OpenAI、Azure OpenAI、本地部署的模型（如vLLM、Ollama等）。

**Q: 如何添加自定义章节结构？**
A: 使用 `learn-template` 命令分析现有模板，或直接编辑 `templates/` 目录下的JSON文件。

**Q: 生成的内容可以修改吗？**
A: 可以，使用 `-i` 参数进入交互模式，可以修改整个文档或特定章节。

## License

MIT
