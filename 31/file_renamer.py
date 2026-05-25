#!/usr/bin/env python3
"""
文件批量重命名工具 (Batch File Renamer)
=========================================

一个功能强大的命令行文件批量重命名工具，支持多种重命名规则组合使用。

功能特性:
  - 添加前缀/后缀
  - 删除指定位置字符
  - 替换字符串/正则表达式
  - 按序号填充（自定义宽度和起始值）
  - 基于文件元数据（创建日期/修改日期/文件大小）
  - 文件名大小写转换
  - 按日期整理文件夹结构（年/月/日）
  - 递归处理子目录
  - 文件过滤（按扩展名/排除模式）
  - 冲突处理（自动编号/覆盖/跳过）
  - 操作日志记录和撤销
  - CSV映射表批量重命名
  - 预览模式/模拟运行

作者: Trae AI
日期: 2026-05-25
"""

import argparse
import csv
import datetime
import json
import logging
import os
import re
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any, Callable


# ==============================================================================
# 配置类
# ==============================================================================

@dataclass
class RenameConfig:
    """重命名配置"""
    directory: str = "."
    recursive: bool = False
    extensions: List[str] = field(default_factory=list)
    exclude_extensions: List[str] = field(default_factory=list)
    exclude_patterns: List[str] = field(default_factory=list)
    prefix: str = ""
    suffix: str = ""
    delete_start: Optional[int] = None
    delete_end: Optional[int] = None
    replace_old: str = ""
    replace_new: str = ""
    regex_pattern: str = ""
    regex_replacement: str = ""
    use_sequencing: bool = False
    seq_start: int = 1
    seq_width: int = 3
    seq_format: str = "0{}d"
    use_metadata: bool = False
    metadata_type: str = "created"
    metadata_format: str = "%Y-%m-%d"
    case_transform: str = ""
    organize_by_date: bool = False
    organize_format: str = "%Y/%m/%d"
    conflict_strategy: str = "number"
    dry_run: bool = False
    preview: bool = False
    csv_file: str = ""
    log_file: str = ""
    undo_file: str = ""


# ==============================================================================
# 工具函数
# ==============================================================================

def get_file_metadata(filepath: str) -> Dict[str, Any]:
    """获取文件元数据"""
    stat = os.stat(filepath)
    result = {
        "modified": datetime.datetime.fromtimestamp(stat.st_mtime),
        "accessed": datetime.datetime.fromtimestamp(stat.st_atime),
        "size": stat.st_size,
        "size_formatted": format_file_size(stat.st_size),
    }

    if hasattr(stat, 'st_birthtime'):
        result["created"] = datetime.datetime.fromtimestamp(stat.st_birthtime)
    else:
        result["created"] = datetime.datetime.fromtimestamp(stat.st_ctime)

    return result


def format_file_size(size: int) -> str:
    """格式化文件大小"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.0f}{unit}"
        size /= 1024.0
    return f"{size:.0f}PB"


def format_metadata_value(filepath: str, config: RenameConfig) -> str:
    """根据配置格式化元数据值"""
    metadata = get_file_metadata(filepath)
    meta_type = config.metadata_type

    if meta_type == "size":
        return metadata["size_formatted"]
    elif meta_type == "size_bytes":
        return str(metadata["size"])
    else:
        dt = metadata.get(meta_type, metadata["modified"])
        return dt.strftime(config.metadata_format)


def match_extensions(filename: str, extensions: List[str]) -> bool:
    """检查文件扩展名是否匹配"""
    if not extensions:
        return True
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    return ext in [e.lower().lstrip(".") for e in extensions]


def match_exclude_patterns(filename: str, patterns: List[str]) -> bool:
    """检查文件名是否匹配排除模式"""
    for pattern in patterns:
        if re.search(pattern, filename):
            return True
    return False


def apply_case_transform(name: str, transform: str) -> str:
    """应用大小写转换"""
    if transform == "upper":
        return name.upper()
    elif transform == "lower":
        return name.lower()
    elif transform == "title":
        return name.title()
    elif transform == "capitalize":
        return name.capitalize()
    return name


# ==============================================================================
# 核心重命名逻辑
# ==============================================================================

class FileRenamer:
    """文件重命名器"""

    def __init__(self, config: RenameConfig):
        self.config = config
        self.operations: List[Dict[str, str]] = []
        self.undo_operations: List[Dict[str, str]] = []
        self.conflict_map: Dict[str, int] = {}

    def scan_files(self) -> List[str]:
        """扫描目录获取文件列表"""
        files = []
        directory = os.path.abspath(self.config.directory)

        if self.config.recursive:
            for root, dirs, filenames in os.walk(directory):
                for f in filenames:
                    filepath = os.path.join(root, f)
                    files.append(filepath)
        else:
            for f in os.listdir(directory):
                filepath = os.path.join(directory, f)
                if os.path.isfile(filepath):
                    files.append(filepath)

        return files

    def filter_files(self, files: List[str]) -> List[str]:
        """根据配置过滤文件"""
        filtered = []

        for filepath in files:
            filename = os.path.basename(filepath)

            if not os.path.isfile(filepath):
                continue

            if self.config.extensions and not match_extensions(
                filename, self.config.extensions
            ):
                continue

            if self.config.exclude_extensions and match_extensions(
                filename, self.config.exclude_extensions
            ):
                continue

            if match_exclude_patterns(filename, self.config.exclude_patterns):
                continue

            filtered.append(filepath)

        return sorted(filtered)

    def generate_new_name(
        self,
        filepath: str,
        index: int,
        original_stem: str,
        original_ext: str,
    ) -> str:
        """根据配置生成新文件名"""
        config = self.config
        new_stem = original_stem

        if config.csv_file:
            return new_stem

        if config.delete_start is not None and config.delete_end is not None:
            start = max(0, config.delete_start)
            end = min(len(new_stem), config.delete_end)
            new_stem = new_stem[:start] + new_stem[end:]
        elif config.delete_start is not None:
            start = max(0, config.delete_start)
            new_stem = new_stem[:start]
        elif config.delete_end is not None:
            end = min(len(new_stem), config.delete_end)
            new_stem = new_stem[end:]

        if config.replace_old and config.replace_old in new_stem:
            new_stem = new_stem.replace(config.replace_old, config.replace_new)

        if config.regex_pattern:
            try:
                new_stem_before = new_stem
                new_stem = re.sub(
                    config.regex_pattern, config.regex_replacement, new_stem
                )
                if new_stem == new_stem_before:
                    new_stem = new_stem_before
            except re.error:
                pass

        if config.use_metadata:
            meta_value = format_metadata_value(filepath, config)
            new_stem = f"{meta_value}_{new_stem}"

        if config.use_sequencing:
            seq_num = config.seq_start + index
            seq_str = str(seq_num).zfill(config.seq_width)
            new_stem = f"{new_stem}_{seq_str}"

        if config.prefix:
            new_stem = f"{config.prefix}{new_stem}"

        if config.suffix:
            new_stem = f"{new_stem}{config.suffix}"

        if config.case_transform:
            new_stem = apply_case_transform(new_stem, config.case_transform)

        return new_stem

    def get_organize_path(self, filepath: str) -> Optional[str]:
        """获取按日期整理的目标路径"""
        if not self.config.organize_by_date:
            return None

        metadata = get_file_metadata(filepath)
        dt = metadata.get(self.config.metadata_type, metadata["modified"])
        folder_path = dt.strftime(self.config.organize_format)
        directory = os.path.abspath(self.config.directory)
        return os.path.join(directory, folder_path)

    def resolve_conflict(
        self,
        filepath: str,
        target_dir: str,
        new_stem: str,
        new_ext: str,
    ) -> Tuple[str, bool]:
        """解决重命名冲突"""
        strategy = self.config.conflict_strategy

        if strategy == "skip":
            return filepath, False

        new_filename = f"{new_stem}{new_ext}"
        new_filepath = os.path.join(target_dir, new_filename)

        original_stem = os.path.splitext(os.path.basename(filepath))[0]
        if new_stem.lower() == original_stem.lower() and target_dir == os.path.dirname(filepath):
            return new_filepath, True

        if not os.path.exists(new_filepath):
            return new_filepath, True

        if strategy == "overwrite":
            return new_filepath, True

        counter = 1
        while True:
            new_filename = f"{new_stem}_{counter}{new_ext}"
            new_filepath = os.path.join(target_dir, new_filename)
            if not os.path.exists(new_filepath):
                return new_filepath, True
            counter += 1

    def load_csv_mapping(self) -> Dict[str, str]:
        """从CSV文件加载重命名映射"""
        mapping = {}
        if not self.config.csv_file:
            return mapping

        try:
            with open(self.config.csv_file, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                for row in reader:
                    if len(row) >= 2:
                        mapping[row[0]] = row[1]
        except Exception as e:
            print(f"警告: 无法读取CSV文件: {e}")

        return mapping

    def plan_operations(self) -> List[Dict[str, str]]:
        """规划所有重命名操作"""
        files = self.scan_files()
        files = self.filter_files(files)

        csv_mapping = self.load_csv_mapping()
        operations = []

        for index, filepath in enumerate(files):
            original_dir = os.path.dirname(filepath)
            original_stem = os.path.splitext(os.path.basename(filepath))[0]
            original_ext = os.path.splitext(filepath)[1]

            if csv_mapping:
                csv_new_name = csv_mapping.get(
                    os.path.basename(filepath),
                    csv_mapping.get(original_stem, ""),
                )
                if csv_new_name:
                    csv_stem, csv_ext = os.path.splitext(csv_new_name)
                    new_stem = csv_stem
                    if csv_ext:
                        original_ext = csv_ext
                else:
                    new_stem = original_stem
            else:
                new_stem = self.generate_new_name(
                    filepath, index, original_stem, original_ext
                )

            target_dir = self.get_organize_path(filepath) or original_dir
            new_filename = f"{new_stem}{original_ext}"
            new_filepath = os.path.join(target_dir, new_filename)

            if new_filepath == filepath:
                continue

            new_filepath, should_rename = self.resolve_conflict(
                filepath, target_dir, new_stem, original_ext
            )

            if should_rename and new_filepath != filepath:
                operations.append({
                    "original": filepath,
                    "new": new_filepath,
                })

        return operations

    def execute_operations(
        self, operations: List[Dict[str, str]]
    ) -> Tuple[int, int]:
        """执行重命名操作"""
        success_count = 0
        fail_count = 0

        for op in operations:
            original = op["original"]
            new = op["new"]

            try:
                new_dir = os.path.dirname(new)
                if new_dir and not os.path.exists(new_dir):
                    os.makedirs(new_dir, exist_ok=True)

                if os.path.exists(new) and self.config.conflict_strategy == "overwrite":
                    if os.path.abspath(original) != os.path.abspath(new):
                        shutil.move(original, new)
                else:
                    shutil.move(original, new)

                self.undo_operations.append({
                    "original": new,
                    "new": original,
                })

                success_count += 1

                if self.config.log_file:
                    self._log_operation(original, new)

            except Exception as e:
                print(f"错误: 无法重命名 {original}: {e}")
                fail_count += 1

        if self.config.undo_file and self.undo_operations:
            self._save_undo_file()

        return success_count, fail_count

    def _log_operation(self, original: str, new: str):
        """记录重命名操作到日志"""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {original} -> {new}\n"

        try:
            with open(self.config.log_file, "a", encoding="utf-8") as f:
                f.write(log_entry)
        except Exception as e:
            print(f"警告: 无法写入日志文件: {e}")

    def _save_undo_file(self):
        """保存撤销操作记录"""
        try:
            with open(self.config.undo_file, "w", encoding="utf-8") as f:
                json.dump(self.undo_operations, f, indent=2, ensure_ascii=False)
            print(f"撤销信息已保存到: {self.config.undo_file}")
        except Exception as e:
            print(f"警告: 无法保存撤销文件: {e}")

    def undo_from_file(self, undo_file: str) -> Tuple[int, int]:
        """从撤销文件恢复操作"""
        try:
            with open(undo_file, "r", encoding="utf-8") as f:
                operations = json.load(f)
        except Exception as e:
            print(f"错误: 无法读取撤销文件: {e}")
            return 0, 0

        success_count = 0
        fail_count = 0

        for op in reversed(operations):
            original = op["original"]
            new = op["new"]

            try:
                if os.path.exists(original):
                    new_dir = os.path.dirname(new)
                    if new_dir and not os.path.exists(new_dir):
                        os.makedirs(new_dir, exist_ok=True)
                    shutil.move(original, new)
                    success_count += 1
                else:
                    print(f"警告: 文件不存在，跳过: {original}")
                    fail_count += 1
            except Exception as e:
                print(f"错误: 无法恢复 {original}: {e}")
                fail_count += 1

        return success_count, fail_count


# ==============================================================================
# 显示和交互
# ==============================================================================

def print_operations(operations: List[Dict[str, str]]):
    """打印重命名操作预览"""
    if not operations:
        print("\n没有需要重命名的文件。")
        return

    print(f"\n{'='*70}")
    print(f"  预览: 将执行 {len(operations)} 个重命名操作")
    print(f"{'='*70}\n")

    for i, op in enumerate(operations, 1):
        original = op["original"]
        new = op["new"]
        print(f"  [{i:3d}] {original}")
        print(f"       -> {new}\n")

    print(f"{'='*70}\n")


def confirm_execution() -> bool:
    """询问用户是否确认执行"""
    while True:
        response = input("是否执行以上操作？(y/n): ").strip().lower()
        if response in ["y", "yes"]:
            return True
        elif response in ["n", "no"]:
            return False
        else:
            print("请输入 y 或 n")


def print_summary(success: int, fail: int, dry_run: bool = False):
    """打印执行摘要"""
    mode = "模拟运行" if dry_run else "执行"
    print(f"\n{'='*50}")
    print(f"  {mode}完成:")
    print(f"  - 成功: {success} 个文件")
    if fail > 0:
        print(f"  - 失败: {fail} 个文件")
    print(f"{'='*50}\n")


# ==============================================================================
# 命令行参数解析
# ==============================================================================

def create_parser() -> argparse.ArgumentParser:
    """创建命令行参数解析器"""
    parser = argparse.ArgumentParser(
        description="文件批量重命名工具 - 支持多种重命名规则组合使用",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 基本用法：添加前缀
  %(prog)s -d ./photos --prefix "2024_"

  # 使用序号重命名
  %(prog)s -d ./images --sequence --seq-start 1 --seq-width 4

  # 使用正则表达式替换
  %(prog)s -d ./docs --regex-pattern "IMG(\\d+)" --regex-replacement "Photo_\\1"

  # 基于创建日期重命名
  %(prog)s -d ./photos --metadata --meta-type created --meta-format "%%Y-%%m-%%d"

  # 按年/月/日整理文件
  %(prog)s -d ./photos --organize --organize-format "%%Y/%%m/%%d"

  # 仅处理jpg和png文件，递归子目录
  %(prog)s -d ./photos -r --ext .jpg --ext .png --prefix "vacation_"

  # 使用CSV映射表
  %(prog)s -d ./files --csv mapping.csv

  # 模拟运行（不实际修改）
  %(prog)s -d ./files --prefix "test_" --dry-run

  # 预览模式
  %(prog)s -d ./files --prefix "preview_" --preview

  # 撤销操作
  %(prog)s --undo undo_20240115_120000.json
        """,
    )

    parser.add_argument(
        "-d", "--directory",
        default=".",
        help="目标目录路径 (默认: 当前目录)",
    )

    parser.add_argument(
        "-r", "--recursive",
        action="store_true",
        help="递归处理子目录",
    )

    parser.add_argument(
        "--ext",
        action="append",
        default=[],
        dest="extensions",
        help="只处理指定扩展名的文件 (可多次指定)",
    )

    parser.add_argument(
        "--exclude-ext",
        action="append",
        default=[],
        dest="exclude_extensions",
        help="排除指定扩展名的文件 (可多次指定)",
    )

    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        dest="exclude_patterns",
        help="排除匹配正则模式的文件名 (可多次指定)",
    )

    # 前缀/后缀
    prefix_suffix = parser.add_argument_group("前缀/后缀")
    prefix_suffix.add_argument(
        "--prefix",
        default="",
        help="添加前缀",
    )
    prefix_suffix.add_argument(
        "--suffix",
        default="",
        help="添加后缀",
    )

    # 删除字符
    delete_group = parser.add_argument_group("删除字符")
    delete_group.add_argument(
        "--delete-start",
        type=int,
        default=None,
        help="从指定位置开始删除字符 (0-based)",
    )
    delete_group.add_argument(
        "--delete-end",
        type=int,
        default=None,
        help="删除到指定位置结束 (0-based)",
    )

    # 替换
    replace_group = parser.add_argument_group("替换")
    replace_group.add_argument(
        "--replace-old",
        default="",
        help="要替换的字符串",
    )
    replace_group.add_argument(
        "--replace-new",
        default="",
        help="替换后的字符串",
    )
    replace_group.add_argument(
        "--regex-pattern",
        default="",
        help="正则表达式匹配模式",
    )
    replace_group.add_argument(
        "--regex-replacement",
        default="",
        help="正则表达式替换字符串 (可用 \\1, \\2 等)",
    )

    # 序号
    seq_group = parser.add_argument_group("序号填充")
    seq_group.add_argument(
        "--sequence",
        action="store_true",
        dest="use_sequencing",
        help="启用序号填充",
    )
    seq_group.add_argument(
        "--seq-start",
        type=int,
        default=1,
        help="序号起始值 (默认: 1)",
    )
    seq_group.add_argument(
        "--seq-width",
        type=int,
        default=3,
        help="序号宽度 (默认: 3, 即 001, 002, ...)",
    )

    # 元数据
    meta_group = parser.add_argument_group("元数据重命名")
    meta_group.add_argument(
        "--metadata",
        action="store_true",
        dest="use_metadata",
        help="使用文件元数据重命名",
    )
    meta_group.add_argument(
        "--meta-type",
        choices=["created", "modified", "accessed", "size", "size_bytes"],
        default="created",
        help="元数据类型 (默认: created)",
    )
    meta_group.add_argument(
        "--meta-format",
        default="%Y-%m-%d",
        help="日期格式 (默认: %%Y-%%m-%%d)",
    )

    # 大小写转换
    case_group = parser.add_argument_group("大小写转换")
    case_group.add_argument(
        "--case",
        choices=["upper", "lower", "title", "capitalize"],
        default="",
        dest="case_transform",
        help="文件名大小写转换",
    )

    # 整理
    organize_group = parser.add_argument_group("文件整理")
    organize_group.add_argument(
        "--organize",
        action="store_true",
        dest="organize_by_date",
        help="按日期整理到子目录",
    )
    organize_group.add_argument(
        "--organize-format",
        default="%Y/%m/%d",
        help="整理目录格式 (默认: %%Y/%%m/%%d)",
    )

    # 冲突处理
    conflict_group = parser.add_argument_group("冲突处理")
    conflict_group.add_argument(
        "--conflict",
        choices=["number", "overwrite", "skip"],
        default="number",
        dest="conflict_strategy",
        help="目标文件已存在时的处理策略 (默认: number)",
    )

    # CSV 映射
    csv_group = parser.add_argument_group("CSV映射")
    csv_group.add_argument(
        "--csv",
        default="",
        dest="csv_file",
        help="从CSV文件读取重命名映射 (格式: 原文件名,新文件名)",
    )

    # 执行模式
    mode_group = parser.add_argument_group("执行模式")
    mode_group.add_argument(
        "--dry-run",
        action="store_true",
        help="模拟运行，显示操作但不实际修改",
    )
    mode_group.add_argument(
        "--preview",
        action="store_true",
        help="预览模式，显示对照表后需用户确认",
    )

    # 日志和撤销
    log_group = parser.add_argument_group("日志和撤销")
    log_group.add_argument(
        "--log",
        default="",
        dest="log_file",
        help="操作日志文件路径",
    )
    log_group.add_argument(
        "--save-undo",
        default="",
        dest="undo_file",
        help="保存撤销信息到指定文件",
    )
    log_group.add_argument(
        "--undo",
        default="",
        dest="undo_file_input",
        help="从指定文件撤销操作",
    )

    return parser


# ==============================================================================
# 主函数
# ==============================================================================

def main():
    """主函数"""
    parser = create_parser()

    if len(sys.argv) == 1:
        parser.print_help()
        return

    args = parser.parse_args()

    if args.undo_file_input:
        config = RenameConfig()
        renamer = FileRenamer(config)
        success, fail = renamer.undo_from_file(args.undo_file_input)
        print_summary(success, fail)
        return

    config = RenameConfig(
        directory=args.directory,
        recursive=args.recursive,
        extensions=args.extensions,
        exclude_extensions=args.exclude_extensions,
        exclude_patterns=args.exclude_patterns,
        prefix=args.prefix,
        suffix=args.suffix,
        delete_start=args.delete_start,
        delete_end=args.delete_end,
        replace_old=args.replace_old,
        replace_new=args.replace_new,
        regex_pattern=args.regex_pattern,
        regex_replacement=args.regex_replacement,
        use_sequencing=args.use_sequencing,
        seq_start=args.seq_start,
        seq_width=args.seq_width,
        use_metadata=args.use_metadata,
        metadata_type=args.meta_type,
        metadata_format=args.meta_format,
        case_transform=args.case_transform,
        organize_by_date=args.organize_by_date,
        organize_format=args.organize_format,
        conflict_strategy=args.conflict_strategy,
        dry_run=args.dry_run,
        preview=args.preview,
        csv_file=args.csv_file,
        log_file=args.log_file,
        undo_file=args.undo_file,
    )

    if not any([
        config.prefix, config.suffix,
        config.delete_start is not None, config.delete_end is not None,
        config.replace_old, config.regex_pattern,
        config.use_sequencing, config.use_metadata,
        config.case_transform, config.organize_by_date,
        config.csv_file,
    ]):
        print("错误: 请指定至少一个重命名规则")
        print("使用 --help 查看所有可用选项")
        return

    renamer = FileRenamer(config)
    operations = renamer.plan_operations()

    if not operations:
        print("没有匹配的文件需要重命名。")
        return

    print_operations(operations)

    should_execute = True
    if config.preview:
        should_execute = confirm_execution()

    if not should_execute:
        print("操作已取消。")
        return

    if config.dry_run:
        print_summary(len(operations), 0, dry_run=True)
    else:
        if not config.undo_file:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            config.undo_file = f"undo_{timestamp}.json"

        success, fail = renamer.execute_operations(operations)
        print_summary(success, fail)


if __name__ == "__main__":
    main()
