#!/usr/bin/env python3
import argparse
import sys
import os
import json

from .analyzer import analyze_text, print_analysis_result
from .similarity import compare_texts
from .export import export_report
from .batch import batch_analyze, export_batch_summary_to_txt
from .stopwords_manager import get_available_stopwords


def get_input_text(args):
    if args.file:
        if not os.path.exists(args.file):
            print(f"错误: 文件不存在: {args.file}", file=sys.stderr)
            sys.exit(1)
        with open(args.file, 'r', encoding='utf-8') as f:
            return f.read()
    elif args.text:
        return args.text
    else:
        print("提示: 请输入要分析的文本（按 Ctrl+D 或 Ctrl+Z 结束输入）:")
        lines = []
        try:
            for line in sys.stdin:
                lines.append(line)
        except EOFError:
            pass
        return ''.join(lines)


def cmd_analyze(args):
    text = get_input_text(args)
    
    if not text.strip():
        print("错误: 输入文本为空", file=sys.stderr)
        sys.exit(1)
    
    stopwords_lang = args.stopwords if args.stopwords else 'english'
    
    try:
        result = analyze_text(text, stopwords_language=stopwords_lang)
    except ValueError as e:
        print(f"错误: {e}", file=sys.stderr)
        available = get_available_stopwords()
        print(f"可用的停用词表: {available}", file=sys.stderr)
        sys.exit(1)
    
    print_analysis_result(result)
    
    if args.export:
        export_format = args.format if args.format else 'txt'
        try:
            exported_path = export_report(result, args.export, export_format)
            print(f"\n报告已导出到: {exported_path}")
        except ValueError as e:
            print(f"导出错误: {e}", file=sys.stderr)
            sys.exit(1)


def cmd_compare(args):
    if args.file1 and args.file2:
        if not os.path.exists(args.file1):
            print(f"错误: 文件1不存在: {args.file1}", file=sys.stderr)
            sys.exit(1)
        if not os.path.exists(args.file2):
            print(f"错误: 文件2不存在: {args.file2}", file=sys.stderr)
            sys.exit(1)
        with open(args.file1, 'r', encoding='utf-8') as f:
            text1 = f.read()
        with open(args.file2, 'r', encoding='utf-8') as f:
            text2 = f.read()
    elif args.text1 and args.text2:
        text1 = args.text1
        text2 = args.text2
    else:
        print("错误: 请提供两段文本进行比较（使用 --file1/--file2 或 --text1/--text2）", file=sys.stderr)
        sys.exit(1)
    
    method = args.method if args.method else 'cosine'
    
    try:
        result = compare_texts(text1, text2, method=method)
    except ValueError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)
    
    print('=' * 60)
    print('文本相似度分析')
    print('=' * 60)
    print()
    print(f'相似度算法: {result["method"]}')
    print(f'相似度: {result["similarity_percentage"]}%')
    print(f'结果说明: {result["interpretation"]}')
    print()
    print('=' * 60)
    
    if args.export:
        export_format = args.format if args.format else 'txt'
        export_data = {'similarity': result}
        try:
            exported_path = export_report(export_data, args.export, export_format)
            print(f"\n报告已导出到: {exported_path}")
        except ValueError as e:
            print(f"导出错误: {e}", file=sys.stderr)
            sys.exit(1)


def cmd_batch(args):
    folder = args.folder
    stopwords_lang = args.stopwords if args.stopwords else 'english'
    
    try:
        result = batch_analyze(folder, stopwords_language=stopwords_lang)
    except (FileNotFoundError, NotADirectoryError) as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)
    
    print('=' * 60)
    print('批量文本分析')
    print('=' * 60)
    print()
    print(f'分析文件夹: {result["folder_path"]}')
    print(f'发现TXT文件数: {result["total_files"]}')
    print()
    
    if result['total_files'] == 0:
        print("警告: 文件夹中没有找到TXT文件")
        return
    
    summary = result['summary']
    if summary:
        print('【汇总统计】')
        print('-' * 40)
        print(f'有效分析文件数: {summary["total_valid_files"]}')
        print(f'总字符数(不含空格): {summary["total_chars_no_space"]}')
        print(f'总英文单词数: {summary["total_english_words"]}')
        print(f'总汉字数: {summary["total_chinese_chars"]}')
        print(f'总行数: {summary["total_lines"]}')
        print(f'总句子数: {summary["total_sentences"]}')
        print(f'平均Flesch阅读难度: {summary["avg_flesch_score"]}')
        print(f'平均情感得分: {summary["avg_sentiment_score"]}')
        print()
        
        print('【文件对比表格】')
        print('-' * 80)
        header = f'{"文件名":<25} {"字符":>8} {"单词":>6} {"汉字":>6} {"行":>5} {"句子":>6} {"Flesch":>8} {"情感":>8}'
        print(header)
        print('-' * 80)
        for row in summary['comparison_table']:
            line = f'{row["file_name"][:22]:<25} {row["chars"]:>8} {row["words"]:>6} {row["chinese"]:>6} {row["lines"]:>5} {row["sentences"]:>6} {row["flesch_score"]:>8} {row["sentiment"]:>8}'
            print(line)
        print()
    
    if args.export:
        try:
            exported_path = export_batch_summary_to_txt(result, args.export)
            print(f"\n汇总报告已导出到: {exported_path}")
        except Exception as e:
            print(f"导出错误: {e}", file=sys.stderr)
            sys.exit(1)
    
    if args.export_all:
        for file_result in result['files']:
            if 'analysis' in file_result:
                base_name = os.path.splitext(file_result['file_name'])[0]
                export_path = os.path.join(args.export_all, f'{base_name}_analysis')
                try:
                    exported_path = export_report(file_result['analysis'], export_path, 'txt')
                    print(f"已导出: {exported_path}")
                except Exception as e:
                    print(f"导出 {file_result['file_name']} 时出错: {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        prog='text-analyzer',
        description='功能强大的Python命令行文本统计与分析工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  # 分析文本文件
  text-analyzer analyze -f sample.txt
  
  # 直接输入文本分析
  text-analyzer analyze -t "Hello world, this is a test text."
  
  # 使用中文停用词表分析中文文本
  text-analyzer analyze -f chinese.txt --stopwords chinese
  
  # 导出分析结果为JSON
  text-analyzer analyze -f sample.txt --export result --format json
  
  # 比较两段文本的相似度
  text-analyzer compare --text1 "Hello world" --text2 "Hello there" --method cosine
  
  # 比较两个文件的相似度
  text-analyzer compare --file1 a.txt --file2 b.txt --method jaccard
  
  # 批量分析文件夹中的所有TXT文件
  text-analyzer batch --folder ./documents --export summary.txt
        '''
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    analyze_parser = subparsers.add_parser('analyze', help='分析单篇文本')
    input_group = analyze_parser.add_mutually_exclusive_group()
    input_group.add_argument('-f', '--file', help='要分析的文本文件路径')
    input_group.add_argument('-t', '--text', help='直接输入要分析的文本')
    analyze_parser.add_argument('-s', '--stopwords', help=f'停用词表语言 (可用: {get_available_stopwords()}, 默认: english)')
    analyze_parser.add_argument('-e', '--export', help='导出报告的文件路径（不含扩展名）')
    analyze_parser.add_argument('--format', choices=['txt', 'json'], help='导出格式 (默认: txt)')
    
    compare_parser = subparsers.add_parser('compare', help='比较两段文本的相似度')
    file_group = compare_parser.add_argument_group('文件输入')
    file_group.add_argument('--file1', help='第一个文本文件路径')
    file_group.add_argument('--file2', help='第二个文本文件路径')
    text_group = compare_parser.add_argument_group('文本输入')
    text_group.add_argument('--text1', help='第一段文本')
    text_group.add_argument('--text2', help='第二段文本')
    compare_parser.add_argument('-m', '--method', choices=['cosine', 'jaccard'], help='相似度算法 (默认: cosine)')
    compare_parser.add_argument('-e', '--export', help='导出报告的文件路径（不含扩展名）')
    compare_parser.add_argument('--format', choices=['txt', 'json'], help='导出格式 (默认: txt)')
    
    batch_parser = subparsers.add_parser('batch', help='批量分析文件夹中的TXT文件')
    batch_parser.add_argument('--folder', required=True, help='包含TXT文件的文件夹路径')
    batch_parser.add_argument('-s', '--stopwords', help=f'停用词表语言 (可用: {get_available_stopwords()}, 默认: english)')
    batch_parser.add_argument('-e', '--export', help='导出汇总报告的文件路径')
    batch_parser.add_argument('--export-all', help='导出每个文件的单独分析报告到此目录')
    
    args = parser.parse_args()
    
    if args.command == 'analyze':
        cmd_analyze(args)
    elif args.command == 'compare':
        cmd_compare(args)
    elif args.command == 'batch':
        cmd_batch(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
