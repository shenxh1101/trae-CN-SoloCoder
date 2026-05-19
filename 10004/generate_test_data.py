#!/usr/bin/env python3
import argparse
import random
from datetime import datetime, timedelta

import pandas as pd

CATEGORIES = [
    "电子产品", "服装鞋帽", "食品饮料", "家居用品", "美妆护肤",
    "母婴用品", "运动户外", "图书文具", "汽车用品", "宠物用品",
]


def generate_data(num_records: int, output_path: str):
    random.seed(42)

    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    data = []
    user_ids = [f"user_{i:04d}" for i in range(1, 1001)]

    user_activity_level = {}
    for uid in user_ids:
        level = random.choices(["low", "medium", "high"], weights=[0.4, 0.4, 0.2])[0]
        user_activity_level[uid] = level

    user_has_purchased = set()

    for _ in range(num_records):
        user_id = random.choice(user_ids)
        level = user_activity_level[user_id]

        if level == "low":
            action_weights = [0.90, 0.08, 0.02]
        elif level == "medium":
            action_weights = [0.70, 0.22, 0.08]
        else:
            action_weights = [0.50, 0.30, 0.20]

        if user_id not in user_has_purchased:
            action_weights[2] *= 0.5

        action_type = random.choices(
            ["点击", "加购", "购买"],
            weights=action_weights,
        )[0]

        if action_type == "购买":
            user_has_purchased.add(user_id)

        category = random.choice(CATEGORIES)

        hour = random.choices(
            list(range(24)),
            weights=[
                1, 0.5, 0.3, 0.2, 0.2, 0.3, 0.8, 2, 4, 5, 5, 4,
                3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2
            ]
        )[0]
        base_time = start_date + timedelta(
            days=random.randint(0, 6),
            hours=hour,
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59),
        )

        data.append({
            "user_id": user_id,
            "action_type": action_type,
            "product_category": category,
            "timestamp": base_time.strftime("%Y-%m-%d %H:%M:%S"),
        })

    df = pd.DataFrame(data)
    df = df.sort_values("timestamp").reset_index(drop=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"模拟数据已生成: {output_path}")
    print(f"  总记录数: {len(df)}")
    print(f"  独立用户数: {df['user_id'].nunique()}")
    print(f"  商品类别数: {df['product_category'].nunique()}")
    print(f"  时间范围: {df['timestamp'].min()} ~ {df['timestamp'].max()}")
    print(f"\n行为分布:")
    for action, count in df["action_type"].value_counts().items():
        print(f"  {action}: {count} ({count / len(df):.1%})")

    print(f"\n用户行为统计:")
    click_users = df[df["action_type"] == "点击"]["user_id"].nunique()
    cart_users = df[df["action_type"] == "加购"]["user_id"].nunique()
    purchase_users = df[df["action_type"] == "购买"]["user_id"].nunique()
    print(f"  点击用户数: {click_users}")
    print(f"  加购用户数: {cart_users}")
    print(f"  购买用户数: {purchase_users}")


def main():
    parser = argparse.ArgumentParser(description="生成电商用户行为模拟数据")
    parser.add_argument(
        "--output",
        "-o",
        default="sample_data.csv",
        help="输出CSV文件路径 (默认: sample_data.csv)",
    )
    parser.add_argument(
        "--num-records",
        "-n",
        type=int,
        default=50000,
        help="生成记录数 (默认: 50000)",
    )
    args = parser.parse_args()

    generate_data(args.num_records, args.output)


if __name__ == "__main__":
    main()
