from .base import BaseParser
from .. import CodeBlock, ParseResult, CodeBlockType
import re
from typing import List, Optional


class JavaParser(BaseParser):
    METHOD_PATTERN = re.compile(
        r'^\s*(?P<modifiers>(?:(?:public|private|protected|static|final|abstract|synchronized|native)\s+)*)'
        r'(?P<return_type>[\w<>\[\],\s]+?)\s+'
        r'(?P<name>\w+)\s*\((?P<params>[^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{',
        re.MULTILINE,
    )

    CLASS_PATTERN = re.compile(
        r'^\s*(?P<modifiers>(?:(?:public|private|protected|static|final|abstract)\s+)*)'
        r'(?:class|interface|enum)\s+'
        r'(?P<name>\w+)',
        re.MULTILINE,
    )

    JAVADOC_PATTERN = re.compile(r'/\*\*[\s\S]*?\*/', re.MULTILINE)

    def get_language(self) -> str:
        return "java"

    def parse(self, source_code: str, file_path: str = "") -> ParseResult:
        lines = source_code.splitlines()
        blocks: List[CodeBlock] = []
        javadoc_ranges = self._find_javadoc_ranges(lines)

        for match in self.CLASS_PATTERN.finditer(source_code):
            name = match.group('name')
            start_line = source_code[:match.start()].count('\n')
            end_line = self._find_block_end(lines, start_line)
            code = '\n'.join(lines[start_line:end_line + 1])

            has_comment, existing = self._check_javadoc_above(lines, start_line, javadoc_ranges)
            indent = lines[start_line][:len(lines[start_line]) - len(lines[start_line].lstrip())]

            blocks.append(CodeBlock(
                block_type=CodeBlockType.CLASS,
                name=name,
                start_line=start_line,
                end_line=end_line,
                code=code,
                has_comment=has_comment,
                existing_comment=existing,
                indent=indent,
            ))

        for match in self.METHOD_PATTERN.finditer(source_code):
            name = match.group('name')
            if name in ('if', 'while', 'for', 'switch', 'catch', 'class', 'new'):
                continue

            return_type = match.group('return_type').strip()
            params_str = match.group('params') or ''
            params = self._parse_java_params(params_str)

            start_line = source_code[:match.start()].count('\n')
            end_line = self._find_block_end(lines, start_line)
            code = '\n'.join(lines[start_line:end_line + 1])

            has_comment, existing = self._check_javadoc_above(lines, start_line, javadoc_ranges)
            indent = lines[start_line][:len(lines[start_line]) - len(lines[start_line].lstrip())]

            parent_class = self._find_parent_class(start_line, blocks)

            blocks.append(CodeBlock(
                block_type=CodeBlockType.METHOD if parent_class else CodeBlockType.FUNCTION,
                name=name,
                start_line=start_line,
                end_line=end_line,
                code=code,
                has_comment=has_comment,
                existing_comment=existing,
                params=params,
                return_type=return_type if return_type != 'void' else None,
                parent_class=parent_class,
                indent=indent,
            ))

        logic_blocks = self._find_complex_logic_blocks(lines, blocks)
        blocks.extend(logic_blocks)
        blocks.sort(key=lambda b: b.start_line)

        return ParseResult(
            source_code=source_code,
            lines=lines,
            blocks=blocks,
            language="java",
            file_path=file_path,
        )

    def _find_javadoc_ranges(self, lines: List[str]) -> List[tuple]:
        ranges = []
        in_javadoc = False
        start = -1
        for i, line in enumerate(lines):
            stripped = line.strip()
            if '/**' in stripped and '*/' in stripped:
                ranges.append((i, i))
            elif '/**' in stripped:
                in_javadoc = True
                start = i
            elif in_javadoc and '*/' in stripped:
                in_javadoc = False
                ranges.append((start, i))
        return ranges

    def _check_javadoc_above(self, lines: List[str], func_line: int, javadoc_ranges: List[tuple]) -> tuple:
        for jd_start, jd_end in javadoc_ranges:
            if jd_end == func_line - 1:
                javadoc = '\n'.join(lines[jd_start:jd_end + 1])
                return True, javadoc
        return False, None

    def _find_block_end(self, lines: List[str], start_line: int) -> int:
        brace_count = 0
        found_open = False
        for i in range(start_line, len(lines)):
            for ch in lines[i]:
                if ch == '{':
                    brace_count += 1
                    found_open = True
                elif ch == '}':
                    brace_count -= 1
                    if found_open and brace_count == 0:
                        return i
        return len(lines) - 1

    def _parse_java_params(self, params_str: str) -> List[str]:
        params = []
        if not params_str.strip():
            return params
        depth = 0
        current = ""
        for ch in params_str:
            if ch == '<':
                depth += 1
                current += ch
            elif ch == '>':
                depth -= 1
                current += ch
            elif ch == ',' and depth == 0:
                params.append(current.strip())
                current = ""
            else:
                current += ch
        if current.strip():
            params.append(current.strip())

        result = []
        for p in params:
            parts = p.split()
            if len(parts) >= 2:
                result.append(parts[-1])
            else:
                result.append(p)
        return result

    def _find_parent_class(self, line: int, class_blocks: List[CodeBlock]) -> Optional[str]:
        for cb in class_blocks:
            if cb.block_type == CodeBlockType.CLASS and cb.start_line <= line <= cb.end_line:
                return cb.name
        return None
