#!/usr/bin/env python3
import argparse
import json
import os
import warnings

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

warnings.filterwarnings("ignore")


def load_data(filepath: str) -> pd.DataFrame:
    df = pd.read_csv(filepath)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["hour"] = df["timestamp"].dt.hour
    df["date"] = df["timestamp"].dt.date
    return df


def analyze_hourly_conversion(df: pd.DataFrame, output_dir: str) -> dict:
    hourly = df.groupby("hour").agg(
        clicks=("action_type", lambda x: (x == "点击").sum()),
        purchases=("action_type", lambda x: (x == "购买").sum()),
    ).reset_index()

    hourly["conversion_rate"] = hourly.apply(
        lambda row: row["purchases"] / row["clicks"] if row["clicks"] > 0 else 0,
        axis=1,
    )

    plt.figure(figsize=(12, 6))
    sns.lineplot(data=hourly, x="hour", y="conversion_rate", marker="o", linewidth=2)
    plt.title("各时段购买转化率曲线", fontsize=14)
    plt.xlabel("小时", fontsize=12)
    plt.ylabel("购买转化率", fontsize=12)
    plt.xticks(range(0, 24))
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "hourly_conversion_rate.png"), dpi=150)
    plt.close()

    return {
        "peak_hour": int(hourly.loc[hourly["conversion_rate"].idxmax(), "hour"]),
        "peak_rate": float(hourly["conversion_rate"].max()),
        "average_rate": float(hourly["conversion_rate"].mean()),
        "hourly_data": [
            {
                "hour": int(row["hour"]),
                "clicks": int(row["clicks"]),
                "purchases": int(row["purchases"]),
                "conversion_rate": float(row["conversion_rate"]),
            }
            for _, row in hourly.iterrows()
        ],
    }


def analyze_funnel(df: pd.DataFrame, output_dir: str) -> dict:
    total_users = df["user_id"].nunique()
    click_users = df[df["action_type"] == "点击"]["user_id"].nunique()
    cart_users = df[df["action_type"] == "加购"]["user_id"].nunique()
    purchase_users = df[df["action_type"] == "购买"]["user_id"].nunique()

    click_to_cart = cart_users / click_users if click_users > 0 else 0
    cart_to_purchase = purchase_users / cart_users if cart_users > 0 else 0
    click_to_purchase = purchase_users / click_users if click_users > 0 else 0

    funnel_stages = ["点击", "加购", "购买"]
    funnel_counts = [click_users, cart_users, purchase_users]

    plt.figure(figsize=(10, 6))
    bars = plt.bar(funnel_stages, funnel_counts, color=["#3498db", "#f39c12", "#2ecc71"])
    plt.title("用户行为漏斗分析", fontsize=14)
    plt.ylabel("用户数", fontsize=12)

    for bar, count in zip(bars, funnel_counts):
        height = bar.get_height()
        plt.text(
            bar.get_x() + bar.get_width() / 2,
            height,
            f"{count}\n({100 * count / click_users:.1f}%)",
            ha="center",
            va="bottom",
            fontsize=11,
        )

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "user_funnel.png"), dpi=150)
    plt.close()

    return {
        "total_users": int(total_users),
        "click_users": int(click_users),
        "cart_users": int(cart_users),
        "purchase_users": int(purchase_users),
        "click_to_cart_rate": float(click_to_cart),
        "cart_to_purchase_rate": float(cart_to_purchase),
        "click_to_purchase_rate": float(click_to_purchase),
    }


def analyze_top_categories(df: pd.DataFrame, output_dir: str) -> dict:
    purchase_df = df[df["action_type"] == "购买"]
    category_counts = (
        purchase_df["product_category"]
        .value_counts()
        .head(10)
        .reset_index()
    )
    category_counts.columns = ["product_category", "purchase_count"]

    plt.figure(figsize=(12, 6))
    sns.barplot(
        data=category_counts,
        x="product_category",
        y="purchase_count",
        palette="viridis",
    )
    plt.title("购买次数Top10商品类别", fontsize=14)
    plt.xlabel("商品类别", fontsize=12)
    plt.ylabel("购买次数", fontsize=12)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "top_categories.png"), dpi=150)
    plt.close()

    return {
        "top_categories": [
            {
                "category": row["product_category"],
                "purchase_count": int(row["purchase_count"]),
            }
            for _, row in category_counts.iterrows()
        ]
    }


def analyze_repurchase_rate(df: pd.DataFrame) -> dict:
    purchase_df = df[df["action_type"] == "购买"]
    user_purchase_counts = purchase_df.groupby("user_id").size().reset_index(name="purchase_count")

    total_purchasers = len(user_purchase_counts)
    repeat_purchasers = len(user_purchase_counts[user_purchase_counts["purchase_count"] >= 2])

    repurchase_rate = repeat_purchasers / total_purchasers if total_purchasers > 0 else 0

    return {
        "total_purchasers": int(total_purchasers),
        "repeat_purchasers": int(repeat_purchasers),
        "repurchase_rate": float(repurchase_rate),
        "average_purchases_per_user": float(user_purchase_counts["purchase_count"].mean())
        if total_purchasers > 0
        else 0,
        "purchase_distribution": [
            {"purchase_count": int(k), "user_count": int(v)}
            for k, v in user_purchase_counts["purchase_count"].value_counts().sort_index().items()
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="电商用户行为数据分析")
    parser.add_argument(
        "--input",
        "-i",
        required=True,
        help="输入CSV文件路径",
    )
    parser.add_argument(
        "--output",
        "-o",
        required=True,
        help="输出目录路径",
    )
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    df = load_data(args.input)

    results = {}
    results["hourly_conversion"] = analyze_hourly_conversion(df, args.output)
    results["funnel_analysis"] = analyze_funnel(df, args.output)
    results["top_categories"] = analyze_top_categories(df, args.output)
    results["repurchase_analysis"] = analyze_repurchase_rate(df)
    results["summary"] = {
        "total_records": int(len(df)),
        "date_range": {
            "start": str(df["timestamp"].min().date()),
            "end": str(df["timestamp"].max().date()),
        },
        "unique_users": int(df["user_id"].nunique()),
        "unique_categories": int(df["product_category"].nunique()),
    }

    with open(os.path.join(args.output, "analysis_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"分析完成！结果已保存到: {args.output}")
    print(f"  - hourly_conversion_rate.png")
    print(f"  - user_funnel.png")
    print(f"  - top_categories.png")
    print(f"  - analysis_results.json")
    print(f"\n摘要:")
    print(f"  总记录数: {results['summary']['total_records']}")
    print(f"  独立用户数: {results['summary']['unique_users']}")
    print(f"  复购率: {results['repurchase_analysis']['repurchase_rate']:.2%}")
    print(f"  点击到购买转化率: {results['funnel_analysis']['click_to_purchase_rate']:.2%}")


if __name__ == "__main__":
    main()
