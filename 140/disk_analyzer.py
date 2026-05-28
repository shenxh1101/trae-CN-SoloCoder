#!/usr/bin/env python3
import os
import sys
import json
import csv
import hashlib
import time
import argparse
from datetime import datetime
from pathlib import Path
from collections import defaultdict


class DiskAnalyzer:
    def __init__(self, exclude_dirs=None, max_depth=None):
        self.exclude_dirs = set(exclude_dirs or [])
        self.max_depth = max_depth
        self.scan_result = None
        self.cache_dir = Path.home() / ".disk_analyzer_cache"
        self.cache_dir.mkdir(exist_ok=True)

    def _get_cache_key(self, path):
        abs_path = os.path.abspath(path)
        return hashlib.md5(abs_path.encode()).hexdigest()

    def _get_cache_path(self, path):
        return self.cache_dir / f"{self._get_cache_key(path)}.json"

    def format_size(self, size_bytes):
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 ** 2:
            return f"{size_bytes / 1024:.2f} KB"
        elif size_bytes < 1024 ** 3:
            return f"{size_bytes / (1024 ** 2):.2f} MB"
        elif size_bytes < 1024 ** 4:
            return f"{size_bytes / (1024 ** 3):.2f} GB"
        else:
            return f"{size_bytes / (1024 ** 4):.2f} TB"

    def _should_exclude(self, dir_name):
        return dir_name in self.exclude_dirs

    def scan_directory(self, path, use_cache=False, incremental=False):
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Directory not found: {path}")

        cache_path = self._get_cache_path(path)
        old_cache = None
        if use_cache and cache_path.exists():
            with open(cache_path, 'r') as f:
                old_cache = json.load(f)
            if not incremental:
                self.scan_result = old_cache
                return old_cache

        result = {
            "path": str(path),
            "name": path.name,
            "scanned_at": datetime.now().isoformat(),
            "total_size": 0,
            "file_count": 0,
            "dir_count": 0,
            "children": [],
            "files": [],
            "file_types": defaultdict(lambda: {"count": 0, "size": 0}),
            "empty_dirs": []
        }

        self._scan_recursive(path, result, 0, old_cache if incremental else None)
        self.scan_result = result

        with open(cache_path, 'w') as f:
            json.dump(result, f, indent=2)

        return result

    def _scan_recursive(self, path, result, current_depth, old_cache=None):
        if self.max_depth is not None and current_depth > self.max_depth:
            return

        try:
            entries = list(path.iterdir())
        except PermissionError:
            return

        has_children = False
        for entry in entries:
            try:
                if entry.is_dir():
                    if self._should_exclude(entry.name):
                        continue
                    has_children = True
                    child_result = {
                        "path": str(entry),
                        "name": entry.name,
                        "total_size": 0,
                        "file_count": 0,
                        "dir_count": 0,
                        "children": [],
                        "files": [],
                        "file_types": defaultdict(lambda: {"count": 0, "size": 0}),
                        "empty_dirs": []
                    }
                    result["dir_count"] += 1
                    self._scan_recursive(entry, child_result, current_depth + 1, old_cache)
                    result["total_size"] += child_result["total_size"]
                    result["file_count"] += child_result["file_count"]
                    result["dir_count"] += child_result["dir_count"]
                    result["children"].append(child_result)
                    
                    for ext, data in child_result["file_types"].items():
                        result["file_types"][ext]["count"] += data["count"]
                        result["file_types"][ext]["size"] += data["size"]
                    
                    result["empty_dirs"].extend(child_result["empty_dirs"])
                    
                    if not child_result["children"] and child_result["file_count"] == 0:
                        if str(entry) not in result["empty_dirs"]:
                            result["empty_dirs"].append(str(entry))
                elif entry.is_file():
                    has_children = True
                    try:
                        file_size = entry.stat().st_size
                        result["total_size"] += file_size
                        result["file_count"] += 1
                        
                        ext = entry.suffix.lower() or "no_extension"
                        result["file_types"][ext]["count"] += 1
                        result["file_types"][ext]["size"] += file_size
                        
                        result["files"].append({
                            "path": str(entry),
                            "name": entry.name,
                            "size": file_size
                        })
                    except (OSError, PermissionError):
                        pass
            except (OSError, PermissionError):
                pass

        if not has_children and result["file_count"] == 0:
            if str(path) not in result["empty_dirs"]:
                result["empty_dirs"].append(str(path))

    def get_top_folders(self, n=10):
        if not self.scan_result:
            return []
        
        folders = []
        self._collect_folders(self.scan_result, folders)
        folders.sort(key=lambda x: x["total_size"], reverse=True)
        return folders[:n]

    def _collect_folders(self, node, folders):
        if "children" in node and node["children"]:
            folders.append(node)
            for child in node["children"]:
                self._collect_folders(child, folders)

    def get_top_files(self, n=20):
        if not self.scan_result:
            return []
        
        all_files = []
        self._collect_files(self.scan_result, all_files)
        all_files.sort(key=lambda x: x["size"], reverse=True)
        return all_files[:n]

    def _collect_files(self, node, files):
        if "files" in node:
            files.extend(node["files"])
        if "children" in node:
            for child in node["children"]:
                self._collect_files(child, files)

    def print_tree(self, node=None, prefix="", is_last=True, max_depth=5, current_depth=0):
        if node is None:
            node = self.scan_result
        if not node:
            return
        
        if current_depth > max_depth:
            return

        total_size = node.get("total_size", 0)
        parent_size = self.scan_result.get("total_size", 1) if self.scan_result else 1
        percentage = (total_size / parent_size * 100) if parent_size > 0 else 0

        connector = "└── " if is_last else "├── "
        print(f"{prefix}{connector}{node['name']} ({self.format_size(total_size)}, {percentage:.1f}%)")

        if "children" in node:
            children = sorted(node["children"], key=lambda x: x.get("total_size", 0), reverse=True)
            for i, child in enumerate(children):
                extension = "    " if is_last else "│   "
                self.print_tree(child, prefix + extension, i == len(children) - 1, max_depth, current_depth + 1)

    def print_bar_chart(self, items=None, title="", width=50):
        if items is None:
            folders = self.get_top_folders(10)
            items = [(f["name"], f["total_size"]) for f in folders]

        if not items:
            return

        print(f"\n{title}")
        max_size = max(size for _, size in items) if items else 1

        for name, size in items:
            bar_length = int((size / max_size) * width) if max_size > 0 else 0
            bar = "█" * bar_length + "░" * (width - bar_length)
            percentage = (size / (self.scan_result["total_size"] if self.scan_result else max_size)) * 100
            print(f"{name[:25]:<25} |{bar}| {self.format_size(size)} ({percentage:.1f}%)")

    def print_file_types(self, top_n=15):
        if not self.scan_result:
            return

        file_types = self.scan_result.get("file_types", {})
        sorted_types = sorted(file_types.items(), key=lambda x: x[1]["size"], reverse=True)[:top_n]

        print(f"\n{'Extension':<15} {'Count':>8} {'Total Size':>15} {'Percentage':>10}")
        print("-" * 50)
        total_size = self.scan_result.get("total_size", 1)
        for ext, data in sorted_types:
            percentage = (data["size"] / total_size * 100) if total_size > 0 else 0
            print(f"{ext:<15} {data['count']:>8} {self.format_size(data['size']):>15} {percentage:>9.1f}%")

    def print_empty_dirs(self):
        if not self.scan_result:
            return
        
        empty_dirs = self.scan_result.get("empty_dirs", [])
        print(f"\nEmpty directories ({len(empty_dirs)} found):")
        for d in empty_dirs[:50]:
            print(f"  {d}")
        if len(empty_dirs) > 50:
            print(f"  ... and {len(empty_dirs) - 50} more")

    def get_cleanup_suggestions(self):
        if not self.scan_result:
            return []

        suggestions = []
        cleanup_patterns = [
            ("Cache", ["cache", ".cache", "__pycache__"]),
            ("Temporary", ["tmp", "temp", ".tmp"]),
            ("Logs", ["logs", "log", ".log"]),
            ("Build", ["build", "dist", "node_modules", ".git"]),
        ]

        def check_patterns(node, patterns):
            for category, pats in patterns:
                for pat in pats:
                    if pat.lower() in node["name"].lower():
                        return category
            return None

        def collect_suggestions(node):
            category = check_patterns(node, cleanup_patterns)
            if category and node.get("total_size", 0) > 1024 * 1024:
                suggestions.append({
                    "category": category,
                    "path": node["path"],
                    "size": node["total_size"]
                })
            for child in node.get("children", []):
                collect_suggestions(child)

        collect_suggestions(self.scan_result)
        suggestions.sort(key=lambda x: x["size"], reverse=True)
        return suggestions

    def print_cleanup_suggestions(self):
        suggestions = self.get_cleanup_suggestions()
        if not suggestions:
            print("\nNo cleanup suggestions found.")
            return

        print(f"\nCleanup Suggestions ({len(suggestions)} items):")
        print(f"{'Category':<12} {'Path':<50} {'Size':>15}")
        print("-" * 80)
        for s in suggestions[:20]:
            print(f"{s['category']:<12} {s['path'][:50]:<50} {self.format_size(s['size']):>15}")
        if len(suggestions) > 20:
            print(f"... and {len(suggestions) - 20} more suggestions")

    def compare_with(self, other_path):
        other_analyzer = DiskAnalyzer(self.exclude_dirs, self.max_depth)
        other_result = other_analyzer.scan_directory(other_path, use_cache=True)

        if not self.scan_result:
            self.scan_directory(self.scan_result["path"] if self.scan_result else ".", use_cache=True)

        diff = {
            "path1": self.scan_result["path"],
            "path2": other_result["path"],
            "size1": self.scan_result["total_size"],
            "size2": other_result["total_size"],
            "diff_size": self.scan_result["total_size"] - other_result["total_size"],
            "files1": self.scan_result["file_count"],
            "files2": other_result["file_count"],
            "diff_files": self.scan_result["file_count"] - other_result["file_count"]
        }

        return diff

    def print_comparison(self, diff):
        print("\n" + "=" * 60)
        print("DIRECTORY COMPARISON")
        print("=" * 60)
        print(f"Directory 1: {diff['path1']}")
        print(f"Directory 2: {diff['path2']}")
        print("-" * 60)
        print(f"{'Metric':<20} {'Dir1':>15} {'Dir2':>15} {'Diff':>15}")
        print("-" * 60)
        print(f"{'Total Size':<20} {self.format_size(diff['size1']):>15} {self.format_size(diff['size2']):>15} {self.format_size(diff['diff_size']):>15}")
        print(f"{'File Count':<20} {diff['files1']:>15} {diff['files2']:>15} {diff['diff_files']:>15}")

    def export_json(self, output_path):
        if not self.scan_result:
            raise ValueError("No scan result to export")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.scan_result, f, indent=2, ensure_ascii=False)
        print(f"JSON report exported to: {output_path}")

    def export_csv(self, output_path):
        if not self.scan_result:
            raise ValueError("No scan result to export")

        rows = []
        def collect_rows(node, parent_path=""):
            full_path = os.path.join(parent_path, node["name"]) if parent_path else node["name"]
            rows.append({
                "path": full_path,
                "type": "directory",
                "size": node.get("total_size", 0),
                "file_count": node.get("file_count", 0)
            })
            for file in node.get("files", []):
                rows.append({
                    "path": os.path.join(full_path, file["name"]),
                    "type": "file",
                    "size": file["size"],
                    "file_count": 1
                })
            for child in node.get("children", []):
                collect_rows(child, full_path)

        collect_rows(self.scan_result)

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["path", "type", "size", "file_count"])
            writer.writeheader()
            writer.writerows(rows)
        print(f"CSV report exported to: {output_path}")

    def export_html(self, output_path):
        if not self.scan_result:
            raise ValueError("No scan result to export")

        html_content = self._generate_html_report()
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"HTML report exported to: {output_path}")

    def _generate_html_report(self):
        top_folders = self.get_top_folders(10)
        top_files = self.get_top_files(20)
        file_types = sorted(
            self.scan_result.get("file_types", {}).items(), 
            key=lambda x: x[1]["size"], 
            reverse=True
        )[:15]

        sunburst_data = self._prepare_sunburst_data(self.scan_result)

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>磁盘空间分析报告 - {self.scan_result['name']}</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; padding: 20px; }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }}
        .header h1 {{ font-size: 28px; margin-bottom: 10px; }}
        .stats-bar {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; }}
        .stat-card {{ background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; }}
        .stat-label {{ font-size: 12px; opacity: 0.8; }}
        .stat-value {{ font-size: 24px; font-weight: bold; }}
        .section {{ background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }}
        .section h2 {{ font-size: 20px; margin-bottom: 20px; color: #333; }}
        .table {{ width: 100%; border-collapse: collapse; }}
        .table th, .table td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
        .table th {{ background: #f8f9fa; font-weight: 600; color: #555; }}
        .table tr:hover {{ background: #f8f9fa; }}
        .progress {{ height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }}
        .progress-bar {{ height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); }}
        #sunburstChart {{ width: 100%; height: 600px; }}
        .size-badge {{ background: #e3f2fd; color: #1976d2; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 磁盘空间分析报告</h1>
            <p><strong>扫描路径:</strong> {self.scan_result['path']}</p>
            <p><strong>扫描时间:</strong> {self.scan_result['scanned_at']}</p>
            <div class="stats-bar">
                <div class="stat-card">
                    <div class="stat-label">总大小</div>
                    <div class="stat-value">{self.format_size(self.scan_result['total_size'])}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">文件数量</div>
                    <div class="stat-value">{self.scan_result['file_count']:,}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">文件夹数量</div>
                    <div class="stat-value">{self.scan_result['dir_count']:,}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">文件类型数</div>
                    <div class="stat-value">{len(self.scan_result.get('file_types', {}))}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🌞 可交互太阳burst图</h2>
            <div id="sunburstChart"></div>
        </div>

        <div class="section">
            <h2>📁 最大的10个文件夹</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>文件夹</th>
                        <th>大小</th>
                        <th>占比</th>
                        <th>可视化</th>
                    </tr>
                </thead>
                <tbody>
        """

        total_size = self.scan_result['total_size']
        for i, folder in enumerate(top_folders, 1):
            percentage = (folder['total_size'] / total_size * 100) if total_size > 0 else 0
            html += f"""
                    <tr>
                        <td>{i}</td>
                        <td>{folder['name']}</td>
                        <td><span class="size-badge">{self.format_size(folder['total_size'])}</span></td>
                        <td>{percentage:.1f}%</td>
                        <td><div class="progress"><div class="progress-bar" style="width: {percentage}%"></div></div></td>
                    </tr>"""

        html += """
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📄 最大的20个文件</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>文件路径</th>
                        <th>大小</th>
                    </tr>
                </thead>
                <tbody>
        """

        for i, file in enumerate(top_files, 1):
            html += f"""
                    <tr>
                        <td>{i}</td>
                        <td style="font-family: monospace; font-size: 12px;">{file['path']}</td>
                        <td><span class="size-badge">{self.format_size(file['size'])}</span></td>
                    </tr>"""

        html += """
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📑 文件类型分布</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>扩展名</th>
                        <th>文件数</th>
                        <th>总大小</th>
                        <th>占比</th>
                    </tr>
                </thead>
                <tbody>
        """

        for ext, data in file_types:
            percentage = (data['size'] / total_size * 100) if total_size > 0 else 0
            html += f"""
                    <tr>
                        <td><code>{ext}</code></td>
                        <td>{data['count']:,}</td>
                        <td><span class="size-badge">{self.format_size(data['size'])}</span></td>
                        <td>{percentage:.1f}%</td>
                    </tr>"""

        html += f"""
                </tbody>
            </table>
        </div>
    </div>

    <script>
        var chart = echarts.init(document.getElementById('sunburstChart'));
        var sunburstData = {json.dumps(sunburst_data, ensure_ascii=False)};
        
        option = {{
            series: [{{
                type: 'sunburst',
                data: sunburstData.children,
                radius: [0, '90%'],
                label: {{
                    rotate: 'radial'
                }},
                levels: [
                    {{}},
                    {{
                        r0: '15%',
                        r: '35%',
                        itemStyle: {{
                            borderWidth: 2
                        }},
                        label: {{
                            rotate: 'tangential'
                        }}
                    }},
                    {{
                        r0: '35%',
                        r: '70%',
                        label: {{
                            align: 'right'
                        }}
                    }},
                    {{
                        r0: '70%',
                        r: '72%',
                        label: {{
                            position: 'outside',
                            padding: 3,
                            silent: false
                        }},
                        itemStyle: {{
                            borderWidth: 3
                        }}
                    }}
                ]
            }}]
        }};
        
        chart.setOption(option);
        window.addEventListener('resize', function() {{
            chart.resize();
        }});
    </script>
</body>
</html>
        """
        return html

    def _prepare_sunburst_data(self, node, max_depth=3, current_depth=0):
        if current_depth > max_depth:
            return {"name": node["name"], "value": node.get("total_size", 0)}

        children = []
        for child in node.get("children", []):
            children.append(self._prepare_sunburst_data(child, max_depth, current_depth + 1))

        result = {
            "name": node["name"],
            "value": node.get("total_size", 0)
        }
        if children:
            result["children"] = children
        return result


def main():
    parser = argparse.ArgumentParser(
        description="磁盘空间分析工具 - 分析和可视化目录占用情况",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python disk_analyzer.py /path/to/directory
  python disk_analyzer.py /path --top-folders 20
  python disk_analyzer.py /path --exclude node_modules .git --max-depth 5
  python disk_analyzer.py /path --export-json report.json --export-html report.html
  python disk_analyzer.py /path --compare /other/path
  python disk_analyzer.py /path --tree --bar-chart
  python disk_analyzer.py /path --top-files --file-types
  python disk_analyzer.py /path --empty-dirs --cleanup-suggestions
  python disk_analyzer.py /path --use-cache --incremental
        """
    )

    parser.add_argument("path", nargs="?", default=".", help="要分析的目录路径")
    
    parser.add_argument("--exclude", nargs="+", default=["node_modules", ".git", "__pycache__"],
                        help="要排除的目录名称 (默认: node_modules .git __pycache__)")
    parser.add_argument("--max-depth", type=int, default=None, help="最大扫描深度")
    parser.add_argument("--use-cache", action="store_true", help="使用缓存的扫描结果")
    parser.add_argument("--incremental", action="store_true", help="增量扫描")

    parser.add_argument("--top-folders", type=int, default=10, help="显示最大的N个文件夹 (默认: 10)")
    parser.add_argument("--top-files", type=int, default=20, help="显示最大的N个文件")
    parser.add_argument("--file-types", action="store_true", help="显示文件类型分布")
    parser.add_argument("--empty-dirs", action="store_true", help="显示空文件夹")
    parser.add_argument("--cleanup-suggestions", action="store_true", help="显示清理建议")

    parser.add_argument("--tree", action="store_true", help="显示目录树")
    parser.add_argument("--tree-depth", type=int, default=5, help="目录树显示深度 (默认: 5)")
    parser.add_argument("--bar-chart", action="store_true", help="显示ASCII条形图")

    parser.add_argument("--compare", metavar="PATH", help="对比另一个目录")

    parser.add_argument("--export-json", metavar="PATH", help="导出JSON报告")
    parser.add_argument("--export-csv", metavar="PATH", help="导出CSV报告")
    parser.add_argument("--export-html", metavar="PATH", help="导出HTML报告 (含可交互太阳burst图)")

    args = parser.parse_args()

    analyzer = DiskAnalyzer(exclude_dirs=args.exclude, max_depth=args.max_depth)

    print("=" * 60)
    print("📊 磁盘空间分析工具")
    print("=" * 60)
    print(f"扫描路径: {os.path.abspath(args.path)}")
    print(f"排除目录: {', '.join(args.exclude)}")
    if args.max_depth:
        print(f"最大深度: {args.max_depth}")
    print("-" * 60)

    try:
        print("正在扫描...")
        result = analyzer.scan_directory(args.path, use_cache=args.use_cache, incremental=args.incremental)
        
        print(f"\n扫描完成!")
        print(f"  总大小: {analyzer.format_size(result['total_size'])}")
        print(f"  文件数: {result['file_count']:,}")
        print(f"  文件夹数: {result['dir_count']:,}")

        print(f"\n📁 最大的 {args.top_folders} 个文件夹:")
        print("-" * 60)
        top_folders = analyzer.get_top_folders(args.top_folders)
        for i, folder in enumerate(top_folders, 1):
            percentage = (folder['total_size'] / result['total_size'] * 100) if result['total_size'] > 0 else 0
            print(f"{i:2d}. {folder['name'][:40]:<40} {analyzer.format_size(folder['total_size']):>12} ({percentage:>5.1f}%)")

        if args.top_files:
            print(f"\n📄 最大的 {args.top_files} 个文件:")
            print("-" * 60)
            top_files = analyzer.get_top_files(args.top_files)
            for i, file in enumerate(top_files, 1):
                print(f"{i:2d}. {analyzer.format_size(file['size']):>12}  {file['path'][:80]}")

        if args.file_types:
            analyzer.print_file_types()

        if args.empty_dirs:
            analyzer.print_empty_dirs()

        if args.cleanup_suggestions:
            analyzer.print_cleanup_suggestions()

        if args.tree:
            print(f"\n🌳 目录树 (深度: {args.tree_depth}):")
            print("-" * 60)
            analyzer.print_tree(max_depth=args.tree_depth)

        if args.bar_chart:
            analyzer.print_bar_chart(title="📊 子目录大小对比")

        if args.compare:
            diff = analyzer.compare_with(args.compare)
            analyzer.print_comparison(diff)

        if args.export_json:
            analyzer.export_json(args.export_json)

        if args.export_csv:
            analyzer.export_csv(args.export_csv)

        if args.export_html:
            analyzer.export_html(args.export_html)

    except KeyboardInterrupt:
        print("\n\n扫描被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
