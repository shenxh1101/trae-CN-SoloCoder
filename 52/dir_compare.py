#!/usr/bin/env python3
import os
import sys
import hashlib
import json
import time
import shutil
import argparse
from datetime import datetime
from pathlib import Path
import fnmatch


class FileInfo:
    def __init__(self, path, base_dir):
        self.full_path = path
        self.rel_path = os.path.relpath(path, base_dir)
        self.base_dir = base_dir
        self.size = 0
        self.mtime = 0
        self.md5 = None
        self._load_stats()

    def _load_stats(self):
        try:
            stat = os.stat(self.full_path)
            self.size = stat.st_size
            self.mtime = stat.st_mtime
        except (OSError, IOError):
            pass

    def calculate_md5(self, chunk_size=8192):
        if self.md5 is not None:
            return self.md5
        hash_md5 = hashlib.md5()
        try:
            with open(self.full_path, "rb") as f:
                for chunk in iter(lambda: f.read(chunk_size), b""):
                    hash_md5.update(chunk)
            self.md5 = hash_md5.hexdigest()
        except (OSError, IOError):
            self.md5 = None
        return self.md5

    def to_dict(self):
        return {
            'rel_path': self.rel_path,
            'size': self.size,
            'mtime': self.mtime,
            'md5': self.md5
        }

    @classmethod
    def from_dict(cls, data, base_dir):
        info = cls.__new__(cls)
        info.rel_path = data['rel_path']
        info.full_path = os.path.join(base_dir, data['rel_path'])
        info.base_dir = base_dir
        info.size = data['size']
        info.mtime = data['mtime']
        info.md5 = data.get('md5')
        return info


class DirectoryScanner:
    def __init__(self, dir_path, ignore_extensions=None, ignore_hidden=False, ignore_system=False):
        self.dir_path = os.path.abspath(dir_path)
        self.ignore_extensions = set(ext.lower().lstrip('.') for ext in (ignore_extensions or []))
        self.ignore_hidden = ignore_hidden
        self.ignore_system = ignore_system
        self.files = {}

    def _should_ignore(self, path):
        name = os.path.basename(path)
        if self.ignore_hidden and name.startswith('.'):
            return True
        if self.ignore_system:
            if sys.platform == 'win32':
                try:
                    import stat
                    file_attrs = os.stat(path).st_file_attributes
                    if file_attrs & stat.FILE_ATTRIBUTE_HIDDEN or file_attrs & stat.FILE_ATTRIBUTE_SYSTEM:
                        return True
                except (OSError, IOError, AttributeError):
                    pass
            else:
                if name.startswith('.'):
                    return True
        if self.ignore_extensions:
            ext = os.path.splitext(name)[1].lower().lstrip('.')
            if ext in self.ignore_extensions:
                return True
        return False

    def scan(self):
        self.files = {}
        for root, dirs, filenames in os.walk(self.dir_path):
            dirs[:] = [d for d in dirs if not self._should_ignore(os.path.join(root, d))]
            for filename in filenames:
                full_path = os.path.join(root, filename)
                if self._should_ignore(full_path):
                    continue
                if os.path.isfile(full_path):
                    file_info = FileInfo(full_path, self.dir_path)
                    self.files[file_info.rel_path] = file_info
        return self.files

    def to_dict(self):
        return {rel_path: info.to_dict() for rel_path, info in self.files.items()}

    @classmethod
    def from_dict(cls, data, dir_path):
        scanner = cls(dir_path)
        scanner.files = {rel_path: FileInfo.from_dict(info, dir_path) for rel_path, info in data.items()}
        return scanner


class DirectoryComparator:
    def __init__(self, dir_a, dir_b, ignore_extensions=None, ignore_hidden=False,
                 ignore_system=False, fast_mode=False, use_md5=False):
        self.dir_a = os.path.abspath(dir_a)
        self.dir_b = os.path.abspath(dir_b)
        self.ignore_extensions = ignore_extensions
        self.ignore_hidden = ignore_hidden
        self.ignore_system = ignore_system
        self.fast_mode = fast_mode
        self.use_md5 = use_md5
        
        self.scanner_a = DirectoryScanner(dir_a, ignore_extensions, ignore_hidden, ignore_system)
        self.scanner_b = DirectoryScanner(dir_b, ignore_extensions, ignore_hidden, ignore_system)
        
        self.only_a = {}
        self.only_b = {}
        self.different = {}
        self.same = {}
        self.duplicates = {}

    def compare(self):
        files_a = self.scanner_a.scan()
        files_b = self.scanner_b.scan()
        
        all_paths = set(files_a.keys()) | set(files_b.keys())
        
        for path in all_paths:
            in_a = path in files_a
            in_b = path in files_b
            
            if in_a and not in_b:
                self.only_a[path] = files_a[path]
            elif in_b and not in_a:
                self.only_b[path] = files_b[path]
            else:
                info_a = files_a[path]
                info_b = files_b[path]
                
                if self._files_are_same(info_a, info_b):
                    self.same[path] = (info_a, info_b)
                else:
                    self.different[path] = (info_a, info_b)
        
        if self.use_md5:
            self._find_duplicates_by_md5()
        
        return self.get_results()

    def _files_are_same(self, info_a, info_b):
        if info_a.size != info_b.size:
            return False
        if self.fast_mode:
            return True
        if self.use_md5:
            md5_a = info_a.calculate_md5()
            md5_b = info_b.calculate_md5()
            return md5_a == md5_b and md5_a is not None
        return self._compare_content(info_a.full_path, info_b.full_path)

    def _compare_content(self, path_a, path_b, chunk_size=8192):
        try:
            with open(path_a, 'rb') as f1, open(path_b, 'rb') as f2:
                while True:
                    chunk1 = f1.read(chunk_size)
                    chunk2 = f2.read(chunk_size)
                    if chunk1 != chunk2:
                        return False
                    if not chunk1:
                        return True
        except (OSError, IOError):
            return False

    def _find_duplicates_by_md5(self):
        md5_map_a = {}
        md5_map_b = {}
        
        for path, info in self.scanner_a.files.items():
            if path not in self.same:
                md5 = info.calculate_md5()
                if md5:
                    md5_map_a.setdefault(md5, []).append(path)
        
        for path, info in self.scanner_b.files.items():
            if path not in self.same:
                md5 = info.calculate_md5()
                if md5:
                    md5_map_b.setdefault(md5, []).append(path)
        
        for md5, paths_a in md5_map_a.items():
            if md5 in md5_map_b:
                paths_b = md5_map_b[md5]
                self.duplicates[md5] = {'dir_a': paths_a, 'dir_b': paths_b}

    def get_results(self):
        return {
            'only_a': self.only_a,
            'only_b': self.only_b,
            'different': self.different,
            'same': self.same,
            'duplicates': self.duplicates
        }

    def get_summary(self):
        def total_size(file_dict):
            if isinstance(next(iter(file_dict.values()), None), tuple):
                return sum(info[0].size for info in file_dict.values())
            return sum(info.size for info in file_dict.values())
        
        summary = {
            'only_a_count': len(self.only_a),
            'only_a_size': total_size(self.only_a) if self.only_a else 0,
            'only_b_count': len(self.only_b),
            'only_b_size': total_size(self.only_b) if self.only_b else 0,
            'different_count': len(self.different),
            'different_size': total_size(self.different) if self.different else 0,
            'same_count': len(self.same),
            'same_size': total_size(self.same) if self.same else 0,
        }
        summary['total_a'] = summary['only_a_count'] + summary['different_count'] + summary['same_count']
        summary['total_b'] = summary['only_b_count'] + summary['different_count'] + summary['same_count']
        return summary


class ReportGenerator:
    @staticmethod
    def generate_text_report(comparator, output_file=None):
        results = comparator.get_results()
        summary = comparator.get_summary()
        
        lines = []
        lines.append("=" * 80)
        lines.append("目录对比报告")
        lines.append("=" * 80)
        lines.append(f"目录 A: {comparator.dir_a}")
        lines.append(f"目录 B: {comparator.dir_b}")
        lines.append(f"对比时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"快速模式: {'是' if comparator.fast_mode else '否'}")
        lines.append(f"MD5对比: {'是' if comparator.use_md5 else '否'}")
        lines.append("")
        
        lines.append("-" * 80)
        lines.append("摘要统计")
        lines.append("-" * 80)
        lines.append(f"仅在 A 中: {summary['only_a_count']} 个文件, {ReportGenerator._format_size(summary['only_a_size'])}")
        lines.append(f"仅在 B 中: {summary['only_b_count']} 个文件, {ReportGenerator._format_size(summary['only_b_size'])}")
        lines.append(f"内容不同: {summary['different_count']} 个文件, {ReportGenerator._format_size(summary['different_size'])}")
        lines.append(f"内容相同: {summary['same_count']} 个文件, {ReportGenerator._format_size(summary['same_size'])}")
        lines.append("")
        
        if results['only_a']:
            lines.append("-" * 80)
            lines.append(f"仅在目录 A 中存在的文件 ({len(results['only_a'])}):")
            lines.append("-" * 80)
            for path, info in sorted(results['only_a'].items()):
                lines.append(f"  {path}  ({ReportGenerator._format_size(info.size)})")
            lines.append("")
        
        if results['only_b']:
            lines.append("-" * 80)
            lines.append(f"仅在目录 B 中存在的文件 ({len(results['only_b'])}):")
            lines.append("-" * 80)
            for path, info in sorted(results['only_b'].items()):
                lines.append(f"  {path}  ({ReportGenerator._format_size(info.size)})")
            lines.append("")
        
        if results['different']:
            lines.append("-" * 80)
            lines.append(f"内容不同的文件 ({len(results['different'])}):")
            lines.append("-" * 80)
            for path, (info_a, info_b) in sorted(results['different'].items()):
                size_diff = info_a.size - info_b.size
                mtime_diff = info_a.mtime - info_b.mtime
                lines.append(f"  {path}")
                lines.append(f"    A: {ReportGenerator._format_size(info_a.size)}, 修改于 {datetime.fromtimestamp(info_a.mtime)}")
                lines.append(f"    B: {ReportGenerator._format_size(info_b.size)}, 修改于 {datetime.fromtimestamp(info_b.mtime)}")
                lines.append(f"    大小差异: {size_diff:+d} bytes ({ReportGenerator._format_size(abs(size_diff))})")
                lines.append(f"    修改时间差异: {ReportGenerator._format_time_diff(abs(mtime_diff))}")
            lines.append("")
        
        if results['same']:
            lines.append("-" * 80)
            lines.append(f"内容相同的文件 ({len(results['same'])}):")
            lines.append("-" * 80)
            for path, (info_a, info_b) in sorted(results['same'].items()):
                lines.append(f"  {path}  ({ReportGenerator._format_size(info_a.size)})")
            lines.append("")
        
        if results['duplicates']:
            lines.append("-" * 80)
            lines.append(f"MD5相同但路径不同的文件 ({len(results['duplicates'])} 组):")
            lines.append("-" * 80)
            for md5, paths in sorted(results['duplicates'].items()):
                lines.append(f"  MD5: {md5}")
                if paths['dir_a']:
                    lines.append(f"    A: {', '.join(paths['dir_a'])}")
                if paths['dir_b']:
                    lines.append(f"    B: {', '.join(paths['dir_b'])}")
            lines.append("")
        
        report = "\n".join(lines)
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(report)
        
        return report

    @staticmethod
    def generate_html_report(comparator, output_file=None):
        results = comparator.get_results()
        summary = comparator.get_summary()
        
        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>目录对比报告</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
        h1 {{ color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }}
        h2 {{ color: #555; margin-top: 30px; }}
        .summary {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .summary-item {{ display: inline-block; margin: 10px; padding: 15px; border-radius: 5px; min-width: 150px; text-align: center; }}
        .only-a {{ background-color: #ffcccc; }}
        .only-b {{ background-color: #ffebcc; }}
        .different {{ background-color: #ffffcc; }}
        .same {{ background-color: #ccffcc; }}
        .file-list {{ background: white; padding: 15px; border-radius: 8px; margin-top: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .file-item {{ padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; }}
        .file-item:hover {{ background-color: #f9f9f9; }}
        .diff-details {{ background-color: #fff8dc; padding: 10px; margin-left: 20px; border-left: 4px solid #ffa500; }}
        .size-diff-positive {{ color: green; }}
        .size-diff-negative {{ color: red; }}
        .header-info {{ background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }}
        .duplicate-group {{ background-color: #f3e5f5; padding: 10px; margin: 5px 0; border-radius: 5px; }}
    </style>
</head>
<body>
    <h1>📁 目录对比报告</h1>
    
    <div class="header-info">
        <p><strong>目录 A:</strong> {comparator.dir_a}</p>
        <p><strong>目录 B:</strong> {comparator.dir_b}</p>
        <p><strong>对比时间:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        <p><strong>快速模式:</strong> {'是' if comparator.fast_mode else '否'} | <strong>MD5对比:</strong> {'是' if comparator.use_md5 else '否'}</p>
    </div>

    <h2>📊 摘要统计</h2>
    <div class="summary">
        <div class="summary-item only-a">
            <div style="font-size: 24px; font-weight: bold;">{summary['only_a_count']}</div>
            <div>仅在 A 中</div>
            <div style="font-size: 12px; color: #666;">{ReportGenerator._format_size(summary['only_a_size'])}</div>
        </div>
        <div class="summary-item only-b">
            <div style="font-size: 24px; font-weight: bold;">{summary['only_b_count']}</div>
            <div>仅在 B 中</div>
            <div style="font-size: 12px; color: #666;">{ReportGenerator._format_size(summary['only_b_size'])}</div>
        </div>
        <div class="summary-item different">
            <div style="font-size: 24px; font-weight: bold;">{summary['different_count']}</div>
            <div>内容不同</div>
            <div style="font-size: 12px; color: #666;">{ReportGenerator._format_size(summary['different_size'])}</div>
        </div>
        <div class="summary-item same">
            <div style="font-size: 24px; font-weight: bold;">{summary['same_count']}</div>
            <div>内容相同</div>
            <div style="font-size: 12px; color: #666;">{ReportGenerator._format_size(summary['same_size'])}</div>
        </div>
    </div>
"""
        
        if results['only_a']:
            html += f"""
    <h2>❌ 仅在目录 A 中存在的文件 ({len(results['only_a'])})</h2>
    <div class="file-list">
"""
            for path, info in sorted(results['only_a'].items()):
                html += f'        <div class="file-item">📄 {path} <span style="color: #888;">({ReportGenerator._format_size(info.size)})</span></div>\n'
            html += "    </div>\n"
        
        if results['only_b']:
            html += f"""
    <h2>❌ 仅在目录 B 中存在的文件 ({len(results['only_b'])})</h2>
    <div class="file-list">
"""
            for path, info in sorted(results['only_b'].items()):
                html += f'        <div class="file-item">📄 {path} <span style="color: #888;">({ReportGenerator._format_size(info.size)})</span></div>\n'
            html += "    </div>\n"
        
        if results['different']:
            html += f"""
    <h2>⚠️  内容不同的文件 ({len(results['different'])})</h2>
    <div class="file-list">
"""
            for path, (info_a, info_b) in sorted(results['different'].items()):
                size_diff = info_a.size - info_b.size
                size_diff_class = 'size-diff-positive' if size_diff >= 0 else 'size-diff-negative'
                mtime_diff = info_a.mtime - info_b.mtime
                html += f'        <div class="file-item">\n'
                html += f'            📄 {path}\n'
                html += f'            <div class="diff-details">\n'
                html += f'                <div>A: {ReportGenerator._format_size(info_a.size)}, 修改于 {datetime.fromtimestamp(info_a.mtime)}</div>\n'
                html += f'                <div>B: {ReportGenerator._format_size(info_b.size)}, 修改于 {datetime.fromtimestamp(info_b.mtime)}</div>\n'
                html += f'                <div>大小差异: <span class="{size_diff_class}">{size_diff:+d} bytes</span> ({ReportGenerator._format_size(abs(size_diff))})</div>\n'
                html += f'                <div>修改时间差异: {ReportGenerator._format_time_diff(abs(mtime_diff))}</div>\n'
                html += f'            </div>\n'
                html += f'        </div>\n'
            html += "    </div>\n"
        
        if results['same']:
            html += f"""
    <h2>✅ 内容相同的文件 ({len(results['same'])})</h2>
    <div class="file-list">
"""
            for path, (info_a, info_b) in sorted(results['same'].items()):
                html += f'        <div class="file-item">📄 {path} <span style="color: #888;">({ReportGenerator._format_size(info_a.size)})</span></div>\n'
            html += "    </div>\n"
        
        if results['duplicates']:
            html += f"""
    <h2>🔍 MD5相同但路径不同的文件 ({len(results['duplicates'])} 组)</h2>
    <div class="file-list">
"""
            for md5, paths in sorted(results['duplicates'].items()):
                html += f'        <div class="duplicate-group">\n'
                html += f'            <strong>MD5:</strong> {md5}<br>\n'
                if paths['dir_a']:
                    html += f'            <strong>A:</strong> {", ".join(paths["dir_a"])}<br>\n'
                if paths['dir_b']:
                    html += f'            <strong>B:</strong> {", ".join(paths["dir_b"])}<br>\n'
                html += f'        </div>\n'
            html += "    </div>\n"
        
        html += """
</body>
</html>"""
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html)
        
        return html

    @staticmethod
    def _format_size(size_bytes):
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        import math
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        return f"{s} {size_names[i]}"

    @staticmethod
    def _format_time_diff(seconds):
        if seconds < 60:
            return f"{int(seconds)} 秒"
        elif seconds < 3600:
            return f"{int(seconds / 60)} 分钟"
        elif seconds < 86400:
            return f"{int(seconds / 3600)} 小时"
        else:
            return f"{int(seconds / 86400)} 天"


class CacheManager:
    def __init__(self, cache_dir=None):
        if cache_dir is None:
            cache_dir = os.path.join(os.path.expanduser('~'), '.dir_compare_cache')
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def _get_cache_key(self, dir_a, dir_b, ignore_extensions, ignore_hidden, ignore_system, fast_mode, use_md5):
        key_data = {
            'dir_a': os.path.abspath(dir_a),
            'dir_b': os.path.abspath(dir_b),
            'ignore_extensions': sorted(ignore_extensions) if ignore_extensions else [],
            'ignore_hidden': ignore_hidden,
            'ignore_system': ignore_system,
            'fast_mode': fast_mode,
            'use_md5': use_md5
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()

    def _get_cache_file(self, cache_key):
        return os.path.join(self.cache_dir, f"{cache_key}.json")

    def save(self, comparator):
        cache_key = self._get_cache_key(
            comparator.dir_a, comparator.dir_b,
            comparator.ignore_extensions, comparator.ignore_hidden,
            comparator.ignore_system, comparator.fast_mode, comparator.use_md5
        )
        cache_data = {
            'timestamp': time.time(),
            'dir_a': comparator.scanner_a.to_dict(),
            'dir_b': comparator.scanner_b.to_dict(),
            'results': {
                'only_a': list(comparator.only_a.keys()),
                'only_b': list(comparator.only_b.keys()),
                'different': list(comparator.different.keys()),
                'same': list(comparator.same.keys())
            }
        }
        with open(self._get_cache_file(cache_key), 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, indent=2)
        return cache_key

    def load(self, dir_a, dir_b, ignore_extensions=None, ignore_hidden=False,
             ignore_system=False, fast_mode=False, use_md5=False):
        cache_key = self._get_cache_key(
            dir_a, dir_b, ignore_extensions, ignore_hidden,
            ignore_system, fast_mode, use_md5
        )
        cache_file = self._get_cache_file(cache_key)
        if not os.path.exists(cache_file):
            return None
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None

    def get_changes(self, comparator):
        cached = self.load(
            comparator.dir_a, comparator.dir_b,
            comparator.ignore_extensions, comparator.ignore_hidden,
            comparator.ignore_system, comparator.fast_mode, comparator.use_md5
        )
        if not cached:
            return None
        
        current_results = comparator.get_results()
        cached_results = cached['results']
        
        changes = {
            'added_to_a': [p for p in current_results['only_a'] if p not in cached_results['only_a']],
            'removed_from_a': [p for p in cached_results['only_a'] if p not in current_results['only_a']],
            'added_to_b': [p for p in current_results['only_b'] if p not in cached_results['only_b']],
            'removed_from_b': [p for p in cached_results['only_b'] if p not in current_results['only_b']],
            'new_different': [p for p in current_results['different'] if p not in cached_results['different']],
            'fixed_different': [p for p in cached_results['different'] if p not in current_results['different']],
        }
        return changes


class DirectorySynchronizer:
    def __init__(self, comparator, interactive=False):
        self.comparator = comparator
        self.interactive = interactive

    def copy_missing_to_b(self):
        results = self.comparator.get_results()
        copied = []
        for path, info in sorted(results['only_a'].items()):
            dest_path = os.path.join(self.comparator.dir_b, path)
            if self._confirm(f"复制 {path} 到 B?"):
                try:
                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                    shutil.copy2(info.full_path, dest_path)
                    copied.append(path)
                    print(f"✓ 已复制: {path}")
                except (OSError, IOError) as e:
                    print(f"✗ 复制失败 {path}: {e}")
        return copied

    def remove_extra_from_b(self):
        results = self.comparator.get_results()
        removed = []
        for path, info in sorted(results['only_b'].items()):
            full_path = os.path.join(self.comparator.dir_b, path)
            if self._confirm(f"删除 {path} 从 B?"):
                try:
                    os.remove(full_path)
                    removed.append(path)
                    print(f"✓ 已删除: {path}")
                except (OSError, IOError) as e:
                    print(f"✗ 删除失败 {path}: {e}")
        return removed

    def sync_a_to_b(self):
        print("同步目录 A 到 B...")
        copied = self.copy_missing_to_b()
        removed = self.remove_extra_from_b()
        print(f"\n同步完成: 复制 {len(copied)} 个文件, 删除 {len(removed)} 个文件")
        return copied, removed

    def _confirm(self, message):
        if not self.interactive:
            return True
        while True:
            response = input(f"{message} (y/n): ").lower().strip()
            if response in ['y', 'yes']:
                return True
            elif response in ['n', 'no']:
                return False
            print("请输入 y 或 n")


class DirectoryMonitor:
    def __init__(self, dir_a, dir_b, ignore_extensions=None, ignore_hidden=False,
                 ignore_system=False, fast_mode=False, use_md5=False, interval=5):
        self.dir_a = dir_a
        self.dir_b = dir_b
        self.ignore_extensions = ignore_extensions
        self.ignore_hidden = ignore_hidden
        self.ignore_system = ignore_system
        self.fast_mode = fast_mode
        self.use_md5 = use_md5
        self.interval = interval
        self._previous_state = None
        self._running = False

    def start(self):
        print(f"开始监控目录变化，间隔 {self.interval} 秒...")
        print(f"目录 A: {self.dir_a}")
        print(f"目录 B: {self.dir_b}")
        print("按 Ctrl+C 停止监控\n")
        
        self._running = True
        try:
            while self._running:
                self._check_changes()
                time.sleep(self.interval)
        except KeyboardInterrupt:
            print("\n监控已停止")
            self._running = False

    def _check_changes(self):
        comparator = DirectoryComparator(
            self.dir_a, self.dir_b,
            self.ignore_extensions, self.ignore_hidden,
            self.ignore_system, self.fast_mode, self.use_md5
        )
        comparator.compare()
        current_state = comparator.get_results()
        
        if self._previous_state is None:
            self._previous_state = current_state
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 初始状态已记录")
            self._print_summary(current_state)
            return
        
        changes = self._detect_changes(self._previous_state, current_state)
        if changes:
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 检测到变化:")
            self._print_changes(changes)
        
        self._previous_state = current_state

    def _detect_changes(self, prev, curr):
        changes = {}
        
        prev_a = set(prev['only_a'].keys()) | set(prev['different'].keys()) | set(prev['same'].keys())
        curr_a = set(curr['only_a'].keys()) | set(curr['different'].keys()) | set(curr['same'].keys())
        
        prev_b = set(prev['only_b'].keys()) | set(prev['different'].keys()) | set(prev['same'].keys())
        curr_b = set(curr['only_b'].keys()) | set(curr['different'].keys()) | set(curr['same'].keys())
        
        changes['added_to_a'] = curr_a - prev_a
        changes['removed_from_a'] = prev_a - curr_a
        changes['added_to_b'] = curr_b - prev_b
        changes['removed_from_b'] = prev_b - curr_b
        
        prev_diff = set(prev['different'].keys())
        curr_diff = set(curr['different'].keys())
        changes['new_modified'] = curr_diff - prev_diff
        
        if not any(changes.values()):
            return None
        return changes

    def _print_summary(self, state):
        print(f"  A: {len(state['only_a']) + len(state['different']) + len(state['same'])} 个文件")
        print(f"  B: {len(state['only_b']) + len(state['different']) + len(state['same'])} 个文件")

    def _print_changes(self, changes):
        if changes['added_to_a']:
            print(f"  📥 A 中新增: {', '.join(sorted(changes['added_to_a']))}")
        if changes['removed_from_a']:
            print(f"  📤 A 中删除: {', '.join(sorted(changes['removed_from_a']))}")
        if changes['added_to_b']:
            print(f"  📥 B 中新增: {', '.join(sorted(changes['added_to_b']))}")
        if changes['removed_from_b']:
            print(f"  📤 B 中删除: {', '.join(sorted(changes['removed_from_b']))}")
        if changes['new_modified']:
            print(f"  ✏️  内容修改: {', '.join(sorted(changes['new_modified']))}")


def main():
    parser = argparse.ArgumentParser(description='目录对比工具 - 对比两个目录的差异')
    parser.add_argument('dir_a', nargs='?', help='目录 A 的路径')
    parser.add_argument('dir_b', nargs='?', help='目录 B 的路径')
    
    parser.add_argument('--ignore-ext', '-i', type=str, 
                        help='忽略的扩展名列表，用逗号分隔，如: .log,.tmp')
    parser.add_argument('--ignore-hidden', action='store_true', 
                        help='忽略隐藏文件')
    parser.add_argument('--ignore-system', action='store_true', 
                        help='忽略系统文件')
    parser.add_argument('--fast', '-f', action='store_true', 
                        help='快速模式，只对比文件名和大小')
    parser.add_argument('--md5', '-m', action='store_true', 
                        help='使用MD5哈希进行内容对比')
    
    parser.add_argument('--report', '-r', choices=['text', 'html', 'both'], 
                        help='生成报告格式')
    parser.add_argument('--output', '-o', type=str, 
                        help='报告输出文件路径（不包含扩展名）')
    
    parser.add_argument('--sync', choices=['copy', 'delete', 'full'], 
                        help='同步模式: copy=复制缺失到B, delete=删除B中多余, full=完全同步')
    parser.add_argument('--interactive', action='store_true', 
                        help='交互式同步，每个操作前确认')
    
    parser.add_argument('--cache', action='store_true', 
                        help='使用缓存加速对比')
    parser.add_argument('--show-changes', action='store_true', 
                        help='显示与上次对比的变化')
    
    parser.add_argument('--monitor', action='store_true', 
                        help='实时监控模式')
    parser.add_argument('--interval', type=int, default=5, 
                        help='监控间隔秒数（默认5秒）')
    
    parser.add_argument('--summary-only', action='store_true', 
                        help='只显示摘要统计')
    
    args = parser.parse_args()
    
    if not args.dir_a or not args.dir_b:
        if not args.monitor:
            parser.print_help()
            sys.exit(1)
    
    ignore_extensions = None
    if args.ignore_ext:
        ignore_extensions = [ext.strip() for ext in args.ignore_ext.split(',')]
    
    if args.monitor:
        monitor = DirectoryMonitor(
            args.dir_a, args.dir_b,
            ignore_extensions=ignore_extensions,
            ignore_hidden=args.ignore_hidden,
            ignore_system=args.ignore_system,
            fast_mode=args.fast,
            use_md5=args.md5,
            interval=args.interval
        )
        monitor.start()
        return
    
    if not os.path.isdir(args.dir_a):
        print(f"错误: 目录 A 不存在: {args.dir_a}")
        sys.exit(1)
    if not os.path.isdir(args.dir_b):
        print(f"错误: 目录 B 不存在: {args.dir_b}")
        sys.exit(1)
    
    comparator = DirectoryComparator(
        args.dir_a, args.dir_b,
        ignore_extensions=ignore_extensions,
        ignore_hidden=args.ignore_hidden,
        ignore_system=args.ignore_system,
        fast_mode=args.fast,
        use_md5=args.md5
    )
    
    print("正在扫描目录...")
    comparator.compare()
    
    if args.cache or args.show_changes:
        cache_manager = CacheManager()
    
    if args.show_changes:
        changes = cache_manager.get_changes(comparator)
        if changes:
            print("\n与上次对比的变化:")
            if changes['added_to_a']:
                print(f"  A 中新增: {len(changes['added_to_a'])} 个文件")
            if changes['removed_from_a']:
                print(f"  A 中删除: {len(changes['removed_from_a'])} 个文件")
            if changes['added_to_b']:
                print(f"  B 中新增: {len(changes['added_to_b'])} 个文件")
            if changes['removed_from_b']:
                print(f"  B 中删除: {len(changes['removed_from_b'])} 个文件")
            if changes['new_different']:
                print(f"  新增差异: {len(changes['new_different'])} 个文件")
            if changes['fixed_different']:
                print(f"  已修复: {len(changes['fixed_different'])} 个文件")
        else:
            print("\n没有找到之前的缓存记录，无法显示变化")
    
    if args.cache:
        cache_manager.save(comparator)
        print("\n✓ 对比结果已缓存")
    
    if args.summary_only:
        summary = comparator.get_summary()
        print("\n" + "=" * 60)
        print("摘要统计")
        print("=" * 60)
        print(f"仅在 A 中: {summary['only_a_count']} 个文件 ({ReportGenerator._format_size(summary['only_a_size'])})")
        print(f"仅在 B 中: {summary['only_b_count']} 个文件 ({ReportGenerator._format_size(summary['only_b_size'])})")
        print(f"内容不同: {summary['different_count']} 个文件 ({ReportGenerator._format_size(summary['different_size'])})")
        print(f"内容相同: {summary['same_count']} 个文件 ({ReportGenerator._format_size(summary['same_size'])})")
        print("=" * 60)
    else:
        report = ReportGenerator.generate_text_report(comparator)
        print(report)
    
    if args.report:
        output_base = args.output or 'directory_comparison_report'
        if args.report in ['text', 'both']:
            text_file = f"{output_base}.txt"
            ReportGenerator.generate_text_report(comparator, text_file)
            print(f"\n✓ 文本报告已保存到: {text_file}")
        if args.report in ['html', 'both']:
            html_file = f"{output_base}.html"
            ReportGenerator.generate_html_report(comparator, html_file)
            print(f"✓ HTML报告已保存到: {html_file}")
    
    if args.sync:
        synchronizer = DirectorySynchronizer(comparator, interactive=args.interactive)
        if args.sync == 'copy':
            synchronizer.copy_missing_to_b()
        elif args.sync == 'delete':
            synchronizer.remove_extra_from_b()
        elif args.sync == 'full':
            synchronizer.sync_a_to_b()


if __name__ == '__main__':
    main()
