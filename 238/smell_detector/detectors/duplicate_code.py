import hashlib
import re
from collections import defaultdict
from typing import List, Optional

from .base import BaseDetector, SmellResult, Severity, SmellCategory


class DuplicateCodeDetector(BaseDetector):
    smell_type = "duplicate_code"
    category = SmellCategory.DUPLICATION
    default_severity = Severity.HIGH

    def __init__(self, config: Optional[dict] = None):
        super().__init__(config)
        self.min_lines = self.config.get("min_lines", 6)
        self.min_duplicates = self.config.get("min_duplicates", 2)

    def detect(self, file_path: str, content: str, lines: List[str]) -> List[SmellResult]:
        return self._detect_single_file(file_path, content, lines)

    def detect_across_files(self, file_data: dict) -> List[SmellResult]:
        results = []
        block_map = defaultdict(list)

        for file_path, (content, lines) in file_data.items():
            blocks = self._extract_blocks(lines)
            for block_hash, start_line, end_line, block_text, length in blocks:
                block_map[(block_hash, length)].append((file_path, start_line, end_line, block_text, length))

        reported_ranges = defaultdict(set)
        sorted_keys = sorted(block_map.keys(), key=lambda x: x[1], reverse=True)

        for key in sorted_keys:
            block_hash, block_len = key
            occurrences = block_map[key]
            if len(occurrences) < self.min_duplicates:
                continue

            is_overlap = False
            for occ in occurrences:
                fpath, sl, el, text, ln = occ
                for reported_sl, reported_el in reported_ranges.get(fpath, set()):
                    if not (el < reported_sl or sl > reported_el):
                        is_overlap = True
                        break
                if is_overlap:
                    break

            if is_overlap:
                continue

            for occ in occurrences:
                fpath, sl, el, text, ln = occ
                reported_ranges[fpath].add((sl, el))
                results.append(self._make_result(
                    file_path=fpath,
                    start_line=sl,
                    end_line=el,
                    description=f"重复代码块（共 {len(occurrences)} 处，{block_len} 行）: {text[:60].strip()}...",
                    code_snippet=text,
                    maintenance_issue="重复代码意味着修改时需要同时更新多处，极易遗漏导致不一致性缺陷。",
                    refactoring_suggestion=self._suggest_refactor(occurrences),
                    severity=Severity.HIGH if len(occurrences) >= 3 else Severity.MEDIUM,
                ))
        return results

    def _detect_single_file(self, file_path: str, content: str, lines: List[str]) -> List[SmellResult]:
        results = []
        blocks = self._extract_blocks(lines)
        block_map = defaultdict(list)

        for block_hash, start_line, end_line, block_text, length in blocks:
            block_map[(block_hash, length)].append((start_line, end_line, block_text, length))

        reported_ranges = set()
        sorted_keys = sorted(block_map.keys(), key=lambda x: x[1], reverse=True)

        for key in sorted_keys:
            block_hash, block_len = key
            occurrences = block_map[key]
            if len(occurrences) < self.min_duplicates:
                continue

            is_overlap = False
            for start_line, end_line, block_text, length in occurrences:
                for reported_sl, reported_el in reported_ranges:
                    if not (end_line < reported_sl or start_line > reported_el):
                        is_overlap = True
                        break
                if is_overlap:
                    break

            if is_overlap:
                continue

            for start_line, end_line, block_text, length in occurrences:
                reported_ranges.add((start_line, end_line))
                results.append(self._make_result(
                    file_path=file_path,
                    start_line=start_line,
                    end_line=end_line,
                    description=f"文件内重复代码块（共 {len(occurrences)} 处，{block_len} 行）: {block_text[:60].strip()}...",
                    code_snippet=block_text,
                    maintenance_issue="重复代码意味着修改时需要同时更新多处，极易遗漏导致不一致性缺陷。",
                    refactoring_suggestion=self._suggest_refactor_simple(occurrences),
                    severity=Severity.HIGH if len(occurrences) >= 3 else Severity.MEDIUM,
                ))
        return results

    def _extract_blocks(self, lines: List[str]) -> List[tuple]:
        blocks = []
        stripped = [l.strip() for l in lines]
        total = len(stripped)

        for length in range(29, self.min_lines - 1, -1):
            for i in range(total - length + 1):
                chunk = stripped[i:i + length]
                if any(l == "" for l in chunk[:2]):
                    continue
                text = "\n".join(chunk)
                normalized = self._normalize(text)
                if not normalized.strip():
                    continue
                block_hash = hashlib.md5(normalized.encode()).hexdigest()
                blocks.append((block_hash, i + 1, i + length, text, length))

        return blocks

    def _normalize(self, text: str) -> str:
        text = re.sub(r'#.*$', '', text, flags=re.MULTILINE)
        text = re.sub(r'//.*$', '', text, flags=re.MULTILINE)
        text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
        text = re.sub(r'""".*?"""', '', text, flags=re.DOTALL)
        text = re.sub(r"'''.*?'''", '', text, flags=re.DOTALL)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _suggest_refactor(self, occurrences: list) -> str:
        files = set(occ[0] for occ in occurrences)
        if len(files) > 1:
            return (
                f"此代码块在 {len(files)} 个文件中重复出现。"
                "建议将公共逻辑提取到共享模块/工具函数中，各处调用共享实现。"
            )
        return "建议将重复代码提取为独立函数或方法，通过参数化处理差异部分。"

    def _suggest_refactor_simple(self, occurrences: list) -> str:
        return "建议将重复代码提取为独立函数或方法，通过参数化处理差异部分。"
