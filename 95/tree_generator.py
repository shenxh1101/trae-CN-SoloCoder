#!/usr/bin/env python3
"""Directory Tree Generator - Core module for scanning and rendering directory trees."""

import os
import sys
import json
import hashlib
import time
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Set, Tuple
from pathlib import Path


EXTENSION_COLORS = {
    '.py': '\033[34m',
    '.js': '\033[33m',
    '.ts': '\033[36m',
    '.jsx': '\033[33m',
    '.tsx': '\033[36m',
    '.html': '\033[35m',
    '.css': '\033[35m',
    '.json': '\033[33m',
    '.md': '\033[32m',
    '.txt': '\033[37m',
    '.yml': '\033[33m',
    '.yaml': '\033[33m',
    '.xml': '\033[32m',
    '.csv': '\033[32m',
    '.sh': '\033[31m',
    '.bash': '\033[31m',
    '.zsh': '\033[31m',
    '.go': '\033[36m',
    '.rs': '\033[35m',
    '.java': '\033[31m',
    '.cpp': '\033[36m',
    '.c': '\033[36m',
    '.h': '\033[36m',
    '.hpp': '\033[36m',
    '.rb': '\033[31m',
    '.php': '\033[35m',
    '.swift': '\033[33m',
    '.kt': '\033[33m',
    '.scala': '\033[31m',
    '.sql': '\033[32m',
    '.png': '\033[35m',
    '.jpg': '\033[35m',
    '.jpeg': '\033[35m',
    '.gif': '\033[35m',
    '.svg': '\033[35m',
    '.ico': '\033[35m',
    '.mp4': '\033[31m',
    '.avi': '\033[31m',
    '.mov': '\033[31m',
    '.mp3': '\033[36m',
    '.wav': '\033[36m',
    '.pdf': '\033[33m',
    '.doc': '\033[34m',
    '.docx': '\033[34m',
    '.xls': '\033[32m',
    '.xlsx': '\033[32m',
    '.ppt': '\033[31m',
    '.pptx': '\033[31m',
    '.zip': '\033[31m',
    '.tar': '\033[31m',
    '.gz': '\033[31m',
    '.bz2': '\033[31m',
    '.7z': '\033[31m',
    '.rar': '\033[31m',
    '.exe': '\033[31m',
    '.dll': '\033[31m',
    '.so': '\033[31m',
    '.dylib': '\033[31m',
    '.bin': '\033[31m',
}

DEFAULT_EXCLUDE_DIRS = {'.git', 'node_modules', '__pycache__', '.svn', '.hg', '.idea', '.vscode'}

RESET_COLOR = '\033[0m'
BOLD = '\033[1m'
DIM = '\033[2m'

TREE_CHARS = {
    'branch': '├── ',
    'branch_last': '└── ',
    'vertical': '│   ',
    'space': '    ',
    'root': '',
}


@dataclass
class TreeNode:
    name: str
    path: str
    is_dir: bool
    size: int = 0
    mtime: float = 0.0
    children: List['TreeNode'] = field(default_factory=list)
    file_count: int = 0
    dir_count: int = 0

    @property
    def extension(self) -> str:
        if self.is_dir:
            return ''
        _, ext = os.path.splitext(self.name)
        return ext.lower()

    @property
    def color(self) -> str:
        if self.is_dir:
            return BOLD + '\033[34m'
        ext = self.extension
        return EXTENSION_COLORS.get(ext, '\033[37m')


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def format_time(timestamp: float) -> str:
    dt = datetime.fromtimestamp(timestamp)
    return dt.strftime('%Y-%m-%d %H:%M:%S')


def should_exclude(name: str, exclude_dirs: Set[str]) -> bool:
    return name in exclude_dirs


def scan_directory(
    path: str,
    max_depth: int = -1,
    exclude_dirs: Optional[Set[str]] = None,
    show_files: bool = True,
    filter_extensions: Optional[Set[str]] = None,
    current_depth: int = 0,
) -> Optional[TreeNode]:
    if exclude_dirs is None:
        exclude_dirs = DEFAULT_EXCLUDE_DIRS.copy()

    try:
        stat = os.stat(path)
    except (OSError, PermissionError):
        return None

    name = os.path.basename(path) or path
    is_dir = os.path.isdir(path)

    node = TreeNode(
        name=name,
        path=os.path.abspath(path),
        is_dir=is_dir,
        size=stat.st_size if not is_dir else 0,
        mtime=stat.st_mtime,
    )

    if is_dir:
        try:
            entries = sorted(os.listdir(path))
        except (OSError, PermissionError):
            entries = []

        dirs = []
        files = []
        for entry in entries:
            entry_path = os.path.join(path, entry)
            if should_exclude(entry, exclude_dirs):
                continue
            try:
                if os.path.isdir(entry_path):
                    dirs.append(entry)
                elif os.path.isfile(entry_path):
                    if filter_extensions:
                        _, ext = os.path.splitext(entry)
                        if ext.lower() not in filter_extensions:
                            continue
                    files.append(entry)
            except OSError:
                continue

        if max_depth < 0 or current_depth < max_depth:
            for d in dirs:
                child = scan_directory(
                    os.path.join(path, d),
                    max_depth,
                    exclude_dirs,
                    show_files,
                    filter_extensions,
                    current_depth + 1,
                )
                if child:
                    node.children.append(child)
                    node.dir_count += 1 + child.dir_count
                    node.file_count += child.file_count
                    node.size += child.size

            if show_files:
                for f in files:
                    file_path = os.path.join(path, f)
                    try:
                        fstat = os.stat(file_path)
                        file_node = TreeNode(
                            name=f,
                            path=os.path.abspath(file_path),
                            is_dir=False,
                            size=fstat.st_size,
                            mtime=fstat.st_mtime,
                        )
                        node.children.append(file_node)
                        node.file_count += 1
                        node.size += fstat.st_size
                    except (OSError, PermissionError):
                        continue

        node.dir_count += len([c for c in node.children if c.is_dir])

    return node


def render_tree(
    node: TreeNode,
    prefix: str = '',
    is_last: bool = True,
    show_size: bool = False,
    show_time: bool = False,
    use_color: bool = True,
    show_stats: bool = False,
    max_depth: int = -1,
    current_depth: int = 0,
) -> List[str]:
    lines = []

    if current_depth == 0:
        name = node.name
        if use_color:
            name = node.color + name + RESET_COLOR
        line = name
        extras = []
        if show_size and node.size > 0:
            extras.append(format_size(node.size))
        if show_time:
            extras.append(format_time(node.mtime))
        if show_stats:
            extras.append(f"[{node.dir_count} dirs, {node.file_count} files]")
        if extras:
            line += f"  {DIM}({' | '.join(extras)}){RESET_COLOR}"
        lines.append(line)
    else:
        connector = TREE_CHARS['branch_last'] if is_last else TREE_CHARS['branch']
        name = node.name
        if use_color:
            name = node.color + name + RESET_COLOR
        line = prefix + connector + name
        extras = []
        if show_size and node.size > 0:
            extras.append(format_size(node.size))
        if show_time and not node.is_dir:
            extras.append(format_time(node.mtime))
        if show_stats and node.is_dir:
            extras.append(f"[{node.dir_count} dirs, {node.file_count} files]")
        if extras:
            line += f"  {DIM}({' | '.join(extras)}){RESET_COLOR}"
        lines.append(line)

    if node.is_dir and (max_depth < 0 or current_depth < max_depth):
        extension = TREE_CHARS['space'] if is_last else TREE_CHARS['vertical']
        new_prefix = prefix + extension

        children = node.children
        dir_children = [c for c in children if c.is_dir]
        file_children = [c for c in children if not c.is_dir]
        sorted_children = dir_children + file_children

        for i, child in enumerate(sorted_children):
            child_is_last = (i == len(sorted_children) - 1)
            child_lines = render_tree(
                child,
                new_prefix,
                child_is_last,
                show_size,
                show_time,
                use_color,
                show_stats,
                max_depth,
                current_depth + 1,
            )
            lines.extend(child_lines)

    return lines


def tree_to_dict(node: TreeNode, max_depth: int = -1, current_depth: int = 0) -> dict:
    result = {
        'name': node.name,
        'path': node.path,
        'is_dir': node.is_dir,
        'size': node.size,
        'size_formatted': format_size(node.size),
        'mtime': node.mtime,
        'mtime_formatted': format_time(node.mtime),
    }

    if node.is_dir:
        result['file_count'] = node.file_count
        result['dir_count'] = node.dir_count
        if max_depth < 0 or current_depth < max_depth:
            result['children'] = [
                tree_to_dict(c, max_depth, current_depth + 1)
                for c in node.children
            ]
        else:
            result['children'] = []

    return result


def generate_snapshot(node: TreeNode) -> str:
    snapshot_data = tree_to_dict(node)
    return json.dumps(snapshot_data, indent=2, default=str)


def load_snapshot(path: str) -> Optional[dict]:
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def compare_trees(old: dict, new: dict, path: str = '') -> List[Tuple[str, str, str]]:
    changes = []

    old_children = {c['name']: c for c in old.get('children', []) if c.get('children') is not None or c.get('is_dir', False)}
    new_children = {c['name']: c for c in new.get('children', []) if c.get('children') is not None or c.get('is_dir', False)}

    old_files = {c['name']: c for c in old.get('children', []) if not c.get('is_dir', False)}
    new_files = {c['name']: c for c in new.get('children', []) if not c.get('is_dir', False)}

    for name in old_files:
        full_path = f"{path}/{name}" if path else name
        if name not in new_files:
            changes.append(('deleted', full_path, 'file'))
        elif old_files[name].get('size') != new_files[name].get('size') or \
             old_files[name].get('mtime') != new_files[name].get('mtime'):
            changes.append(('modified', full_path, 'file'))

    for name in new_files:
        full_path = f"{path}/{name}" if path else name
        if name not in old_files:
            changes.append(('added', full_path, 'file'))

    for name in old_children:
        full_path = f"{path}/{name}" if path else name
        if name not in new_children:
            changes.append(('deleted', full_path, 'dir'))
        else:
            changes.extend(compare_trees(old_children[name], new_children[name], full_path))

    for name in new_children:
        full_path = f"{path}/{name}" if path else name
        if name not in old_children:
            changes.append(('added', full_path, 'dir'))

    return changes


def generate_diff_tree(
    node: TreeNode,
    old_snapshot: dict,
    prefix: str = '',
    is_last: bool = True,
    current_depth: int = 0,
) -> List[str]:
    lines = []

    if current_depth == 0:
        name = BOLD + '\033[34m' + node.name + RESET_COLOR
        lines.append(name)
    else:
        connector = TREE_CHARS['branch_last'] if is_last else TREE_CHARS['branch']
        name = node.name
        if node.is_dir:
            name = BOLD + '\033[34m' + name + RESET_COLOR
        line = prefix + connector + name
        lines.append(line)

    if node.is_dir:
        extension = TREE_CHARS['space'] if is_last else TREE_CHARS['vertical']
        new_prefix = prefix + extension

        children = node.children
        dir_children = [c for c in children if c.is_dir]
        file_children = [c for c in children if not c.is_dir]
        sorted_children = dir_children + file_children

        old_children_names = {c['name'] for c in old_snapshot.get('children', [])}

        for i, child in enumerate(sorted_children):
            child_is_last = (i == len(sorted_children) - 1)
            child_old = None
            for c in old_snapshot.get('children', []):
                if c['name'] == child.name:
                    child_old = c
                    break

            is_new = child.name not in old_children_names

            if is_new and child.is_dir:
                connector = TREE_CHARS['branch_last'] if child_is_last else TREE_CHARS['branch']
                name = '\033[32m' + '[+] ' + child.name + RESET_COLOR
                lines.append(new_prefix + connector + name)
            elif is_new and not child.is_dir:
                connector = TREE_CHARS['branch_last'] if child_is_last else TREE_CHARS['branch']
                name = '\033[32m' + '[+] ' + child.name + RESET_COLOR
                lines.append(new_prefix + connector + name)
            elif not is_new and child.is_dir and child_old:
                child_lines = generate_diff_tree(
                    child, child_old, new_prefix, child_is_last, current_depth + 1
                )
                lines.extend(child_lines)
            elif not is_new and not child.is_dir:
                old_size = child_old.get('size') if child_old else None
                if old_size != child.size:
                    connector = TREE_CHARS['branch_last'] if child_is_last else TREE_CHARS['branch']
                    name = '\033[33m' + '[~] ' + child.name + RESET_COLOR
                    lines.append(new_prefix + connector + name)

    return lines


def generate_html(node: TreeNode, show_size: bool = True, show_time: bool = True) -> str:
    def render_node(n, depth=0):
        indent = '  ' * (depth + 1)
        if n.is_dir:
            children_html = ''
            dir_children = [c for c in n.children if c.is_dir]
            file_children = [c for c in n.children if not c.is_dir]
            for child in dir_children + file_children:
                children_html += render_node(child, depth + 1)

            stats = f" [{n.dir_count} dirs, {n.file_count} files]" if depth == 0 else ''
            size_info = f" ({format_size(n.size)})" if show_size and n.size > 0 else ''

            return f'''{indent}<li class="folder">
{indent}  <details open>
{indent}    <summary><span class="icon">📁</span> {n.name}{stats}{size_info}</summary>
{indent}    <ul>
{children_html}{indent}    </ul>
{indent}  </details>
{indent}</li>
'''
        else:
            ext = n.extension
            icon = EXTENSION_ICONS.get(ext, '📄')
            color = EXTENSION_HEX.get(ext, '#888')
            extra = ''
            if show_size:
                extra += f' <span class="size">{format_size(n.size)}</span>'
            if show_time:
                extra += f' <span class="time">{format_time(n.mtime)}</span>'
            return f'{indent}<li class="file" style="color:{color}"><span class="icon">{icon}</span> {n.name}{extra}</li>\n'

    tree_html = render_node(node)

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory Tree - {node.name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            line-height: 1.6;
        }}
        h1 {{ color: #569cd6; margin-bottom: 20px; }}
        .tree {{ list-style: none; }}
        .tree ul {{ list-style: none; padding-left: 24px; }}
        .tree li {{ padding: 2px 0; }}
        .tree .folder > summary {{
            cursor: pointer;
            user-select: none;
            list-style: none;
        }}
        .tree .folder > summary::-webkit-details-marker {{ display: none; }}
        .tree .folder[open] > summary .icon::before {{ content: '📂'; }}
        .tree .folder:not([open]) > summary .icon::before {{ content: '📁'; }}
        .tree .folder > summary .icon {{ font-style: normal; }}
        .tree .folder > summary .icon::before {{
            content: '📂';
            display: inline-block;
            width: 1.2em;
        }}
        .tree .file .icon {{ margin-right: 4px; }}
        .size {{ color: #6a9955; font-size: 0.85em; }}
        .time {{ color: #808080; font-size: 0.85em; }}
        .stats {{
            margin-top: 20px;
            padding: 10px;
            background: #252526;
            border-radius: 4px;
        }}
    </style>
</head>
<body>
    <h1>📁 {node.name}</h1>
    <ul class="tree">
{tree_html}
    </ul>
    <div class="stats">
        <p>📊 统计: {node.dir_count} 个目录, {node.file_count} 个文件</p>
        <p>💾 总大小: {format_size(node.size)}</p>
    </div>
</body>
</html>'''
    return html


EXTENSION_ICONS = {
    '.py': '🐍', '.js': '📜', '.ts': '📘', '.jsx': '⚛️', '.tsx': '⚛️',
    '.html': '🌐', '.css': '🎨', '.json': '📋', '.md': '📝', '.txt': '📄',
    '.yml': '⚙️', '.yaml': '⚙️', '.xml': '📰', '.csv': '📊',
    '.sh': '💻', '.bash': '💻', '.zsh': '💻',
    '.go': '🐹', '.rs': '🦀', '.java': '☕', '.cpp': '⚡', '.c': '⚡',
    '.h': '📐', '.hpp': '📐', '.rb': '💎', '.php': '🐘',
    '.swift': '🐦', '.kt': '🎯', '.scala': '🔷', '.sql': '🗃️',
    '.png': '🖼️', '.jpg': '🖼️', '.jpeg': '🖼️', '.gif': '🖼️',
    '.svg': '🎨', '.ico': '🖼️',
    '.mp4': '🎬', '.avi': '🎬', '.mov': '🎬',
    '.mp3': '🎵', '.wav': '🎵',
    '.pdf': '📕', '.doc': '📘', '.docx': '📘',
    '.xls': '📗', '.xlsx': '📗',
    '.ppt': '📙', '.pptx': '📙',
    '.zip': '📦', '.tar': '📦', '.gz': '📦',
    '.bz2': '📦', '.7z': '📦', '.rar': '📦',
    '.exe': '⚙️', '.dll': '⚙️', '.so': '⚙️', '.dylib': '⚙️', '.bin': '⚙️',
}

EXTENSION_HEX = {
    '.py': '#3572A5', '.js': '#F7DF1E', '.ts': '#3178C6',
    '.html': '#E34F26', '.css': '#1572B6', '.json': '#CBCB41',
    '.md': '#083FA6', '.yml': '#CB171E', '.yaml': '#CB171E',
    '.sh': '#89E051', '.go': '#00ADD8', '.rs': '#DEA584',
    '.java': '#EA2D2E', '.cpp': '#00599C', '.rb': '#CC342D',
    '.php': '#777BB4', '.swift': '#FA7343', '.kt': '#7F52FF',
    '.sql': '#E38C00',
}
