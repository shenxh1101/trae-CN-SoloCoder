from abc import ABC, abstractmethod
from typing import List, Optional
from .. import CodeBlock, ParseResult, CodeBlockType
import re


class BaseParser(ABC):
    def __init__(self):
        self.complex_logic_threshold = 8

    @abstractmethod
    def parse(self, source_code: str, file_path: str = "") -> ParseResult:
        pass

    @abstractmethod
    def get_language(self) -> str:
        pass

    def _detect_existing_comment(self, lines: List[str], block_start: int) -> tuple:
        return False, None

    def _count_complexity(self, code: str) -> int:
        complexity = 1
        patterns = [
            r'\bif\b', r'\belif\b', r'\belse\b', r'\bfor\b',
            r'\bwhile\b', r'\band\b', r'\bor\b', r'\btry\b',
            r'\bexcept\b', r'\bwith\b', r'\bcatch\b', r'\bswitch\b',
            r'\bcase\b', r'\b&&\b', r'\b\|\|\b', r'\?\s',
        ]
        for pattern in patterns:
            complexity += len(re.findall(pattern, code))
        return complexity

    def _find_complex_logic_blocks(self, lines: List[str], existing_blocks: List[CodeBlock]) -> List[CodeBlock]:
        occupied = set()
        for block in existing_blocks:
            for i in range(block.start_line, block.end_line + 1):
                occupied.add(i)

        blocks = []
        i = 0
        while i < len(lines):
            if (i + 1) in occupied:
                i += 1
                continue
            stripped = lines[i].strip()
            if not stripped or stripped.startswith(('#', '//', '/*', '*', '*/')):
                i += 1
                continue

            indent = len(lines[i]) - len(lines[i].lstrip())
            block_start = i
            j = i + 1
            while j < len(lines):
                if (j + 1) in occupied:
                    break
                line_stripped = lines[j].strip()
                if not line_stripped:
                    j += 1
                    break
                current_indent = len(lines[j]) - len(lines[j].lstrip())
                if current_indent < indent and line_stripped:
                    break
                j += 1

            block_end = j - 1
            block_code = '\n'.join(lines[block_start:block_end + 1])
            complexity = self._count_complexity(block_code)

            if complexity >= self.complex_logic_threshold and (block_end - block_start) >= 3:
                has_comment, existing = self._check_line_comment(lines, block_start)
                if not has_comment:
                    blocks.append(CodeBlock(
                        block_type=CodeBlockType.COMPLEX_LOGIC,
                        name=f"logic_L{block_start + 1}",
                        start_line=block_start,
                        end_line=block_end,
                        code=block_code,
                        has_comment=has_comment,
                        existing_comment=existing,
                        indent=lines[block_start][:len(lines[block_start]) - len(lines[block_start].lstrip())],
                    ))
            i = j

        return blocks

    def _check_line_comment(self, lines: List[str], line_idx: int) -> tuple:
        if line_idx > 0:
            prev = lines[line_idx - 1].strip()
            if prev.startswith('//') or prev.startswith('#'):
                return True, prev
        return False, None
