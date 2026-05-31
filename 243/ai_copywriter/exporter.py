import os
from datetime import datetime


class Exporter:
    def to_markdown_table(self, results: list[dict], output_path: str) -> str:
        headers = ["序号", "产品", "平台", "语调", "文案内容", "来源", "预估CTR", "95%置信区间", "推荐标签"]
        rows = []
        for i, r in enumerate(results, 1):
            ctr = r.get("estimated_ctr", "N/A")
            if isinstance(ctr, float):
                ctr = f"{ctr}%"
            ctr_data = r.get("ctr_data", {})
            ci = ctr_data.get("confidence_interval_95", "N/A")
            copy_text = r["copy"].replace("\n", "<br>")
            hashtags_str = self._format_hashtags(r.get("hashtags", []))
            rows.append([
                str(i),
                r["product"],
                r["platform"],
                r["tone"],
                copy_text,
                r.get("source", "N/A"),
                str(ctr),
                str(ci),
                hashtags_str,
            ])

        header_line = "| " + " | ".join(headers) + " |"
        separator = "| " + " | ".join(["---"] * len(headers)) + " |"
        data_lines = []
        for row in rows:
            data_lines.append("| " + " | ".join(row) + " |")

        content = f"# 营销文案生成报告\n\n"
        content += f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        content += header_line + "\n"
        content += separator + "\n"
        for line in data_lines:
            content += line + "\n"

        content += f"\n---\n共生成 {len(results)} 条文案\n"

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        return output_path

    def _format_hashtags(self, hashtags):
        if not hashtags:
            return ""
        formatted = []
        for ht in hashtags:
            if isinstance(ht, dict):
                tag = ht.get("tag", "")
                score = ht.get("score", 0)
                formatted.append(f"#{tag}({score:.0%})")
            else:
                formatted.append(f"#{ht}")
        return ", ".join(formatted)

    def to_excel(self, results: list[dict], output_path: str) -> str:
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("导出Excel需要安装pandas和openpyxl: pip install pandas openpyxl")

        rows = []
        for i, r in enumerate(results, 1):
            ctr_data = r.get("ctr_data", {})
            rows.append({
                "序号": i,
                "产品": r["product"],
                "平台": r["platform"],
                "语调": r["tone"],
                "文案内容": r["copy"],
                "来源": r.get("source", "N/A"),
                "预估点击率": r.get("estimated_ctr", "N/A"),
                "95%置信区间": ctr_data.get("confidence_interval_95", "N/A"),
                "标准误": ctr_data.get("standard_error", "N/A"),
                "评分": r.get("rating", "未评分"),
                "推荐标签": self._format_hashtags(r.get("hashtags", [])),
            })

        df = pd.DataFrame(rows)
        df.to_excel(output_path, index=False, engine="openpyxl")
        return output_path

    def to_json(self, results: list[dict], output_path: str) -> str:
        import json

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        return output_path

    def auto_export(self, results: list[dict], output_dir: str = ".", fmt: str = "markdown") -> str:
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if fmt == "markdown":
            path = os.path.join(output_dir, f"文案报告_{timestamp}.md")
            return self.to_markdown_table(results, path)
        elif fmt == "excel":
            path = os.path.join(output_dir, f"文案报告_{timestamp}.xlsx")
            return self.to_excel(results, path)
        elif fmt == "json":
            path = os.path.join(output_dir, f"文案报告_{timestamp}.json")
            return self.to_json(results, path)
        else:
            raise ValueError(f"不支持的导出格式: {fmt}，可选: markdown, excel, json")
