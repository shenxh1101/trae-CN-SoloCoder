"""
命令行接口模块
"""
import os
import sys
import argparse
import getpass
import json
from typing import Optional

from .splitter import FileSplitter
from .merger import FileMerger
from .index import IndexManager
from .recovery_script import RecoveryScriptGenerator
from .checksum import calculate_md5
from . import __version__


def print_progress(processed: int, total: int) -> None:
    """打印进度条"""
    if total == 0:
        return
    progress = (processed / total) * 100
    bar_length = 50
    filled = int(bar_length * processed / total)
    bar = '=' * filled + '-' * (bar_length - filled)
    processed_mb = processed / (1024 * 1024)
    total_mb = total / (1024 * 1024)
    sys.stdout.write(f'\r进度: [{bar}] {progress:.1f}% ({processed_mb:.2f}/{total_mb:.2f} MB)')
    sys.stdout.flush()
    if processed >= total:
        print()


def get_password(confirm: bool = False) -> str:
    """获取密码"""
    while True:
        password = getpass.getpass("请输入密码: ")
        if confirm:
            password2 = getpass.getpass("请再次输入密码: ")
            if password != password2:
                print("两次输入的密码不一致，请重试")
                continue
        if not password:
            print("密码不能为空")
            continue
        return password


def cmd_split(args) -> int:
    """分片命令处理"""
    print(f"正在分片文件: {args.file}")
    print(f"分片大小: {args.size} MB")
    print(f"输出目录: {args.output or '原文件目录'}")
    print(f"分片扩展名: {args.extension}")
    print(f"加密类型: {args.encryption}")
    
    password = None
    if args.encryption != 'none':
        password = get_password(confirm=True)
    
    try:
        splitter = FileSplitter(
            file_path=args.file,
            chunk_size_mb=args.size,
            output_dir=args.output,
            chunk_extension=args.extension,
            encryption_type=args.encryption,
            password=password,
            progress_callback=print_progress
        )
        
        index_path, chunk_count = splitter.split()
        
        print()
        print(f"分片完成！")
        print(f"分片数量: {chunk_count}")
        print(f"索引文件: {index_path}")
        
        if args.generate_script:
            print()
            print("正在生成恢复脚本...")
            script_gen = RecoveryScriptGenerator(splitter.get_index_manager())
            script_dir = args.output or os.path.dirname(os.path.abspath(args.file))
            base_name = os.path.splitext(os.path.basename(args.file))[0] + '_recover'
            scripts = script_gen.generate_all(
                output_dir=script_dir,
                base_name=base_name,
                password=password if args.include_password else None,
                require_password=not args.include_password
            )
            print(f"Windows脚本: {scripts['windows']}")
            print(f"Unix脚本: {scripts['unix']}")
            print(f"Python脚本: {scripts['python']}")
        
        return 0
    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        return 1


def cmd_merge(args) -> int:
    """合并命令处理"""
    print(f"正在合并文件")
    
    password = None
    
    if args.index:
        print(f"索引文件: {args.index}")
        merger = FileMerger(
            index_file_path=args.index,
            output_path=args.output,
            verify_integrity=not args.no_verify,
            resume=not args.no_resume,
            progress_callback=print_progress
        )
        
        index_data = merger.index_manager.index_data
        encryption_type = index_data.get('encryption_type', 'none')
        if encryption_type != 'none' and encryption_type:
            print(f"检测到加密类型: {encryption_type}")
            password = get_password(confirm=False)
            merger.password = password
        
        if args.range:
            start, end = args.range
            print(f"合并范围: 分片 {start} 到 {end}")
            try:
                output_path, count = merger.merge_range(start, end, args.output)
                print()
                print(f"范围合并完成！")
                print(f"合并分片数: {count}")
                print(f"输出文件: {output_path}")
                return 0
            except Exception as e:
                print(f"错误: {str(e)}", file=sys.stderr)
                return 1
        else:
            try:
                output_path, verified = merger.merge()
                print()
                print(f"合并完成！")
                print(f"输出文件: {output_path}")
                print(f"完整性验证: {'通过' if verified else '失败'}")
                return 0
            except Exception as e:
                print(f"错误: {str(e)}", file=sys.stderr)
                return 1
    
    elif args.text:
        print(f"分片列表文件: {args.text}")
        if not args.output:
            print("错误: 使用--output参数是必须的")
            return 1
        
        merger = FileMerger(
            output_path=args.output,
            verify_integrity=not args.no_verify,
            progress_callback=print_progress
        )
        
        try:
            merger.load_chunks_from_text(args.text, args.output)
            output_path, verified = merger.merge()
            print()
            print(f"合并完成！")
            print(f"输出文件: {output_path}")
            return 0
        except Exception as e:
            print(f"错误: {str(e)}", file=sys.stderr)
            return 1
    
    else:
        print("错误: 必须指定 --index 或 --text 参数")
        return 1


def cmd_verify(args) -> int:
    """验证命令处理"""
    if not args.index:
        print("错误: 必须指定 --index 参数")
        return 1
    
    print(f"正在验证分片完整性")
    print(f"索引文件: {args.index}")
    
    try:
        merger = FileMerger(index_file_path=args.index)
        results = merger.verify_all_chunks()
        
        print()
        print(f"{'序号':<6}{'文件名':<30}{'状态':<10}{'大小':<10}")
        print("-" * 70)
        
        all_valid = True
        for result in results:
            status = '✓ 有效' if result['valid'] else '✗ 无效'
            if not result['exists']:
                status = '✗ 缺失'
            size_mb = result['size'] / (1024 * 1024)
            print(f"{result['index']:<6}{result['filename']:<30}{status:<10}{size_mb:.2f} MB")
            if not result['valid'] or not result['exists']:
                all_valid = False
        
        print()
        if all_valid:
            print("所有分片验证通过！")
            return 0
        else:
            print("部分分片验证失败！")
            return 1
            
    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        return 1


def cmd_export(args) -> int:
    """导出命令处理"""
    if not args.index:
        print("错误: 必须指定 --index 参数")
        return 1
    
    print(f"正在导出索引信息")
    print(f"索引文件: {args.index}")
    print(f"导出文件: {args.output}")
    
    try:
        index_manager = IndexManager()
        index_manager.load(args.index)
        index_manager.export_json(args.output)
        
        print()
        print(f"导出完成！")
        
        if args.chunks_list:
            chunks_file = os.path.splitext(args.output)[0] + '_chunks.txt'
            with open(chunks_file, 'w', encoding='utf-8') as f:
                for chunk in index_manager.index_data['chunks']:
                    f.write(chunk['filename'] + '\n')
            print(f"分片列表: {chunks_file}")
        
        return 0
    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        return 1


def cmd_info(args) -> int:
    """查看索引信息命令处理"""
    if not args.index:
        print("错误: 必须指定 --index 参数")
        return 1
    
    try:
        index_manager = IndexManager()
        index_manager.load(args.index)
        data = index_manager.index_data
        
        print("=" * 60)
        print("  索引文件信息")
        print("=" * 60)
        print(f"原始文件: {data['original_file']}")
        print(f"原始大小: {data['original_size']} 字节 ({data['original_size'] / (1024*1024):.2f} MB")
        print(f"原始MD5: {data['original_md5']}")
        print(f"分片大小: {data['chunk_size_mb']} MB")
        print(f"分片数量: {data['total_chunks']}")
        print(f"加密类型: {data['encryption_type']}")
        print(f"分片扩展名: {data['chunk_extension']}")
        print(f"创建时间: {data.get('created_at', 'N/A')}")
        print()
        print("分片列表:")
        print(f"{'序号':<6}{'文件名':<35}{'大小':<15}{'MD5'}")
        print("-" * 80)
        for chunk in data['chunks']:
            size_mb = chunk['size'] / (1024 * 1024)
            print(f"{chunk['index']:<6}{chunk['filename']:<35}{size_mb:.2f} MB{chunk.get('md5', '')[:16]}...")
        
        progress = data.get('merge_progress', {})
        if progress:
            print()
            print("合并进度:")
            print(f"  当前分片: {progress.get('current_chunk', 0)} / {data['total_chunks']}")
            print(f"  已写入: {progress.get('bytes_written', 0)} 字节")
            print(f"  完成状态: {'已完成' if progress.get('completed', False) else '未完成'}")
        
        return 0
    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        return 1


def cmd_script(args) -> int:
    """生成恢复脚本命令处理"""
    if not args.index:
        print("错误: 必须指定 --index 参数")
        return 1
    
    print(f"正在生成恢复脚本")
    print(f"索引文件: {args.index}")
    print(f"输出目录: {args.output}")
    
    password = None
    if args.include_password:
        password = get_password(confirm=False)
    
    try:
        index_manager = IndexManager()
        index_manager.load(args.index)
        
        script_gen = RecoveryScriptGenerator(index_manager)
        base_name = args.name or 'recover'
        
        if args.type == 'all':
            scripts = script_gen.generate_all(
                output_dir=args.output,
                base_name=base_name,
                password=password,
                require_password=not args.include_password
            )
            print()
            print("生成的脚本:")
            print(f"  Windows: {scripts['windows']}")
            print(f"  Unix/Linux/Mac: {scripts['unix']}")
            print(f"  Python: {scripts['python']}")
        elif args.type == 'windows':
            path = script_gen.generate_windows_batch(
                os.path.join(args.output, f'{base_name}.bat'),
                password=password,
                require_password=not args.include_password
            )
            print(f"Windows脚本: {path}")
        elif args.type == 'unix':
            path = script_gen.generate_unix_shell(
                os.path.join(args.output, f'{base_name}.sh'),
                password=password,
                require_password=not args.include_password
            )
            print(f"Unix脚本: {path}")
        elif args.type == 'python':
            path = script_gen.generate_python_script(
                os.path.join(args.output, f'{base_name}.py'),
                password=password,
                require_password=not args.include_password
            )
            print(f"Python脚本: {path}")
        
        return 0
    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        return 1


def parse_range(value: str) -> tuple:
    """解析范围参数"""
    try:
        parts = value.split('-')
        if len(parts) != 2:
            raise ValueError
        start = int(parts[0])
        end = int(parts[1])
        if start < 1 or end < start:
            raise ValueError
        return (start, end)
    except ValueError:
        raise argparse.ArgumentTypeError(f"范围格式不正确，应为 'start-end'，如 '1-5'")


def main() -> int:
    """主入口函数"""
    parser = argparse.ArgumentParser(
        prog='file-splitter',
        description='文件分片合并工具 - 支持加密、断点续传、MD5校验等功能',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 分片文件，每个分片10MB，使用AES加密
  file-splitter split -f large_file.zip -s 10 -e aes

  # 合并分片
  file-splitter merge -i large_file.index.json

  # 合并分片1-5（部分恢复）
  file-splitter merge -i large_file.index.json -r 1-5 -o partial_file.zip

  # 从文本文件读取分片列表合并
  file-splitter merge -t chunks.txt -o restored_file.zip

  # 验证分片完整性
  file-splitter verify -i large_file.index.json

  # 查看索引信息
  file-splitter info -i large_file.index.json

  # 导出索引为JSON
  file-splitter export -i large_file.index.json -o index_export.json

  # 生成恢复脚本
  file-splitter script -i large_file.index.json -o ./scripts -t all
        """
    )
    
    parser.add_argument('--version', action='version', version=f'%(prog)s {__version__}')
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # 分片命令
    split_parser = subparsers.add_parser('split', help='将文件分片')
    split_parser.add_argument('-f', '--file', required=True, help='要分片的文件路径')
    split_parser.add_argument('-s', '--size', type=int, required=True, help='每个分片的大小（MB）')
    split_parser.add_argument('-o', '--output', help='输出目录（默认原文件所在目录')
    split_parser.add_argument('-e', '--extension', default='part', help='分片文件扩展名（默认: part）')
    split_parser.add_argument('-c', '--encryption', default='none',
                         choices=['none', 'xor', 'aes'], help='加密类型（默认: none）')
    split_parser.add_argument('--generate-script', action='store_true', help='同时生成恢复脚本')
    split_parser.add_argument('--include-password', action='store_true', help='在恢复脚本中包含密码（不安全）')
    
    # 合并命令
    merge_parser = subparsers.add_parser('merge', help='合并分片文件')
    merge_parser.add_argument('-i', '--index', help='索引文件路径')
    merge_parser.add_argument('-t', '--text', help='分片列表文本文件路径')
    merge_parser.add_argument('-o', '--output', help='输出文件路径')
    merge_parser.add_argument('-r', '--range', type=parse_range, help='合并指定范围的分片，格式: start-end')
    merge_parser.add_argument('--no-verify', action='store_true', help='跳过完整性验证')
    merge_parser.add_argument('--no-resume', action='store_true', help='不使用断点续传，从头开始合并')
    
    # 验证命令
    verify_parser = subparsers.add_parser('verify', help='验证分片完整性')
    verify_parser.add_argument('-i', '--index', required=True, help='索引文件路径')
    
    # 导出命令
    export_parser = subparsers.add_parser('export', help='导出索引信息为JSON')
    export_parser.add_argument('-i', '--index', required=True, help='索引文件路径')
    export_parser.add_argument('-o', '--output', required=True, help='导出文件路径')
    export_parser.add_argument('--chunks-list', action='store_true', help='同时导出行格式的分片列表')
    
    # 查看信息命令
    info_parser = subparsers.add_parser('info', help='查看索引文件信息')
    info_parser.add_argument('-i', '--index', required=True, help='索引文件路径')
    
    # 生成脚本命令
    script_parser = subparsers.add_parser('script', help='生成恢复脚本')
    script_parser.add_argument('-i', '--index', required=True, help='索引文件路径')
    script_parser.add_argument('-o', '--output', required=True, help='输出目录')
    script_parser.add_argument('-n', '--name', help='脚本基础名称（默认: recover）')
    script_parser.add_argument('-t', '--type', default='all',
                                choices=['all', 'windows', 'unix', 'python'],
                                help='脚本类型（默认: all）')
    script_parser.add_argument('--include-password', action='store_true',
                                help='在脚本中包含密码（不安全）')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    commands = {
        'split': cmd_split,
        'merge': cmd_merge,
        'verify': cmd_verify,
        'export': cmd_export,
        'info': cmd_info,
        'script': cmd_script,
    }
    
    return commands[args.command](args)


if __name__ == '__main__':
    sys.exit(main())
