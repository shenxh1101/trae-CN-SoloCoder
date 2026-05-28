"""
Parsers for importing mind map data from various formats.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import List, Optional, Tuple

from .node import MindMapNode, MindMapForest


class BaseParser:
    """Base class for all parsers."""

    @staticmethod
    def _strip_comment(line: str) -> str:
        """Strip inline comments starting with // or #."""
        line = re.sub(r'\s*//.*$', '', line)
        line = re.sub(r'\s*#.*$', '', line)
        return line.strip()

    @staticmethod
    def _extract_note(content: str) -> Tuple[str, Optional[str]]:
        """Extract note from content using [note] syntax."""
        note_match = re.search(r'\[(.*?)\]\s*$', content)
        if note_match:
            note = note_match.group(1)
            content = content[:note_match.start()].strip()
            return content, note
        return content, None

    @staticmethod
    def _extract_icon(content: str) -> Tuple[str, Optional[str]]:
        """Extract icon/emoji from content using :emoji: syntax."""
        icon_match = re.match(r'^(:[\w+\-]+:|[\U00010000-\U0010ffff])\s+', content)
        if icon_match:
            icon = icon_match.group(1)
            content = content[icon_match.end():].strip()
            return content, icon
        return content, None

    @classmethod
    def _parse_node_content(cls, line: str) -> Tuple[str, Optional[str], Optional[str]]:
        """Parse content, icon, and note from a line."""
        content = line.strip()
        content, icon = cls._extract_icon(content)
        content, note = cls._extract_note(content)
        return content, icon, note


class TextParser(BaseParser):
    """Parser for indented text format."""

    def __init__(self, indent_char: str = ' ', indent_size: int = 4):
        self.indent_char = indent_char
        self.indent_size = indent_size

    def _get_indent_level(self, line: str) -> int:
        """Calculate the indent level of a line."""
        stripped = line.lstrip(self.indent_char)
        indent_len = len(line) - len(stripped)
        if self.indent_char == '\t':
            return indent_len
        return indent_len // self.indent_size if self.indent_size > 0 else 0

    def parse(self, text: str) -> MindMapForest:
        """Parse text into a MindMapForest."""
        lines = text.splitlines()
        forest = MindMapForest()
        stack: List[Tuple[int, MindMapNode]] = []
        current_root: Optional[MindMapNode] = None

        for line in lines:
            if not line.strip():
                continue
            if line.strip().startswith('//') or line.strip().startswith('#'):
                continue

            raw_line = self._strip_comment(line)
            if not raw_line:
                continue

            level = self._get_indent_level(line)
            content, icon, note = self._parse_node_content(raw_line)

            if not content:
                continue

            node = MindMapNode(content=content, icon=icon, note=note)

            if level == 0:
                forest.add_root(node)
                current_root = node
                stack = [(0, node)]
            else:
                while stack and stack[-1][0] >= level:
                    stack.pop()

                if not stack:
                    parent = current_root
                    level = 1
                else:
                    parent = stack[-1][1]

                parent.add_child(node)
                stack.append((level, node))

        return forest

    @classmethod
    def parse_file(cls, file_path: str, **kwargs) -> MindMapForest:
        """Parse a text file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return cls(**kwargs).parse(content)


class MarkdownParser(BaseParser):
    """Parser for Markdown list format."""

    LIST_PATTERN = re.compile(
        r'^(\s*)'
        r'(?:[-*+]|\d+\.)'
        r'\s+'
        r'(.+)$'
    )

    HEADING_PATTERN = re.compile(r'^(#{1,6})\s+(.+)$')

    def _detect_format(self, lines: List[str]) -> str:
        """Detect whether the format is list-based or heading-based."""
        list_count = 0
        heading_count = 0
        for line in lines[:20]:
            if self.LIST_PATTERN.match(line):
                list_count += 1
            if self.HEADING_PATTERN.match(line):
                heading_count += 1
        return 'heading' if heading_count > list_count else 'list'

    def _get_list_level(self, indent: str) -> int:
        """Calculate list level from indentation."""
        tab_count = indent.count('\t')
        space_count = len(indent.replace('\t', ''))
        return tab_count + (space_count // 2)

    def _parse_list_format(self, lines: List[str]) -> MindMapForest:
        """Parse Markdown list format."""
        forest = MindMapForest()
        stack: List[Tuple[int, MindMapNode]] = []
        current_root: Optional[MindMapNode] = None

        for line in lines:
            if not line.strip():
                continue
            if line.strip().startswith('```'):
                continue

            match = self.LIST_PATTERN.match(line)
            if not match:
                continue

            indent, content = match.groups()
            level = self._get_list_level(indent)
            content, icon, note = self._parse_node_content(content)

            if not content:
                continue

            node = MindMapNode(content=content, icon=icon, note=note)

            if level == 0:
                forest.add_root(node)
                current_root = node
                stack = [(0, node)]
            else:
                while stack and stack[-1][0] >= level:
                    stack.pop()

                if not stack:
                    parent = current_root
                    level = 1
                else:
                    parent = stack[-1][1]

                parent.add_child(node)
                stack.append((level, node))

        return forest

    def _parse_heading_format(self, lines: List[str]) -> MindMapForest:
        """Parse Markdown heading format."""
        forest = MindMapForest()
        stack: List[Tuple[int, MindMapNode]] = []
        current_root: Optional[MindMapNode] = None

        for line in lines:
            if not line.strip():
                continue

            match = self.HEADING_PATTERN.match(line)
            if not match:
                continue

            hashes, content = match.groups()
            level = len(hashes) - 1
            content, icon, note = self._parse_node_content(content)

            if not content:
                continue

            node = MindMapNode(content=content, icon=icon, note=note)

            if level == 0:
                forest.add_root(node)
                current_root = node
                stack = [(0, node)]
            else:
                while stack and stack[-1][0] >= level:
                    stack.pop()

                if not stack:
                    parent = current_root
                    level = 1
                else:
                    parent = stack[-1][1]

                parent.add_child(node)
                stack.append((level, node))

        return forest

    def parse(self, text: str) -> MindMapForest:
        """Parse Markdown text into a MindMapForest."""
        lines = text.splitlines()
        format_type = self._detect_format(lines)

        if format_type == 'heading':
            return self._parse_heading_format(lines)
        return self._parse_list_format(lines)

    @classmethod
    def parse_file(cls, file_path: str) -> MindMapForest:
        """Parse a Markdown file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return cls().parse(content)


class OPMLParser(BaseParser):
    """Parser for OPML (Outline Processor Markup Language) format."""

    NS = {'opml': 'http://opml.org/spec2'}

    def _parse_outline(self, element: ET.Element) -> Optional[MindMapNode]:
        """Parse an outline element into a MindMapNode."""
        text = element.get('text') or element.get('title') or ''
        if not text:
            return None

        content, icon, note = self._parse_node_content(text)

        note = note or element.get('_note') or element.get('note')

        node = MindMapNode(content=content, icon=icon, note=note)

        if element.get('id'):
            node.node_id = element.get('id')

        if element.get('collapsed', '').lower() in ('true', '1', 'yes'):
            node.collapsed = True

        for child in element.findall('outline'):
            child_node = self._parse_outline(child)
            if child_node:
                node.add_child(child_node)

        return node

    def parse(self, xml_content: str) -> MindMapForest:
        """Parse OPML XML content into a MindMapForest."""
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            raise ValueError(f"Invalid OPML XML: {e}")

        forest = MindMapForest()

        head = root.find('head')
        if head is not None:
            title_elem = head.find('title')
            if title_elem is not None and title_elem.text:
                forest.metadata['title'] = title_elem.text

        body = root.find('body')
        if body is None:
            return forest

        for outline in body.findall('outline'):
            node = self._parse_outline(outline)
            if node:
                forest.add_root(node)

        return forest

    @classmethod
    def parse_file(cls, file_path: str) -> MindMapForest:
        """Parse an OPML file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return cls().parse(content)


def auto_parse(file_path: str) -> MindMapForest:
    """Automatically detect format and parse a file."""
    if file_path.lower().endswith('.opml') or file_path.lower().endswith('.xml'):
        return OPMLParser.parse_file(file_path)
    if file_path.lower().endswith('.md') or file_path.lower().endswith('.markdown'):
        return MarkdownParser.parse_file(file_path)
    return TextParser.parse_file(file_path)
