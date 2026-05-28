#!/usr/bin/env python3
"""
MindMap Generator - A Python command-line mind map generation tool.

Usage:
    python mindmap.py [OPTIONS] INPUT_FILE

Examples:
    python mindmap.py input.txt
    python mindmap.py input.md --format html --output mindmap.html
    python mindmap.py input.txt --layout down --theme ocean
    python mindmap.py input.txt --format ascii
    python mindmap.py input.opml --format mm --output mindmap.mm
    python mindmap.py --interactive
    python mindmap.py input.txt --embed iframe
"""

import argparse
import json
import os
import sys
from typing import Optional

from mindmap import (
    MindMapForest,
    TextParser,
    MarkdownParser,
    OPMLParser,
    auto_parse,
    HTMLExporter,
    ASCIIExporter,
    FreeMindExporter,
    PNGExporter,
    EmbedCodeExporter,
    StyleConfig,
    InteractiveEditor,
)


def get_parser() -> argparse.ArgumentParser:
    """Create the argument parser."""
    parser = argparse.ArgumentParser(
        prog='mindmap',
        description='思维导图生成工具 - 从文本/Markdown/OPML生成思维导图',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
支持的格式:
  txt, md, markdown - 文本/Markdown格式
  opml, xml         - OPML格式
  html              - 交互式HTML
  ascii             - ASCII字符画
  mm                - FreeMind格式
  png               - PNG图片
  embed             - 嵌入代码

支持的布局:
  right  - 向右展开（默认）
  left   - 向左展开
  down   - 向下展开
  radial - 放射状（HTML专用）

支持的主题:
  default, warm, cool, ocean, sunset, purple, dark, minimal
        """
    )

    parser.add_argument(
        'input',
        nargs='?',
        help='输入文件路径（文本/Markdown/OPML）',
    )

    parser.add_argument(
        '-f', '--format',
        choices=['txt', 'md', 'markdown', 'opml', 'xml', 'html', 'ascii', 'mm', 'png', 'embed'],
        default='html',
        help='输出格式（默认: html）',
    )

    parser.add_argument(
        '-o', '--output',
        help='输出文件路径（默认: 根据输入文件自动生成）',
    )

    parser.add_argument(
        '-l', '--layout',
        choices=['right', 'left', 'down', 'radial'],
        default='right',
        help='导图布局方向（默认: right）',
    )

    parser.add_argument(
        '-t', '--theme',
        choices=['default', 'warm', 'cool', 'ocean', 'sunset', 'purple', 'dark', 'minimal'],
        default='default',
        help='颜色主题（默认: default）',
    )

    parser.add_argument(
        '--title',
        default='思维导图',
        help='HTML标题（默认: 思维导图）',
    )

    parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='启动交互式编辑模式',
    )

    parser.add_argument(
        '--embed',
        choices=['iframe', 'div', 'json'],
        help='生成嵌入代码的类型',
    )

    parser.add_argument(
        '--ascii-style',
        choices=['light', 'heavy', 'double', 'simple'],
        default='light',
        help='ASCII导图的样式（默认: light）',
    )

    parser.add_argument(
        '--show-icons',
        action='store_true',
        default=True,
        help='ASCII导图中显示图标',
    )

    parser.add_argument(
        '--show-notes',
        action='store_true',
        default=False,
        help='ASCII导图中显示批注',
    )

    parser.add_argument(
        '--png-width',
        type=int,
        default=1920,
        help='PNG图片宽度（默认: 1920）',
    )

    parser.add_argument(
        '--png-height',
        type=int,
        default=1080,
        help='PNG图片高度（默认: 1080）',
    )

    parser.add_argument(
        '--level-colors',
        action='store_true',
        default=True,
        help='为不同层级自动生成不同颜色',
    )

    parser.add_argument(
        '--style-config',
        help='JSON格式的样式配置文件路径',
    )

    parser.add_argument(
        '--list-themes',
        action='store_true',
        help='列出所有可用主题',
    )

    parser.add_argument(
        '--stats',
        action='store_true',
        help='显示导图统计信息',
    )

    parser.add_argument(
        '--version', '-v',
        action='version',
        version='%(prog)s 1.0.0',
    )

    return parser


def list_themes() -> None:
    """List all available themes with previews."""
    print("可用主题:\n")
    themes = [
        ('default', '默认蓝色主题', '#4a90d9'),
        ('warm', '暖色调红色主题', '#e74c3c'),
        ('cool', '冷色调绿色主题', '#27ae60'),
        ('ocean', '海洋青色主题', '#1abc9c'),
        ('sunset', '日落橙色主题', '#e67e22'),
        ('purple', '紫色主题', '#9b59b6'),
        ('dark', '深色主题', '#444444'),
        ('minimal', '简约主题', '#333333'),
    ]
    for name, desc, color in themes:
        print(f"  {name:10s} - {desc}")


def load_style_config(args: argparse.Namespace) -> StyleConfig:
    """Load style configuration from arguments."""
    if args.style_config:
        with open(args.style_config, 'r', encoding='utf-8') as f:
            data = json.load(f)
        style = StyleConfig.from_dict(data)
    else:
        style = StyleConfig.create_preset(args.theme)

    style.layout = args.layout

    if args.level_colors:
        style.generate_level_styles()

    return style


def generate_output_filename(input_file: Optional[str], output_format: str) -> str:
    """Generate default output filename."""
    extensions = {
        'html': 'html',
        'ascii': 'txt',
        'mm': 'mm',
        'png': 'png',
        'embed': 'html',
        'txt': 'txt',
        'md': 'md',
        'markdown': 'md',
        'opml': 'opml',
        'xml': 'opml',
    }
    ext = extensions.get(output_format, 'html')

    if input_file:
        base = os.path.splitext(os.path.basename(input_file))[0]
    else:
        base = 'mindmap'

    return f"{base}.{ext}"


def parse_input(input_file: str, input_format: Optional[str] = None) -> MindMapForest:
    """Parse input file and return forest."""
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"输入文件不存在: {input_file}")

    if input_format:
        if input_format in ('txt',):
            return TextParser.parse_file(input_file)
        elif input_format in ('md', 'markdown'):
            return MarkdownParser.parse_file(input_file)
        elif input_format in ('opml', 'xml'):
            return OPMLParser.parse_file(input_file)

    return auto_parse(input_file)


def show_stats(forest: MindMapForest) -> None:
    """Display statistics about the mind map."""
    all_nodes = forest.get_all_nodes()
    root_count = len(forest.roots)
    total_nodes = len(all_nodes)
    leaf_nodes = sum(1 for n in all_nodes if not n.children)
    max_level = max((n.get_level() for n in all_nodes), default=0)
    nodes_with_notes = sum(1 for n in all_nodes if n.note)
    nodes_with_icons = sum(1 for n in all_nodes if n.icon)

    print("\n导图统计信息:")
    print("=" * 40)
    print(f"根节点数量:    {root_count}")
    print(f"总节点数量:    {total_nodes}")
    print(f"叶子节点数量:  {leaf_nodes}")
    print(f"最大层级深度:  {max_level}")
    print(f"有批注的节点:  {nodes_with_notes}")
    print(f"有图标的节点:  {nodes_with_icons}")
    print("=" * 40)
    print()


def export_forest(
    forest: MindMapForest,
    output_format: str,
    output_file: str,
    style_config: StyleConfig,
    args: argparse.Namespace,
) -> None:
    """Export the forest to the specified format."""
    if output_format == 'html':
        exporter = HTMLExporter(
            style_config=style_config,
            layout=args.layout,
            title=args.title,
        )
        exporter.export_file(forest, output_file)
        print(f"✓ 已导出HTML到: {output_file}")

    elif output_format == 'ascii':
        exporter = ASCIIExporter(
            style_config=style_config,
            style=args.ascii_style,
            show_icons=args.show_icons,
            show_notes=args.show_notes,
        )
        if output_file == '-':
            print(exporter.export(forest))
        else:
            exporter.export_file(forest, output_file)
            print(f"✓ 已导出ASCII到: {output_file}")

    elif output_format == 'mm':
        exporter = FreeMindExporter(style_config=style_config)
        exporter.export_file(forest, output_file)
        print(f"✓ 已导出FreeMind到: {output_file}")

    elif output_format == 'png':
        exporter = PNGExporter(
            style_config=style_config,
            layout=args.layout,
            width=args.png_width,
            height=args.png_height,
        )
        try:
            exporter.export_file(forest, output_file)
            print(f"✓ 已导出PNG到: {output_file}")
        except RuntimeError as e:
            print(f"✗ PNG导出失败: {e}")
            print("  请安装以下任一工具:")
            print("  - pip install playwright && playwright install chromium")
            print("  - pip install selenium webdriver-manager")
            print("  - pip install imgkit (需要安装wkhtmltoimage)")
            sys.exit(1)

    elif output_format == 'embed':
        embed_type = args.embed or 'iframe'
        exporter = EmbedCodeExporter(
            style_config=style_config,
            layout=args.layout,
        )
        exporter.export_file(forest, output_file, format=embed_type)
        print(f"✓ 已生成{embed_type.upper()}嵌入代码到: {output_file}")
        if embed_type == 'iframe':
            print("\n嵌入代码预览:")
            print("-" * 40)
            print(exporter.export_iframe(forest, title=args.title))
            print("-" * 40)

    elif output_format in ('txt', 'md', 'markdown', 'opml', 'xml'):
        ascii_exporter = ASCIIExporter(
            style_config=style_config,
            style=args.ascii_style,
        )
        ascii_exporter.export_file(forest, output_file)
        print(f"✓ 已导出文本格式到: {output_file}")


def main() -> None:
    """Main entry point."""
    parser = get_parser()
    args = parser.parse_args()

    if args.list_themes:
        list_themes()
        return

    if args.interactive:
        forest = MindMapForest()
        if args.input:
            try:
                forest = parse_input(args.input)
                print(f"✓ 已加载: {args.input}")
            except Exception as e:
                print(f"警告: 加载失败 - {e}")

        style_config = load_style_config(args)
        editor = InteractiveEditor(forest=forest, style_config=style_config)
        editor.auto_save_path = args.output or generate_output_filename(args.input, 'txt')
        editor.run()
        return

    if not args.input:
        parser.print_help()
        print("\n错误: 请提供输入文件，或使用 --interactive 启动交互式模式")
        sys.exit(1)

    try:
        forest = parse_input(args.input)
    except FileNotFoundError as e:
        print(f"错误: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"解析错误: {e}")
        sys.exit(1)

    if args.stats:
        show_stats(forest)

    style_config = load_style_config(args)

    output_file = args.output or generate_output_filename(args.input, args.format)

    try:
        export_forest(forest, args.format, output_file, style_config, args)
    except KeyboardInterrupt:
        print("\n操作已取消")
        sys.exit(130)
    except Exception as e:
        print(f"导出错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
