import ast
import re
import os
from typing import List, Tuple
from codedoc.config import ComplexityResult, Config


class ComplexityCalculator:
    def __init__(self, config: Config):
        self.config = config
        self.high_threshold = config.get("complexity.threshold_high", 10)
        self.medium_threshold = config.get("complexity.threshold_medium", 5)

    def analyze_python(self, filepath: str) -> List[ComplexityResult]:
        results = []
        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                source = f.read()
        except (IOError, OSError):
            return results

        try:
            tree = ast.parse(source, filename=filepath)
        except SyntaxError:
            return results

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                complexity = self._calc_python_complexity(node)
                level, suggestion = self._evaluate(complexity, node.name)
                end_line = node.end_lineno if hasattr(node, 'end_lineno') and node.end_lineno else node.lineno
                results.append(ComplexityResult(
                    file=filepath,
                    function_name=node.name or "<lambda>",
                    line_start=node.lineno,
                    line_end=end_line,
                    complexity=complexity,
                    level=level,
                    suggestion=suggestion,
                ))
            elif isinstance(node, ast.ClassDef):
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        complexity = self._calc_python_complexity(item)
                        full_name = f"{node.name}.{item.name}"
                        level, suggestion = self._evaluate(complexity, full_name)
                        end_line = item.end_lineno if hasattr(item, 'end_lineno') and item.end_lineno else item.lineno
                        results.append(ComplexityResult(
                            file=filepath,
                            function_name=full_name,
                            line_start=item.lineno,
                            line_end=end_line,
                            complexity=complexity,
                            level=level,
                            suggestion=suggestion,
                        ))

        return results

    def _calc_python_complexity(self, node: ast.AST) -> int:
        complexity = 1
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.IfExp)):
                complexity += 1
                if child.orelse:
                    complexity += 1
            elif isinstance(child, ast.For) or isinstance(child, ast.AsyncFor):
                complexity += 1
                if child.orelse:
                    complexity += 1
            elif isinstance(child, ast.While):
                complexity += 1
                if child.orelse:
                    complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, ast.With) or isinstance(child, ast.AsyncWith):
                complexity += 1
            elif isinstance(child, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
                complexity += 1
                for gen in child.generators:
                    complexity += len(gen.ifs)
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
            elif isinstance(child, ast.Assert):
                complexity += 1
            elif isinstance(child, ast.Lambda):
                complexity += 1
        return complexity

    def analyze_javascript(self, filepath: str) -> List[ComplexityResult]:
        results = []
        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                source = f.read()
        except (IOError, OSError):
            return results

        functions = self._extract_js_functions(source)
        for name, start_line, body_start, body_end in functions:
            body = source[body_start:body_end]
            complexity = self._calc_js_complexity(body)
            level, suggestion = self._evaluate(complexity, name)

            end_line = start_line + body[:len(body)].count("\n") if body else start_line
            results.append(ComplexityResult(
                file=filepath,
                function_name=name,
                line_start=start_line,
                line_end=end_line,
                complexity=complexity,
                level=level,
                suggestion=suggestion,
            ))

        return results

    def _extract_js_functions(self, source: str) -> List[Tuple[str, int, int, int]]:
        functions = []
        lines = source.splitlines()
        line_offsets = [0]
        for line in lines:
            line_offsets.append(line_offsets[-1] + len(line) + 1)

        for i, line in enumerate(lines, 1):
            match = re.match(
                r'(?:async\s+)?function\s+([\w$]+)\s*\([^)]*\)\s*\{',
                line
            )
            if match:
                name = match.group(1)
                brace_offset = line_offsets[i - 1] + line.index("{")
                brace_count = 0
                body_start = -1
                body_end = -1
                for idx in range(brace_offset, len(source)):
                    if source[idx] == "{":
                        if brace_count == 0:
                            body_start = idx + 1
                        brace_count += 1
                    elif source[idx] == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            body_end = idx
                            break
                functions.append((name, i, body_start, body_end))

            arrow_match = re.match(
                r'(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[\w$]+)\s*=>\s*\{',
                line
            )
            if arrow_match:
                name = arrow_match.group(1)
                brace_offset = line_offsets[i - 1] + line.index("{")
                brace_count = 0
                body_start = -1
                body_end = -1
                for idx in range(brace_offset, len(source)):
                    if source[idx] == "{":
                        if brace_count == 0:
                            body_start = idx + 1
                        brace_count += 1
                    elif source[idx] == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            body_end = idx
                            break
                functions.append((name, i, body_start, body_end))

        return functions

    def _calc_js_complexity(self, body: str) -> int:
        complexity = 1
        complexity += len(re.findall(r'\bif\b', body))
        complexity += len(re.findall(r'\belse\b', body))
        complexity += len(re.findall(r'\bfor\b', body))
        complexity += len(re.findall(r'\bwhile\b', body))
        complexity += len(re.findall(r'\bcase\b', body))
        complexity += len(re.findall(r'\bcatch\b', body))
        complexity += len(re.findall(r'&&', body))
        complexity += len(re.findall(r'\|\|', body))
        complexity += len(re.findall(r'\?\?', body))
        complexity += len(re.findall(r'\?\.\w', body))
        ternary_count = len(re.findall(r'\?[^?]', body))
        complexity += ternary_count
        return complexity

    def _evaluate(self, complexity: int, func_name: str) -> Tuple[str, str]:
        if complexity >= self.high_threshold:
            suggestion = (
                f"函数 '{func_name}' 圈复杂度为 {complexity}（过高），"
                f"建议拆分为多个小函数，每个函数职责单一。"
                f"可以将条件分支提取为独立函数，或使用策略模式/查找表替代多重if-else。"
            )
            return "high", suggestion
        elif complexity >= self.medium_threshold:
            suggestion = (
                f"函数 '{func_name}' 圈复杂度为 {complexity}（中等），"
                f"考虑简化逻辑，减少嵌套层级，提取部分逻辑为辅助函数。"
            )
            return "medium", suggestion
        else:
            return "low", f"函数 '{func_name}' 圈复杂度为 {complexity}，复杂度良好。"

    def analyze_file(self, filepath: str) -> List[ComplexityResult]:
        ext = os.path.splitext(filepath)[1].lower()
        if ext == ".py":
            return self.analyze_python(filepath)
        elif ext in (".js", ".jsx", ".mjs", ".ts", ".tsx"):
            return self.analyze_javascript(filepath)
        return []
