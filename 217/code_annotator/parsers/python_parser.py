from .base import BaseParser
from .. import CodeBlock, ParseResult, CodeBlockType
import ast
import re
from typing import List, Optional


class PythonParser(BaseParser):
    def get_language(self) -> str:
        return "python"

    def parse(self, source_code: str, file_path: str = "") -> ParseResult:
        lines = source_code.splitlines()
        blocks: List[CodeBlock] = []

        try:
            tree = ast.parse(source_code)
        except SyntaxError:
            return ParseResult(
                source_code=source_code,
                lines=lines,
                blocks=[],
                language="python",
                file_path=file_path,
            )

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                block = self._parse_function(node, lines, source_code)
                if block:
                    blocks.append(block)
            elif isinstance(node, ast.ClassDef):
                block = self._parse_class(node, lines, source_code)
                if block:
                    blocks.append(block)

        logic_blocks = self._find_complex_logic_blocks(lines, blocks)
        blocks.extend(logic_blocks)
        blocks.sort(key=lambda b: b.start_line)

        return ParseResult(
            source_code=source_code,
            lines=lines,
            blocks=blocks,
            language="python",
            file_path=file_path,
        )

    def _parse_function(self, node, lines: List[str], source_code: str) -> Optional[CodeBlock]:
        start_line = node.lineno - 1
        end_line = self._find_end_line(node, lines) - 1
        code = '\n'.join(lines[start_line:end_line + 1])

        has_comment, existing = self._check_docstring(node)
        params = self._extract_params(node)
        return_type = self._extract_return_type(node)

        indent = lines[start_line][:len(lines[start_line]) - len(lines[start_line].lstrip())]

        parent_class = None
        if hasattr(node, 'parent_class'):
            parent_class = node.parent_class

        block_type = CodeBlockType.METHOD if parent_class else CodeBlockType.FUNCTION

        return CodeBlock(
            block_type=block_type,
            name=node.name,
            start_line=start_line,
            end_line=end_line,
            code=code,
            has_comment=has_comment,
            existing_comment=existing,
            params=params,
            return_type=return_type,
            parent_class=parent_class,
            indent=indent,
        )

    def _parse_class(self, node, lines: List[str], source_code: str) -> Optional[CodeBlock]:
        start_line = node.lineno - 1
        end_line = self._find_end_line(node, lines) - 1
        code = '\n'.join(lines[start_line:end_line + 1])

        has_comment, existing = self._check_docstring(node)

        indent = lines[start_line][:len(lines[start_line]) - len(lines[start_line].lstrip())]

        return CodeBlock(
            block_type=CodeBlockType.CLASS,
            name=node.name,
            start_line=start_line,
            end_line=end_line,
            code=code,
            has_comment=has_comment,
            existing_comment=existing,
            indent=indent,
        )

    def _find_end_line(self, node, lines: List[str]) -> int:
        if hasattr(node, 'end_lineno') and node.end_lineno:
            return node.end_lineno
        return min(node.lineno + 1, len(lines))

    def _check_docstring(self, node) -> tuple:
        docstring = ast.get_docstring(node, clean=False)
        if docstring:
            return True, docstring
        return False, None

    def _extract_params(self, node) -> List[str]:
        params = []
        for arg in node.args.args:
            if arg.arg == 'self':
                continue
            param_str = arg.arg
            if arg.annotation:
                try:
                    param_str += f": {ast.unparse(arg.annotation)}"
                except Exception:
                    pass
            params.append(param_str)

        if node.args.vararg:
            params.append(f"*{node.args.vararg.arg}")
        if node.args.kwarg:
            params.append(f"**{node.args.kwarg.arg}")

        return params

    def _extract_return_type(self, node) -> Optional[str]:
        if node.returns:
            try:
                return ast.unparse(node.returns)
            except Exception:
                return None
        return None
