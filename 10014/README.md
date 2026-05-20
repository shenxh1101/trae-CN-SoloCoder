# 中文文本情感分析工具

基于 Hugging Face Transformers 的批量文本情感分析工具，使用预训练的中文情感模型（如 bert-base-chinese-finetuned-sentiment）对批量文本进行情感分类，支持词云图生成、情感趋势分析、典型例句提取等功能。

## 功能特性

- **情感分析**: 使用预训练的深度学习模型对中文文本进行情感分类（正面/负面/中性）
- **批量处理**: 支持 CSV 文件批量处理，可通过 `--batch-size` 参数配置批处理大小
- **GPU 加速**: 自动检测并使用 CUDA (NVIDIA)、MPS (Apple Silicon) 或 CPU 运行
- **模型缓存**: 支持自定义模型缓存目录，支持离线使用
- **词云图**: 分别生成正面（绿色）和负面（红色）情感文本的词云图
- **情感趋势图**: 如果数据包含时间戳，可生成情感随时间变化的趋势折线图
- **典型例句**: 自动提取各情感类别中置信度最高的 5 条典型例句
- **结果输出**: 输出包含情感标签和置信度的 CSV 文件及分析总结报告

## 环境要求

- Python 3.8+
- 建议使用虚拟环境
- 建议使用 conda 或 venv 管理环境

## 安装依赖

```bash
pip install -r requirements.txt
```

依赖列表包括：
- `torch`: PyTorch 深度学习框架，支持 GPU 加速
- `transformers`: Hugging Face 模型库，用于加载预训练模型
- `pandas`: 数据处理库，用于读取和写入 CSV 文件
- `numpy`: 数值计算库
- `matplotlib`: 绘图库，用于生成趋势图
- `wordcloud`: 词云图库，用于生成词云图
- `jieba`: 中文分词库，用于词云图的文本预处理
- `scikit-learn`: 机器学习库，提供辅助功能
- `pillow`: 图像处理库
- `tqdm`: 进度条库
- `sentencepiece`: 子词分词器，部分模型需要
- `huggingface-hub`: Hugging Face Hub 客户端，用于下载模型

## 使用方法

### 基本使用

```bash
python sentiment_analysis.py --input sample_data.csv --text-column text
```

### 带时间戳的情感分析（生成趋势图）

```bash
python sentiment_analysis.py --input sample_data.csv --text-column text --timestamp-column timestamp
```

### 自定义模型和参数

```bash
python sentiment_analysis.py \
    --input your_data.csv \
    --text-column content \
    --timestamp-column date \
    --output-dir ./results \
    --batch-size 32 \
    --model-name bert-base-chinese-finetuned-sentiment \
    --cache-dir ./model_cache
```

### 禁用词云图或趋势图

```bash
python sentiment_analysis.py --input sample_data.csv --no-wordcloud --no-trend
```

### 指定中文字体路径（用于词云图）

```bash
# macOS
python sentiment_analysis.py --input sample_data.csv --font-path /System/Library/Fonts/PingFang.ttc

# Windows
python sentiment_analysis.py --input sample_data.csv --font-path "C:/Windows/Fonts/msyh.ttc"

# Linux
python sentiment_analysis.py --input sample_data.csv --font-path /usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc
```

## 命令行参数说明

| 参数 | 缩写 | 默认值 | 说明 |
|------|------|--------|------|
| `--input` | `-i` | 必填 | 输入 CSV 文件路径 |
| `--text-column` | `-t` | `text` | 文本列名 |
| `--timestamp-column` | `-ts` | `None` | 时间戳列名（可选，提供则生成趋势图） |
| `--output-dir` | `-o` | `./output` | 输出目录 |
| `--model-name` | `-m` | `bert-base-chinese-finetuned-sentiment` | 预训练模型名称或路径 |
| `--cache-dir` | `-c` | `~/.cache/huggingface/hub` | 模型缓存目录 |
| `--batch-size` | `-b` | `16` | 批处理大小 |
| `--font-path` | `-f` | `None` | 中文字体路径（词云图用） |
| `--no-wordcloud` | - | `False` | 禁用词云图生成 |
| `--no-trend` | - | `False` | 禁用趋势图生成 |

## 推荐模型

### 默认模型
- `bert-base-chinese-finetuned-sentiment`
  - 基于 BERT-base-chinese 微调的中文情感分析模型
  - 三分类（正面/负面/中性）
  - 如该模型不可用，脚本会自动尝试以下备选模型

### 备选模型（自动回退）
脚本内置多个备选模型，当默认模型不可用时会自动按顺序尝试：

1. `lxyuan/distilbert-base-multilingual-cased-sentiments-student`
   - 轻量级多语言情感分析模型
   - 支持包括中文在内的多种语言
   - 速度快，适合大批量处理
   - 三分类（正面/负面/中性）

2. `uer/roberta-base-finetuned-dianping-chinese`
   - 基于大众点评评论微调的中文情感分析模型
   - 二分类（正面/负面）

3. `techthiyanes/chinese_sentiment`
   - 中文情感分析模型

4. `liam168/c2-roberta-base-finetuned-dianping-chinese`
   - 中文电商评论情感分析模型

## 模型缓存说明

### 缓存位置

默认情况下，Hugging Face 模型会下载到以下位置：

| 操作系统 | 默认缓存路径 |
|----------|-------------|
| Linux/macOS | `~/.cache/huggingface/hub` |
| Windows | `C:\Users\<username>\.cache\huggingface\hub` |

可以通过以下方式自定义缓存目录：

**方式 1：命令行参数**
```bash
python sentiment_analysis.py --input sample_data.csv --cache-dir ./my_cache
```

**方式 2：环境变量**
```bash
export TRANSFORMERS_CACHE=/path/to/custom/cache
export HF_HOME=/path/to/custom/hf_home
python sentiment_analysis.py --input sample_data.csv
```

### 模型缓存目录结构

模型下载后，缓存目录结构如下：
```
~/.cache/huggingface/hub/
└── models--bert-base-chinese-finetuned-sentiment/
    ├── blobs/
    │   ├── config.json
    │   ├── pytorch_model.bin
    │   ├── tokenizer.json
    │   ├── tokenizer_config.json
    │   └── vocab.txt
    ├── refs/
    │   └── main
    └── snapshots/
        └── <commit_hash>/
            ├── config.json -> ../../blobs/config.json
            ├── pytorch_model.bin -> ../../blobs/pytorch_model.bin
            └── ...
```

### 离线使用

如需在离线环境中使用，可以预先下载模型并使用本地路径：

**步骤 1：在联网机器上下载模型**
```bash
# 方法 1：使用 Python 脚本下载
python -c "
from transformers import AutoModelForSequenceClassification, AutoTokenizer
model_name = 'bert-base-chinese-finetuned-sentiment'
cache_dir = './model_cache'
tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
model = AutoModelForSequenceClassification.from_pretrained(model_name, cache_dir=cache_dir)
print(f'Model saved to {cache_dir}')
"

# 方法 2：使用 huggingface-cli 下载
pip install huggingface_hub
huggingface-cli download bert-base-chinese-finetuned-sentiment --local-dir ./model_cache --local-dir-use-symlinks False
```

**步骤 2：使用本地模型运行**
```bash
python sentiment_analysis.py --input sample_data.csv --model-name ./model_cache
```

### 国内镜像加速

如果在中国大陆访问 Hugging Face 较慢，可以使用镜像源：

```bash
# 设置环境变量
export HF_ENDPOINT=https://hf-mirror.com

# 然后正常运行脚本
python sentiment_analysis.py --input sample_data.csv
```

或者在 Python 脚本中设置：
```python
import os
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
```

### 清除缓存

如需清除缓存释放空间：
```bash
# 清除特定模型缓存
rm -rf ~/.cache/huggingface/hub/models--bert-base-chinese-finetuned-sentiment

# 清除所有 huggingface 缓存
rm -rf ~/.cache/huggingface
```

## 输入文件格式

输入 CSV 文件至少需要包含一个文本列。如果需要生成趋势图，还需要包含时间戳列。

示例：
```csv
text,timestamp
这家餐厅的菜品非常美味,2024-01-15 10:30:00
产品质量很差,2024-01-15 11:20:00
今天天气不错,2024-01-15 12:00:00
```

支持的时间戳格式：
- `YYYY-MM-DD HH:MM:SS`
- `YYYY-MM-DD`
- `YYYY/MM/DD HH:MM:SS`
- 其他 pandas 可解析的日期格式

## 输出文件

运行后会在输出目录生成以下文件：

| 文件名 | 说明 |
|--------|------|
| `sentiment_results.csv` | 包含情感标签和置信度的完整结果 |
| `analysis_summary.txt` | 分析总结报告（数量统计、平均置信度等） |
| `正面_词云图.png` | 正面情感词云图（绿色，可选） |
| `负面_词云图.png` | 负面情感词云图（红色，可选） |
| `情感趋势图.png` | 情感趋势变化图（如果提供时间戳） |

### sentiment_results.csv 格式
```csv
text,timestamp,sentiment_label,confidence
这家餐厅的菜品非常美味,2024-01-15 10:30:00,正面,0.9876
产品质量很差,2024-01-15 11:20:00,负面,0.9543
...
```

### analysis_summary.txt 示例
```
情感分析总结报告
==================================================

total_texts: 30
positive_count: 12
neutral_count: 8
negative_count: 10
avg_confidence: 0.9123
model_used: bert-base-chinese-finetuned-sentiment
device: mps
```

## 性能说明

### GPU 加速
- **CUDA (NVIDIA)**: 自动检测，支持 CUDA 11.0+
- **MPS (Apple Silicon)**: 自动检测，适用于 M1/M2/M3 系列芯片
- **CPU**: 无 GPU 时自动回退

### 批处理大小建议
根据显存大小调整 `--batch-size` 参数：

| 显存大小 | 建议批处理大小 |
|----------|---------------|
| 4GB | 8-16 |
| 8GB | 16-32 |
| 16GB+ | 32-64 |

### 处理速度参考
- CPU (Intel i7-10700): 约 5-10 条/秒
- MPS (Apple M1 Pro): 约 20-30 条/秒
- CUDA (NVIDIA RTX 3090): 约 100-200 条/秒

## 核心代码实现说明

### 1. 模型加载
```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
model = AutoModelForSequenceClassification.from_pretrained(model_name, cache_dir=cache_dir)
```

### 2. 情感分析 pipeline
```python
from transformers import pipeline

sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model=model,
    tokenizer=tokenizer,
    device=0 if cuda else (-1 if cpu else "mps"),
    batch_size=batch_size,
)
```

### 3. GPU 自动检测
```python
if torch.cuda.is_available():
    device = torch.device("cuda")
elif torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")
```

### 4. 词云图生成
- 使用 jieba 进行中文分词
- 过滤停用词和单字词
- 正面词云使用绿色系，负面词云使用红色系

### 5. 情感趋势图
- 将情感标签映射为数值（正面=1，中性=0，负面=-1）
- 按日期重采样计算平均情感分数
- 绘制双图：平均情感趋势 + 各类别数量趋势

## 常见问题

### 1. 词云图中文显示乱码
**问题**: 词云图中的中文字符显示为方框或乱码
**解决方案**: 指定中文字体路径
```bash
# macOS
python sentiment_analysis.py --input sample_data.csv --font-path /System/Library/Fonts/PingFang.ttc

# Windows
python sentiment_analysis.py --input sample_data.csv --font-path "C:/Windows/Fonts/msyh.ttc"
```

### 2. 模型下载失败
**可能原因**: 网络问题、模型不存在、权限问题
**解决方案**:
- 检查网络连接
- 使用国内镜像源：`export HF_ENDPOINT=https://hf-mirror.com`
- 手动下载模型后使用本地路径
- 检查磁盘空间和权限

### 3. 内存不足 (CUDA out of memory)
**解决方案**:
- 减小 `--batch-size` 参数
- 使用更小的模型（如 distilbert 系列）
- 清理 GPU 显存：`torch.cuda.empty_cache()`

### 4. 模型返回的标签不是正面/负面/中性
**原因**: 不同模型的标签输出格式不同
**解决方案**: 脚本已内置标签映射函数，会自动将各种格式的标签映射为统一的中文标签。

### 5. 情感趋势图生成失败
**可能原因**: 时间戳格式不正确
**解决方案**: 确保时间戳列的格式是 pandas 可解析的，如 `YYYY-MM-DD HH:MM:SS`

## 示例数据

`sample_data.csv` 包含 30 条示例文本，涵盖正面、负面和中性情感，可用于测试工具功能。

运行示例：
```bash
python sentiment_analysis.py --input sample_data.csv --timestamp-column timestamp --output-dir ./output
```

## 许可协议

本工具仅供学习和研究使用。
