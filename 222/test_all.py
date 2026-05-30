#!/usr/bin/env python3
import os
import sys
import json
import shutil

from parser import MeetingParser, Utterance
from config import Config
from summarizer import SimpleSummarizer, merge_summary_with_stats
from output_formatter import OutputFormatter
from feedback import FeedbackManager
from calendar_generator import CalendarGenerator, TimeEventParser
from llm_client import LLMClient
from batch_processor import BatchProcessor

passed = 0
failed = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        print(f"  ✓ {name}")
        passed += 1
    else:
        print(f"  ✗ {name} {detail}")
        failed += 1

def cleanup_test_dirs():
    for d in ["feedback", "batch_output", "test_output"]:
        if os.path.exists(d):
            shutil.rmtree(d)

print("=" * 60)
print("AI会议发言总结工具 - 综合测试")
print("=" * 60)

# ============================================================
print("\n【测试1】语气词过滤功能")
# ============================================================
parser_on = MeetingParser(ignore_fillers=True)
parser_off = MeetingParser(ignore_fillers=False)
utterances_on = parser_on.parse_file("example_meeting.txt")
utterances_off = parser_off.parse_file("example_meeting.txt")

test("解析出11条发言", len(utterances_on) == 11, f"实际: {len(utterances_on)}")

has_filler_raw = any("嗯" in u.raw_content or "啊" in u.raw_content for u in utterances_on)
has_filler_clean_on = any(
    any(filler in u.clean_content for filler in Config.FILLER_WORDS)
    for u in utterances_on
)
has_filler_clean_off = any(
    any(filler in u.clean_content for filler in ["嗯", "啊"])
    for u in utterances_off
)
test("原文中包含语气词", has_filler_raw)
test("忽略模式: 清理后不含语气词", not has_filler_clean_on)
test("保留模式: 清理后保留语气词", has_filler_clean_off)

has_double_comma = any("，，" in u.clean_content or ",," in u.clean_content for u in utterances_on)
has_leading_comma = any(u.clean_content.startswith("，") or u.clean_content.startswith(",") for u in utterances_on)
test("清理后无残留双逗号", not has_double_comma)
test("清理后无开头逗号", not has_leading_comma)

# ============================================================
print("\n【测试2】发言人统计功能")
# ============================================================
stats = parser_on.get_speaker_stats(utterances_on)
test("4位发言人", len(stats) == 4, f"实际: {len(stats)}")
test("张三发言5次", stats.get("张三", {}).get("utterance_count") == 5)
test("李四发言3次", stats.get("李四", {}).get("utterance_count") == 3)
test("统计含预估时长", "estimated_duration_minutes" in stats.get("张三", {}))

metadata = parser_on.get_meeting_metadata(utterances_on, "example_meeting.txt")
test("元数据含filename", metadata.get("filename") == "example_meeting.txt")
test("元数据含speakers列表", len(metadata.get("speakers", [])) == 4)

# ============================================================
print("\n【测试3】SimpleSummarizer 待办事项提取")
# ============================================================
simple = SimpleSummarizer()
todos = simple.extract_todo_simple(utterances_on)

test("提取到待办事项", len(todos) > 0, f"实际: {len(todos)}")

has_li4_todo = any(t.get("assignee") == "李四" for t in todos)
test("识别李四的待办", has_li4_todo)

has_zhao6_todo = any(t.get("assignee") == "赵六" for t in todos)
test("识别赵六的待办", has_zhao6_todo)

deadlines = [t.get("deadline", "") for t in todos if t.get("deadline")]
test("部分待办有截止时间", len(deadlines) > 0, f"有截止时间的: {deadlines}")

for t in todos:
    if t.get("deadline"):
        is_clean = len(t["deadline"]) < 30 and "，" not in t["deadline"]
        test(f"截止时间格式合理: '{t['deadline']}'", is_clean, f"实际: '{t['deadline']}'")
        break

# ============================================================
print("\n【测试4】SimpleSummarizer 时间节点提取")
# ============================================================
events = simple.extract_time_events_simple(utterances_on)

test("提取到时间节点", len(events) > 0, f"实际: {len(events)}")

has_next_monday = any("下周一" in e.get("time", "") for e in events)
test("识别'下周一'", has_next_monday)

has_next_wed = any("下周三" in e.get("time", "") for e in events)
test("识别'下周三下午三点'", has_next_wed, f"时间: {[e.get('time') for e in events]}")

for e in events:
    time_val = e.get("time", "")
    is_clean = "点" not in time_val or "下午" in time_val or "上午" in time_val
    if "点" in time_val:
        test(f"时间表达式含'点'时有上下午限定: '{time_val}'", is_clean)
        break

# ============================================================
print("\n【测试5】输出格式化功能")
# ============================================================
summary = {
    "summary_by_speaker": {},
    "meeting_consensus": ["确定下周一联调测试"],
    "todo_items": todos,
    "time_events": events,
    "overall_summary": "本次会议讨论了产品开发进度"
}
result = merge_summary_with_stats(summary, stats, metadata)

md_content = OutputFormatter.to_markdown(result)
test("Markdown输出含标题", "# 会议摘要" in md_content)
test("Markdown输出含统计表", "| 发言人 |" in md_content)
test("Markdown输出含待办表", "| 序号 | 任务 |" in md_content)

json_content = OutputFormatter.to_json(result)
json_parsed = json.loads(json_content)
test("JSON输出可解析", json_parsed is not None)
test("JSON含metadata", "metadata" in json_parsed)

text_content = OutputFormatter.to_plain_text(result)
test("纯文本含会议摘要", "会议摘要" in text_content)
test("纯文本含待办事项", "待办事项" in text_content)

# ============================================================
print("\n【测试6】反馈保存功能（非交互式）")
# ============================================================
if os.path.exists("feedback"):
    shutil.rmtree("feedback")

fm = FeedbackManager()
meeting_id = fm.save_feedback(result, 4, "测试反馈评论", {"overall_summary": "修正摘要"})
test("反馈保存返回meeting_id", meeting_id != "")

feedback_dir_exists = os.path.exists("feedback")
test("feedback目录已创建", feedback_dir_exists)

feedback_files = [f for f in os.listdir("feedback") if f.endswith(".json")]
test("反馈文件已生成", len(feedback_files) > 0)

if feedback_files:
    with open(os.path.join("feedback", feedback_files[0]), "r", encoding="utf-8") as f:
        saved = json.load(f)
    test("反馈含评分", saved.get("feedback", {}).get("accuracy_rating") == 4)
    test("反馈含评论", saved.get("feedback", {}).get("comments") == "测试反馈评论")
    test("反馈含修正", "overall_summary" in saved.get("feedback", {}).get("corrections", {}))

fm2 = FeedbackManager()
stats2 = fm2.get_feedback_stats()
test("反馈统计: total=1", stats2.get("total") == 1)
test("反馈统计: avg_rating=4", stats2.get("avg_rating") == 4.0)

export_count = fm2.export_training_data("test_training_data.json")
test("导出训练数据", export_count >= 1, f"导出{export_count}条")
if os.path.exists("test_training_data.json"):
    os.remove("test_training_data.json")

# ============================================================
print("\n【测试7】日历生成功能")
# ============================================================
cal_gen = CalendarGenerator()
test_events = [
    {"event": "客户评审会议", "time": "下周三下午三点", "original_text": "下周三下午三点有个客户评审会议"},
    {"event": "联调测试", "time": "下周一", "original_text": "下周一进行第一次联调测试"},
    {"event": "提交初稿", "time": "周三", "original_text": "周三之前提交初稿"},
]

ics_file = "test_calendar.ics"
try:
    cal_gen.generate_ics_from_events(test_events, ics_file)
    ics_exists = os.path.exists(ics_file)
    test("ICS文件已生成", ics_exists)
    
    if ics_exists:
        with open(ics_file, "r", encoding="utf-8") as f:
            ics_content = f.read()
        test("ICS含VCALENDAR", "BEGIN:VCALENDAR" in ics_content)
        test("ICS含VEVENT", "BEGIN:VEVENT" in ics_content)
        test("ICS含VALARM", "BEGIN:VALARM" in ics_content)
        test("ICS含客户评审会议", "客户评审会议" in ics_content)
        test("ICS含DTSTART", "DTSTART" in ics_content)
        test("ICS含TRIGGER提醒", "TRIGGER:-PT30M" in ics_content)
        os.remove(ics_file)
except Exception as e:
    test("ICS生成", False, str(e))

# ============================================================
print("\n【测试8】时间解析器")
# ============================================================
tp = TimeEventParser()
from datetime import datetime

base = datetime(2026, 5, 30, 10, 0, 0)  # 周六

r1 = tp.parse_time_expression("下周一", base)
test("解析'下周一'", r1 is not None and r1.weekday() == 0, f"结果: {r1}")

r2 = tp.parse_time_expression("下周三下午三点", base)
test("解析'下周三下午三点'", r2 is not None and r2.weekday() == 2 and r2.hour == 15, f"结果: {r2}")

r3 = tp.parse_time_expression("明天", base)
test("解析'明天'", r3 is not None and r3.day == 31, f"结果: {r3}")

r4 = tp.parse_time_expression("6月15号", base)
test("解析'6月15号'", r4 is not None and r4.month == 6 and r4.day == 15, f"结果: {r4}")

r5 = tp.parse_time_expression("今天", base)
test("解析'今天'", r5 is not None and r5.day == 30, f"结果: {r5}")

# ============================================================
print("\n【测试9】批量处理功能")
# ============================================================
if os.path.exists("batch_output"):
    shutil.rmtree("batch_output")

bp = BatchProcessor(use_llm=False)
results = bp.process_directory("batch_input", "batch_output", "markdown")
test("批量处理3个文件", len(results) == 3, f"实际: {len(results)}")

batch_output_exists = os.path.exists("batch_output")
test("batch_output目录已创建", batch_output_exists)

if batch_output_exists:
    output_files = os.listdir("batch_output")
    summary_files = [f for f in output_files if "_summary" in f]
    test("生成了摘要文件", len(summary_files) >= 3, f"实际: {summary_files}")

comparison_file = os.path.join("batch_output", "comparison_report.md")
bp.generate_comparison_report(results, comparison_file)
comparison_exists = os.path.exists(comparison_file)
test("对比报告已生成", comparison_exists)

if comparison_exists:
    with open(comparison_file, "r", encoding="utf-8") as f:
        report = f.read()
    test("对比报告含效率指标", "效率指标对比" in report)
    test("对比报告含待办汇总", "待办事项汇总" in report)

# ============================================================
print("\n【测试10】LLM客户端初始化")
# ============================================================
client_no_key = LLMClient()
test("无API Key时客户端不可用", not client_no_key.is_available())

try:
    from openai import OpenAI
    openai_installed = True
except ImportError:
    openai_installed = False

if openai_installed:
    client_with_key = LLMClient(api_key="sk-test-key-123")
    test("有API Key时客户端可用(OpenAI库已安装)", client_with_key.is_available())
else:
    test("OpenAI库未安装,跳过客户端测试", True)

test("模型已从配置加载", client_no_key.model != "")

# ============================================================
print("\n" + "=" * 60)
print(f"测试完成: {passed} 通过, {failed} 失败")
print("=" * 60)

if failed > 0:
    sys.exit(1)
