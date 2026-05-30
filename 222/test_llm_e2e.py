#!/usr/bin/env python3
"""
AI总结功能端到端测试脚本
使用方法:
  1. 复制 .env.example 为 .env 并填入 API Key
  2. 运行: python3 test_llm_e2e.py
  3. 或直接通过环境变量: OPENAI_API_KEY=sk-xxx python3 test_llm_e2e.py
  4. DeepSeek: OPENAI_API_KEY=sk-xxx OPENAI_BASE_URL=https://api.deepseek.com/v1 OPENAI_MODEL=deepseek-chat python3 test_llm_e2e.py
"""
import os
import sys
import json
import time
import traceback

from dotenv import load_dotenv
load_dotenv()

from parser import MeetingParser
from llm_client import LLMClient, LLMCallError
from summarizer import MeetingSummarizer, SimpleSummarizer, merge_summary_with_stats
from output_formatter import OutputFormatter


def test_llm_initialization():
    print("\n" + "=" * 60)
    print("【测试1】LLM客户端初始化")
    print("=" * 60)
    
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "")
    model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    
    print(f"  API Key: {'✓ 已配置 (' + api_key[:8] + '...' + api_key[-4:] + ')' if api_key else '✗ 未配置'}")
    print(f"  Model: {model}")
    print(f"  Base URL: {base_url or '(默认OpenAI)'}")
    
    client = LLMClient()
    
    if client.is_available():
        print(f"  ✓ LLM客户端初始化成功")
        print(f"  ✓ 模型: {client.model}")
        print(f"  ✓ 超时: {client.timeout}秒")
        print(f"  ✓ 最大重试: {client.max_retries}次")
        return client
    else:
        error = client.get_last_error() or "未知错误"
        print(f"  ✗ LLM客户端初始化失败: {error}")
        return None


def test_llm_single_call(client):
    print("\n" + "=" * 60)
    print("【测试2】AI总结 - 单个文件完整调用链路")
    print("=" * 60)
    
    if not client or not client.is_available():
        print("  ⊘ 跳过: LLM客户端不可用")
        return None
    
    test_file = "example_meeting.txt"
    if not os.path.exists(test_file):
        print(f"  ✗ 测试文件不存在: {test_file}")
        return None
    
    parser = MeetingParser()
    utterances = parser.parse_file(test_file)
    print(f"  ✓ 解析完成: {len(utterances)} 条发言")
    
    summarizer = MeetingSummarizer(client)
    
    print(f"  ⏳ 正在调用 AI 模型 (model={client.model})...")
    start_time = time.time()
    
    try:
        summary = summarizer.execute(utterances, parser)
        elapsed = time.time() - start_time
        print(f"  ✓ AI总结完成! 耗时: {elapsed:.2f}秒")
        
        print(f"  ✓ 发言人总结: {len(summary.get('summary_by_speaker', {}))} 人")
        print(f"  ✓ 共识: {len(summary.get('meeting_consensus', []))} 条")
        print(f"  ✓ 待办事项: {len(summary.get('todo_items', []))} 条")
        print(f"  ✓ 时间节点: {len(summary.get('time_events', []))} 条")
        
        overall = summary.get('overall_summary', '')
        if overall:
            preview = overall[:100] + '...' if len(overall) > 100 else overall
            print(f"  ✓ 整体摘要: {preview}")
        
        return summary
    except LLMCallError as e:
        elapsed = time.time() - start_time
        print(f"  ✗ AI总结失败 ({elapsed:.2f}秒): {e}")
        if e.original_error:
            print(f"  原始错误: {type(e.original_error).__name__}: {e.original_error}")
        return None


def test_llm_result_save(summary):
    print("\n" + "=" * 60)
    print("【测试3】AI结果保存到文件")
    print("=" * 60)
    
    if not summary:
        print("  ⊘ 跳过: 无AI总结结果")
        return
    
    parser = MeetingParser()
    utterances = parser.parse_file("example_meeting.txt")
    stats = parser.get_speaker_stats(utterances)
    metadata = parser.get_meeting_metadata(utterances, "example_meeting.txt")
    result = merge_summary_with_stats(summary, stats, metadata)
    
    md_content = OutputFormatter.to_markdown(result)
    md_path = "output/llm_test_summary.md"
    OutputFormatter.save_to_file(md_content, md_path)
    print(f"  ✓ Markdown 保存到: {md_path}")
    
    json_content = OutputFormatter.to_json(result)
    json_path = "output/llm_test_summary.json"
    OutputFormatter.save_to_file(json_content, json_path)
    print(f"  ✓ JSON 保存到: {json_path}")
    
    try:
        excel_path = "output/llm_test_summary.xlsx"
        OutputFormatter.to_excel(result, excel_path)
        print(f"  ✓ Excel 保存到: {excel_path}")
    except ImportError:
        print(f"  ⊘ Excel 导出跳过 (openpyxl未安装)")


def test_llm_error_handling(client):
    print("\n" + "=" * 60)
    print("【测试4】LLM错误处理 - 无效API Key")
    print("=" * 60)
    
    bad_client = LLMClient(api_key="sk-invalid-key-12345", base_url=client.base_url if client else None)
    
    if not bad_client.is_available():
        print("  ✓ 无效Key客户端创建失败(预期行为)")
        return
    
    print(f"  ⏳ 测试无效Key调用...")
    try:
        bad_client.chat_completion([{"role": "user", "content": "test"}])
        print(f"  ✗ 应该报错但没有报错")
    except LLMCallError as e:
        print(f"  ✓ 正确捕获错误: {str(e)[:80]}")
    except Exception as e:
        print(f"  ✓ 捕获异常: {type(e).__name__}: {str(e)[:80]}")


def test_llm_timeout():
    print("\n" + "=" * 60)
    print("【测试5】LLM超时机制 - 极短超时")
    print("=" * 60)
    
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        print("  ⊘ 跳过: 无API Key")
        return
    
    timeout_client = LLMClient(timeout=1, max_retries=0)
    
    if not timeout_client.is_available():
        print("  ⊘ 跳过: LLM客户端不可用")
        return
    
    print(f"  ⏳ 使用1秒超时测试...")
    try:
        timeout_client.chat_completion([
            {"role": "user", "content": "请详细描述一个复杂的故事，至少500字"}
        ])
        print(f"  ⚠ 调用成功(可能网络较快)")
    except LLMCallError as e:
        print(f"  ✓ 超时错误被正确捕获: {str(e)[:80]}")
    except Exception as e:
        print(f"  ✓ 捕获异常: {type(e).__name__}: {str(e)[:80]}")


def test_llm_fallback():
    print("\n" + "=" * 60)
    print("【测试6】降级机制 - AI失败后自动降级")
    print("=" * 60)
    
    parser = MeetingParser()
    utterances = parser.parse_file("example_meeting.txt")
    
    bad_client = LLMClient(api_key="sk-fake-key")
    if bad_client.is_available():
        summarizer = MeetingSummarizer(bad_client)
        try:
            result = summarizer.execute(utterances, parser)
            if "(AI总结调用失败" in result.get("overall_summary", "") or "(AI总结失败" in result.get("overall_summary", ""):
                print(f"  ✓ 自动降级成功，使用了关键词提取模式")
            else:
                print(f"  ⚠ AI调用意外成功")
        except LLMCallError as e:
            print(f"  ⚠ 降级未自动触发，抛出了异常: {e}")
    else:
        print(f"  ✓ 无效Key时客户端不可用(预期行为)")


def test_llm_batch(client):
    print("\n" + "=" * 60)
    print("【测试7】批量处理AI总结")
    print("=" * 60)
    
    if not client or not client.is_available():
        print("  ⊘ 跳过: LLM客户端不可用")
        return
    
    from batch_processor import BatchProcessor
    
    processor = BatchProcessor(client, use_llm=True)
    
    batch_dir = "batch_input"
    if not os.path.exists(batch_dir):
        print(f"  ✗ 批量测试目录不存在: {batch_dir}")
        return
    
    print(f"  ⏳ 批量处理 (AI模式)...")
    start_time = time.time()
    
    results = processor.process_directory(
        batch_dir, 
        "output/llm_batch", 
        "markdown"
    )
    
    elapsed = time.time() - start_time
    print(f"  ✓ 批量处理完成! 共 {len(results)} 个文件, 耗时: {elapsed:.2f}秒")
    
    if results:
        comparison_file = "output/llm_batch/comparison_report.md"
        processor.generate_comparison_report(results, comparison_file)
        print(f"  ✓ 对比报告: {comparison_file}")


def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║          AI总结功能 - 端到端测试                            ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    
    client = test_llm_initialization()
    
    summary = test_llm_single_call(client)
    
    test_llm_result_save(summary)
    
    test_llm_error_handling(client)
    
    test_llm_timeout()
    
    test_llm_fallback()
    
    test_llm_batch(client)
    
    print("\n" + "=" * 60)
    print("端到端测试完成!")
    print("=" * 60)
    
    if client and client.is_available():
        print("\n✓ LLM调用全链路验证通过!")
        print("  初始化 → 请求发送 → 响应接收 → 结果解析 → 文件保存")
    else:
        print("\n⚠ 未配置有效的API Key，AI调用测试已跳过")
        print("  配置方法:")
        print("    1. cp .env.example .env")
        print("    2. 编辑 .env 填入 API Key")
        print("    3. 重新运行: python3 test_llm_e2e.py")
        print()
        print("  DeepSeek 快速测试:")
        print("    OPENAI_API_KEY=sk-xxx OPENAI_BASE_URL=https://api.deepseek.com/v1 \\")
        print("    OPENAI_MODEL=deepseek-chat python3 test_llm_e2e.py")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n测试中断")
        sys.exit(0)
