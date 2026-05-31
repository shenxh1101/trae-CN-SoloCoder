import csv
from typing import Optional
from .generator import CopyGenerator, PLATFORMS, TONES


class BatchProcessor:
    def __init__(self, generator: CopyGenerator):
        self.generator = generator

    def read_csv(self, filepath: str) -> list[dict]:
        products = []
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                product_name = row.get("产品名称", "").strip()
                selling_points_raw = row.get("核心卖点", "").strip()
                if not product_name:
                    continue
                selling_points = [p.strip() for p in selling_points_raw.split("/") if p.strip()]
                if not selling_points:
                    selling_points = [p.strip() for p in selling_points_raw.split("、") if p.strip()]
                if not selling_points:
                    selling_points = [p.strip() for p in selling_points_raw.split(",") if p.strip()]
                products.append({
                    "product": product_name,
                    "selling_points": selling_points,
                })
        return products

    def batch_generate(
        self,
        filepath: str,
        platforms: Optional[list[str]] = None,
        tones: Optional[list[str]] = None,
        competitor_keywords: Optional[list[str]] = None,
    ) -> list[dict]:
        products = self.read_csv(filepath)
        if not products:
            raise ValueError(f"CSV文件中未找到有效产品数据: {filepath}")

        platforms = platforms or PLATFORMS
        tones = tones or TONES
        all_results = []

        for product_info in products:
            for platform in platforms:
                for tone in tones:
                    result = self.generator.generate(
                        product=product_info["product"],
                        selling_points=product_info["selling_points"],
                        platform=platform,
                        tone=tone,
                        competitor_keywords=competitor_keywords,
                    )
                    all_results.append(result)

        return all_results
