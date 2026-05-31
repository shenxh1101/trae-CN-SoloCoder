#!/usr/bin/env python3
import os
import sys
import json
import tempfile
import shutil
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from meeting_summarizer.models import (
    MeetingSummary, MeetingType, ActionItem, Priority,
    DiscussionPoint, ControversialIssue
)
from meeting_summarizer.utils import (
    generate_id, extract_names, extract_dates, parse_priority, clean_text
)
from meeting_summarizer.action_items import ActionItemProcessor
from meeting_summarizer.output_formats import OutputFormatter
from meeting_summarizer.feedback import FeedbackManager
from meeting_summarizer.llm_client import LLMClient
from meeting_summarizer.config import Config
from meeting_summarizer.extractor import MeetingExtractor
from meeting_summarizer.tts import TTSGenerator


class TestUtils(unittest.TestCase):
    def test_generate_id(self):
        id1 = generate_id("test", "123")
        id2 = generate_id("test", "123")
        id3 = generate_id("test", "456")
        self.assertEqual(id1, id2)
        self.assertNotEqual(id1, id3)
        self.assertEqual(len(id1), 8)

    def test_extract_names(self):
        text = "张三和李四一起参加了会议。Alice和Bob也来了。"
        names = extract_names(text)
        self.assertIn("张三", names)
        self.assertIn("李四", names)
        self.assertIn("Alice", names)
        self.assertIn("Bob", names)

    def test_extract_dates(self):
        text = "会议定于2024年1月15日召开，明天需要完成报告，3天后提交。"
        dates = extract_dates(text)
        self.assertTrue(any("2024-01-15" in d for d in dates))
        self.assertTrue(len(dates) >= 2)

    def test_parse_priority(self):
        self.assertEqual(parse_priority("这是紧急任务"), Priority.HIGH)
        self.assertEqual(parse_priority("请尽快完成"), Priority.MEDIUM)
        self.assertEqual(parse_priority("可以后续处理"), Priority.LOW)
        self.assertEqual(parse_priority("普通任务"), Priority.MEDIUM)

    def test_clean_text(self):
        text = "  这是   一段    测试文本  "
        cleaned = clean_text(text)
        self.assertEqual(cleaned, "这是 一段 测试文本")


class TestActionItemProcessor(unittest.TestCase):
    def setUp(self):
        self.action_items = [
            ActionItem(id="1", task="完成登录功能", assignee="张三", priority=Priority.HIGH),
            ActionItem(id="2", task="编写测试用例", assignee="李四", priority=Priority.MEDIUM),
            ActionItem(id="3", task="更新文档", assignee="王五", priority=Priority.LOW),
            ActionItem(id="4", task="完成登录功能的测试", assignee="张三", priority=Priority.HIGH),
        ]

    def test_prioritize(self):
        sorted_items = ActionItemProcessor.prioritize(self.action_items)
        self.assertEqual(sorted_items[0].priority, Priority.HIGH)
        self.assertEqual(sorted_items[-1].priority, Priority.LOW)

    def test_find_duplicates(self):
        items_with_dup = self.action_items + [
            ActionItem(id="5", task="完成登录功能", assignee="张三", priority=Priority.HIGH)
        ]
        processed = ActionItemProcessor.find_duplicates(items_with_dup, threshold=70)
        duplicate_items = [item for item in processed if item.is_duplicate]
        self.assertTrue(len(duplicate_items) >= 1)

    def test_merge_duplicates(self):
        items_with_dup = [
            ActionItem(id="1", task="完成登录功能", assignee="张三", priority=Priority.HIGH),
            ActionItem(id="2", task="完成登录功能", assignee="张三", priority=Priority.HIGH, is_duplicate=True, duplicate_of="1"),
        ]
        merged = ActionItemProcessor.merge_duplicates(items_with_dup)
        self.assertEqual(len(merged), 1)

    def test_group_by_assignee(self):
        groups = ActionItemProcessor.group_by_assignee(self.action_items)
        self.assertIn("张三", groups)
        self.assertIn("李四", groups)
        self.assertIn("王五", groups)
        self.assertEqual(len(groups["张三"]), 2)

    def test_group_by_priority(self):
        groups = ActionItemProcessor.group_by_priority(self.action_items)
        self.assertEqual(len(groups.get("high", [])), 2)
        self.assertEqual(len(groups.get("medium", [])), 1)
        self.assertEqual(len(groups.get("low", [])), 1)

    def test_smart_merge_combines_fields(self):
        items = [
            ActionItem(id="a1", task="修复登录页面bug", assignee="张三",
                       due_date="2024-01-20", priority=Priority.MEDIUM,
                       description="登录页面在移动端显示异常",
                       related_topics=["前端"]),
            ActionItem(id="a2", task="修复登录页面的bug", assignee=None,
                       due_date=None, priority=Priority.HIGH,
                       description="密码重置功能失败",
                       related_topics=["后端"]),
        ]
        result = ActionItemProcessor.find_duplicates(items, threshold=70)
        dup_items = [i for i in result if i.is_duplicate]
        self.assertTrue(len(dup_items) >= 1, "应该检测到重复项")

        merged = ActionItemProcessor.merge_duplicates(result, smart_merge=True)
        self.assertTrue(len(merged) < len(items), "合并后数量应减少")

        merged_item = merged[0]
        self.assertIn("张三", merged_item.assignee, "合并后应保留第一个assignee")
        self.assertEqual(merged_item.due_date, "2024-01-20", "合并后应保留due_date")
        self.assertEqual(merged_item.priority, Priority.HIGH, "合并后优先级取最高")
        self.assertIn("前端", merged_item.related_topics, "合并后应包含相关主题")
        self.assertIn("后端", merged_item.related_topics, "合并后应包含相关主题")
        self.assertIn("登录页面在移动端显示异常", merged_item.description)
        self.assertIn("密码重置功能失败", merged_item.description)

    def test_smart_merge_preserves_all_data(self):
        items = [
            ActionItem(id="b1", task="优化数据库查询性能", assignee=None,
                       due_date=None, priority=Priority.LOW,
                       description="查询速度慢", related_topics=["数据库"]),
            ActionItem(id="b2", task="优化数据库查询性能", assignee="李四",
                       due_date="2024-02-01", priority=Priority.MEDIUM,
                       description=None, related_topics=["性能"]),
        ]
        result = ActionItemProcessor.find_duplicates(items, threshold=70)
        merged = ActionItemProcessor.merge_duplicates(result, smart_merge=True)

        self.assertTrue(len(merged) < len(items), "相同任务应被合并")

        merged_item = merged[0]
        self.assertEqual(merged_item.assignee, "李四", "保留有值的assignee")
        self.assertEqual(merged_item.due_date, "2024-02-01", "保留有值的due_date")
        self.assertIn(merged_item.priority, [Priority.MEDIUM, Priority.HIGH], "优先级取最高")
        self.assertIn("数据库", merged_item.related_topics)
        self.assertIn("性能", merged_item.related_topics)

    def test_find_related(self):
        items = [
            ActionItem(id="r1", task="完成用户登录模块开发", assignee="张三", priority=Priority.HIGH),
            ActionItem(id="r2", task="完成用户注册模块开发", assignee="李四", priority=Priority.MEDIUM),
            ActionItem(id="r3", task="部署生产环境服务器", assignee="王五", priority=Priority.LOW),
        ]
        related = ActionItemProcessor.find_related(items, threshold=60)
        self.assertTrue(len(related) > 0, "应该能找到关联的行动点")

    def test_detect_conflicts(self):
        items = [
            ActionItem(id="c1", task="任务A", assignee="张三",
                       due_date="2024-01-20", priority=Priority.HIGH),
            ActionItem(id="c2", task="任务B", assignee="张三",
                       due_date="2024-01-20", priority=Priority.MEDIUM),
        ]
        conflicts = ActionItemProcessor.detect_conflicts(items)
        self.assertEqual(len(conflicts), 1, "应该检测到同一人同一天的冲突")
        self.assertIn("张三", conflicts[0][2])

    def test_get_statistics(self):
        stats = ActionItemProcessor.get_statistics(self.action_items)
        self.assertEqual(stats["total"], 4)
        self.assertEqual(stats["with_assignee"], 4)
        self.assertEqual(stats["by_priority"]["high"], 2)
        self.assertEqual(stats["by_priority"]["medium"], 1)
        self.assertEqual(stats["by_priority"]["low"], 1)

    def test_bulk_update_assignee(self):
        items = [
            ActionItem(id="1", task="任务A", assignee="小张", priority=Priority.MEDIUM),
            ActionItem(id="2", task="任务B", assignee="小张", priority=Priority.MEDIUM),
            ActionItem(id="3", task="任务C", assignee="小李", priority=Priority.MEDIUM),
        ]
        updated = ActionItemProcessor.bulk_update_assignee(items, "小张", "张三")
        self.assertEqual(updated[0].assignee, "张三")
        self.assertEqual(updated[1].assignee, "张三")
        self.assertEqual(updated[2].assignee, "小李")


class TestOutputFormatter(unittest.TestCase):
    def setUp(self):
        self.summary = MeetingSummary(
            title="测试会议",
            meeting_type=MeetingType.GENERAL,
            main_topic="讨论项目进展",
            participants=["张三", "李四"],
            key_discussion_points=[
                DiscussionPoint(topic="进度", summary="项目进展顺利", participants=["张三"])
            ],
            decisions=["决定上线"],
            action_items=[
                ActionItem(id="1", task="完成开发", assignee="张三", priority=Priority.HIGH, due_date="2024-01-20")
            ],
            raw_transcript="测试转录文本"
        )

    def test_to_markdown(self):
        md = OutputFormatter.to_markdown(self.summary)
        self.assertIn("# 测试会议", md)
        self.assertIn("完成开发", md)
        self.assertIn("张三", md)
        self.assertIn("2024-01-20", md)

    def test_to_json(self):
        json_str = OutputFormatter.to_json(self.summary)
        self.assertIn("测试会议", json_str)
        self.assertIn("完成开发", json_str)

    def test_to_csv(self):
        csv_str = OutputFormatter.to_csv(self.summary.action_items)
        self.assertIn("完成开发", csv_str)
        self.assertIn("张三", csv_str)
        self.assertIn("high", csv_str)

    def test_save_markdown(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            temp_path = f.name
        try:
            OutputFormatter.save_markdown(self.summary, temp_path)
            self.assertTrue(os.path.exists(temp_path))
            with open(temp_path, 'r', encoding='utf-8') as f:
                content = f.read()
                self.assertIn("# 测试会议", content)
        finally:
            os.unlink(temp_path)


class TestFeedbackManager(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.manager = FeedbackManager(feedback_dir=self.temp_dir)
        self.summary = MeetingSummary(
            title="测试会议",
            meeting_type=MeetingType.GENERAL,
            main_topic="测试",
            action_items=[],
            raw_transcript=""
        )

    def test_add_name_alias(self):
        self.manager.add_name_alias("小张", "张三")
        aliases = self.manager.get_name_aliases()
        self.assertEqual(aliases.get("小张"), "张三")

    def test_add_priority_keyword(self):
        self.manager.add_priority_keyword("critical", Priority.HIGH)
        keywords = self.manager.get_priority_keywords()
        self.assertEqual(keywords.get("critical"), "high")

    def test_rate_accuracy(self):
        self.manager.rate_accuracy(self.summary, 5, "非常准确")
        stats = self.manager.get_accuracy_stats()
        self.assertEqual(stats["average"], 5.0)
        self.assertEqual(stats["count"], 1)

    def test_apply_preferences(self):
        self.manager.add_name_alias("小张", "张三")
        self.manager.add_priority_keyword("urgent", Priority.HIGH)

        summary = MeetingSummary(
            title="测试",
            meeting_type=MeetingType.GENERAL,
            main_topic="测试",
            action_items=[
                ActionItem(id="1", task="这是urgent任务", assignee="小张", priority=Priority.MEDIUM)
            ],
            raw_transcript=""
        )

        result = self.manager.apply_preferences_to_summary(summary)
        self.assertEqual(result.action_items[0].assignee, "张三")
        self.assertEqual(result.action_items[0].priority, Priority.HIGH)

    def test_export_import_feedback(self):
        self.manager.add_name_alias("小A", "A")
        self.manager.add_priority_keyword("关键", Priority.HIGH)

        export_path = os.path.join(self.temp_dir, "export.json")
        self.manager.export_feedback(export_path)
        self.assertTrue(os.path.exists(export_path))

        new_manager = FeedbackManager(feedback_dir=os.path.join(self.temp_dir, "new"))
        new_manager.import_feedback(export_path)
        self.assertEqual(new_manager.get_name_aliases().get("小A"), "A")
        self.assertEqual(new_manager.get_priority_keywords().get("关键"), "high")

    def tearDown(self):
        shutil.rmtree(self.temp_dir)


class TestFeedbackInLLMFlow(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.feedback_manager = FeedbackManager(feedback_dir=self.temp_dir)
        self.feedback_manager.add_name_alias("小王", "王五")
        self.feedback_manager.add_priority_keyword("紧急", Priority.HIGH)

    def test_feedback_injects_into_llm_prompt(self):
        extractor = MeetingExtractor(feedback_manager=self.feedback_manager)
        system_prompt, user_prompt = extractor._build_llm_prompt(
            "会议内容", MeetingType.GENERAL
        )
        self.assertIn("小王", system_prompt, "LLM提示词应包含人名别名")
        self.assertIn("王五", system_prompt, "LLM提示词应包含规范名称")
        self.assertIn("紧急", system_prompt, "LLM提示词应包含优先级关键词")
        self.assertIn("high", system_prompt, "LLM提示词应包含优先级映射")

    def test_feedback_applies_to_llm_parse_result(self):
        extractor = MeetingExtractor(feedback_manager=self.feedback_manager)
        mock_result = {
            "title": "测试",
            "main_topic": "测试主题",
            "participants": ["小王"],
            "action_items": [
                {"task": "紧急修复bug", "assignee": "小王", "priority": "medium",
                 "due_date": None, "description": None, "related_topics": []}
            ]
        }
        summary = extractor._parse_llm_result(
            mock_result, "会议内容", MeetingType.GENERAL, "测试"
        )

        self.assertEqual(summary.action_items[0].assignee, "王五",
                         "LLM提取结果中'小王'应被别名为'王五'")

    def test_feedback_applies_after_rule_extraction(self):
        extractor = MeetingExtractor(feedback_manager=self.feedback_manager)
        transcript = "小王需要紧急修复线上bug"
        summary = extractor.extract(
            transcript=transcript,
            meeting_type=MeetingType.GENERAL,
            force_rule=True
        )
        assignees = [ai.assignee for ai in summary.action_items if ai.assignee]
        for a in assignees:
            if "小王" in a or "王五" in a:
                self.assertIn("王五", a, "规则提取结果中'小王'应被别名为'王五'")

    def tearDown(self):
        shutil.rmtree(self.temp_dir)


class TestLLMClient(unittest.TestCase):
    def test_detect_backend_returns_string(self):
        backend = Config.detect_llm_backend()
        self.assertIn(backend, ["openai", "ollama", "none"])

    def test_client_status(self):
        client = LLMClient()
        status = client.get_status()
        self.assertIn("backend", status)
        self.assertIn("available", status)
        self.assertIsInstance(status["available"], bool)

    def test_client_graceful_unavailable(self):
        client = LLMClient(backend="none")
        self.assertFalse(client.is_available())


class TestSemanticPriorityRanking(unittest.TestCase):
    def test_re_rank_by_semantic_importance(self):
        items = [
            ActionItem(id="s1", task="修复线上紧急bug", assignee="张三", priority=Priority.LOW),
            ActionItem(id="s2", task="更新README文档", assignee="李四", priority=Priority.HIGH),
            ActionItem(id="s3", task="定期备份数据库", assignee="王五", priority=Priority.MEDIUM),
        ]

        semantic_priorities = {"s1": "high", "s2": "low", "s3": "medium"}
        result = ActionItemProcessor.re_rank_by_semantic_importance(items, semantic_priorities)

        self.assertEqual(result[0].id, "s1", "紧急bug应为高优先级排第一")
        self.assertEqual(result[0].priority, Priority.HIGH)
        self.assertEqual(result[-1].id, "s2", "更新文档应为低优先级排最后")
        self.assertEqual(result[-1].priority, Priority.LOW)

    def test_extractor_re_rank_method_exists(self):
        extractor = MeetingExtractor()
        self.assertTrue(hasattr(extractor, 're_rank_action_items_with_llm'))
        self.assertTrue(callable(extractor.re_rank_action_items_with_llm))


class TestDuplicateMergeComprehensive(unittest.TestCase):
    def test_merge_priority_upgrade_from_low_to_medium(self):
        items = [
            ActionItem(id="m1", task="实现用户认证模块", assignee=None,
                       due_date=None, priority=Priority.LOW,
                       description=None, related_topics=[]),
            ActionItem(id="m2", task="实现用户认证模块", assignee="张三",
                       due_date="2024-03-01", priority=Priority.MEDIUM,
                       description="需要支持OAuth2", related_topics=["安全"]),
        ]
        before = [(i.id, i.priority.value, i.assignee, i.due_date, i.description) for i in items]
        self.assertEqual(before[0], ("m1", "low", None, None, None))
        self.assertEqual(before[1], ("m2", "medium", "张三", "2024-03-01", "需要支持OAuth2"))

        merged = ActionItemProcessor.merge_duplicates(
            ActionItemProcessor.find_duplicates(items, threshold=70), smart_merge=True
        )

        self.assertEqual(len(merged), 1, "合并后应只有1条")
        m = merged[0]
        self.assertEqual(m.priority, Priority.MEDIUM, "LOW+MEDIUM合并应为MEDIUM")
        self.assertEqual(m.assignee, "张三", "应保留有值的assignee")
        self.assertEqual(m.due_date, "2024-03-01", "应保留有值的due_date")
        self.assertEqual(m.description, "需要支持OAuth2", "应保留有值的description")
        self.assertIn("安全", m.related_topics, "应合并related_topics")

    def test_merge_priority_high_wins(self):
        items = [
            ActionItem(id="h1", task="修复支付流程bug", assignee="李四",
                       due_date="2024-02-15", priority=Priority.HIGH,
                       description="支付失败", related_topics=["支付"]),
            ActionItem(id="h2", task="修复支付流程bug", assignee=None,
                       due_date=None, priority=Priority.LOW,
                       description=None, related_topics=["后端"]),
        ]
        merged = ActionItemProcessor.merge_duplicates(
            ActionItemProcessor.find_duplicates(items, threshold=70), smart_merge=True
        )

        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0].priority, Priority.HIGH, "HIGH+LOW合并应为HIGH")

    def test_merge_preserves_both_descriptions(self):
        items = [
            ActionItem(id="d1", task="优化搜索功能", assignee="王五",
                       priority=Priority.MEDIUM,
                       description="搜索速度慢", related_topics=["搜索"]),
            ActionItem(id="d2", task="优化搜索功能", assignee=None,
                       priority=Priority.LOW,
                       description="搜索结果不准确", related_topics=["算法"]),
        ]
        merged = ActionItemProcessor.merge_duplicates(
            ActionItemProcessor.find_duplicates(items, threshold=70), smart_merge=True
        )

        self.assertEqual(len(merged), 1)
        desc = merged[0].description
        self.assertIn("搜索速度慢", desc, "应保留第一条description")
        self.assertIn("搜索结果不准确", desc, "应保留第二条description")

    def test_merge_three_duplicates(self):
        items = [
            ActionItem(id="t1", task="编写API文档", assignee=None,
                       priority=Priority.LOW, description="文档缺失",
                       related_topics=["文档"]),
            ActionItem(id="t2", task="编写API文档", assignee="赵六",
                       priority=Priority.MEDIUM, description=None,
                       related_topics=["API"]),
            ActionItem(id="t3", task="编写API文档", assignee=None,
                       priority=Priority.HIGH, description="用户反馈强烈",
                       related_topics=["用户体验"]),
        ]
        merged = ActionItemProcessor.merge_duplicates(
            ActionItemProcessor.find_duplicates(items, threshold=70), smart_merge=True
        )

        self.assertEqual(len(merged), 1, "三条重复应合并为一条")
        self.assertEqual(merged[0].priority, Priority.HIGH, "LOW+MEDIUM+HIGH合并应为HIGH")
        self.assertEqual(merged[0].assignee, "赵六", "应保留唯一的assignee")
        self.assertTrue(len(merged[0].related_topics) >= 2, "应合并所有related_topics")

    def test_no_merge_for_different_tasks(self):
        items = [
            ActionItem(id="u1", task="设计数据库架构", assignee="张三", priority=Priority.HIGH),
            ActionItem(id="u2", task="设计前端页面", assignee="李四", priority=Priority.MEDIUM),
            ActionItem(id="u3", task="编写单元测试", assignee="王五", priority=Priority.LOW),
        ]
        merged = ActionItemProcessor.merge_duplicates(
            ActionItemProcessor.find_duplicates(items, threshold=70), smart_merge=True
        )

        self.assertEqual(len(merged), 3, "不同任务不应被合并")

    def test_merge_data_snapshot_before_after(self):
        items = [
            ActionItem(id="s1", task="部署测试环境", assignee=None,
                       due_date=None, priority=Priority.LOW,
                       description="环境配置", related_topics=["运维"]),
            ActionItem(id="s2", task="部署测试环境", assignee="钱七",
                       due_date="2024-04-01", priority=Priority.MEDIUM,
                       description=None, related_topics=["测试"]),
        ]

        snapshot_before = {
            "count": len(items),
            "priorities": [i.priority.value for i in items],
            "assignees": [i.assignee for i in items],
            "due_dates": [i.due_date for i in items],
            "descriptions": [i.description for i in items],
        }

        merged = ActionItemProcessor.merge_duplicates(
            ActionItemProcessor.find_duplicates(items, threshold=70), smart_merge=True
        )

        snapshot_after = {
            "count": len(merged),
            "priorities": [i.priority.value for i in merged],
            "assignees": [i.assignee for i in merged],
            "due_dates": [i.due_date for i in merged],
            "descriptions": [i.description for i in merged],
        }

        self.assertEqual(snapshot_before["count"], 2)
        self.assertEqual(snapshot_after["count"], 1)
        self.assertEqual(snapshot_before["priorities"], ["low", "medium"])
        self.assertEqual(snapshot_after["priorities"], ["medium"])
        self.assertIn(None, snapshot_before["assignees"])
        self.assertEqual(snapshot_after["assignees"], ["钱七"])
        self.assertIn(None, snapshot_before["due_dates"])
        self.assertEqual(snapshot_after["due_dates"], ["2024-04-01"])


class TestTTSEndToEnd(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.summary = MeetingSummary(
            title="测试会议",
            meeting_type=MeetingType.GENERAL,
            main_topic="讨论项目进展",
            participants=["张三"],
            decisions=["决定上线"],
            action_items=[
                ActionItem(id="1", task="完成开发", assignee="张三",
                           priority=Priority.HIGH, due_date="2024-01-20")
            ],
            raw_transcript=""
        )

    def test_gtts_generates_audio_file(self):
        try:
            from gtts import gTTS
        except ImportError:
            self.skipTest("gTTS not installed")

        output_path = os.path.join(self.temp_dir, "test_gtts.mp3")
        tts = TTSGenerator(engine="gtts")
        try:
            result = tts.generate_summary_audio(
                self.summary, output_path, include_action_items=True, verbose=False
            )
            self.assertEqual(result, output_path)
            self.assertTrue(os.path.exists(output_path), "gTTS应生成音频文件")
            file_size = os.path.getsize(output_path)
            self.assertGreater(file_size, 0, "生成的音频文件大小应大于0")
        except RuntimeError as e:
            if "Failed to connect" in str(e) or "proxy" in str(e).lower():
                self.skipTest("gTTS requires network access (proxy unavailable)")

    def test_gtts_audio_is_valid_mp3(self):
        try:
            from gtts import gTTS
        except ImportError:
            self.skipTest("gTTS not installed")

        output_path = os.path.join(self.temp_dir, "test_valid.mp3")
        tts = TTSGenerator(engine="gtts")
        try:
            tts.generate_summary_audio(self.summary, output_path)

            with open(output_path, 'rb') as f:
                header = f.read(3)
                is_mp3 = header[:2] == b'\xff\xfb' or header[:3] == b'ID3' or header[:2] == b'\xff\xf3'
                self.assertTrue(is_mp3, "生成的文件应为有效的MP3格式")
        except RuntimeError as e:
            if "Failed to connect" in str(e) or "proxy" in str(e).lower():
                self.skipTest("gTTS requires network access (proxy unavailable)")

    def test_gtts_without_action_items(self):
        try:
            from gtts import gTTS
        except ImportError:
            self.skipTest("gTTS not installed")

        output_path = os.path.join(self.temp_dir, "test_no_actions.mp3")
        tts = TTSGenerator(engine="gtts")
        try:
            result = tts.generate_summary_audio(
                self.summary, output_path, include_action_items=False
            )
            self.assertTrue(os.path.exists(output_path))
        except RuntimeError as e:
            if "Failed to connect" in str(e) or "proxy" in str(e).lower():
                self.skipTest("gTTS requires network access (proxy unavailable)")

    def test_summary_text_generation(self):
        tts = TTSGenerator(engine="gtts")
        text = tts._generate_summary_text(self.summary, include_action_items=True)
        self.assertIn("测试会议", text)
        self.assertIn("讨论项目进展", text)
        self.assertIn("张三", text)
        self.assertIn("完成开发", text)

    def test_check_dependencies(self):
        deps = TTSGenerator.check_dependencies()
        self.assertIsInstance(deps, dict)
        self.assertIn("gtts", deps)
        self.assertIn("pyttsx3", deps)
        for name, info in deps.items():
            self.assertIn("available", info)

    def test_empty_text_raises_error(self):
        tts = TTSGenerator(engine="gtts")
        output_path = os.path.join(self.temp_dir, "empty.mp3")
        with self.assertRaises(ValueError):
            tts.generate_audio("", output_path)

    def test_split_long_text(self):
        tts = TTSGenerator(engine="gtts")
        long_text = "这是第一句话。这是第二句话。这是第三句话。" * 200
        parts = tts._split_long_text(long_text, max_length=500)
        self.assertTrue(len(parts) > 1, "长文本应被分成多段")
        for part in parts:
            self.assertLessEqual(len(part), 600, "每段文本长度应合理")

    def test_pyttsx3_generates_audio_file(self):
        try:
            import pyttsx3
        except ImportError:
            self.skipTest("pyttsx3 not installed")

        output_path = os.path.join(self.temp_dir, "test_pyttsx3.wav")
        tts = TTSGenerator(engine="pyttsx3")
        try:
            result = tts.generate_audio("这是一个测试", output_path)
            self.assertEqual(result, output_path)
            self.assertTrue(os.path.exists(output_path), "pyttsx3应生成音频文件")
            file_size = os.path.getsize(output_path)
            self.assertGreater(file_size, 0, "生成的音频文件大小应大于0")
        except Exception as e:
            if "driver" in str(e).lower() or "engine" in str(e).lower():
                self.skipTest(f"pyttsx3 engine unavailable: {e}")
            raise

    def test_pyttsx3_with_summary(self):
        try:
            import pyttsx3
        except ImportError:
            self.skipTest("pyttsx3 not installed")

        output_path = os.path.join(self.temp_dir, "test_summary.wav")
        tts = TTSGenerator(engine="pyttsx3")
        try:
            result = tts.generate_summary_audio(
                self.summary, output_path, include_action_items=True
            )
            self.assertTrue(os.path.exists(output_path), "应生成完整摘要音频")
        except Exception as e:
            if "driver" in str(e).lower() or "engine" in str(e).lower():
                self.skipTest(f"pyttsx3 engine unavailable: {e}")
            raise

    def tearDown(self):
        shutil.rmtree(self.temp_dir)


if __name__ == '__main__':
    unittest.main()
