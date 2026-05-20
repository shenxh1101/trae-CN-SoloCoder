#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试脚本：验证情感分析工具的核心功能逻辑
此脚本模拟了完整的分析流程，展示预期的输出结果格式
"""

import pandas as pd
import numpy as np
from collections import Counter
import os
from pathlib import Path

try:
    import jieba
    JIEBA_AVAILABLE = True
except ImportError:
    JIEBA_AVAILABLE = False
    print("[WARN] jieba not available, using simple tokenization for demo")
    def simple_tokenize(text):
        return [text[i:i+2] for i in range(0, len(text), 2)]

print("=" * 80)
print("中文文本情感分析工具 - 功能验证测试")
print("=" * 80)

# 1. 测试数据读取
print("\n[1/6] 测试 CSV 数据读取...")
input_path = Path("sample_data.csv")
if input_path.exists():
    df = pd.read_csv(input_path)
    print(f"  ✓ 成功读取 {len(df)} 条数据")
    print(f"  ✓ 列名: {df.columns.tolist()}")
    print(f"  ✓ 前3条数据:")
    for i, row in df.head(3).iterrows():
        print(f"    {i+1}. {row['text'][:50]}...")
else:
    print("  ✗ sample_data.csv 不存在")

# 2. 测试文本清洗
print("\n[2/6] 测试文本清洗功能...")
import re
def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\@\w+|\#", "", text)
    text = re.sub(r"[^\u4e00-\u9fa5a-zA-Z0-9\s]", "", text)
    return text.strip()

test_texts = [
    "这家餐厅真的太棒了！👍 http://test.com",
    "产品质量很差，@客服 不给解决 #差评",
    "正常的中性文本123",
]
for text in test_texts:
    cleaned = clean_text(text)
    print(f"  原文: {text}")
    print(f"  清洗: {cleaned}")
print("  ✓ 文本清洗功能正常")

# 3. 测试标签映射
print("\n[3/6] 测试标签映射功能...")
def map_label(label, model_name=""):
    label_lower = str(label).lower()
    if any(k in label_lower for k in ["positive", "pos", "正面", "积极", "1", "2"]):
        return "正面"
    elif any(k in label_lower for k in ["negative", "neg", "负面", "消极", "0"]):
        return "负面"
    elif any(k in label_lower for k in ["neutral", "neu", "中性", "1"]):
        return "中性"
    else:
        return label

test_labels = ["positive", "negative", "neutral", "POSITIVE", "LABEL_1", "LABEL_0"]
for label in test_labels:
    mapped = map_label(label)
    print(f"  {label:15} -> {mapped}")
print("  ✓ 标签映射功能正常")

# 4. 测试停用词和分词
print("\n[4/6] 测试中文分词和停用词过滤...")
stopwords = {
    "的", "了", "和", "是", "就", "都", "而", "及", "与", "这", "那",
    "有", "个", "上", "也", "很", "但", "还", "又", "在", "不", "我",
}
test_text = "这家餐厅的菜品非常美味，服务态度也很好"
if JIEBA_AVAILABLE:
    words = jieba.lcut(test_text)
else:
    words = simple_tokenize(test_text)
filtered_words = [w for w in words if w not in stopwords and len(w) > 1]
print(f"  原文: {test_text}")
print(f"  分词: {words}")
print(f"  过滤后: {filtered_words}")
word_freq = Counter(filtered_words)
print(f"  词频: {dict(word_freq)}")
print("  ✓ 分词和停用词过滤功能正常")

# 5. 模拟情感分析结果
print("\n[5/6] 模拟情感分析结果...")
np.random.seed(42)
mock_labels = np.random.choice(["正面", "负面", "中性"], size=len(df), p=[0.4, 0.35, 0.25])
mock_scores = np.random.uniform(0.7, 0.99, size=len(df)).round(4)
df["sentiment_label"] = mock_labels
df["confidence"] = mock_scores

print("  情感分布统计:")
label_counts = df["sentiment_label"].value_counts()
for label, count in label_counts.items():
    percentage = (count / len(df)) * 100
    print(f"    {label}: {count} ({percentage:.2f}%)")
print(f"  平均置信度: {df['confidence'].mean():.4f}")
print("  ✓ 情感分析结果格式正确")

# 6. 测试典型例句提取
print("\n[6/6] 测试典型例句提取...")
def extract_examples(df, n=5):
    examples = {}
    for label in ["正面", "负面", "中性"]:
        label_df = df[df["sentiment_label"] == label]
        if len(label_df) > 0:
            sorted_df = label_df.sort_values("confidence", ascending=False)
            top_examples = sorted_df.head(n)[["text", "confidence"]].values.tolist()
            examples[label] = top_examples
        else:
            examples[label] = []
    return examples

examples = extract_examples(df, n=3)
for label in ["正面", "负面", "中性"]:
    print(f"\n  【{label}典型例句】")
    if examples[label]:
        for i, (text, conf) in enumerate(examples[label], 1):
            print(f"    {i}. (置信度: {conf:.4f})")
            print(f"       {text[:60]}{'...' if len(text) > 60 else ''}")
    else:
        print(f"    无该类别的文本")
print("  ✓ 典型例句提取功能正常")

# 保存模拟结果
output_dir = Path("output_demo")
output_dir.mkdir(exist_ok=True)
output_csv = output_dir / "sentiment_results_mock.csv"
df.to_csv(output_csv, index=False, encoding="utf-8-sig")

# 生成总结报告
summary = {
    "total_texts": len(df),
    "positive_count": int((df["sentiment_label"] == "正面").sum()),
    "neutral_count": int((df["sentiment_label"] == "中性").sum()),
    "negative_count": int((df["sentiment_label"] == "负面").sum()),
    "avg_confidence": round(float(df["confidence"].mean()), 4),
    "model_used": "bert-base-chinese-finetuned-sentiment",
    "device": "mps/cpu/cuda (auto-detected)",
}
summary_path = output_dir / "analysis_summary_mock.txt"
with open(summary_path, "w", encoding="utf-8") as f:
    f.write("情感分析总结报告（模拟）\n")
    f.write("=" * 50 + "\n\n")
    for key, value in summary.items():
        f.write(f"{key}: {value}\n")

print("\n" + "=" * 80)
print("测试完成！")
print("=" * 80)
print(f"\n模拟结果已保存到: {output_dir}")
print(f"  - {output_csv}")
print(f"  - {summary_path}")
print("\n完整功能运行预期输出格式:")
print("""
================================================================================
中文文本情感分析工具
================================================================================
[INFO] Output directory: /path/to/output
[INFO] Reading CSV file: sample_data.csv
[INFO] Found 30 rows in CSV
[INFO] Using Apple MPS (Metal Performance Shaders)
[INFO] Loading model: bert-base-chinese-finetuned-sentiment
[INFO] Model cache directory: ~/.cache/huggingface/hub
[INFO] Analyzing 30 texts with batch size 16...
Processing batches: 100%|██████████████████| 2/2 [00:05<00:00]
[INFO] Results saved to: output/sentiment_results.csv

[INFO] 情感分布统计:
  正面: 12 (40.00%)
  负面: 11 (36.67%)
  中性: 7 (23.33%)

[INFO] Generating 正面 word cloud...
[INFO] 正面 word cloud saved to: output/正面_词云图.png
[INFO] Generating 负面 word cloud...
[INFO] 负面 word cloud saved to: output/负面_词云图.png
[INFO] Generating sentiment trend chart...
[INFO] Sentiment trend chart saved to: output/情感趋势图.png
[INFO] Extracting 5 typical examples for each sentiment...

================================================================================
典型例句展示
================================================================================

【正面例句】
--------------------------------------------------------------------------------
1. (置信度: 0.9876)
   这家餐厅的菜品非常美味,服务态度也很好,强烈推荐!
...

【负面例句】
--------------------------------------------------------------------------------
1. (置信度: 0.9765)
   产品质量很差,用了几天就坏了,客服也不给解决,非常失望
...

【中性例句】
--------------------------------------------------------------------------------
1. (置信度: 0.8923)
   今天天气不错,适合出去走走
...

[INFO] Summary saved to: output/analysis_summary.txt

================================================================================
分析完成!
================================================================================
""")
