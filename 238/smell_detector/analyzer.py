import os
from typing import Dict, List, Optional, Tuple

from .detectors.base import SmellResult, Severity
from .detectors.duplicate_code import DuplicateCodeDetector
from .rules.registry import RuleRegistry
from .reporters.html_reporter import HTMLReporter
from .reporters.csv_reporter import CSVReporter
from .feedback import FeedbackStore
from .autofix import AutoFixer


SUPPORTED_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx"}


class Analyzer:
    def __init__(self, preset: str = "all", enabled_smells: Optional[List[str]] = None,
                 config: Optional[dict] = None):
        self.registry = RuleRegistry()
        self.detectors = self.registry.get_detectors(preset, enabled_smells, config)
        self.feedback_store = FeedbackStore()
        self.autofixer = AutoFixer()

    def analyze_file(self, file_path: str) -> List[SmellResult]:
        if not os.path.isfile(file_path):
            print(f"错误: 文件不存在: {file_path}")
            return []

        ext = os.path.splitext(file_path)[1]
        if ext not in SUPPORTED_EXTENSIONS:
            print(f"警告: 不支持的文件类型: {ext}")
            return []

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except IOError as e:
            print(f"错误: 无法读取文件 {file_path}: {e}")
            return []

        lines = content.splitlines(True)
        results = []
        for detector in self.detectors:
            try:
                results.extend(detector.detect(file_path, content, lines))
            except Exception as e:
                print(f"警告: 检测器 {detector.smell_type} 在 {file_path} 上出错: {e}")

        self.feedback_store.filter_false_positives(results)
        return results

    def analyze_directory(self, dir_path: str, ignore_dirs: Optional[List[str]] = None) -> List[SmellResult]:
        if not os.path.isdir(dir_path):
            print(f"错误: 目录不存在: {dir_path}")
            return []

        default_ignore = {".git", "node_modules", "__pycache__", ".venv", "venv", ".tox",
                          "dist", "build", ".mypy_cache", ".pytest_cache", ".idea", ".vscode"}
        if ignore_dirs:
            default_ignore.update(ignore_dirs)

        file_data = {}
        for root, dirs, files in os.walk(dir_path):
            dirs[:] = [d for d in dirs if d not in default_ignore]
            for fname in files:
                ext = os.path.splitext(fname)[1]
                if ext in SUPPORTED_EXTENSIONS:
                    fpath = os.path.join(root, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                            content = f.read()
                        file_data[fpath] = (content, content.splitlines(True))
                    except IOError:
                        continue

        results = []
        for fpath, (content, lines) in file_data.items():
            for detector in self.detectors:
                if isinstance(detector, DuplicateCodeDetector):
                    continue
                try:
                    results.extend(detector.detect(fpath, content, lines))
                except Exception as e:
                    print(f"警告: 检测器 {detector.smell_type} 在 {fpath} 上出错: {e}")

        dup_detectors = [d for d in self.detectors if isinstance(d, DuplicateCodeDetector)]
        if dup_detectors:
            try:
                results.extend(dup_detectors[0].detect_across_files(file_data))
            except Exception as e:
                print(f"警告: 跨文件重复代码检测出错: {e}")

        self.feedback_store.filter_false_positives(results)
        return results

    def calculate_debt_score(self, results: List[SmellResult]) -> Tuple[float, str]:
        if not results:
            return 0.0, "A"

        total_weight = 0
        file_line_counts = {}
        for r in results:
            file_path = r.location.file_path
            if file_path not in file_line_counts:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        file_line_counts[file_path] = len(f.readlines())
                except IOError:
                    file_line_counts[file_path] = 100

        severity_weights = {
            Severity.LOW: 0.5,
            Severity.MEDIUM: 1.0,
            Severity.HIGH: 2.5,
            Severity.CRITICAL: 5,
        }

        for r in results:
            total_weight += severity_weights[r.severity]

        total_lines = max(sum(file_line_counts.values()), 100)
        density_per_1000_lines = (total_weight / total_lines) * 1000

        base_score = min(density_per_1000_lines * 1.0, 100.0)

        if base_score <= 4:
            grade = "A"
        elif base_score <= 10:
            grade = "B"
        elif base_score <= 18:
            grade = "C"
        elif base_score <= 30:
            grade = "D"
        elif base_score <= 50:
            grade = "E"
        else:
            grade = "F"

        return base_score, grade

    def get_file_heat_map(self, results: List[SmellResult]) -> Dict[str, int]:
        heat = {}
        for r in results:
            heat[r.location.file_path] = heat.get(r.location.file_path, 0) + 1
        return dict(sorted(heat.items(), key=lambda x: x[1], reverse=True))

    def get_statistics(self, results: List[SmellResult]) -> dict:
        stats = {
            "total": len(results),
            "by_severity": {},
            "by_type": {},
            "by_file": {},
        }
        for r in results:
            sev = r.severity.value
            stats["by_severity"][sev] = stats["by_severity"].get(sev, 0) + 1
            stats["by_type"][r.smell_type] = stats["by_type"].get(r.smell_type, 0) + 1
            fp = r.location.file_path
            stats["by_file"][fp] = stats["by_file"].get(fp, 0) + 1
        return stats

    def generate_html_report(self, results: List[SmellResult], output_path: str,
                             project_path: str = "") -> str:
        score, grade = self.calculate_debt_score(results)
        reporter = HTMLReporter(output_path)
        return reporter.generate(results, project_path, score, grade)

    def generate_csv_report(self, results: List[SmellResult], output_path: str) -> str:
        reporter = CSVReporter(output_path)
        return reporter.generate(results)

    def mark_false_positive(self, file_path: str, smell_type: str,
                            start_line: int, reason: str = ""):
        self.feedback_store.mark_false_positive(file_path, smell_type, start_line, reason)

    def list_false_positives(self) -> list:
        return self.feedback_store.list_all()

    def autofix(self, results: List[SmellResult], dry_run: bool = True) -> List[dict]:
        fixable = [r for r in results if r.smell_type == "long_function"]
        return self.autofixer.fix(fixable, dry_run=dry_run)

    def ci_check(self, results: List[SmellResult],
                 max_critical: int = 0, max_high: int = 5,
                 max_debt_score: float = 50.0) -> dict:
        score, grade = self.calculate_debt_score(results)
        critical_count = sum(1 for r in results if r.severity == Severity.CRITICAL)
        high_count = sum(1 for r in results if r.severity == Severity.HIGH)

        passed = (critical_count <= max_critical
                  and high_count <= max_high
                  and score <= max_debt_score)

        return {
            "passed": passed,
            "score": score,
            "grade": grade,
            "critical_count": critical_count,
            "high_count": high_count,
            "total_smells": len(results),
            "thresholds": {
                "max_critical": max_critical,
                "max_high": max_high,
                "max_debt_score": max_debt_score,
            },
        }
