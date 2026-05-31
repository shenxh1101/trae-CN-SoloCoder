import ast
import re
from typing import List, Optional, Set

from .base import BaseDetector, SmellResult, Severity, SmellCategory


class TempFieldDetector(BaseDetector):
    smell_type = "temporary_field"
    category = SmellCategory.MAINTAINABILITY
    default_severity = Severity.MEDIUM

    def __init__(self, config: Optional[dict] = None):
        super().__init__(config)
        self.min_unused_ratio = self.config.get("min_unused_ratio", 0.4)

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
                all_attrs = self._get_all_self_attrs(node)
                method_attrs = self._get_method_attr_usage(node)

                for attr, defining_methods in method_attrs.items():
                    if len(defining_methods) == 1 and len(all_attrs.get(attr, set())) > 0:
                        using_methods = all_attrs[attr]
                        def_method = next(iter(defining_methods))
                        if using_methods == defining_methods and def_method != "__init__":
                            def_line = self._get_attr_def_line(node, attr)
                            snippet = self._extract_snippet(lines, def_line)
                            results.append(self._make_result(
                                file_path=file_path,
                                start_line=def_line,
                                end_line=def_line,
                                description=f"临时字段 'self.{attr}' 仅在方法 '{def_method}' 中设置和使用，应改为局部变量。",
                                code_snippet=snippet,
                                maintenance_issue="临时字段使得对象的状态不可预测，某些属性只在特定方法调用时才有值，其他时候为 None 或未定义，增加理解和调试难度。",
                                refactoring_suggestion=f"将 'self.{attr}' 改为方法 '{def_method}' 内的局部变量，因为它只在该方法中使用。",
                                severity=Severity.MEDIUM,
                            ))

                conditional_attrs = self._detect_conditional_attrs(node, lines, file_path)
                results.extend(conditional_attrs)

        return results

    def _detect_javascript(self, file_path: str, content: str, lines: List[str]) -> List[SmellResult]:
        results = []
        class_pattern = re.compile(r'class\s+(\w+)\s*(?:extends\s+\w+\s*)?\{', re.MULTILINE)

        for match in class_pattern.finditer(content):
            class_name = match.group(1)
            class_body_start = content.find("{", match.start())
            if class_body_start == -1:
                continue

            class_body = content[class_body_start:]
            this_assignments = re.findall(r'this\.(\w+)\s*=', class_body)
            attr_counts = {}
            for attr in this_assignments:
                attr_counts[attr] = attr_counts.get(attr, 0) + 1

            method_pattern = re.compile(r'(\w+)\s*\([^)]*\)\s*\{', re.MULTILINE)
            method_matches = list(method_pattern.finditer(class_body))

            for attr, count in attr_counts.items():
                if count > 1:
                    continue

                usage_positions = []
                for m in re.finditer(rf'this\.{re.escape(attr)}\b', class_body):
                    usage_positions.append(m.start())

                if len(usage_positions) <= 2:
                    method_for_attr = None
                    for i, method_match in enumerate(method_matches):
                        method_start = method_match.start()
                        method_end = method_matches[i + 1].start() if i + 1 < len(method_matches) else len(class_body)
                        all_in_method = all(method_start <= pos < method_end for pos in usage_positions)
                        if all_in_method:
                            method_for_attr = method_match.group(1)
                            if method_for_attr == "constructor":
                                break

                    if method_for_attr and method_for_attr != "constructor":
                        line_match = re.search(rf'this\.{re.escape(attr)}\s*=', class_body)
                        if line_match:
                            abs_pos = class_body_start + line_match.start()
                            line_num = content[:abs_pos].count("\n") + 1
                            snippet = self._extract_snippet(lines, line_num)
                            results.append(self._make_result(
                                file_path=file_path,
                                start_line=line_num,
                                end_line=line_num,
                                description=f"临时字段 'this.{attr}' 仅在方法 '{method_for_attr}' 中设置和使用，应改为局部变量。",
                                code_snippet=snippet,
                                maintenance_issue="临时字段使得对象的状态不可预测，某些属性只在特定方法调用时才有值，增加理解和调试难度。",
                                refactoring_suggestion=f"将 'this.{attr}' 改为方法 '{method_for_attr}' 内的局部变量，因为它只在该方法中使用。",
                                severity=Severity.MEDIUM,
                            ))
        return results

    def _get_all_self_attrs(self, node: ast.ClassDef) -> dict:
        attrs = {}
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for child in ast.walk(item):
                    if isinstance(child, ast.Attribute) and isinstance(child.value, ast.Name):
                        if child.value.id == "self":
                            attrs.setdefault(child.attr, set()).add(item.name)
        return attrs

    def _get_method_attr_usage(self, node: ast.ClassDef) -> dict:
        method_attrs = {}
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for child in ast.walk(item):
                    if isinstance(child, ast.Assign):
                        for target in child.targets:
                            if (isinstance(target, ast.Attribute)
                                    and isinstance(target.value, ast.Name)
                                    and target.value.id == "self"):
                                method_attrs.setdefault(target.attr, set()).add(item.name)
        return method_attrs

    def _get_attr_def_line(self, node: ast.ClassDef, attr: str) -> int:
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for child in ast.walk(item):
                    if isinstance(child, ast.Assign):
                        for target in child.targets:
                            if (isinstance(target, ast.Attribute)
                                    and isinstance(target.value, ast.Name)
                                    and target.value.id == "self"
                                    and target.attr == attr):
                                return child.lineno
        return node.lineno

    def _detect_conditional_attrs(self, node: ast.ClassDef, lines: List[str], file_path: str) -> List[SmellResult]:
        results = []
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                conditional_assigns = self._find_conditional_assigns(item)
                for attr, assign_node in conditional_assigns.items():
                    snippet = self._extract_snippet(lines, assign_node.lineno, min(assign_node.lineno + 3, item.end_lineno or len(lines)))
                    results.append(self._make_result(
                        file_path=file_path,
                        start_line=assign_node.lineno,
                        end_line=assign_node.end_lineno or assign_node.lineno,
                        description=f"属性 'self.{attr}' 在方法 '{item.name}' 的条件分支中条件性赋值，可能导致临时字段异味。",
                        code_snippet=snippet,
                        maintenance_issue="条件性赋值的属性在对象其他地方可能为 None/undefined，增加空值检查负担和运行时错误风险。",
                        refactoring_suggestion="考虑在 __init__ 中初始化该属性为合理默认值，或引入 Null Object 模式。",
                        severity=Severity.LOW,
                    ))
        return results

    def _find_conditional_assigns(self, func_node) -> dict:
        result = {}
        for child in ast.walk(func_node):
            if isinstance(child, (ast.If, ast.While, ast.For)):
                for sub_child in ast.walk(child):
                    if isinstance(sub_child, ast.Assign):
                        for target in sub_child.targets:
                            if (isinstance(target, ast.Attribute)
                                    and isinstance(target.value, ast.Name)
                                    and target.value.id == "self"):
                                if target.attr not in result:
                                    result[target.attr] = sub_child
        return result

    def _extract_snippet(self, lines: List[str], line_num: int, end_line: int = None) -> str:
        if end_line is None:
            end_line = line_num
        return "".join(lines[line_num - 1:end_line])
