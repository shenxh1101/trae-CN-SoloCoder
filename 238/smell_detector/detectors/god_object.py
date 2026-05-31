import ast
import re
from typing import List, Optional

from .base import BaseDetector, SmellResult, Severity, SmellCategory


class GodObjectDetector(BaseDetector):
    smell_type = "god_object"
    category = SmellCategory.COUPLING
    default_severity = Severity.HIGH

    def __init__(self, config: Optional[dict] = None):
        super().__init__(config)
        self.max_methods = self.config.get("max_methods", 10)
        self.max_attributes = self.config.get("max_attributes", 15)
        self.max_lines = self.config.get("max_class_lines", 300)

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
            if isinstance(node, ast.ClassDef):
                methods = [n for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                attrs = self._count_python_attributes(node)
                class_lines = (node.end_lineno or len(lines)) - node.lineno + 1

                issues = []
                if len(methods) > self.max_methods:
                    issues.append(f"{len(methods)} 个方法（阈值 {self.max_methods}）")
                if attrs > self.max_attributes:
                    issues.append(f"{attrs} 个属性（阈值 {self.max_attributes}）")
                if class_lines > self.max_lines:
                    issues.append(f"{class_lines} 行代码（阈值 {self.max_lines}）")

                if issues:
                    snippet = self._extract_snippet(lines, node.lineno, min(node.lineno + 15, node.end_lineno or len(lines)))
                    results.append(self._make_result(
                        file_path=file_path,
                        start_line=node.lineno,
                        end_line=node.end_lineno or len(lines),
                        description=f"类 '{node.name}' 是上帝对象: {', '.join(issues)}。",
                        code_snippet=snippet,
                        maintenance_issue="上帝对象承担了过多职责，违反单一职责原则，使得修改任何一个功能都可能影响其他功能，增加测试和调试难度。",
                        refactoring_suggestion=self._suggest_refactor(node.name, methods, attrs, class_lines),
                        severity=Severity.CRITICAL if len(issues) >= 3 else Severity.HIGH,
                    ))
        return results

    def _detect_javascript(self, file_path: str, content: str, lines: List[str]) -> List[SmellResult]:
        results = []
        class_pattern = re.compile(r'class\s+(\w+)\s*(?:extends\s+\w+\s*)?\{', re.MULTILINE)

        for match in class_pattern.finditer(content):
            class_name = match.group(1)
            brace_start = content.find("{", match.start())
            if brace_start == -1:
                continue
            end_line = self._find_matching_brace(content, brace_start)
            if end_line is None:
                continue

            start_line = content[:match.start()].count("\n") + 1
            class_content = content[brace_start:content.find("}", brace_start) + 1 if content.find("}", brace_start) != -1 else len(content)]

            method_pattern = re.compile(r'(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{', re.MULTILINE)
            methods = method_pattern.findall(class_content)

            constructor_match = re.search(r'constructor\s*\([^)]*\)\s*\{', class_content)
            attrs = 0
            if constructor_match:
                this_pattern = re.compile(r'this\.(\w+)\s*=', re.MULTILINE)
                attrs = len(set(this_pattern.findall(class_content)))

            class_lines = end_line - start_line + 1
            issues = []
            if len(methods) > self.max_methods:
                issues.append(f"{len(method)} 个方法（阈值 {self.max_methods}）")
            if attrs > self.max_attributes:
                issues.append(f"{attrs} 个属性（阈值 {self.max_attributes}）")
            if class_lines > self.max_lines:
                issues.append(f"{class_lines} 行代码（阈值 {self.max_lines}）")

            if issues:
                snippet = self._extract_snippet(lines, start_line, min(start_line + 15, end_line))
                results.append(self._make_result(
                    file_path=file_path,
                    start_line=start_line,
                    end_line=end_line,
                    description=f"类 '{class_name}' 是上帝对象: {', '.join(issues)}。",
                    code_snippet=snippet,
                    maintenance_issue="上帝对象承担了过多职责，违反单一职责原则，使得修改任何一个功能都可能影响其他功能。",
                    refactoring_suggestion=self._suggest_refactor(class_name, methods, attrs, class_lines),
                    severity=Severity.CRITICAL if len(issues) >= 3 else Severity.HIGH,
                ))
        return results

    def _count_python_attributes(self, node: ast.ClassDef) -> int:
        attrs = set()
        for item in ast.walk(node):
            if isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name):
                        if target.value.id == "self":
                            attrs.add(target.attr)
        return len(attrs)

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

    def _extract_snippet(self, lines: List[str], start: int, end: int) -> str:
        return "".join(lines[start - 1:end])

    def _suggest_refactor(self, name: str, methods, attrs: int, class_lines: int) -> str:
        suggestions = [f"将类 '{name}' 按职责拆分为多个小类。"]
        if isinstance(methods, list) and len(methods) > self.max_methods:
            suggestions.append(f"当前有 {len(methods)} 个方法，建议按功能域分组，每组提取为独立类。")
        if attrs > self.max_attributes:
            suggestions.append(f"当前有 {attrs} 个属性，建议将相关属性组合为值对象或独立类。")
        suggestions.append("可考虑使用组合模式代替继承，让每个类只负责一个明确的功能领域。")
        return " ".join(suggestions)
