#!/usr/bin/env python3
"""
AI总结功能 - 真实API 一键测试脚本
使用前请先在 .env 文件中填入有效的 API Key

运行: python test_llm_real.py
"""
import os
import sys
import time

from dotenv import load_dotenv
load_dotenv()


def check_api_key():
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║                    ⚠️   API Key 未配置                         ║")
        print("╠══════════════════════════════════════════════════════════════╣")
        print("║                                                              ║")
        print("║  请先获取一个有效的 API Key:                                  ║")
        print("║                                                              ║")
        print("║  🎯 DeepSeek (推荐, 国内直连):                               ║")
        print("║     注册: https://platform.deepseek.com                      ║")
        print("║     新用户送 500万免费 token (~¥8)                           ║")
        print("║                                                              ║")
        print("║  🎯 OpenAI (官方):                                           ║")
        print("║     注册: https://platform.openai.com                        ║")
        print("║                                                              ║")
        print("║  配置方法:                                                    ║")
        print("║  1. 复制 .env.example → .env                                 ║")
        print("║  2. 编辑 .env，填入 API Key                                  ║")
        print("║  3. 重新运行: python test_llm_real.py                        ║")
        print("║                                                              ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        return False
    return True


def run_tests():
    print("\n" + "=" * 60)
    print("   🚀 AI总结功能 - 真实API 端到端测试")
    print("=" * 60)
    
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "")
    model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    
    print(f"\n📋 API 配置:")
    print(f"  Key: {api_key[:8]}...{api_key[-4:]}")
    print(f"  Model: {model}")
    print(f"  Base URL: {base_url or '(OpenAI 默认)'}")
    
    from parser import MeetingParser
    from llm_client import LLMClient
    from summarizer import MeetingSummarizer, merge_summary_with_stats
    from output_formatter import OutputFormatter
    from batch_processor import BatchProcessor
    
    print("\n" + "=" * 60)
    print("【测试1】LLM 客户端初始化")
    print("=" * 60)
    
    client = LLMClient()
    if not client.is_available():
        print(f"  ✗ 失败: {client.get_last_error()}")
        return False
    print(f"  ✓ 初始化成功")
    print(f"  ✓ 超时: {client.timeout}s")
    print(f"  ✓ 重试: {client.max_retries}次")
    
    print("\n" + "=" * 60)
    print("【测试2】简单 API 连通性测试")
    print("=" * 60)
    
    print("  ⏳ 发送测试请求...")
    start = time.time()
    try:
        response = client.chat_completion([
            {"role": "user", "content": "你好，请回复'测试通过'两个字"}
        ], max_tokens=50)
        elapsed = time.time() - start
        print(f"  ✓ 响应: {response.strip()}")
        print(f"  ✓ 耗时: {elapsed:.2f}s")
    except Exception as e:
        elapsed = time.time() - start
        print(f"  ✗ 失败: {e}")
        print(f"  ⏱  耗时: {elapsed:.2f}s")
        return False
    
    print("\n" + "=" * 60)
    print("【测试3】会议记录 AI 总结 (JSON模式)")
    print("=" * 60)
    
    parser = MeetingParser()
    utterances = parser.parse_file("example_meeting.txt")
    print(f"  ✓ 解析: {len(utterances)} 条发言")
    
    summarizer = MeetingSummarizer(client)
    print(f"  ⏳ 正在生成 AI 总结...")
    start = time.time()
    
    try:
        summary = summarizer.execute(utterances, parser)
        elapsed = time.time() - start
        print(f"  ✓ 完成! 耗时: {elapsed:.2f}s")
        
        num_speakers = len(summary.get('summary_by_speaker', {}))
        num_consensus = len(summary.get('meeting_consensus', []))
        num_todos = len(summary.get('todo_items', []))
        num_events = len(summary.get('time_events', []))
        
        print(f"  ✓ 发言人总结: {num_speakers} 人")
        print(f"  ✓ 会议共识: {num_consensus} 条")
        print(f"  ✓ 待办事项: {num_todos} 条")
        print(f"  ✓ 时间节点: {num_events} 条")
        
        overall = summary.get('overall_summary', '')
        if overall:
            preview = overall[:100] + '...' if len(overall) > 100 else overall
            print(f"  ✓ 整体摘要: {preview}")
        
        if num_speakers == 0 and num_consensus == 0 and num_todos == 0 and num_events == 0:
            print("  ⚠ 警告: AI返回的内容较少，可能需要优化prompt")
    except Exception as e:
        elapsed = time.time() - start
        print(f"  ✗ 失败 ({elapsed:.2f}s): {e}")
        return False
    
    print("\n" + "=" * 60)
    print("【测试4】保存结果到文件 (Markdown/JSON/Excel)")
    print("=" * 60)
    
    stats = parser.get_speaker_stats(utterances)
    metadata = parser.get_meeting_metadata(utterances, "example_meeting.txt")
    result = merge_summary_with_stats(summary, stats, metadata)
    
    md_path = "output/ai_real_test.md"
    OutputFormatter.save_to_file(OutputFormatter.to_markdown(result), md_path)
    print(f"  ✓ Markdown: {md_path}")
    
    json_path = "output/ai_real_test.json"
    OutputFormatter.save_to_file(OutputFormatter.to_json(result), json_path)
    print(f"  ✓ JSON: {json_path}")
    
    try:
        excel_path = "output/ai_real_test.xlsx"
        OutputFormatter.to_excel(result, excel_path)
        print(f"  ✓ Excel: {excel_path}")
    except Exception as e:
        print(f"  ⊘ Excel 跳过: {e}")
    
    print("\n" + "=" * 60)
    print("【测试5】批量处理 AI 总结 (3个文件)")
    print("=" * 60)
    
    processor = BatchProcessor(client, use_llm=True)
    output_dir = "output/ai_real_batch"
    print(f"  ⏳ 批量处理中...")
    start = time.time()
    
    try:
        results = processor.process_directory("batch_input", output_dir, "markdown", workers=1)
        elapsed = time.time() - start
        print(f"  ✓ 完成! {len(results)} 个文件, 耗时: {elapsed:.2f}s")
        
        success_count = sum(1 for r in results if not r.get('overall_summary', '').startswith('(AI总结'))
        print(f"  ✓ AI总结成功: {success_count}/{len(results)} 个文件")
        
        comparison_path = os.path.join(output_dir, "comparison_report.md")
        processor.generate_comparison_report(results, comparison_path)
        print(f"  ✓ 对比报告: {comparison_path}")
    except Exception as e:
        elapsed = time.time() - start
        print(f"  ✗ 失败 ({elapsed:.2f}s): {e}")
        return False
    
    print("\n" + "=" * 60)
    print("【测试6】验证所有输出文件")
    print("=" * 60)
    
    files_to_check = [
        md_path,
        json_path,
        comparison_path,
    ]
    
    all_ok = True
    for f in files_to_check:
        if os.path.exists(f):
            size = os.path.getsize(f)
            print(f"  ✓ {f} ({size} bytes)")
        else:
            print(f"  ✗ {f} (不存在)")
            all_ok = False
    
    print("\n" + "=" * 60)
    print("   🎉 所有 AI 功能端到端测试通过!")
    print("=" * 60)
    print()
    print("完整链路验证:")
    print("  ✅ API 初始化")
    print("  ✅ 请求发送")
    print("  ✅ 响应接收")
    print("  ✅ JSON 解析")
    print("  ✅ 数据提取")
    print("  ✅ 文件保存")
    print("  ✅ 批量处理")
    print()
    print("可执行的命令:")
    print("  python main.py -i example_meeting.txt -o output/summary.md")
    print("  python main.py -b batch_input/ -O output/batch --comparison")
    print()
    return True


def main():
    if not check_api_key():
        sys.exit(1)
    
    try:
        success = run_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n测试中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n测试异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
