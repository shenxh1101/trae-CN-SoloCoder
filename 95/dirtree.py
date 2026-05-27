#!/usr/bin/env python3
"""Directory Tree Generator - CLI tool for generating beautiful directory trees."""

import argparse
import sys
import os
import json
from pathlib import Path

from tree_generator import (
    scan_directory,
    render_tree,
    tree_to_dict,
    generate_snapshot,
    load_snapshot,
    compare_trees,
    generate_diff_tree,
    generate_html,
    format_size,
    format_time,
    DEFAULT_EXCLUDE_DIRS,
)


def print_tree(args):
    exclude_dirs = set(args.exclude) if args.exclude else DEFAULT_EXCLUDE_DIRS.copy()
    filter_extensions = set(ext.lower() for ext in args.extensions) if args.extensions else None
    show_files = not args.dirs_only

    tree = scan_directory(
        path=args.path,
        max_depth=args.depth,
        exclude_dirs=exclude_dirs,
        show_files=show_files,
        filter_extensions=filter_extensions,
    )

    if tree is None:
        print(f"Error: Cannot access path '{args.path}'", file=sys.stderr)
        sys.exit(1)

    lines = render_tree(
        tree,
        show_size=args.size,
        show_time=args.time,
        use_color=not args.no_color,
        show_stats=args.stats,
        max_depth=args.depth,
    )

    output = '\n'.join(lines)

    if args.output:
        with open(args.output, 'w') as f:
            clean_output = '\n'.join(line.replace('\033[', '').replace('m', '') for line in lines)
            clean_output = '\n'.join(
                ''.join(c for c in line if c not in '\033[0123456789;') or line
                for line in lines
            )
            f.write(output)
        print(f"Tree saved to {args.output}")
    else:
        print(output)

    if args.stats:
        print(f"\n{'─' * 50}")
        print(f"📊 Statistics:")
        print(f"   Directories: {tree.dir_count}")
        print(f"   Files: {tree.file_count}")
        print(f"   Total size: {format_size(tree.size)}")

    return tree


def export_json(args):
    exclude_dirs = set(args.exclude) if args.exclude else DEFAULT_EXCLUDE_DIRS.copy()
    filter_extensions = set(ext.lower() for ext in args.extensions) if args.extensions else None
    show_files = not args.dirs_only

    tree = scan_directory(
        path=args.path,
        max_depth=args.depth,
        exclude_dirs=exclude_dirs,
        show_files=show_files,
        filter_extensions=filter_extensions,
    )

    if tree is None:
        print(f"Error: Cannot access path '{args.path}'", file=sys.stderr)
        sys.exit(1)

    data = tree_to_dict(tree, max_depth=args.depth)
    json_str = json.dumps(data, indent=2, default=str, ensure_ascii=False)

    if args.output:
        with open(args.output, 'w') as f:
            f.write(json_str)
        print(f"JSON exported to {args.output}")
    else:
        print(json_str)


def export_html(args):
    exclude_dirs = set(args.exclude) if args.exclude else DEFAULT_EXCLUDE_DIRS.copy()
    filter_extensions = set(ext.lower() for ext in args.extensions) if args.extensions else None
    show_files = not args.dirs_only

    tree = scan_directory(
        path=args.path,
        max_depth=args.depth,
        exclude_dirs=exclude_dirs,
        show_files=show_files,
        filter_extensions=filter_extensions,
    )

    if tree is None:
        print(f"Error: Cannot access path '{args.path}'", file=sys.stderr)
        sys.exit(1)

    html = generate_html(tree, show_size=not args.no_size, show_time=not args.no_time)

    output_path = args.output or f"{tree.name}_tree.html"
    with open(output_path, 'w') as f:
        f.write(html)
    print(f"HTML exported to {output_path}")


def compare_dirs(args):
    exclude_dirs = set(args.exclude) if args.exclude else DEFAULT_EXCLUDE_DIRS.copy()

    tree1 = scan_directory(args.path1, max_depth=args.depth, exclude_dirs=exclude_dirs)
    tree2 = scan_directory(args.path2, max_depth=args.depth, exclude_dirs=exclude_dirs)

    if tree1 is None or tree2 is None:
        print("Error: Cannot access one of the paths", file=sys.stderr)
        sys.exit(1)

    dict1 = tree_to_dict(tree1, max_depth=args.depth)
    dict2 = tree_to_dict(tree2, max_depth=args.depth)

    changes = compare_trees(dict1, dict2)

    if not changes:
        print("✅ No differences found!")
        return

    print(f"\n{'═' * 60}")
    print(f"  🔍 Directory Comparison")
    print(f"  📁 Left:  {args.path1}")
    print(f"  📁 Right: {args.path2}")
    print(f"{'═' * 60}\n")

    added = [(p, t) for c, p, t in changes if c == 'added']
    deleted = [(p, t) for c, p, t in changes if c == 'deleted']
    modified = [(p, t) for c, p, t in changes if c == 'modified']

    if added:
        print(f"📗 Added ({len(added)}):")
        for path, item_type in added:
            icon = '📁' if item_type == 'dir' else '📄'
            print(f"   {icon} {path}")
        print()

    if deleted:
        print(f"📕 Deleted ({len(deleted)}):")
        for path, item_type in deleted:
            icon = '📁' if item_type == 'dir' else '📄'
            print(f"   {icon} {path}")
        print()

    if modified:
        print(f"📙 Modified ({len(modified)}):")
        for path, item_type in modified:
            icon = '📁' if item_type == 'dir' else '📄'
            print(f"   {icon} {path}")
        print()

    print(f"{'─' * 60}")
    print(f"📊 Summary: +{len(added)} added, -{len(deleted)} deleted, ~{len(modified)} modified")


def incremental(args):
    exclude_dirs = set(args.exclude) if args.exclude else DEFAULT_EXCLUDE_DIRS.copy()

    snapshot_path = args.snapshot or os.path.join(args.path, '.dirtree_snapshot.json')

    tree = scan_directory(args.path, max_depth=args.depth, exclude_dirs=exclude_dirs)

    if tree is None:
        print(f"Error: Cannot access path '{args.path}'", file=sys.stderr)
        sys.exit(1)

    current_dict = tree_to_dict(tree, max_depth=args.depth)
    old_snapshot = load_snapshot(snapshot_path)

    if old_snapshot is None:
        print("📸 No previous snapshot found. Creating initial snapshot...")
        with open(snapshot_path, 'w') as f:
            json.dump(current_dict, f, indent=2, default=str, ensure_ascii=False)
        print(f"✅ Snapshot saved to {snapshot_path}")

        lines = render_tree(
            tree,
            show_size=args.size,
            show_time=args.time,
            use_color=not args.no_color,
            show_stats=args.stats,
            max_depth=args.depth,
        )
        print('\n' + '\n'.join(lines))
        return

    changes = compare_trees(old_snapshot, current_dict)

    if not changes:
        print("✅ No changes detected since last scan!")
        return

    print(f"\n{'═' * 60}")
    print(f"  🔄 Incremental Update")
    print(f"  📁 Path: {args.path}")
    print(f"{'═' * 60}\n")

    diff_lines = generate_diff_tree(tree, old_snapshot)
    print('\n'.join(diff_lines))

    print(f"\n{'─' * 60}")
    added = [c for c in changes if c[0] == 'added']
    deleted = [c for c in changes if c[0] == 'deleted']
    modified = [c for c in changes if c[0] == 'modified']
    print(f"📊 Changes: +{len(added)} added, -{len(deleted)} deleted, ~{len(modified)} modified")

    if args.update:
        with open(snapshot_path, 'w') as f:
            json.dump(current_dict, f, indent=2, default=str, ensure_ascii=False)
        print(f"✅ Snapshot updated at {snapshot_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Directory Tree Generator - Generate beautiful directory tree structures',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  dirtree /path/to/dir                    Basic tree view
  dirtree /path/to/dir -s -t              Show sizes and times
  dirtree /path/to/dir -d 2               Limit depth to 2 levels
  dirtree /path/to/dir -e .git -e node_modules  Exclude folders
  dirtree /path/to/dir --dirs-only        Show only directories
  dirtree /path/to/dir --ext .py --ext .js  Filter by extensions
  dirtree /path/to/dir -o output.txt      Save to text file
  dirtree /path/to/dir --json             Export as JSON
  dirtree /path/to/dir --html             Export as interactive HTML
  dirtree /path/to/dir --stats            Show statistics
  dirtree --compare dir1 dir2             Compare two directories
  dirtree /path/to/dir --incremental      Show changes since last scan
        '''
    )

    parser.add_argument('path', nargs='?', default='.', help='Directory path to scan')
    parser.add_argument('-d', '--depth', type=int, default=-1, help='Maximum depth to display')
    parser.add_argument('-s', '--size', action='store_true', help='Show file sizes')
    parser.add_argument('-t', '--time', action='store_true', help='Show modification times')
    parser.add_argument('-e', '--exclude', action='append', help='Exclude directories (can be used multiple times)')
    parser.add_argument('--no-color', action='store_true', help='Disable colored output')
    parser.add_argument('--dirs-only', action='store_true', help='Show only directories')
    parser.add_argument('--ext', '--extensions', dest='extensions', action='append', help='Filter by file extensions')
    parser.add_argument('-o', '--output', help='Output file path')
    parser.add_argument('--stats', action='store_true', help='Show directory statistics')

    parser.add_argument('--json', action='store_true', help='Export as JSON format')
    parser.add_argument('--html', action='store_true', help='Export as interactive HTML')
    parser.add_argument('--no-size', action='store_true', help='Hide sizes in HTML export')
    parser.add_argument('--no-time', action='store_true', help='Hide times in HTML export')

    parser.add_argument('--compare', nargs=2, metavar=('PATH1', 'PATH2'), help='Compare two directories')
    parser.add_argument('--incremental', action='store_true', help='Show changes since last scan')
    parser.add_argument('--snapshot', help='Snapshot file path for incremental mode')
    parser.add_argument('--update', action='store_true', help='Update snapshot after incremental scan')

    args = parser.parse_args()

    if args.compare:
        args.path1, args.path2 = args.compare
        compare_dirs(args)
    elif args.incremental:
        incremental(args)
    elif args.json:
        export_json(args)
    elif args.html:
        export_html(args)
    else:
        print_tree(args)


if __name__ == '__main__':
    main()
