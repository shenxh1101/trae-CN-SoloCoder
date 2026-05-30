#!/usr/bin/env python3
import argparse
import os
import sys
import logging

from parser import MeetingParser
from llm_client import LLMClient, LLMCallError
from summarizer import MeetingSummarizer, SimpleSummarizer, merge_summary_with_stats
from output_formatter import OutputFormatter
from feedback import FeedbackManager
from batch_processor import BatchProcessor
from calendar_generator import CalendarGenerator
from config import Config


def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                  AI 会议发言总结工具                          ║
║           智能提取观点、共识、待办事项和时间节点               ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)


def process_single_file(args):
    print(f"处理文件: {args.input}")
    
    parser = MeetingParser(ignore_fillers=not args.no_ignore_fillers)
    utterances = parser.parse_file(args.input)
    
    print(f"  ✓ 解析完成，共 {len(utterances)} 条发言")
    print(f"  ✓ 参会人员: {', '.join(set(u.speaker for u in utterances))}")
    
    llm_client = LLMClient(timeout=args.timeout)
    use_llm = llm_client.is_available() and not args.no_llm
    
    if use_llm:
        print(f"  ✓ 使用 AI 模型: {llm_client.model}")
        if llm_client.base_url:
            print(f"  ✓ API 地址: {llm_client.base_url}")
        summarizer = MeetingSummarizer(llm_client)
        try:
            summary = summarizer.execute(utterances, parser)
            print(f"  ✓ AI总结完成")
        except LLMCallError as e:
            print(f"  ✗ AI总结失败: {e}")
            print(f"  ↻ 降级为关键词提取模式...")
            simple_summarizer = SimpleSummarizer()
            summary = {
                "summary_by_speaker": {},
                "meeting_consensus": [],
                "todo_items": simple_summarizer.extract_todo_simple(utterances),
                "time_events": simple_summarizer.extract_time_events_simple(utterances),
                "overall_summary": f"(AI总结失败，已降级为关键词提取模式。错误: {e})"
            }
    else:
        if not llm_client.is_available():
            error_detail = llm_client.get_last_error() or "未配置API Key"
            print(f"  ⚠  LLM不可用: {error_detail}")
        print("  ⚠  使用关键词提取模式")
        simple_summarizer = SimpleSummarizer()
        summary = {
            "summary_by_speaker": {},
            "meeting_consensus": [],
            "todo_items": simple_summarizer.extract_todo_simple(utterances),
            "time_events": simple_summarizer.extract_time_events_simple(utterances),
            "overall_summary": "(关键词提取模式，请配置 OPENAI_API_KEY 启用 AI 总结)"
        }
    
    stats = parser.get_speaker_stats(utterances)
    metadata = parser.get_meeting_metadata(utterances, os.path.basename(args.input))
    
    result = merge_summary_with_stats(summary, stats, metadata)
    
    output_format = args.format or "markdown"
    if output_format == "json":
        content = OutputFormatter.to_json(result)
        ext = ".json"
        is_binary = False
    elif output_format == "excel":
        ext = ".xlsx"
        is_binary = True
    elif output_format == "markdown":
        content = OutputFormatter.to_markdown(result)
        ext = ".md"
        is_binary = False
    else:
        content = OutputFormatter.to_plain_text(result)
        ext = ".txt"
        is_binary = False
    
    if not is_binary:
        print(content)
    
    if args.output:
        output_file = args.output
        if not output_file.endswith(ext):
            output_file = os.path.splitext(output_file)[0] + ext
        
        if output_format == "excel":
            OutputFormatter.to_excel(result, output_file)
        else:
            OutputFormatter.save_to_file(content, output_file)
        print(f"\n✓ 结果已保存到: {output_file}")
    
    if args.ics:
        try:
            cal_generator = CalendarGenerator()
            ics_file = args.ics
            if not ics_file.endswith(".ics"):
                ics_file += ".ics"
            
            events = result.get("time_events", [])
            todos = result.get("todo_items", [])
            
            all_events = events + [
                {"event": f"待办: {t.get('task', '')}", 
                 "time": t.get('deadline', ''),
                 "original_text": t.get('task', '')}
                for t in todos if t.get('deadline')
            ]
            
            cal_generator.generate_ics_from_events(all_events, ics_file)
            print(f"✓ 日历文件已保存到: {ics_file}")
        except ImportError as e:
            print(f"⚠  无法生成日历: {e}")
    
    if args.feedback:
        feedback_manager = FeedbackManager()
        if args.rating:
            meeting_id = feedback_manager.save_feedback(result, args.rating, args.comment or "")
            print(f"\n✓ 反馈已保存！评分: {args.rating}, 反馈ID: {meeting_id}")
        else:
            feedback_manager.collect_feedback_interactive(result)
    
    return result


def process_batch(args):
    print(f"批量处理目录: {args.input_dir}")
    
    llm_client = LLMClient(timeout=args.timeout)
    use_llm = llm_client.is_available() and not args.no_llm
    
    if use_llm:
        print(f"  ✓ 使用 AI 模型: {llm_client.model}")
        if llm_client.base_url:
            print(f"  ✓ API 地址: {llm_client.base_url}")
    else:
        if not llm_client.is_available():
            error_detail = llm_client.get_last_error() or "未配置API Key"
            print(f"  ⚠  LLM不可用: {error_detail}")
        print("  ⚠  使用关键词提取模式")
    
    processor = BatchProcessor(llm_client, use_llm=use_llm)
    
    output_dir = args.output_dir or "batch_output"
    results = processor.process_directory(
        args.input_dir, 
        output_dir, 
        args.format or "markdown",
        workers=args.workers
    )
    
    if results and args.comparison:
        output_format = args.format or "markdown"
        if output_format == "json":
            comparison_ext = ".json"
        elif output_format == "excel":
            comparison_ext = ".xlsx"
        else:
            comparison_ext = ".md"
        comparison_file = os.path.join(output_dir, f"comparison_report{comparison_ext}")
        processor.generate_comparison_report(results, comparison_file, output_format)
        print(f"\n✓ 汇总对比报告已保存到: {comparison_file}")
    
    if args.ics:
        try:
            cal_generator = CalendarGenerator()
            ics_file = os.path.join(output_dir, "all_events.ics")
            
            all_events = []
            for result in results:
                filename = result.get("metadata", {}).get("filename", "")
                events = result.get("time_events", [])
                todos = result.get("todo_items", [])
                
                for e in events:
                    all_events.append({
                        "event": f"[{filename}] {e.get('event', '')}",
                        "time": e.get('time', ''),
                        "original_text": e.get('original_text', '')
                    })
                
                for t in todos:
                    if t.get('deadline'):
                        all_events.append({
                            "event": f"[{filename}] 待办: {t.get('task', '')}",
                            "time": t.get('deadline', ''),
                            "original_text": t.get('task', '')
                        })
            
            if all_events:
                cal_generator.generate_ics_from_events(all_events, ics_file)
                print(f"✓ 汇总日历文件已保存到: {ics_file}")
        except ImportError as e:
            print(f"⚠  无法生成日历: {e}")
    
    print(f"\n✓ 批量处理完成，共处理 {len(results)} 个文件")


def show_feedback_stats(args):
    feedback_manager = FeedbackManager()
    stats = feedback_manager.get_feedback_stats()
    
    print("\n反馈统计:")
    print(f"  总反馈数: {stats['total']}")
    print(f"  平均评分: {stats['avg_rating']} / 5")
    print("\n评分分布:")
    for rating, count in stats['rating_distribution'].items():
        bar = "█" * count
        print(f"  {rating} 星: {bar} ({count})")
    
    if args.export:
        count = feedback_manager.export_training_data(args.export)
        print(f"\n✓ 已导出 {count} 条高质量数据到: {args.export}")


def main():
    print_banner()
    
    parser = argparse.ArgumentParser(
        description="AI 会议发言总结工具 - 智能提取观点、共识、待办事项和时间节点",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py -i meeting.txt                     # 处理单个文件
  python main.py -i meeting.txt -o summary.md       # 输出到文件
  python main.py -i meeting.txt -f json             # JSON格式输出
  python main.py -i meeting.txt -f excel            # Excel格式输出
  python main.py -i meeting.txt --ics calendar.ics  # 生成日历
  python main.py -i meeting.txt --feedback          # 收集反馈
  python main.py -b batch_input/ -o batch_output/   # 批量处理
  python main.py -b batch_input/ --workers 3        # 并发批量处理
  python main.py -i meeting.txt -v                  # 详细调试模式
  python main.py --feedback-stats                   # 查看反馈统计
        """
    )
    
    parser.add_argument("-i", "--input", help="输入会议记录文件 (.txt)")
    parser.add_argument("-o", "--output", help="输出文件路径")
    parser.add_argument("-f", "--format", 
                       choices=["markdown", "json", "text", "excel"],
                       default="markdown",
                       help="输出格式 (默认: markdown)")
    parser.add_argument("--no-llm", action="store_true",
                       help="不使用LLM，仅用关键词提取")
    parser.add_argument("--no-ignore-fillers", action="store_true",
                       help="不忽略语气词（如嗯、啊等）")
    parser.add_argument("--verbose", "-v", action="store_true",
                       help="显示详细调试信息")
    parser.add_argument("--timeout", type=int, default=60,
                       help="API调用超时时间(秒)，默认: 60")
    parser.add_argument("--ics", help="生成日历文件 (.ics)")
    parser.add_argument("--feedback", action="store_true",
                       help="处理后收集用户反馈")
    parser.add_argument("--rating", type=int, choices=[1, 2, 3, 4, 5],
                       help="直接指定摘要评分(1-5)，配合--feedback非交互使用")
    parser.add_argument("--comment", type=str, default="",
                       help="反馈评论，配合--rating使用")
    
    batch_group = parser.add_argument_group("批量处理")
    batch_group.add_argument("-b", "--batch", dest="input_dir",
                            help="批量处理目录下的所有 .txt 文件")
    batch_group.add_argument("-O", "--output-dir",
                            help="批量处理输出目录")
    batch_group.add_argument("--comparison", action="store_true",
                            help="生成汇总对比报告")
    batch_group.add_argument("--workers", type=int, default=1,
                            help="并发处理的工作线程数 (默认: 1, 建议: 2-4)")
    
    feedback_group = parser.add_argument_group("反馈管理")
    feedback_group.add_argument("--feedback-stats", action="store_true",
                               help="显示反馈统计")
    feedback_group.add_argument("--export", help="导出训练数据到指定文件")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.basicConfig(level=logging.DEBUG, format='%(asctime)s [%(name)s] %(levelname)s: %(message)s')
    else:
        logging.basicConfig(level=logging.CRITICAL + 1)
    
    if args.feedback_stats:
        show_feedback_stats(args)
        return
    
    if args.input_dir:
        process_batch(args)
        return
    
    if args.input:
        process_single_file(args)
        return
    
    parser.print_help()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n操作已取消")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ 错误: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
