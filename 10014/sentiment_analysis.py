#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import os
import re
import warnings
from collections import Counter
from pathlib import Path

import jieba
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
from tqdm import tqdm
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    pipeline,
)
from wordcloud import WordCloud

warnings.filterwarnings("ignore")

os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "true"


def set_device():
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"[INFO] Using GPU: {torch.cuda.get_device_name(0)}")
    elif torch.backends.mps.is_available():
        device = torch.device("mps")
        print("[INFO] Using Apple MPS (Metal Performance Shaders)")
    else:
        device = torch.device("cpu")
        print("[INFO] Using CPU")
    return device


def load_stopwords():
    default_stopwords = {
        "的", "了", "和", "是", "就", "都", "而", "及", "与", "这", "那",
        "有", "个", "上", "也", "很", "但", "还", "又", "在", "不", "我",
        "你", "他", "她", "它", "我们", "你们", "他们", "她们", "它们",
        "这个", "那个", "什么", "怎么", "为什么", "哪", "哪里", "谁",
        "多少", "几", "多", "少", "大", "小", "来", "去", "到", "把",
        "被", "让", "给", "从", "向", "对", "以", "为", "因", "由于",
        "所以", "如果", "虽然", "但是", "然而", "而且", "并且", "或者",
        "还是", "要么", "不是", "就是", "既", "又", "不但", "而且",
        "无论", "都", "不管", "也", "即使", "也", "只要", "就", "只有",
        "才", "啊", "哦", "呀", "呢", "吧", "吗", "啦", "嘛", "嗯",
        "哈哈", "呵呵", "唉", "哦", "咦", "哇", "啊", "嗯", "嗷",
        " ", ",", ".", "!", "?", ";", ":", "\"", "'", "(", ")", "[", "]",
        "{", "}", "<", ">", "/", "\\", "|", "-", "_", "+", "=", "*", "&",
        "^", "%", "$", "#", "@", "!", "~", "`", "，", "。", "！", "？",
        "；", "：", "“", "”", "‘", "’", "（", "）", "【", "】", "、",
        "…", "—", "·", "《", "》", "〈", "〉", "「", "」", "『", "』",
    }
    return default_stopwords


def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\@\w+|\#", "", text)
    text = re.sub(r"[^\u4e00-\u9fa5a-zA-Z0-9\s]", "", text)
    text = text.strip()
    return text


def get_model_and_tokenizer(model_name, cache_dir):
    print(f"[INFO] Loading model: {model_name}")
    print(f"[INFO] Model cache directory: {cache_dir}")

    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        cache_dir=cache_dir,
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        cache_dir=cache_dir,
    )

    return tokenizer, model


def map_label(label, model_name):
    label_lower = str(label).lower()

    if any(k in label_lower for k in ["positive", "pos", "正面", "积极", "1", "2"]):
        return "正面"
    elif any(k in label_lower for k in ["negative", "neg", "负面", "消极", "0"]):
        return "负面"
    elif any(k in label_lower for k in ["neutral", "neu", "中性", "1"]):
        return "中性"
    else:
        return label


def analyze_sentiments(texts, tokenizer, model, device, batch_size=16):
    print(f"[INFO] Analyzing {len(texts)} texts with batch size {batch_size}...")

    sentiment_pipeline = pipeline(
        "sentiment-analysis",
        model=model,
        tokenizer=tokenizer,
        device=0 if device.type == "cuda" else (-1 if device.type == "cpu" else "mps"),
        batch_size=batch_size,
    )

    results = []
    for i in tqdm(range(0, len(texts), batch_size), desc="Processing batches"):
        batch = texts[i:i + batch_size]
        batch_results = sentiment_pipeline(batch, truncation=True, max_length=512)
        results.extend(batch_results)

    labels = [map_label(r["label"], model.config.name_or_path) for r in results]
    scores = [round(float(r["score"]), 4) for r in results]

    return labels, scores


def generate_wordcloud(texts, label, output_dir, stopwords, font_path=None):
    print(f"[INFO] Generating {label} word cloud...")

    all_words = []
    for text in texts:
        text = clean_text(text)
        words = jieba.lcut(text)
        words = [w for w in words if w not in stopwords and len(w) > 1]
        all_words.extend(words)

    if not all_words:
        print(f"[WARN] No valid words found for {label} word cloud")
        return

    word_freq = Counter(all_words)

    color_func = lambda *args, **kwargs: (
        (34, 139, 34) if label == "正面" else (220, 20, 60)
    )

    wc = WordCloud(
        font_path=font_path,
        width=1200,
        height=800,
        background_color="white",
        max_words=200,
        max_font_size=150,
        min_font_size=10,
        color_func=color_func,
        collocations=False,
        prefer_horizontal=0.9,
    )

    wc.generate_from_frequencies(word_freq)

    output_path = output_dir / f"{label}_词云图.png"
    wc.to_file(str(output_path))
    print(f"[INFO] {label} word cloud saved to: {output_path}")


def plot_sentiment_trend(df, timestamp_col, output_dir):
    print("[INFO] Generating sentiment trend chart...")

    df = df.copy()
    df[timestamp_col] = pd.to_datetime(df[timestamp_col])
    df = df.sort_values(timestamp_col)

    sentiment_map = {"正面": 1, "中性": 0, "负面": -1}
    df["sentiment_score"] = df["sentiment_label"].map(sentiment_map)

    df.set_index(timestamp_col, inplace=True)
    daily_avg = df["sentiment_score"].resample("D").mean()
    daily_counts = df["sentiment_label"].resample("D").value_counts().unstack(fill_value=0)

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))

    ax1.plot(daily_avg.index, daily_avg.values, marker="o", linewidth=2, color="#1f77b4")
    ax1.axhline(y=0, color="gray", linestyle="--", alpha=0.7)
    ax1.set_xlabel("日期", fontsize=12)
    ax1.set_ylabel("平均情感分数", fontsize=12)
    ax1.set_title("情感趋势变化图", fontsize=14, fontweight="bold")
    ax1.grid(True, alpha=0.3)
    ax1.fill_between(daily_avg.index, daily_avg.values, 0, 
                     where=(daily_avg.values >= 0), color="green", alpha=0.2)
    ax1.fill_between(daily_avg.index, daily_avg.values, 0, 
                     where=(daily_avg.values < 0), color="red", alpha=0.2)

    if "正面" in daily_counts.columns:
        ax2.plot(daily_counts.index, daily_counts["正面"], 
                 marker="s", label="正面", color="green", linewidth=2)
    if "中性" in daily_counts.columns:
        ax2.plot(daily_counts.index, daily_counts["中性"], 
                 marker="^", label="中性", color="orange", linewidth=2)
    if "负面" in daily_counts.columns:
        ax2.plot(daily_counts.index, daily_counts["负面"], 
                 marker="o", label="负面", color="red", linewidth=2)

    ax2.set_xlabel("日期", fontsize=12)
    ax2.set_ylabel("评论数量", fontsize=12)
    ax2.set_title("各情感类别数量趋势", fontsize=14, fontweight="bold")
    ax2.legend(fontsize=10)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    output_path = output_dir / "情感趋势图.png"
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"[INFO] Sentiment trend chart saved to: {output_path}")


def extract_examples(df, n=5):
    print(f"[INFO] Extracting {n} typical examples for each sentiment...")

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


def print_examples(examples):
    print("\n" + "=" * 80)
    print("典型例句展示")
    print("=" * 80)

    for label in ["正面", "负面", "中性"]:
        print(f"\n【{label}例句】")
        print("-" * 80)
        if examples[label]:
            for i, (text, conf) in enumerate(examples[label], 1):
                print(f"{i}. (置信度: {conf:.4f})")
                print(f"   {text[:200]}{'...' if len(text) > 200 else ''}")
        else:
            print("   无该类别的文本")


def main():
    parser = argparse.ArgumentParser(
        description="中文文本情感分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--input", "-i",
        type=str,
        required=True,
        help="输入CSV文件路径",
    )
    parser.add_argument(
        "--text-column", "-t",
        type=str,
        default="text",
        help="文本列名 (默认: text)",
    )
    parser.add_argument(
        "--timestamp-column", "-ts",
        type=str,
        default=None,
        help="时间戳列名 (如果提供，将生成情感趋势图)",
    )
    parser.add_argument(
        "--output-dir", "-o",
        type=str,
        default="./output",
        help="输出目录 (默认: ./output)",
    )
    parser.add_argument(
        "--model-name", "-m",
        type=str,
        default="bert-base-chinese-finetuned-sentiment",
        help="预训练模型名称或路径 (默认: bert-base-chinese-finetuned-sentiment)",
    )
    parser.add_argument(
        "--cache-dir", "-c",
        type=str,
        default=os.path.expanduser("~/.cache/huggingface/hub"),
        help="模型缓存目录",
    )
    parser.add_argument(
        "--batch-size", "-b",
        type=int,
        default=16,
        help="批处理大小 (默认: 16)",
    )
    parser.add_argument(
        "--font-path", "-f",
        type=str,
        default=None,
        help="中文字体路径 (用于词云图)",
    )
    parser.add_argument(
        "--no-wordcloud",
        action="store_true",
        help="禁用词云图生成",
    )
    parser.add_argument(
        "--no-trend",
        action="store_true",
        help="禁用情感趋势图生成",
    )

    args = parser.parse_args()

    print("\n" + "=" * 80)
    print("中文文本情感分析工具")
    print("=" * 80)

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"[ERROR] Input file not found: {input_path}")
        return

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"[INFO] Output directory: {output_dir.resolve()}")

    print(f"[INFO] Reading CSV file: {input_path}")
    df = pd.read_csv(input_path)

    if args.text_column not in df.columns:
        print(f"[ERROR] Text column '{args.text_column}' not found in CSV")
        print(f"[INFO] Available columns: {df.columns.tolist()}")
        return

    print(f"[INFO] Found {len(df)} rows in CSV")

    texts = df[args.text_column].astype(str).tolist()
    cleaned_texts = [clean_text(t) for t in texts]

    device = set_device()

    fallback_models = [
        "lxyuan/distilbert-base-multilingual-cased-sentiments-student",
        "uer/roberta-base-finetuned-dianping-chinese",
        "techthiyanes/chinese_sentiment",
        "liam168/c2-roberta-base-finetuned-dianping-chinese",
    ]

    try:
        tokenizer, model = get_model_and_tokenizer(args.model_name, args.cache_dir)
    except Exception as e:
        print(f"[ERROR] Failed to load model '{args.model_name}': {e}")
        print("[INFO] Trying fallback models...")
        tokenizer, model = None, None
        for fallback_model in fallback_models:
            try:
                print(f"[INFO] Trying fallback model: {fallback_model}")
                tokenizer, model = get_model_and_tokenizer(fallback_model, args.cache_dir)
                args.model_name = fallback_model
                break
            except Exception as e2:
                print(f"[WARN] Fallback model '{fallback_model}' also failed: {e2}")
                continue
        if tokenizer is None or model is None:
            print("[ERROR] All fallback models failed. Please check your network connection or provide a valid local model path.")
            return

    labels, scores = analyze_sentiments(
        cleaned_texts, tokenizer, model, device, args.batch_size
    )

    df["sentiment_label"] = labels
    df["confidence"] = scores

    output_csv = output_dir / "sentiment_results.csv"
    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"[INFO] Results saved to: {output_csv}")

    print("\n[INFO] 情感分布统计:")
    label_counts = df["sentiment_label"].value_counts()
    for label, count in label_counts.items():
        percentage = (count / len(df)) * 100
        print(f"  {label}: {count} ({percentage:.2f}%)")

    stopwords = load_stopwords()

    if not args.no_wordcloud:
        pos_texts = df[df["sentiment_label"] == "正面"][args.text_column].tolist()
        neg_texts = df[df["sentiment_label"] == "负面"][args.text_column].tolist()

        if pos_texts:
            generate_wordcloud(pos_texts, "正面", output_dir, stopwords, args.font_path)
        else:
            print("[WARN] No positive texts found, skipping positive word cloud")

        if neg_texts:
            generate_wordcloud(neg_texts, "负面", output_dir, stopwords, args.font_path)
        else:
            print("[WARN] No negative texts found, skipping negative word cloud")

    if not args.no_trend and args.timestamp_column:
        if args.timestamp_column in df.columns:
            try:
                plot_sentiment_trend(df, args.timestamp_column, output_dir)
            except Exception as e:
                print(f"[WARN] Failed to generate trend chart: {e}")
        else:
            print(f"[WARN] Timestamp column '{args.timestamp_column}' not found")

    examples = extract_examples(df, n=5)
    print_examples(examples)

    summary = {
        "total_texts": len(df),
        "positive_count": int((df["sentiment_label"] == "正面").sum()),
        "neutral_count": int((df["sentiment_label"] == "中性").sum()),
        "negative_count": int((df["sentiment_label"] == "负面").sum()),
        "avg_confidence": round(float(df["confidence"].mean()), 4),
        "model_used": args.model_name,
        "device": str(device),
    }

    summary_path = output_dir / "analysis_summary.txt"
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("情感分析总结报告\n")
        f.write("=" * 50 + "\n\n")
        for key, value in summary.items():
            f.write(f"{key}: {value}\n")
    print(f"\n[INFO] Summary saved to: {summary_path}")

    print("\n" + "=" * 80)
    print("分析完成!")
    print("=" * 80)


if __name__ == "__main__":
    main()
