import csv
import os
from datetime import datetime
from typing import List

from ..detectors.base import SmellResult


class CSVReporter:
    def __init__(self, output_path: str = "smell_report.csv"):
        self.output_path = output_path

    def generate(self, results: List[SmellResult], project_path: str = "") -> str:
        with open(self.output_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "异味类型", "分类", "严重程度", "文件路径",
                "起始行", "结束行", "描述", "维护问题", "重构建议",
                "是否误报", "检测时间"
            ])
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            for r in results:
                writer.writerow([
                    r.smell_type,
                    r.category.value,
                    r.severity.value,
                    r.location.file_path,
                    r.location.start_line,
                    r.location.end_line,
                    r.description,
                    r.maintenance_issue,
                    r.refactoring_suggestion,
                    "是" if r.is_false_positive else "否",
                    now,
                ])
        return self.output_path
