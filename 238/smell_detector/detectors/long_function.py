import ast
import re
from typing import List, Optional

from .base import BaseDetector, SmellResult, Severity, SmellCategory


class LongFunctionDetector(BaseDetector):
    smell_type = "long_function"
    category = SmellCategory.COMPLEXITY
    default_severity = Severity.HIGH

    def __init__(self, config: Optional[dict] = None):
        super().__init__(config)
        self.max_lines = self.config.get("max_lines", 50)
        self.max_params = self.config.get("max_params", 5)

    def detect(self, file_path: str, content: str, lines: List[str]) -> List[SmellResult]:
        ext = file_path.rsplit(".", 1)[-1] if "." in file_path else ""
        if ext == "py":
            return self._detect_python(file_path, content, lines)
        elif ext in ("js", "jsx", "ts", "tsx"):
            return self._detect_javascript(file_path, content, lines)
        return []

    def _detect_python(self, file_path: str, content: str, lines: List[str]) -> List[SmellResult]:
        results = []
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return results

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_lines = node.end_lineno - node.lineno + 1
                if func_lines > self.max_lines:
                    snippet = self._extract_snippet(lines, node.lineno, node.end_lineno)
                    params = [a.arg for a in node.args.args]
                    param_issue = ""
                    if len(params) > self.max_params:
                        param_issue = f" 函数还有 {len(params)} 个参数（建议不超过 {self.max_params} 个）。"

                    results.append(self._make_result(
                        file_path=file_path,
                        start_line=node.lineno,
                        end_line=node.end_lineno,
                        description=f"函数 '{node.name}' 有 {func_lines} 行（超过阈值 {self.max_lines} 行）。{param_issue}",
                        code_snippet=snippet,
                        maintenance_issue=f"过长的函数难以理解、测试和维护。单个函数承担过多职责会增加修改风险。{param_issue}",
                        refactoring_suggestion=self._suggest_refactor_python(node.name, func_lines, params),
                        severity=Severity.CRITICAL if func_lines > self.max_lines * 2 else Severity.HIGH,
                    ))
        return results

    def _detect_javascript(self, file_path: str, content: str, lines: List[str]) -> List[SmellResult]:
        results = []
        func_pattern = re.compile(
            r'(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:async\s+)?\(|let\s+(\w+)\s*=\s*(?:async\s+)?\(|'
            r'(?:async\s+)?function\s+(\w+)\s*\(|(\w+)\s*:\s*(?:async\s+)?function\s*\()',
            re.MULTILINE
        )

        for match in func_pattern.finditer(content):
            func_name = next((g for g in match.groups() if g), "anonymous")
            start_line = content[:match.start()].count("\n") + 1
            brace_start = content.find("{", match.start())
            if brace_start == -1:
                continue

            end_line = self._find_matching_brace(content, brace_start)
            if end_line is None:
                continue

            func_lines = end_line - start_line + 1
            if func_lines > self.max_lines:
                snippet = self._extract_snippet(lines, start_line, end_line)
                results.append(self._make_result(
                    file_path=file_path,
                    start_line=start_line,
                    end_line=end_line,
                    description=f"函数 '{func_name}' 有 {func_lines} 行（超过阈值 {self.max_lines} 行）。",
                    code_snippet=snippet,
                    maintenance_issue="过长的函数难以理解、测试和维护。单个函数承担过多职责会增加修改风险。",
                    refactoring_suggestion=self._suggest_refactor_js(func_name, func_lines),
                    severity=Severity.CRITICAL if func_lines > self.max_lines * 2 else Severity.HIGH,
                ))
        return results

    def _find_matching_brace(self, content: str, start: int) -> Optional[int]:
        depth = 0
        i = start
        while i < len(content):
            if content[i] == "{":
                depth += 1
            elif content[i] == "}":
                depth -= 1
                if depth == 0:
                    return content[:i].count("\n") + 1
            i += 1
        return None

    def _extract_snippet(self, lines: List[str], start: int, end: int, max_lines: int = 20) -> str:
        snippet_lines = lines[start - 1:end]
        if len(snippet_lines) > max_lines:
            half = max_lines // 2
            return "".join(
                lines[start - 1:start - 1 + half]
                + [f"  ... ({len(snippet_lines) - max_lines} lines omitted) ...\n"]
                + lines[end - half:end]
            )
        return "".join(snippet_lines)

    def _suggest_refactor_python(self, name: str, lines: int, params: List[str]) -> str:
        suggestions = [f"将函数 '{name}' 拆分为多个较小的函数，每个函数只做一件事。"]
        if len(params) > self.max_params:
            suggestions.append(f"考虑将 {len(params)} 个参数封装为参数对象（dataclass 或 TypedDict）。")
        if lines > self.max_lines * 2:
            suggestions.append("函数严重过长，建议先提取独立的逻辑块为辅助函数，再将主函数简化为流程编排。")
        suggestions.append("可使用 --autofix 尝试自动拆分此函数。")
        return " ".join(suggestions)

    def _suggest_refactor_js(self, name: str, lines: int) -> str:
        suggestions = [f"将函数 '{name}' 拆分为多个较小的函数，每个函数只做一件事。"]
        if lines > self.max_lines * 2:
            suggestions.append("函数严重过长，建议先提取独立的逻辑块为辅助函数。")
        return " ".join(suggestions)
