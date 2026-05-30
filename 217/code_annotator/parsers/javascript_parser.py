from .base import BaseParser
from .. import CodeBlock, ParseResult, CodeBlockType
import re
from typing import List, Optional


class JavaScriptParser(BaseParser):
    FUNC_PATTERNS = [
        re.compile(
            r'^\s*(?P<export>export\s+)?(?P<async>async\s+)?function\s+(?P<name>\w+)\s*\((?P<params>[^)]*)\)',
            re.MULTILINE,
        ),
        re.compile(
            r'^\s*(?P<export>export\s+)?(?P<const_let_var>(?:const|let|var)\s+)?(?P<name>\w+)\s*=\s*(?P<async>async\s+)?function\s*\((?P<params>[^)]*)\)',
            re.MULTILINE,
        ),
        re.compile(
            r'^\s*(?P<export>export\s+)?(?P<const_let_var>(?:const|let|var)\s+)?(?P<name>\w+)\s*=\s*(?P<async>async\s+)?\((?P<params>[^)]*)\)\s*=>',
            re.MULTILINE,
        ),
        re.compile(
            r'^\s*(?P<async>async\s+)?(?P<name>\w+)\s*\((?P<params>[^)]*)\)\s*\{',
            re.MULTILINE,
        ),
    ]

    CLASS_PATTERN = re.compile(
        r'^\s*(?P<export>export\s+)?(?P<default>default\s+)?class\s+(?P<name>\w+)',
        re.MULTILINE,
    )

    JSDOC_PATTERN = re.compile(r'/\*\*[\s\S]*?\*/', re.MULTILINE)

    def get_language(self) -> str:
        return "javascript"

    def parse(self, source_code: str, file_path: str = "") -> ParseResult:
        lines = source_code.splitlines()
        blocks: List[CodeBlock] = []
        jsdoc_ranges = self._find_jsdoc_ranges(lines)

        for pattern in self.FUNC_PATTERNS:
            for match in pattern.finditer(source_code):
                name = match.group('name')
                if not name:
                    continue
                params_str = match.group('params') or ''
                params = [p.strip().split('=')[0].strip() for p in params_str.split(',') if p.strip()]

                start_line = source_code[:match.start()].count('\n')
                end_line = self._find_block_end(lines, start_line)
                code = '\n'.join(lines[start_line:end_line + 1])

                has_comment, existing = self._check_jsdoc_above(lines, start_line, jsdoc_ranges)
                indent = lines[start_line][:len(lines[start_line]) - len(lines[start_line].lstrip())]

                blocks.append(CodeBlock(
                    block_type=CodeBlockType.FUNCTION,
                    name=name,
                    start_line=start_line,
                    end_line=end_line,
                    code=code,
                    has_comment=has_comment,
                    existing_comment=existing,
                    params=params,
                    indent=indent,
                ))

        for match in self.CLASS_PATTERN.finditer(source_code):
            name = match.group('name')
            start_line = source_code[:match.start()].count('\n')
            end_line = self._find_class_end(lines, start_line)
            code = '\n'.join(lines[start_line:end_line + 1])

            has_comment, existing = self._check_jsdoc_above(lines, start_line, jsdoc_ranges)
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

        logic_blocks = self._find_complex_logic_blocks(lines, blocks)
        blocks.extend(logic_blocks)
        blocks.sort(key=lambda b: b.start_line)

        seen = set()
        unique_blocks = []
        for b in blocks:
            key = (b.name, b.start_line)
            if key not in seen:
                seen.add(key)
                unique_blocks.append(b)

        return ParseResult(
            source_code=source_code,
            lines=lines,
            blocks=unique_blocks,
            language="javascript",
            file_path=file_path,
        )

    def _find_jsdoc_ranges(self, lines: List[str]) -> List[tuple]:
        ranges = []
        in_jsdoc = False
        start = -1
        for i, line in enumerate(lines):
            stripped = line.strip()
            if '/**' in stripped and '*/' in stripped:
                ranges.append((i, i))
            elif '/**' in stripped:
                in_jsdoc = True
                start = i
            elif in_jsdoc and '*/' in stripped:
                in_jsdoc = False
                ranges.append((start, i))
        return ranges

    def _check_jsdoc_above(self, lines: List[str], func_line: int, jsdoc_ranges: List[tuple]) -> tuple:
        for jsdoc_start, jsdoc_end in jsdoc_ranges:
            if jsdoc_end == func_line - 1:
                jsdoc = '\n'.join(lines[jsdoc_start:jsdoc_end + 1])
                return True, jsdoc
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

        is_arrow = '=>' in lines[start_line]
        if is_arrow and not found_open:
            for i in range(start_line, len(lines)):
                stripped = lines[i].strip()
                if i > start_line and not stripped:
                    return i - 1
                if i > start_line and not stripped.startswith(('(', '{', '[', '.', '&&', '||', '?', ':', '+', ',', '`')):
                    return i - 1
            return len(lines) - 1

        return len(lines) - 1

    def _find_class_end(self, lines: List[str], start_line: int) -> int:
        return self._find_block_end(lines, start_line)

    def _detect_existing_comment(self, lines: List[str], block_start: int) -> tuple:
        if block_start > 0:
            prev = lines[block_start - 1].strip()
            if prev.startswith('//') or prev.endswith('*/'):
                return True, prev
        return False, None
