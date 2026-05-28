"""
Exporters for various output formats.
"""

from __future__ import annotations

import base64
import html
import json
import os
import re
import tempfile
import xml.etree.ElementTree as ET
from html import escape
from typing import List, Optional
from urllib.parse import quote

from .node import MindMapNode, MindMapForest
from .style import NodeStyle, StyleConfig


class BaseExporter:
    """Base class for all exporters."""

    def __init__(self, style_config: Optional[StyleConfig] = None):
        self.style_config = style_config or StyleConfig()

    def _get_style(self, node: MindMapNode) -> NodeStyle:
        """Get the style for a node."""
        return self.style_config.get_style_for_node(node)


class ASCIIExporter(BaseExporter):
    """Export mind map to ASCII art."""

    BOX_CHARS = {
        'light': {
            'h': '─', 'v': '│',
            'tl': '┌', 'tr': '┐',
            'bl': '└', 'br': '┘',
            'lt': '├', 'rt': '┤',
            'tt': '┬', 'bt': '┴',
            'cross': '┼',
            'arrow': '─→',
        },
        'heavy': {
            'h': '━', 'v': '┃',
            'tl': '┏', 'tr': '┓',
            'bl': '┗', 'br': '┛',
            'lt': '┣', 'rt': '┫',
            'tt': '┳', 'bt': '┻',
            'cross': '╋',
            'arrow': '━→',
        },
        'double': {
            'h': '═', 'v': '║',
            'tl': '╔', 'tr': '╗',
            'bl': '╚', 'br': '╝',
            'lt': '╠', 'rt': '╣',
            'tt': '╦', 'bt': '╩',
            'cross': '╬',
            'arrow': '═→',
        },
        'simple': {
            'h': '-', 'v': '|',
            'tl': '+', 'tr': '+',
            'bl': '+', 'br': '+',
            'lt': '+', 'rt': '+',
            'tt': '+', 'bt': '+',
            'cross': '+',
            'arrow': '->',
        },
    }

    def __init__(self, style_config: Optional[StyleConfig] = None, style: str = 'light',
                 show_icons: bool = True, show_notes: bool = False):
        super().__init__(style_config)
        self.box_style = self.BOX_CHARS.get(style, self.BOX_CHARS['light'])
        self.show_icons = show_icons
        self.show_notes = show_notes

    def _box_text(self, text: str, icon: Optional[str] = None, level: int = 0) -> str:
        """Wrap text in a box."""
        if self.show_icons and icon:
            text = f"{icon} {text}"
        text = text.strip()
        width = max(10, len(text) + 4)
        chars = self.box_style

        top = chars['tl'] + chars['h'] * (width - 2) + chars['tr']
        middle = chars['v'] + f" {text} ".center(width - 2) + chars['v']
        bottom = chars['bl'] + chars['h'] * (width - 2) + chars['br']

        return f"{top}\n{middle}\n{bottom}"

    def _render_tree(self, node: MindMapNode, prefix: str = '', is_last: bool = True,
                     is_root: bool = False) -> List[str]:
        """Render a tree node and its children."""
        lines = []
        chars = self.box_style

        if is_root:
            box = self._box_text(node.content, node.icon, node.get_level())
            lines.extend(box.split('\n'))
        else:
            connector = chars['arrow'] if is_last else chars['lt'] + chars['h'] * 2
            box = self._box_text(node.content, node.icon, node.get_level())
            box_lines = box.split('\n')

            for i, line in enumerate(box_lines):
                if i == 1:
                    lines.append(f"{prefix}{connector} {line}")
                else:
                    extension = ' ' * (len(connector) + 1)
                    if not is_last:
                        extension = chars['v'] + extension[1:]
                    lines.append(f"{prefix}{extension}{line}")

        if self.show_notes and node.note:
            note_lines = node.note.split('\n')
            for i, note_line in enumerate(note_lines):
                prefix_note = ' ' * (len(prefix) + len(connector) + 1) if not is_root else '   '
                if i == 0:
                    lines.append(f"{prefix_note}📝 {note_line}")
                else:
                    lines.append(f"{prefix_note}   {note_line}")

        children = node.children
        for i, child in enumerate(children):
            is_child_last = (i == len(children) - 1)
            if is_root:
                new_prefix = ' ' * 3
            else:
                new_prefix = prefix + (' ' if is_last else chars['v']) + ' ' * (len(connector) + 1)

            child_lines = self._render_tree(child, new_prefix, is_child_last, False)
            lines.extend(child_lines)

        return lines

    def export(self, forest: MindMapForest) -> str:
        """Export the forest to ASCII art."""
        all_lines = []
        for i, root in enumerate(forest.roots):
            tree_lines = self._render_tree(root, is_root=True)
            all_lines.extend(tree_lines)
            if i < len(forest.roots) - 1:
                all_lines.append('')
                all_lines.append(' ' * 10 + '─' * 40)
                all_lines.append('')
        return '\n'.join(all_lines)

    def export_file(self, forest: MindMapForest, file_path: str) -> None:
        """Export to a file."""
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(self.export(forest))


class HTMLExporter(BaseExporter):
    """Export mind map to interactive HTML."""

    def __init__(self, style_config: Optional[StyleConfig] = None, layout: str = 'right',
                 title: str = '思维导图'):
        super().__init__(style_config)
        self.layout = layout
        self.title = title

    def _escape(self, text: str) -> str:
        """Escape text for HTML."""
        return html.escape(text)

    def _node_to_html(self, node: MindMapNode) -> str:
        """Convert a node to HTML."""
        style = self._get_style(node)
        node_style = style.to_css()
        style_str = '; '.join(f'{k}: {v}' for k, v in node_style.items())

        content_parts = []
        if node.icon:
            content_parts.append(f'<span class="node-icon">{self._escape(node.icon)}</span>')
        content_parts.append(f'<span class="node-text">{self._escape(node.content)}</span>')
        content_html = ''.join(content_parts)

        note_attrs = ''
        note_class = ''
        if node.note:
            note_class = ' has-note'
            escaped_note = self._escape(node.note).replace("'", "\\'")
            note_attrs = (
                f" onmouseover=\"showNote(this, '{escaped_note}')\""
                f" onmouseout=\"hideNote()\""
            )

        collapsed_class = ' collapsed' if node.collapsed else ''
        toggle_html = ''
        if node.children:
            toggle_char = '+' if node.collapsed else '-'
            toggle_html = (
                f'<span class="node-toggle" id="toggle-{node.node_id}" '
                f'onclick="event.stopPropagation(); toggleNode(\'{node.node_id}\')">{toggle_char}</span>'
            )

        children_html = ''
        if node.children:
            child_parts = []
            for child in node.children:
                child_html = self._node_to_html(child)
                child_parts.append(f'<div class="child-node">{child_html}</div>')
            children_html = f'<div class="children">{"".join(child_parts)}</div>'

        layout_class = f'root-{self.layout}'

        return (
            f'<div class="node{collapsed_class}" id="node-{node.node_id}" data-level="{node.get_level()}">'
            f'<div class="node-content{note_class}" style="{style_str}"{note_attrs} '
            f'onclick="toggleNode(\'{node.node_id}\')">{toggle_html}{content_html}</div>'
            f'{children_html}'
            f'</div>'
        )

    def _generate_custom_css(self) -> str:
        """Generate custom CSS from style config."""
        css_parts = []
        for level in range(10):
            style = self.style_config.get_style_for_level(level)
            css_parts.append(f'.node[data-level="{level}"] > .node-content {{')
            css_parts.append(f'  font-size: {style.font_size}px !important;')
            css_parts.append(f'  background-color: {style.background_color} !important;')
            css_parts.append(f'  color: {style.color} !important;')
            css_parts.append(f'  border-color: {style.border_color} !important;')
            css_parts.append(f'  border-width: {style.border_width}px !important;')
            css_parts.append(f'  border-radius: {style.border_radius}px !important;')
            css_parts.append(f'  padding: {style.padding}px {style.padding * 2}px !important;')
            css_parts.append('}')
            css_parts.append(f'.node[data-level="{level}"] > .children::before {{')
            css_parts.append(f'  background: {style.line_color} !important;')
            css_parts.append(f'  width: {style.line_width}px !important;')
            css_parts.append('}')
            css_parts.append(f'.node[data-level="{level}"] .child-node::before {{')
            css_parts.append(f'  background: {style.line_color} !important;')
            css_parts.append(f'  height: {style.line_width}px !important;')
            css_parts.append('}')
            css_parts.append(f'#toggle-[data-level="{level}"] {{')
            css_parts.append(f'  background: {style.background_color} !important;')
            css_parts.append('}')
        return '\n'.join(css_parts)

    def export(self, forest: MindMapForest) -> str:
        """Export the forest to HTML."""
        template_path = os.path.join(
            os.path.dirname(__file__), 'templates', 'mindmap.html'
        )
        with open(template_path, 'r', encoding='utf-8') as f:
            template = f.read()

        layout_class = f'root-{self.layout}'
        mindmap_parts = []
        mindmap_class = 'mindmap'
        if self.layout == 'down':
            mindmap_class += ' down-layout'
        elif self.layout == 'radial':
            mindmap_class += ' radial-layout'

        for root in forest.roots:
            node_html = self._node_to_html(root)
            tree_html = f'<div class="tree {layout_class}">{node_html}</div>'
            mindmap_parts.append(tree_html)

        if len(forest.roots) > 1:
            mindmap_html = f'<div class="forest-container">{"".join(mindmap_parts)}</div>'
        else:
            mindmap_html = f'<div class="{mindmap_class}">{"".join(mindmap_parts)}</div>'

        data_json = json.dumps(forest.to_dict(), ensure_ascii=False)
        style_json = json.dumps(self.style_config.to_dict(), ensure_ascii=False)
        custom_css = self._generate_custom_css()

        html_content = template
        html_content = html_content.replace('{{ title }}', self._escape(self.title))
        html_content = html_content.replace('{{ mindmap_html }}', mindmap_html)
        html_content = html_content.replace('{{ data_json | safe }}', data_json)
        html_content = html_content.replace('{{ style_json | safe }}', style_json)
        html_content = html_content.replace('{{ layout }}', self.layout)
        html_content = html_content.replace('{{ custom_css }}', custom_css)

        return html_content

    def export_file(self, forest: MindMapForest, file_path: str) -> None:
        """Export to an HTML file."""
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(self.export(forest))


class FreeMindExporter(BaseExporter):
    """Export mind map to FreeMind .mm format."""

    def __init__(self, style_config: Optional[StyleConfig] = None):
        super().__init__(style_config)

    def _node_to_element(self, node: MindMapNode) -> ET.Element:
        """Convert a node to FreeMind XML element."""
        style = self._get_style(node)

        attrib = {
            'TEXT': node.content,
            'ID': node.node_id,
        }

        if node.icon:
            attrib['ICON'] = node.icon

        if node.note:
            attrib['NOTE'] = node.note

        if node.collapsed:
            attrib['FOLDED'] = 'true'

        if style:
            if style.background_color:
                attrib['BACKGROUND_COLOR'] = style.background_color
            if style.color:
                attrib['COLOR'] = style.color
            if style.font_size:
                attrib['FONT_SIZE'] = str(style.font_size)

        element = ET.Element('node', attrib)

        for child in node.children:
            child_element = self._node_to_element(child)
            element.append(child_element)

        return element

    def export(self, forest: MindMapForest) -> str:
        """Export the forest to FreeMind XML."""
        map_element = ET.Element('map', {'version': '1.0.1'})

        for root in forest.roots:
            root_element = self._node_to_element(root)
            map_element.append(root_element)

        ET.indent(map_element, space='  ')
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(
            map_element, encoding='unicode', xml_declaration=False
        )

    def export_file(self, forest: MindMapForest, file_path: str) -> None:
        """Export to a .mm file."""
        content = self.export(forest)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)


class PNGExporter(BaseExporter):
    """Export mind map to PNG image."""

    def __init__(self, style_config: Optional[StyleConfig] = None, layout: str = 'right',
                 width: int = 1920, height: int = 1080):
        super().__init__(style_config)
        self.layout = layout
        self.width = width
        self.height = height

    def _try_selenium(self, html_content: str, file_path: str) -> bool:
        """Try to capture using Selenium."""
        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager

            options = Options()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument(f'--window-size={self.width},{self.height}')

            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                f.write(html_content)
                temp_path = f.name

            try:
                driver.get(f'file://{temp_path}')
                driver.execute_script('document.body.style.overflow = "hidden";')
                driver.execute_script(
                    'return new Promise(resolve => {'
                    '  setTimeout(() => resolve(true), 1000);'
                    '});'
                )
                driver.save_screenshot(file_path)
                return True
            finally:
                driver.quit()
                os.unlink(temp_path)
        except Exception:
            return False

    def _try_playwright(self, html_content: str, file_path: str) -> bool:
        """Try to capture using Playwright."""
        try:
            from playwright.sync_api import sync_playwright

            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                f.write(html_content)
                temp_path = f.name

            try:
                with sync_playwright() as p:
                    browser = p.chromium.launch()
                    page = browser.new_page(viewport={'width': self.width, 'height': self.height})
                    page.goto(f'file://{temp_path}')
                    page.wait_for_timeout(1000)
                    page.screenshot(path=file_path, full_page=True)
                    browser.close()
                    return True
            finally:
                os.unlink(temp_path)
        except Exception:
            return False

    def _try_imgkit(self, html_content: str, file_path: str) -> bool:
        """Try to capture using imgkit."""
        try:
            import imgkit

            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                f.write(html_content)
                temp_path = f.name

            try:
                options = {
                    'format': 'png',
                    'width': self.width,
                    'height': self.height,
                    'encoding': 'UTF-8',
                }
                imgkit.from_file(temp_path, file_path, options=options)
                return True
            finally:
                os.unlink(temp_path)
        except Exception:
            return False

    def export(self, forest: MindMapForest) -> bytes:
        """Export the forest to PNG bytes."""
        html_exporter = HTMLExporter(self.style_config, self.layout)
        html_content = html_exporter.export(forest)

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            temp_path = f.name

        try:
            if self._try_playwright(html_content, temp_path):
                with open(temp_path, 'rb') as f:
                    return f.read()
            if self._try_selenium(html_content, temp_path):
                with open(temp_path, 'rb') as f:
                    return f.read()
            if self._try_imgkit(html_content, temp_path):
                with open(temp_path, 'rb') as f:
                    return f.read()

            raise RuntimeError(
                "No headless browser tool available. "
                "Please install playwright, selenium, or imgkit."
            )
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def export_file(self, forest: MindMapForest, file_path: str) -> None:
        """Export to a PNG file."""
        data = self.export(forest)
        with open(file_path, 'wb') as f:
            f.write(data)


class EmbedCodeExporter(BaseExporter):
    """Generate embed code for blogs and web pages."""

    def __init__(self, style_config: Optional[StyleConfig] = None, layout: str = 'right'):
        super().__init__(style_config)
        self.layout = layout

    def export_iframe(self, forest: MindMapForest, title: str = '思维导图',
                      width: str = '100%', height: str = '600px') -> str:
        """Generate iframe embed code with data URI."""
        html_exporter = HTMLExporter(self.style_config, self.layout, title)
        html_content = html_exporter.export(forest)

        encoded_html = base64.b64encode(html_content.encode('utf-8')).decode('ascii')
        data_uri = f'data:text/html;charset=utf-8;base64,{encoded_html}'

        return (
            f'<iframe src="{data_uri}" '
            f'width="{width}" height="{height}" '
            f'frameborder="0" scrolling="auto" '
            f'title="{html.escape(title)}" '
            f'style="border: 1px solid #ddd; border-radius: 8px;"></iframe>'
        )

    def export_div(self, forest: MindMapForest, container_id: str = 'mindmap-container') -> str:
        """Generate a div-based embed code with inline HTML."""
        html_exporter = HTMLExporter(self.style_config, self.layout)
        html_content = html_exporter.export(forest)

        match = re.search(r'<body>(.*?)</body>', html_content, re.DOTALL)
        body_content = match.group(1) if match else html_content

        css_match = re.search(r'<style>(.*?)</style>', html_content, re.DOTALL)
        css_content = css_match.group(1) if css_match else ''

        js_match = re.search(r'<script>(.*?)</script>', html_content, re.DOTALL)
        js_content = js_match.group(1) if js_match else ''

        return (
            f'<style>\n{css_content}\n</style>\n'
            f'<div id="{container_id}">\n{body_content}\n</div>\n'
            f'<script>\n{js_content}\n</script>'
        )

    def export_json(self, forest: MindMapForest) -> str:
        """Generate JSON data for embedding with a viewer."""
        return forest.to_json()

    def export_file(self, forest: MindMapForest, file_path: str, format: str = 'iframe') -> None:
        """Export embed code to a file."""
        if format == 'iframe':
            content = self.export_iframe(forest)
        elif format == 'div':
            content = self.export_div(forest)
        elif format == 'json':
            content = self.export_json(forest)
        else:
            raise ValueError(f"Unknown format: {format}")

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
