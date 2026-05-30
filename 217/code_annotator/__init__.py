from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class CodeBlockType(Enum):
    FUNCTION = "function"
    CLASS = "class"
    METHOD = "method"
    COMPLEX_LOGIC = "complex_logic"


@dataclass
class CodeBlock:
    block_type: CodeBlockType
    name: str
    start_line: int
    end_line: int
    code: str
    has_comment: bool = False
    existing_comment: Optional[str] = None
    params: List[str] = field(default_factory=list)
    return_type: Optional[str] = None
    parent_class: Optional[str] = None
    indent: str = ""


@dataclass
class ParseResult:
    source_code: str
    lines: List[str]
    blocks: List[CodeBlock]
    language: str
    file_path: str = ""
