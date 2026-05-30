#!/usr/bin/env python3
import os
import sys
import argparse

from file_scanner import get_conversion_tasks, find_heic_files
from batch_converter import batch_convert
from converter import convert_heic_to_jpg
from folder_watcher import FolderWatcher


def valid_quality(value):
    ivalue = int(value)
    if ivalue < 1 or ivalue > 100:
        raise argparse.ArgumentTypeError(f"质量必须在 1-100 之间: {value}")
    return ivalue


def valid_threads(value):
    ivalue = int(value)
    if ivalue < 1:
        raise argparse.ArgumentTypeError(f"线程数必须大于等于 1: {value}")
    return ivalue


def valid_max_size(value):
    ivalue = int(value)
    if ivalue < 100:
        raise argparse.ArgumentTypeError(f"最大尺寸必须大于等于 100px: {value}")
    return ivalue


def build_parser():
    parser = argparse.ArgumentParser(
        prog='heic2jpg',
        description='批量将 HEIC 图片转换为 JPG 格式的命令行工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 转换单个文件
  heic2jpg -i photo.heic

  # 转换整个目录（递归）
  heic2jpg -i /path/to/heic_folder

  # 指定输出目录并保留目录结构
  heic2jpg -i /path/to/input -o /path/to/output

  # 预览模式（只显示要转换的文件）
  heic2jpg -i /path/to/input --preview

  # 设置质量为85，删除原文件，使用8线程
  heic2jpg -i /path/to/input -q 85 -d -t 8

  # 限制最大宽度为2000px，添加日期水印
  heic2jpg -i /path/to/input --max-size 2000 --watermark-date

  # 监控文件夹，自动转换新加入的文件
  heic2jpg -i /path/to/input --watch
        """
    )

    parser.add_argument('-i', '--input', required=True,
                        help='输入文件或目录路径')
    parser.add_argument('-o', '--output', default=None,
                        help='输出目录路径（默认: 与输入文件同目录）')
    parser.add_argument('-q', '--quality', type=valid_quality, default=90,
                        help='JPG 输出质量 (1-100，默认: 90)')
    parser.add_argument('-d', '--delete-original', action='store_true',
                        help='转换成功后删除原 HEIC 文件')
    parser.add_argument('-t', '--threads', type=valid_threads, default=4,
                        help='多线程转换的线程数（默认: 4，1表示单线程）')
    parser.add_argument('--max-size', type=valid_max_size, default=None,
                        help='限制图片最大尺寸（等比缩放，例如 2000 表示最大边不超过2000px）')
    parser.add_argument('--no-rotate', action='store_true',
                        help='禁用根据 EXIF 自动旋转图片')
    parser.add_argument('--no-recursive', action='store_true',
                        help='不递归查找子目录中的文件')
    parser.add_argument('--no-structure', action='store_true',
                        help='不保留目录结构，所有文件输出到同一目录')
    parser.add_argument('--preview', action='store_true',
                        help='预览模式，只显示将要转换的文件列表，不实际转换')
    parser.add_argument('--report', default=None,
                        help='生成转换报告的 JSON 文件路径')
    parser.add_argument('--watch', action='store_true',
                        help='监控文件夹模式，常驻进程自动转换新加入的文件')
    parser.add_argument('--watermark', default=None,
                        help='添加文字水印（例如 "版权所有"）')
    parser.add_argument('--watermark-date', action='store_true',
                        help='添加拍摄日期作为水印（优先使用EXIF日期，否则用当前日期）')
    parser.add_argument('--watermark-position',
                        choices=['top-left', 'top-right', 'bottom-left', 'bottom-right'],
                        default='bottom-right',
                        help='水印位置（默认: bottom-right）')
    parser.add_argument('-s', '--silent', action='store_true',
                        help='静默模式，减少输出信息')

    return parser


def show_preview(tasks):
    print(f"找到 {len(tasks)} 个待转换文件:\n")
    for i, (input_path, output_path) in enumerate(tasks, 1):
        print(f"{i:3d}. {input_path}")
        print(f"     -> {output_path}")
    print(f"\n总计: {len(tasks)} 个文件")
    if len(tasks) > 0:
        print(f"输出目录: {os.path.dirname(tasks[0][1]) if len(tasks) == 1 else '按目录结构输出'}")


def main():
    parser = build_parser()
    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    output_dir = os.path.abspath(args.output) if args.output else None

    if not os.path.exists(input_path):
        print(f"错误: 输入路径不存在: {input_path}", file=sys.stderr)
        sys.exit(1)

    convert_options = {
        'quality': args.quality,
        'delete_original': args.delete_original,
        'max_size': args.max_size,
        'auto_rotate': not args.no_rotate,
        'watermark': args.watermark,
        'watermark_date': args.watermark_date,
        'watermark_position': args.watermark_position,
    }

    if args.watch:
        if not os.path.isdir(input_path):
            print("错误: 监控模式必须指定目录", file=sys.stderr)
            sys.exit(1)
        watcher = FolderWatcher(
            input_path,
            output_dir=output_dir,
            recursive=not args.no_recursive,
            preserve_structure=not args.no_structure,
            convert_options=convert_options
        )
        watcher.run_forever()
        return

    if os.path.isfile(input_path):
        if output_dir:
            output_file = os.path.join(output_dir, os.path.splitext(os.path.basename(input_path))[0] + '.jpg')
        else:
            output_file = None
        if args.preview:
            out_path = output_file or os.path.splitext(input_path)[0] + '.jpg'
            print(f"待转换文件:\n  {input_path}\n  -> {out_path}")
            return
        try:
            result = convert_heic_to_jpg(
                input_path,
                output_path=output_file,
                **convert_options
            )
            print(f"✓ 转换成功: {input_path} -> {result}")
        except Exception as e:
            print(f"✗ 转换失败: {e}", file=sys.stderr)
            sys.exit(1)
        return

    recursive = not args.no_recursive
    preserve_structure = not args.no_structure

    tasks = get_conversion_tasks(
        input_path,
        output_dir=output_dir,
        preserve_structure=preserve_structure,
        recursive=recursive
    )

    if len(tasks) == 0:
        print("未找到任何 HEIC 文件")
        return

    if args.preview:
        show_preview(tasks)
        return

    print(f"开始转换，共 {len(tasks)} 个文件，使用 {args.threads} 线程\n")

    report = batch_convert(
        tasks,
        convert_options,
        max_workers=args.threads,
        verbose=not args.silent
    )

    report.print_summary()

    if args.report:
        report.save_json(os.path.abspath(args.report))

    if report.failed_count > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
