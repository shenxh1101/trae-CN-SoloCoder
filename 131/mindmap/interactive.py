"""
Interactive editor for mind maps in the terminal.
"""

from __future__ import annotations

import os
import sys
from typing import List, Optional

from .node import MindMapNode, MindMapForest
from .exporter import ASCIIExporter
from .style import StyleConfig


class InteractiveEditor:
    """Interactive terminal-based mind map editor."""

    def __init__(self, forest: Optional[MindMapForest] = None,
                 style_config: Optional[StyleConfig] = None):
        self.forest = forest or MindMapForest()
        self.style_config = style_config or StyleConfig()
        self.selected_node: Optional[MindMapNode] = None
        self.ascii_exporter = ASCIIExporter(self.style_config)
        self.clipboard: Optional[MindMapNode] = None
        self.history: List[MindMapForest] = []
        self.redo_stack: List[MindMapForest] = []
        self.auto_save_path: Optional[str] = None

    def _save_state(self) -> None:
        """Save current state for undo."""
        self.history.append(MindMapForest.from_dict(self.forest.to_dict()))
        if len(self.history) > 50:
            self.history.pop(0)
        self.redo_stack.clear()

    def undo(self) -> bool:
        """Undo the last action."""
        if not self.history:
            return False
        self.redo_stack.append(MindMapForest.from_dict(self.forest.to_dict()))
        self.forest = self.history.pop()
        self.selected_node = None
        return True

    def redo(self) -> bool:
        """Redo the last undone action."""
        if not self.redo_stack:
            return False
        self.history.append(MindMapForest.from_dict(self.forest.to_dict()))
        self.forest = self.redo_stack.pop()
        self.selected_node = None
        return True

    def _clear_screen(self) -> None:
        """Clear the terminal screen."""
        os.system('cls' if os.name == 'nt' else 'clear')

    def _render(self) -> None:
        """Render the current mind map."""
        self._clear_screen()
        print("=" * 80)
        print("交互式思维导图编辑器".center(80))
        print("=" * 80)
        print()

        ascii_art = self.ascii_exporter.export(self.forest)
        print(ascii_art)
        print()

        if self.selected_node:
            print(f"当前选中: [{self.selected_node.node_id}] {self.selected_node.content}")
            if self.selected_node.note:
                print(f"批注: {self.selected_node.note}")
            print()

        print("=" * 80)
        print(self._get_help())
        print("=" * 80)

    def _get_help(self) -> str:
        """Get help text."""
        return (
            "命令列表:\n"
            "  list              - 列出所有节点\n"
            "  select <id>       - 选择节点\n"
            "  add <content>     - 为选中节点添加子节点\n"
            "  addroot <content> - 添加根节点\n"
            "  edit <content>    - 编辑选中节点内容\n"
            "  note <text>       - 为选中节点添加/修改批注\n"
            "  icon <emoji>      - 为选中节点添加图标\n"
            "  delete            - 删除选中节点\n"
            "  move <up|down>    - 移动选中节点在兄弟节点中的位置\n"
            "  indent            - 增加选中节点的层级（成为前一个兄弟的子节点）\n"
            "  outdent           - 减少选中节点的层级\n"
            "  copy              - 复制选中节点到剪贴板\n"
            "  paste             - 在选中节点下粘贴剪贴板内容\n"
            "  cut               - 剪切选中节点到剪贴板\n"
            "  toggle            - 切换选中节点的折叠状态\n"
            "  collapse          - 折叠选中节点\n"
            "  expand            - 展开选中节点\n"
            "  find <text>       - 搜索节点\n"
            "  undo              - 撤销\n"
            "  redo              - 重做\n"
            "  save <path>       - 保存为文本格式\n"
            "  export <path>     - 导出为HTML\n"
            "  ascii             - 显示ASCII导图\n"
            "  refresh           - 刷新显示\n"
            "  clear             - 清空所有内容\n"
            "  help              - 显示此帮助\n"
            "  quit / exit       - 退出编辑器\n"
        )

    def _list_nodes(self) -> None:
        """List all nodes with their IDs."""
        print("\n节点列表:")
        print("-" * 80)
        for i, node in enumerate(self.forest.get_all_nodes()):
            prefix = "  " * node.get_level()
            marker = " * " if node == self.selected_node else "   "
            icon = f" [{node.icon}]" if node.icon else ""
            note = " 📝" if node.note else ""
            print(f"[{node.node_id}] {prefix}{marker}{node.content}{icon}{note}")
        print()

    def _find_nodes(self, text: str) -> None:
        """Find and display nodes containing text."""
        results = self.forest.find_by_content(text)
        if not results:
            print(f"\n未找到包含 '{text}' 的节点")
            return
        print(f"\n找到 {len(results)} 个匹配节点:")
        print("-" * 80)
        for node in results:
            prefix = "  " * node.get_level()
            print(f"[{node.node_id}] {prefix}{node.content}")
        print()

    def _add_child(self, content: str) -> None:
        """Add a child node to the selected node."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        self._save_state()
        node = MindMapNode(content=content)
        self.selected_node.add_child(node)
        self.selected_node = node
        print(f"\n已添加子节点: {content}")

    def _add_root(self, content: str) -> None:
        """Add a root node."""
        self._save_state()
        node = MindMapNode(content=content)
        self.forest.add_root(node)
        self.selected_node = node
        print(f"\n已添加根节点: {content}")

    def _edit_node(self, content: str) -> None:
        """Edit the selected node's content."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        self._save_state()
        self.selected_node.content = content
        print(f"\n已修改节点内容为: {content}")

    def _set_note(self, text: str) -> None:
        """Set note for the selected node."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        self._save_state()
        self.selected_node.note = text if text else None
        if text:
            print(f"\n已添加批注: {text}")
        else:
            print("\n已清除批注")

    def _set_icon(self, icon: str) -> None:
        """Set icon for the selected node."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        self._save_state()
        self.selected_node.icon = icon if icon else None
        if icon:
            print(f"\n已设置图标: {icon}")
        else:
            print("\n已清除图标")

    def _delete_node(self) -> None:
        """Delete the selected node."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        if not self._confirm("确定要删除选中节点及其所有子节点吗？"):
            return
        self._save_state()
        node = self.selected_node
        if node.parent:
            node.parent.remove_child(node)
        else:
            self.forest.remove_root(node)
        self.selected_node = None
        print(f"\n已删除节点: {node.content}")

    def _move_node(self, direction: str) -> None:
        """Move the selected node up or down among siblings."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        node = self.selected_node
        parent = node.parent

        if parent is None:
            siblings = self.forest.roots
        else:
            siblings = parent.children

        idx = siblings.index(node)
        if direction == 'up':
            if idx > 0:
                self._save_state()
                siblings[idx], siblings[idx - 1] = siblings[idx - 1], siblings[idx]
                print("\n已向上移动")
            else:
                print("\n已经是第一个节点")
        elif direction == 'down':
            if idx < len(siblings) - 1:
                self._save_state()
                siblings[idx], siblings[idx + 1] = siblings[idx + 1], siblings[idx]
                print("\n已向下移动")
            else:
                print("\n已经是最后一个节点")

    def _indent_node(self) -> None:
        """Increase node level (make it a child of previous sibling)."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        node = self.selected_node
        parent = node.parent

        if parent is None:
            siblings = self.forest.roots
        else:
            siblings = parent.children

        idx = siblings.index(node)
        if idx == 0:
            print("\n错误: 没有前一个兄弟节点")
            return

        prev_sibling = siblings[idx - 1]
        self._save_state()

        if parent:
            parent.remove_child(node)
        else:
            self.forest.remove_root(node)

        prev_sibling.add_child(node)
        print("\n已增加层级")

    def _outdent_node(self) -> None:
        """Decrease node level (make it a sibling of its parent)."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        node = self.selected_node
        parent = node.parent

        if parent is None:
            print("\n错误: 根节点无法减少层级")
            return

        grandparent = parent.parent
        self._save_state()

        parent.remove_child(node)

        if grandparent is None:
            siblings = self.forest.roots
            insert_idx = siblings.index(parent) + 1
            self.forest.roots.insert(insert_idx, node)
            node.parent = None
            node._level = 0
        else:
            grandparent.insert_after(node, parent)

        print("\n已减少层级")

    def _copy_node(self) -> None:
        """Copy the selected node to clipboard."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        self.clipboard = self.selected_node.clone()
        print(f"\n已复制: {self.selected_node.content}")

    def _cut_node(self) -> None:
        """Cut the selected node to clipboard."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        self._save_state()
        node = self.selected_node
        self.clipboard = node.clone()
        if node.parent:
            node.parent.remove_child(node)
        else:
            self.forest.remove_root(node)
        self.selected_node = None
        print(f"\n已剪切: {node.content}")

    def _paste_node(self) -> None:
        """Paste the clipboard node as a child of selected node."""
        if not self.clipboard:
            print("\n错误: 剪贴板为空")
            return
        if not self.selected_node:
            print("\n错误: 请先选择一个目标节点")
            return
        self._save_state()
        new_node = self.clipboard.clone()
        self.selected_node.add_child(new_node)
        self.selected_node = new_node
        print(f"\n已粘贴: {new_node.content}")

    def _toggle_collapse(self) -> None:
        """Toggle collapse state of selected node."""
        if not self.selected_node:
            print("\n错误: 请先选择一个节点")
            return
        if not self.selected_node.children:
            print("\n该节点没有子节点")
            return
        self.selected_node.collapsed = not self.selected_node.collapsed
        state = "折叠" if self.selected_node.collapsed else "展开"
        print(f"\n已{state}节点")

    def _select_node(self, node_id: str) -> None:
        """Select a node by ID."""
        node = self.forest.find_by_id(node_id)
        if not node:
            print(f"\n未找到节点: {node_id}")
            return
        self.selected_node = node
        print(f"\n已选中: [{node.node_id}] {node.content}")

    def _clear_all(self) -> None:
        """Clear all content."""
        if not self._confirm("确定要清空所有内容吗？此操作不可撤销！"):
            return
        self._save_state()
        self.forest = MindMapForest()
        self.selected_node = None
        print("\n已清空所有内容")

    def _save_to_text(self, path: str) -> None:
        """Save mind map as text format."""
        lines = []
        for root in self.forest.roots:
            self._node_to_text(root, 0, lines)
        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"\n已保存到: {path}")

    def _node_to_text(self, node: MindMapNode, level: int, lines: List[str]) -> None:
        """Convert node to text line."""
        indent = '    ' * level
        content = node.content
        if node.icon:
            content = f"{node.icon} {content}"
        if node.note:
            content = f"{content} [{node.note}]"
        lines.append(f"{indent}{content}")
        if not node.collapsed:
            for child in node.children:
                self._node_to_text(child, level + 1, lines)

    def _export_html(self, path: str) -> None:
        """Export to HTML."""
        from .exporter import HTMLExporter
        exporter = HTMLExporter(self.style_config, layout='right')
        exporter.export_file(self.forest, path)
        print(f"\n已导出HTML到: {path}")

    def _confirm(self, message: str) -> bool:
        """Ask for confirmation."""
        response = input(f"{message} (y/N): ").strip().lower()
        return response in ('y', 'yes')

    def _parse_command(self, input_line: str) -> tuple[str, str]:
        """Parse command and arguments from input."""
        parts = input_line.strip().split(maxsplit=1)
        if not parts:
            return '', ''
        cmd = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ''
        return cmd, args

    def run(self) -> None:
        """Run the interactive editor."""
        self._render()

        while True:
            try:
                input_line = input("\n请输入命令: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n\n再见！")
                break

            if not input_line:
                continue

            cmd, args = self._parse_command(input_line)

            try:
                if cmd in ('quit', 'exit', 'q'):
                    if self.history and self._confirm("保存更改吗？"):
                        default_path = self.auto_save_path or "mindmap_output.txt"
                        save_path = input(f"保存路径 (默认: {default_path}): ").strip() or default_path
                        self._save_to_text(save_path)
                    print("\n再见！")
                    break

                elif cmd == 'help':
                    print()
                    print(self._get_help())

                elif cmd == 'list':
                    self._list_nodes()

                elif cmd == 'select':
                    self._select_node(args)

                elif cmd == 'add':
                    if args:
                        self._add_child(args)
                    else:
                        print("\n错误: 请提供节点内容")

                elif cmd == 'addroot':
                    if args:
                        self._add_root(args)
                    else:
                        print("\n错误: 请提供根节点内容")

                elif cmd == 'edit':
                    if args:
                        self._edit_node(args)
                    else:
                        print("\n错误: 请提供新的节点内容")

                elif cmd == 'note':
                    self._set_note(args)

                elif cmd == 'icon':
                    self._set_icon(args)

                elif cmd == 'delete' or cmd == 'del':
                    self._delete_node()

                elif cmd == 'move':
                    if args in ('up', 'down'):
                        self._move_node(args)
                    else:
                        print("\n错误: 请指定 'up' 或 'down'")

                elif cmd == 'indent':
                    self._indent_node()

                elif cmd == 'outdent':
                    self._outdent_node()

                elif cmd == 'copy':
                    self._copy_node()

                elif cmd == 'cut':
                    self._cut_node()

                elif cmd == 'paste':
                    self._paste_node()

                elif cmd == 'toggle':
                    self._toggle_collapse()

                elif cmd == 'collapse':
                    if self.selected_node and self.selected_node.children:
                        self.selected_node.collapsed = True
                        print("\n已折叠节点")

                elif cmd == 'expand':
                    if self.selected_node:
                        self.selected_node.collapsed = False
                        print("\n已展开节点")

                elif cmd == 'find' or cmd == 'search':
                    if args:
                        self._find_nodes(args)
                    else:
                        print("\n错误: 请提供搜索文本")

                elif cmd == 'undo':
                    if self.undo():
                        print("\n已撤销")
                    else:
                        print("\n没有可撤销的操作")

                elif cmd == 'redo':
                    if self.redo():
                        print("\n已重做")
                    else:
                        print("\n没有可重做的操作")

                elif cmd == 'save':
                    path = args or "mindmap_output.txt"
                    self._save_to_text(path)

                elif cmd == 'export':
                    path = args or "mindmap_output.html"
                    self._export_html(path)

                elif cmd == 'ascii':
                    print()
                    print(self.ascii_exporter.export(self.forest))
                    print()

                elif cmd == 'refresh' or cmd == 'r':
                    pass

                elif cmd == 'clear':
                    self._clear_all()

                else:
                    print(f"\n未知命令: {cmd}。输入 'help' 查看可用命令。")

            except Exception as e:
                print(f"\n错误: {e}")

            self._render()
