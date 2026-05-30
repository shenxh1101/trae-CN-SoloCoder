# 🎬 AI 视频分镜脚本生成器

一个功能强大的命令行AI视频脚本分镜生成器，基于大语言模型智能生成专业视频分镜。

## ✨ 功能特性

- 📝 **智能分镜生成** - 输入简短创意，自动生成专业分镜脚本
- ⏱️ **时长控制** - 支持指定视频时长，自动分配镜头时间
- 📊 **多格式导出** - 支持 CSV、Markdown、PDF、HTML 四种格式
- ✏️ **镜头修改** - 支持对单个镜头进行修改调整
- 📦 **批量生成** - 从文件读取多个创意，批量输出分镜
- 🖼️ **风格参考** - 上传参考图片，调整画面描述风格
- 📈 **节奏分析** - 显示整体视频的节奏曲线和转场建议
- 🎨 **故事板** - 生成可视化 HTML 故事板

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置 API Key

复制 `.env.example` 为 `.env` 并填入你的 API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
```

### 3. 开始使用

```bash
# 查看帮助
python main.py --help

# 生成单个分镜
python main.py generate "一个程序员深夜修复bug" --duration 30 --format markdown html

# 查看使用示例
python main.py examples
```

## 📖 使用示例

### 1. 生成单个分镜脚本

```bash
python main.py generate "一个程序员深夜修复bug，突然灵光一闪" \
  --duration 30 \
  --format markdown html pdf \
  --output output
```

### 2. 使用参考图片风格

```bash
python main.py generate "浪漫的日落海滩" \
  --image reference.jpg \
  --format html
```

### 3. 修改指定镜头

```bash
python main.py modify 3 "将景别改为特写" \
  --creative "程序员深夜写代码"
```

### 4. 批量生成分镜

```bash
python main.py batch examples/creatives.txt \
  --duration 60 \
  --format markdown csv
```

### 5. 分析参考图片

```bash
python main.py analyze-image reference.jpg
```

### 6. 查看配置信息

```bash
python main.py config
```

## 📁 项目结构

```
.
├── main.py                 # 主命令行入口
├── requirements.txt        # 依赖列表
├── .env.example           # 环境变量示例
├── examples/              # 示例文件
│   └── creatives.txt      # 创意示例
├── src/                   # 源代码
│   ├── storyboard_generator.py   # 分镜生成引擎
│   ├── exporter.py               # 文件导出模块
│   ├── batch_processor.py        # 批量处理模块
│   ├── image_analyzer.py         # 图片风格分析
│   ├── pace_analyzer.py          # 节奏分析模块
│   └── storyboard_html.py        # HTML故事板生成
└── output/                # 输出目录(自动创建)
```

## 🎬 分镜字段说明

| 字段 | 说明 | 可选值 |
|------|------|--------|
| 镜头序号 | 镜头编号 | 1, 2, 3... |
| 景别 | 镜头类型 | 远景、全景、中景、近景、特写 |
| 画面描述 | 具体的画面内容 | - |
| 台词/旁白 | 人物对话或旁白 | - |
| 建议时长 | 该镜头持续时间 | 秒 |
| 节奏 | 镜头节奏 | 紧张、正常、舒缓 |
| 转场 | 转场方式 | 切、淡入淡出、滑动、缩放、旋转 |

## 🔧 高级用法

### 使用不同的模型

```bash
export OPENAI_MODEL=gpt-4
python main.py generate "..."
```

### 配合其他兼容 API

修改 `.env` 中的 `OPENAI_BASE_URL` 即可使用兼容 OpenAI 格式的其他 API 服务。

## 📝 注意事项

1. 需要有效的 OpenAI API Key 才能使用
2. 生成分镜会消耗 API 额度，请合理使用
3. 建议先使用较短的时长(30秒)测试效果
4. 批量生成前建议先测试单个创意

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
