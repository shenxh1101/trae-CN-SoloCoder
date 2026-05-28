#!/usr/bin/env python3

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


DEFAULT_CONFIG = {
    "languages": {
        "Python": {
            "extensions": [".py", ".pyw", ".pyx"],
            "line_comment": ["#"],
            "block_comment_pairs": [('"""', '"""'), ("'''", "'''")],
            "function_patterns": [
                r"^\s*def\s+\w+",
                r"^\s*async\s+def\s+\w+",
                r"^\s*class\s+\w+",
            ],
        },
        "JavaScript": {
            "extensions": [".js", ".mjs", ".cjs"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*function\s+\w+",
                r"^\s*(?:export\s+)?(?:async\s+)?function\s+\w+",
                r"(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>",
            ],
        },
        "TypeScript": {
            "extensions": [".ts", ".tsx", ".mts", ".cts"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*function\s+\w+",
                r"^\s*(?:export\s+)?(?:async\s+)?function\s+\w+",
                r"(?:const|let|var)\s+\w+\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>",
            ],
        },
        "Java": {
            "extensions": [".java"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+\w+\s*\(",
            ],
        },
        "C": {
            "extensions": [".c", ".h"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*[\w*]+\s+\w+\s*\(",
            ],
        },
        "C++": {
            "extensions": [".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*[\w*<>:]+\s+\w+\s*\(",
            ],
        },
        "C#": {
            "extensions": [".cs"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*(?:public|private|protected|internal|static|\s)+[\w<>\[\]]+\s+\w+\s*\(",
            ],
        },
        "Go": {
            "extensions": [".go"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*func\s+\w+",
                r"^\s*func\s*\(\w+\s+\*?\w+\)\s*\w+",
            ],
        },
        "Rust": {
            "extensions": [".rs"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*(?:pub\s+)?fn\s+\w+",
            ],
        },
        "Ruby": {
            "extensions": [".rb", ".rake"],
            "line_comment": ["#"],
            "block_comment_pairs": [("=begin", "=end")],
            "function_patterns": [
                r"^\s*def\s+\w+",
            ],
        },
        "PHP": {
            "extensions": [".php"],
            "line_comment": ["//", "#"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*function\s+\w+",
                r"^\s*(?:public|private|protected|static|\s)+\s+function\s+\w+",
            ],
        },
        "Swift": {
            "extensions": [".swift"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*(?:@\w+\s+)*(?:public|private|internal|static|override|\s)*func\s+\w+",
            ],
        },
        "Kotlin": {
            "extensions": [".kt", ".kts"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*(?:fun\s+\w+)",
            ],
        },
        "Scala": {
            "extensions": [".scala"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*def\s+\w+",
            ],
        },
        "Shell": {
            "extensions": [".sh", ".bash", ".zsh"],
            "line_comment": ["#"],
            "block_comment_pairs": [],
            "function_patterns": [
                r"^\s*function\s+\w+",
                r"^\s*\w+\s*\(\s*\)",
            ],
        },
        "PowerShell": {
            "extensions": [".ps1", ".psm1"],
            "line_comment": ["#"],
            "block_comment_pairs": [("<#", "#>")],
            "function_patterns": [
                r"^\s*function\s+\w+",
            ],
        },
        "Lua": {
            "extensions": [".lua"],
            "line_comment": ["--"],
            "block_comment_pairs": [("--[[", "]]")],
            "function_patterns": [
                r"^\s*function\s+\w+",
                r"^\s*local\s+function\s+\w+",
            ],
        },
        "Perl": {
            "extensions": [".pl", ".pm"],
            "line_comment": ["#"],
            "block_comment_pairs": [],
            "function_patterns": [
                r"^\s*sub\s+\w+",
            ],
        },
        "R": {
            "extensions": [".r", ".R"],
            "line_comment": ["#"],
            "block_comment_pairs": [],
            "function_patterns": [
                r"^\s*\w+\s*<-\s*function\s*\(",
            ],
        },
        "SQL": {
            "extensions": [".sql"],
            "line_comment": ["--"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\s+\w+",
            ],
        },
        "HTML": {
            "extensions": [".html", ".htm"],
            "line_comment": [],
            "block_comment_pairs": [("<!--", "-->")],
            "function_patterns": [],
        },
        "CSS": {
            "extensions": [".css", ".scss", ".sass", ".less"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [],
        },
        "Vue": {
            "extensions": [".vue"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/"), ("<!--", "-->")],
            "function_patterns": [],
        },
        "Svelte": {
            "extensions": [".svelte"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/"), ("<!--", "-->")],
            "function_patterns": [],
        },
        "JSON": {
            "extensions": [".json"],
            "line_comment": [],
            "block_comment_pairs": [],
            "function_patterns": [],
        },
        "XML": {
            "extensions": [".xml", ".xsl", ".xsd", ".svg", ".xaml"],
            "line_comment": [],
            "block_comment_pairs": [("<!--", "-->")],
            "function_patterns": [],
        },
        "YAML": {
            "extensions": [".yml", ".yaml"],
            "line_comment": ["#"],
            "block_comment_pairs": [],
            "function_patterns": [],
        },
        "TOML": {
            "extensions": [".toml"],
            "line_comment": ["#"],
            "block_comment_pairs": [],
            "function_patterns": [],
        },
        "Markdown": {
            "extensions": [".md", ".markdown"],
            "line_comment": [],
            "block_comment_pairs": [],
            "function_patterns": [],
        },
        "Dart": {
            "extensions": [".dart"],
            "line_comment": ["//"],
            "block_comment_pairs": [("/*", "*/")],
            "function_patterns": [
                r"^\s*(?:void|int|String|bool|double|var|final|const|static|\s)+\s+\w+\s*\(",
            ],
        },
        "Elixir": {
            "extensions": [".ex", ".exs"],
            "line_comment": ["#"],
            "block_comment_pairs": [],
            "function_patterns": [
                r"^\s*def\s+\w+",
                r"^\s*defp\s+\w+",
            ],
        },
        "Haskell": {
            "extensions": [".hs"],
            "line_comment": ["--"],
            "block_comment_pairs": [("{-", "-}")],
            "function_patterns": [
                r"^\s*\w+\s*::\s*",
            ],
        },
        "Zig": {
            "extensions": [".zig"],
            "line_comment": ["//"],
            "block_comment_pairs": [],
            "function_patterns": [
                r"^\s*fn\s+\w+",
            ],
        },
    },
    "exclude_dirs": [
        "node_modules", "dist", "build", ".git", "__pycache__",
        ".venv", "venv", ".tox", ".mypy_cache", ".pytest_cache",
        "target", "out", ".idea", ".vscode", "coverage", ".next",
        ".nuxt", "vendor", "Pods", ".gradle", ".mvn",
    ],
    "exclude_files": [],
    "min_lines": 0,
}


@dataclass
class FileStats:
    filepath: str
    language: str
    total_lines: int = 0
    blank_lines: int = 0
    comment_lines: int = 0
    code_lines: int = 0
    function_count: int = 0


@dataclass
class LanguageStats:
    language: str
    total_lines: int = 0
    blank_lines: int = 0
    comment_lines: int = 0
    code_lines: int = 0
    file_count: int = 0
    function_count: int = 0
    files: List[FileStats] = field(default_factory=list)


class Config:
    def __init__(self, config_path: Optional[str] = None):
        self.languages = {}
        self.exclude_dirs: Set[str] = set()
        self.exclude_files: Set[str] = set()
        self.min_lines: int = 0
        self._ext_to_lang: Dict[str, str] = {}
        self._load_default()
        if config_path:
            self._load_file(config_path)

    def _load_default(self):
        self._apply_dict(DEFAULT_CONFIG)

    def _apply_dict(self, data: dict):
        for lang_name, lang_cfg in data.get("languages", {}).items():
            self.languages[lang_name] = {
                "extensions": lang_cfg.get("extensions", []),
                "line_comment": lang_cfg.get("line_comment", []),
                "block_comment_pairs": [
                    tuple(pair) for pair in lang_cfg.get("block_comment_pairs", [])
                ],
                "function_patterns": lang_cfg.get("function_patterns", []),
            }
            for ext in lang_cfg.get("extensions", []):
                self._ext_to_lang[ext] = lang_name
        self.exclude_dirs = set(data.get("exclude_dirs", list(self.exclude_dirs)))
        self.exclude_files = set(data.get("exclude_files", list(self.exclude_files)))
        self.min_lines = data.get("min_lines", self.min_lines)
        self._rebuild_ext_map()

    def _rebuild_ext_map(self):
        self._ext_to_lang.clear()
        for lang_name, lang_cfg in self.languages.items():
            for ext in lang_cfg.get("extensions", []):
                self._ext_to_lang[ext] = lang_name

    def _load_file(self, path: str):
        p = Path(path)
        if not p.exists():
            print(f"Warning: config file '{path}' not found, using defaults.")
            return
        try:
            with open(p, "r", encoding="utf-8") as f:
                content = f.read()
        except OSError as e:
            print(f"Warning: cannot read config file '{path}': {e}")
            return

        if p.suffix in (".yaml", ".yml"):
            try:
                import yaml
                data = yaml.safe_load(content)
            except ImportError:
                print("Warning: PyYAML not installed. Install with: pip install pyyaml")
                print("Falling back to JSON config parsing.")
                return
            except Exception as e:
                print(f"Warning: failed to parse YAML config: {e}")
                return
        elif p.suffix == ".json":
            try:
                data = json.loads(content)
            except json.JSONDecodeError as e:
                print(f"Warning: failed to parse JSON config: {e}")
                return
        else:
            print(f"Warning: unsupported config format '{p.suffix}', expected .yaml/.yml/.json")
            return

        self._apply_dict(data)

    def get_language(self, ext: str) -> Optional[str]:
        return self._ext_to_lang.get(ext)

    def get_lang_config(self, language: str) -> dict:
        return self.languages.get(language, {})


class FileScanner:
    def __init__(self, config: Config, exclude_dirs: Optional[List[str]] = None,
                 exclude_files: Optional[List[str]] = None):
        self.config = config
        self.exclude_dirs = set(config.exclude_dirs)
        if exclude_dirs:
            self.exclude_dirs.update(exclude_dirs)
        self.exclude_files = set(config.exclude_files)
        if exclude_files:
            self.exclude_files.update(exclude_files)

    def scan(self, root: str) -> List[Tuple[str, str]]:
        root_path = Path(root).resolve()
        if not root_path.is_dir():
            print(f"Error: '{root}' is not a directory.")
            sys.exit(1)

        results = []
        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [
                d for d in dirnames
                if d not in self.exclude_dirs and not d.startswith(".")
            ]
            for filename in filenames:
                if filename in self.exclude_files:
                    continue
                filepath = os.path.join(dirpath, filename)
                ext = os.path.splitext(filename)[1].lower()
                language = self.config.get_language(ext)
                if language:
                    results.append((filepath, language))
        return results


class LineParser:
    def __init__(self, config: Config):
        self.config = config

    def parse_file(self, filepath: str, language: str) -> FileStats:
        lang_cfg = self.config.get_lang_config(language)
        line_comments = lang_cfg.get("line_comment", [])
        block_pairs = lang_cfg.get("block_comment_pairs", [])
        func_patterns = lang_cfg.get("function_patterns", [])

        total_lines = 0
        blank_lines = 0
        comment_lines = 0
        code_lines = 0
        function_count = 0

        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except OSError as e:
            print(f"Warning: cannot read '{filepath}': {e}")
            return FileStats(filepath=filepath, language=language)

        total_lines = len(lines)
        in_block_comment = False
        block_end_marker = ""

        compiled_func_patterns = []
        for pat in func_patterns:
            try:
                compiled_func_patterns.append(re.compile(pat))
            except re.error:
                pass

        for line in lines:
            stripped = line.strip()

            if in_block_comment:
                comment_lines += 1
                if block_end_marker and block_end_marker in stripped:
                    in_block_comment = False
                    remaining = stripped[stripped.index(block_end_marker) + len(block_end_marker):].strip()
                    if remaining:
                        comment_lines -= 1
                        code_lines += 1
                continue

            if not stripped:
                blank_lines += 1
                continue

            is_comment_line = False
            for start, end in block_pairs:
                if stripped.startswith(start):
                    is_comment_line = True
                    if start != end:
                        end_idx = stripped.find(end, len(start))
                        if end_idx == -1:
                            in_block_comment = True
                            block_end_marker = end
                        else:
                            remaining = stripped[end_idx + len(end):].strip()
                            if remaining:
                                is_comment_line = False
                    break

            if not is_comment_line:
                for lc in line_comments:
                    if stripped.startswith(lc):
                        is_comment_line = True
                        break

            if is_comment_line:
                comment_lines += 1
            else:
                code_lines += 1
                for pat in compiled_func_patterns:
                    if pat.search(stripped):
                        function_count += 1
                        break

        return FileStats(
            filepath=filepath,
            language=language,
            total_lines=total_lines,
            blank_lines=blank_lines,
            comment_lines=comment_lines,
            code_lines=code_lines,
            function_count=function_count,
        )


class StatsCollector:
    def __init__(self, config: Config, min_lines: int = 0):
        self.config = config
        self.min_lines = min_lines or config.min_lines
        self.language_stats: Dict[str, LanguageStats] = defaultdict(
            lambda: LanguageStats(language="")
        )

    def add(self, file_stat: FileStats):
        if self.min_lines > 0 and file_stat.total_lines < self.min_lines:
            return
        lang = file_stat.language
        ls = self.language_stats[lang]
        ls.language = lang
        ls.total_lines += file_stat.total_lines
        ls.blank_lines += file_stat.blank_lines
        ls.comment_lines += file_stat.comment_lines
        ls.code_lines += file_stat.code_lines
        ls.file_count += 1
        ls.function_count += file_stat.function_count
        ls.files.append(file_stat)

    def get_sorted(self) -> List[LanguageStats]:
        return sorted(
            self.language_stats.values(),
            key=lambda s: s.code_lines,
            reverse=True,
        )

    def to_dict(self) -> dict:
        result = {}
        for lang, ls in self.language_stats.items():
            result[lang] = {
                "total_lines": ls.total_lines,
                "blank_lines": ls.blank_lines,
                "comment_lines": ls.comment_lines,
                "code_lines": ls.code_lines,
                "file_count": ls.file_count,
                "function_count": ls.function_count,
                "files": [
                    {
                        "filepath": f.filepath,
                        "total_lines": f.total_lines,
                        "blank_lines": f.blank_lines,
                        "comment_lines": f.comment_lines,
                        "code_lines": f.code_lines,
                        "function_count": f.function_count,
                    }
                    for f in ls.files
                ],
            }
        return result


class TerminalReporter:
    COLORS = {
        "reset": "\033[0m",
        "bold": "\033[1m",
        "dim": "\033[2m",
        "red": "\033[31m",
        "green": "\033[32m",
        "yellow": "\033[33m",
        "blue": "\033[34m",
        "magenta": "\033[35m",
        "cyan": "\033[36m",
        "white": "\033[37m",
        "bg_red": "\033[41m",
        "bg_green": "\033[42m",
        "bg_yellow": "\033[43m",
        "bg_blue": "\033[44m",
        "bg_magenta": "\033[45m",
        "bg_cyan": "\033[46m",
        "bg_white": "\033[47m",
    }

    LANG_COLORS = [
        "cyan", "green", "yellow", "magenta", "blue", "red",
        "white", "cyan", "green", "yellow", "magenta", "blue",
    ]

    def __init__(self, no_color: bool = False):
        self.no_color = no_color

    def _c(self, color: str, text: str) -> str:
        if self.no_color:
            return text
        return f"{self.COLORS.get(color, '')}{text}{self.COLORS['reset']}"

    def print_summary(self, stats: StatsCollector, root: str):
        sorted_stats = stats.get_sorted()
        if not sorted_stats:
            print("No code files found.")
            return

        total_code = sum(s.code_lines for s in sorted_stats)
        total_blank = sum(s.blank_lines for s in sorted_stats)
        total_comment = sum(s.comment_lines for s in sorted_stats)
        total_all = sum(s.total_lines for s in sorted_stats)
        total_files = sum(s.file_count for s in sorted_stats)
        total_funcs = sum(s.function_count for s in sorted_stats)

        print()
        print(self._c("bold", f"  Code Line Counter — {root}"))
        print(self._c("dim", "  " + "─" * 78))
        print()

        header = (
            f"  {'Language':<16} {'Files':>7} {'Code':>10} {'Comment':>10} "
            f"{'Blank':>10} {'Total':>10} {'Funcs':>7} {'%Code':>7}"
        )
        print(self._c("bold", header))
        print(self._c("dim", "  " + "─" * 78))

        for i, s in enumerate(sorted_stats):
            pct = (s.code_lines / total_code * 100) if total_code > 0 else 0
            color = self.LANG_COLORS[i % len(self.LANG_COLORS)]
            name = self._c(color, f"{s.language:<16}")
            line = (
                f"  {name} {s.file_count:>7} {s.code_lines:>10} {s.comment_lines:>10} "
                f"{s.blank_lines:>10} {s.total_lines:>10} {s.function_count:>7} {pct:>6.1f}%"
            )
            print(line)

        print(self._c("dim", "  " + "─" * 78))

        total_pct = 100.0
        total_line = (
            f"  {'SUM':<16} {total_files:>7} {total_code:>10} {total_comment:>10} "
            f"{total_blank:>10} {total_all:>10} {total_funcs:>7} {total_pct:>6.1f}%"
        )
        print(self._c("bold", total_line))
        print()

    def print_chart(self, stats: StatsCollector, width: int = 50):
        sorted_stats = stats.get_sorted()
        if not sorted_stats:
            return

        total_code = sum(s.code_lines for s in sorted_stats)
        if total_code == 0:
            return

        print(self._c("bold", "  Language Distribution:"))
        print()

        for i, s in enumerate(sorted_stats):
            pct = s.code_lines / total_code * 100
            bar_len = int(pct / 100 * width)
            color = self.LANG_COLORS[i % len(self.LANG_COLORS)]
            bg = f"bg_{color}" if f"bg_{color}" in self.COLORS else "bg_white"

            if self.no_color:
                bar = "█" * bar_len
            else:
                bar_inner = " " * bar_len
                bar = f"{self.COLORS[bg]}{bar_inner}{self.COLORS['reset']}"

            label = f"  {s.language:<14} "
            print(f"{self._c(color, label)}{bar} {pct:5.1f}%")

        print()

    def print_diff(self, old_stats: dict, new_stats: dict):
        all_langs = set(old_stats.keys()) | set(new_stats.keys())
        if not all_langs:
            print("No data to compare.")
            return

        print()
        print(self._c("bold", "  Incremental Diff Report"))
        print(self._c("dim", "  " + "─" * 70))
        print()

        header = (
            f"  {'Language':<16} {'Code Δ':>10} {'Comment Δ':>10} "
            f"{'Blank Δ':>10} {'Total Δ':>10} {'Files Δ':>8}"
        )
        print(self._c("bold", header))
        print(self._c("dim", "  " + "─" * 70))

        for lang in sorted(all_langs):
            old = old_stats.get(lang, {})
            new = new_stats.get(lang, {})

            code_diff = new.get("code_lines", 0) - old.get("code_lines", 0)
            comment_diff = new.get("comment_lines", 0) - old.get("comment_lines", 0)
            blank_diff = new.get("blank_lines", 0) - old.get("blank_lines", 0)
            total_diff = new.get("total_lines", 0) - old.get("total_lines", 0)
            file_diff = new.get("file_count", 0) - old.get("file_count", 0)

            def fmt_delta(v):
                if v > 0:
                    return self._c("green", f"+{v}")
                elif v < 0:
                    return self._c("red", f"{v}")
                return f"{v}"

            line = (
                f"  {lang:<16} {fmt_delta(code_diff):>10} {fmt_delta(comment_diff):>10} "
                f"{fmt_delta(blank_diff):>10} {fmt_delta(total_diff):>10} {fmt_delta(file_diff):>8}"
            )
            print(line)

        print()


class CsvExporter:
    @staticmethod
    def export(stats: StatsCollector, output_path: str):
        sorted_stats = stats.get_sorted()
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Language", "File", "Code Lines", "Comment Lines",
                "Blank Lines", "Total Lines", "Function Count",
            ])
            for ls in sorted_stats:
                for fs in ls.files:
                    writer.writerow([
                        fs.language,
                        fs.filepath,
                        fs.code_lines,
                        fs.comment_lines,
                        fs.blank_lines,
                        fs.total_lines,
                        fs.function_count,
                    ])
        print(f"CSV report exported to: {output_path}")


class HtmlExporter:
    @staticmethod
    def export(stats: StatsCollector, output_path: str, root: str):
        sorted_stats = stats.get_sorted()
        total_code = sum(s.code_lines for s in sorted_stats)

        file_tree = HtmlExporter._build_tree(sorted_stats)

        lang_rows = ""
        for i, s in enumerate(sorted_stats):
            pct = (s.code_lines / total_code * 100) if total_code > 0 else 0
            color = HtmlExporter._lang_color(i)
            bar = f'<div style="background:{color};width:{pct}%;height:20px;border-radius:3px;"></div>'
            lang_rows += f"""
            <tr>
                <td><span style="color:{color};font-weight:bold;">●</span> {s.language}</td>
                <td>{s.file_count}</td>
                <td>{s.code_lines:,}</td>
                <td>{s.comment_lines:,}</td>
                <td>{s.blank_lines:,}</td>
                <td>{s.total_lines:,}</td>
                <td>{s.function_count}</td>
                <td>{pct:.1f}%</td>
                <td style="width:200px;">{bar}</td>
            </tr>"""

        tree_html = HtmlExporter._render_tree(file_tree, stats)

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Code Line Count Report — {root}</title>
<style>
  :root {{ --bg: #1e1e2e; --surface: #282840; --text: #cdd6f4; --dim: #6c7086; --accent: #89b4fa; --border: #45475a; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); padding: 2rem; }}
  h1 {{ color: var(--accent); margin-bottom: 0.5rem; }}
  h2 {{ color: var(--accent); margin: 1.5rem 0 0.5rem; }}
  .meta {{ color: var(--dim); margin-bottom: 1.5rem; }}
  table {{ border-collapse: collapse; width: 100%; margin-bottom: 1rem; }}
  th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); }}
  th {{ background: var(--surface); color: var(--accent); font-weight: 600; }}
  tr:hover {{ background: var(--surface); }}
  .tree {{ font-family: monospace; white-space: pre; }}
  .tree-item {{ cursor: pointer; padding: 2px 0; }}
  .tree-item:hover {{ color: var(--accent); }}
  .tree-children {{ display: none; padding-left: 1.2em; }}
  .tree-children.open {{ display: block; }}
  .toggle::before {{ content: '▶ '; display: inline-block; font-size: 0.7em; transition: transform 0.2s; }}
  .toggle.open::before {{ transform: rotate(90deg); }}
  .stats-row {{ display: flex; gap: 2rem; margin-bottom: 1.5rem; flex-wrap: wrap; }}
  .stat-card {{ background: var(--surface); border-radius: 8px; padding: 1rem 1.5rem; min-width: 150px; }}
  .stat-card .label {{ color: var(--dim); font-size: 0.85rem; }}
  .stat-card .value {{ font-size: 1.6rem; font-weight: 700; color: var(--accent); }}
</style>
</head>
<body>
<h1>📊 Code Line Count Report</h1>
<p class="meta">Project: <strong>{root}</strong> &middot; Generated: {now}</p>

<div class="stats-row">
  <div class="stat-card"><div class="label">Total Files</div><div class="value">{sum(s.file_count for s in sorted_stats):,}</div></div>
  <div class="stat-card"><div class="label">Total Code Lines</div><div class="value">{total_code:,}</div></div>
  <div class="stat-card"><div class="label">Total Comment Lines</div><div class="value">{sum(s.comment_lines for s in sorted_stats):,}</div></div>
  <div class="stat-card"><div class="label">Total Blank Lines</div><div class="value">{sum(s.blank_lines for s in sorted_stats):,}</div></div>
  <div class="stat-card"><div class="label">Total Functions</div><div class="value">{sum(s.function_count for s in sorted_stats):,}</div></div>
</div>

<h2>Language Breakdown</h2>
<table>
<thead><tr><th>Language</th><th>Files</th><th>Code</th><th>Comment</th><th>Blank</th><th>Total</th><th>Functions</th><th>% Code</th><th>Distribution</th></tr></thead>
<tbody>{lang_rows}</tbody>
</table>

<h2>File Details (click to expand)</h2>
<div class="tree">{tree_html}</div>

<script>
document.querySelectorAll('.toggle').forEach(el => {{
  el.addEventListener('click', () => {{
    el.classList.toggle('open');
    const children = el.nextElementSibling;
    if (children) children.classList.toggle('open');
  }});
}});
</script>
</body>
</html>"""

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"HTML report exported to: {output_path}")

    @staticmethod
    def _lang_color(index: int) -> str:
        colors = [
            "#89b4fa", "#a6e3a1", "#f9e2af", "#cba6f7", "#74c7ec",
            "#f38ba8", "#fab387", "#94e2d5", "#f5c2e7", "#89dceb",
        ]
        return colors[index % len(colors)]

    @staticmethod
    def _build_tree(sorted_stats: List[LanguageStats]) -> dict:
        tree: dict = {}
        for ls in sorted_stats:
            for fs in ls.files:
                parts = Path(fs.filepath).parts
                node = tree
                for part in parts[:-1]:
                    node = node.setdefault(part + "/", {})
                node[parts[-1]] = fs
        return tree

    @staticmethod
    def _render_tree(tree: dict, stats: StatsCollector, indent: int = 0) -> str:
        html = ""
        for key, value in sorted(tree.items()):
            prefix = "  " * indent
            if isinstance(value, dict):
                html += f'<div class="tree-item toggle" style="padding-left:{indent * 20}px;">📁 {key}</div>\n'
                html += f'<div class="tree-children">\n'
                html += HtmlExporter._render_tree(value, stats, indent + 1)
                html += '</div>\n'
            else:
                fs: FileStats = value
                html += (
                    f'<div style="padding-left:{indent * 20}px;">'
                    f'📄 {key} — '
                    f'<span style="color:var(--accent)">{fs.code_lines}</span> code, '
                    f'{fs.comment_lines} comment, '
                    f'{fs.blank_lines} blank, '
                    f'{fs.function_count} funcs'
                    f'</div>\n'
                )
        return html


class DiffEngine:
    @staticmethod
    def save_snapshot(stats: StatsCollector, path: str):
        data = stats.to_dict()
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @staticmethod
    def load_snapshot(path: str) -> dict:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def compare(old_data: dict, new_data: dict) -> dict:
        all_langs = set(old_data.keys()) | set(new_data.keys())
        diff = {}
        for lang in all_langs:
            old = old_data.get(lang, {})
            new = new_data.get(lang, {})
            diff[lang] = {
                "code_diff": new.get("code_lines", 0) - old.get("code_lines", 0),
                "comment_diff": new.get("comment_lines", 0) - old.get("comment_lines", 0),
                "blank_diff": new.get("blank_lines", 0) - old.get("blank_lines", 0),
                "total_diff": new.get("total_lines", 0) - old.get("total_lines", 0),
                "file_diff": new.get("file_count", 0) - old.get("file_count", 0),
            }
        return diff


def generate_sample_config(path: str):
    sample = {
        "languages": {
            "CustomLang": {
                "extensions": [".custom"],
                "line_comment": ["#"],
                "block_comment_pairs": [["/*", "*/"]],
                "function_patterns": [r"^\\s*def\\s+\\w+"],
            }
        },
        "exclude_dirs": ["node_modules", "dist", "build", ".git"],
        "exclude_files": ["package-lock.json"],
        "min_lines": 0,
    }

    ext = os.path.splitext(path)[1].lower()
    if ext in (".yaml", ".yml"):
        try:
            import yaml
            content = yaml.dump(sample, default_flow_style=False, allow_unicode=True)
        except ImportError:
            print("Error: PyYAML not installed. Use .json extension or: pip install pyyaml")
            return
    elif ext == ".json":
        content = json.dumps(sample, indent=2, ensure_ascii=False)
    else:
        print(f"Error: unsupported extension '{ext}', use .yaml/.yml/.json")
        return

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Sample config written to: {path}")


def build_argparser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cloc-tool",
        description="Code Line Counter — Analyze code statistics across multiple languages",
    )
    parser.add_argument("path", nargs="?", default=".", help="Project directory to scan (default: current dir)")
    parser.add_argument("-c", "--config", help="Path to config file (.yaml/.yml/.json)")
    parser.add_argument("--exclude-dirs", nargs="*", help="Additional directories to exclude")
    parser.add_argument("--exclude-files", nargs="*", help="File names to exclude")
    parser.add_argument("--min-lines", type=int, default=0, help="Minimum line threshold per file")
    parser.add_argument("--csv", help="Export detailed CSV report to path")
    parser.add_argument("--html", help="Export HTML report to path")
    parser.add_argument("--no-chart", action="store_true", help="Disable percentage bar chart")
    parser.add_argument("--no-color", action="store_true", help="Disable colored output")
    parser.add_argument("--snapshot", help="Save statistics snapshot to JSON file")
    parser.add_argument("--diff", help="Compare with previous snapshot JSON file")
    parser.add_argument("--generate-config", help="Generate a sample config file at path")
    parser.add_argument("--list-langs", action="store_true", help="List all supported languages and exit")
    return parser


def main():
    parser = build_argparser()
    args = parser.parse_args()

    if args.generate_config:
        generate_sample_config(args.generate_config)
        return

    config = Config(args.config)

    if args.list_langs:
        print("\nSupported languages:\n")
        for lang, cfg in sorted(config.languages.items()):
            exts = ", ".join(cfg["extensions"])
            print(f"  {lang:<16} {exts}")
        print()
        return

    root = os.path.abspath(args.path)

    scanner = FileScanner(
        config,
        exclude_dirs=args.exclude_dirs,
        exclude_files=args.exclude_files,
    )

    parser_engine = LineParser(config)
    collector = StatsCollector(config, min_lines=args.min_lines)

    files = scanner.scan(root)
    if not files:
        print("No code files found in the specified directory.")
        return

    total = len(files)
    for idx, (filepath, language) in enumerate(files):
        if (idx + 1) % 50 == 0 or idx == total - 1:
            print(f"\r  Scanning: {idx + 1}/{total}", end="", flush=True)
        fs = parser_engine.parse_file(filepath, language)
        collector.add(fs)

    print("\r" + " " * 40 + "\r", end="")

    reporter = TerminalReporter(no_color=args.no_color)
    reporter.print_summary(collector, root)

    if not args.no_chart:
        reporter.print_chart(collector)

    if args.csv:
        CsvExporter.export(collector, args.csv)

    if args.html:
        HtmlExporter.export(collector, args.html, root)

    if args.diff:
        try:
            old_data = DiffEngine.load_snapshot(args.diff)
        except (OSError, json.JSONDecodeError) as e:
            print(f"Error loading snapshot: {e}")
            sys.exit(1)
        new_data = collector.to_dict()
        reporter.print_diff(old_data, new_data)

    if args.snapshot:
        DiffEngine.save_snapshot(collector, args.snapshot)
        print(f"Snapshot saved to: {args.snapshot}")


if __name__ == "__main__":
    main()
