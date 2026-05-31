#!/usr/bin/env python3
import unittest
import json
import os
import tempfile
from pathlib import Path
from datetime import date, datetime
from dataclasses import dataclass, field
from typing import List, Dict, Optional

from diary_reader import DiaryReader, DiaryEntry
from sentiment_analyzer import SentimentAnalyzer
from trend_analyzer import TrendAnalyzer
from ascii_chart import ASCIIChart
from search_engine import SearchEngine
from report_generator import ReportGenerator
from data_exporter import DataExporter
from display_utils import DisplayUtils, Color
from weather_recommender import WeatherManager, ActionRecommender


def make_entry(d: str, content: str, score: float = None) -> DiaryEntry:
    return DiaryEntry(
        date=datetime.strptime(d, "%Y-%m-%d").date(),
        content=content,
        filename=f"{d}.txt",
        sentiment_score=score
    )


SAMPLE_ENTRIES = [
    make_entry("2024-01-01", "今天是新年第一天，心情很好，和家人一起吃了丰盛的晚餐。明天开始要坚持跑步，保持健康的生活方式。"),
    make_entry("2024-01-02", "工作压力有点大，加班到很晚。不过晚上回家后做了冥想，感觉平静了很多。"),
    make_entry("2024-01-03", "今天和朋友聚会很开心，聊了很多有趣的话题。感觉自己需要多参加社交活动，减少独处时间。"),
    make_entry("2024-01-04", "早起去跑步了，空气清新，感觉整个人都充满活力。工作效率也提高了，完成了重要的项目任务。"),
    make_entry("2024-01-05", "遇到了一些挫折，心情有点沮丧。不过想到之前的努力，还是决定继续坚持下去。"),
    make_entry("2024-01-06", "周末了，读了一本好书，学到了很多新知识。下午去公园散步，享受阳光。"),
    make_entry("2024-01-07", "为下周制定了详细的学习计划。感觉自己在不断成长，对未来充满希望。"),
    make_entry("2024-01-08", "工作压力依然很大，但学会了调整心态。晚上做了瑜伽，身体很放松。"),
    make_entry("2024-01-09", "今天跑步时遇到了邻居，一起聊了很多关于健康的话题。决定以后每周跑步三次。"),
    make_entry("2024-01-10", "项目取得了进展，感到很有成就感。晚上和家人庆祝了一下，很幸福。"),
    make_entry("2024-01-11", "有点焦虑，可能是因为任务太多。需要学会合理安排时间，避免过度劳累。"),
    make_entry("2024-01-12", "今天的天气很好，心情也跟着好起来。完成了所有的工作任务，感觉很满足。"),
    make_entry("2024-01-13", "去健身房锻炼了，身体很累但很舒服。晚上看了一部电影，放松了一下。"),
    make_entry("2024-01-14", "和家人通了电话，听到他们的声音感觉很温暖。这周的目标基本完成了。"),
    make_entry("2024-01-15", "新的一周开始了，充满干劲。工作上有了新的想法，很期待实现。"),
]


class TestDiaryReader(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        for i, entry in enumerate(SAMPLE_ENTRIES):
            filepath = Path(self.tmpdir) / f"{entry.date.isoformat()}.txt"
            filepath.write_text(entry.content, encoding="utf-8")

    def test_load_entries(self):
        reader = DiaryReader(Path(self.tmpdir))
        self.assertGreater(len(reader.entries), 0)

    def test_entries_sorted_by_date(self):
        reader = DiaryReader(Path(self.tmpdir))
        dates = [e.date for e in reader.entries]
        self.assertEqual(dates, sorted(dates))

    def test_get_entries_by_month(self):
        reader = DiaryReader(Path(self.tmpdir))
        jan = reader.get_entries_by_month(2024, 1)
        self.assertGreater(len(jan), 0)
        for e in jan:
            self.assertEqual(e.date.year, 2024)
            self.assertEqual(e.date.month, 1)

    def test_get_entries_by_year(self):
        reader = DiaryReader(Path(self.tmpdir))
        y2024 = reader.get_entries_by_year(2024)
        self.assertGreater(len(y2024), 0)

    def test_empty_directory(self):
        empty_dir = Path(tempfile.mkdtemp())
        reader = DiaryReader(empty_dir)
        self.assertEqual(len(reader.entries), 0)

    def test_invalid_file_encoding(self):
        bad_file = Path(self.tmpdir) / "2024-02-01.txt"
        bad_file.write_bytes(b'\xff\xfe\x00\x00')
        reader = DiaryReader(Path(self.tmpdir))
        for e in reader.entries:
            self.assertIsNotNone(e.date)

    def test_empty_file(self):
        empty_file = Path(self.tmpdir) / "2024-02-02.txt"
        empty_file.write_text("", encoding="utf-8")
        reader = DiaryReader(Path(self.tmpdir))
        for e in reader.entries:
            self.assertTrue(e.content.strip())

    def test_check_missing_days(self):
        reader = DiaryReader(Path(self.tmpdir))
        days_missing, should_remind = reader.check_consecutive_missing_days()
        self.assertIsInstance(days_missing, int)
        self.assertIsInstance(should_remind, bool)

    def test_get_available_years(self):
        reader = DiaryReader(Path(self.tmpdir))
        years = reader.get_available_years()
        self.assertIn(2024, years)

    def test_get_entry_by_date(self):
        reader = DiaryReader(Path(self.tmpdir))
        entry = reader.get_entry_by_date(date(2024, 1, 1))
        self.assertIsNotNone(entry)
        self.assertEqual(entry.date, date(2024, 1, 1))

    def test_nonexistent_date(self):
        reader = DiaryReader(Path(self.tmpdir))
        entry = reader.get_entry_by_date(date(2099, 1, 1))
        self.assertIsNone(entry)


class TestSentimentAnalyzer(unittest.TestCase):
    def setUp(self):
        self.analyzer = SentimentAnalyzer()
        self.entries = [make_entry("2024-01-01", "今天很开心快乐满足")]

    def test_analyze_entry(self):
        score = self.analyzer.analyze_entry(self.entries[0])
        self.assertIsNotNone(score)
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_negative_entry(self):
        entry = make_entry("2024-01-02", "今天很难过伤心痛苦")
        score = self.analyzer.analyze_entry(entry)
        self.assertLess(score, 0.5)

    def test_empty_content(self):
        entry = make_entry("2024-01-03", "")
        score = self.analyzer.analyze_entry(entry)
        self.assertEqual(score, 0.5)

    def test_neutral_content(self):
        entry = make_entry("2024-01-04", "今天吃了饭然后睡觉了")
        score = self.analyzer.analyze_entry(entry)
        self.assertEqual(score, 0.5)

    def test_analyze_all(self):
        entries = SAMPLE_ENTRIES[:]
        result = self.analyzer.analyze_all(entries)
        for e in entries:
            self.assertIsNotNone(e.sentiment_score)

    def test_monthly_sentiment(self):
        self.analyzer.analyze_all(SAMPLE_ENTRIES)
        monthly = self.analyzer.get_monthly_sentiment(SAMPLE_ENTRIES, 2024, 1)
        self.assertIsInstance(monthly, dict)
        self.assertGreater(len(monthly), 0)

    def test_yearly_sentiment(self):
        self.analyzer.analyze_all(SAMPLE_ENTRIES)
        yearly = self.analyzer.get_yearly_sentiment(SAMPLE_ENTRIES, 2024)
        self.assertIsInstance(yearly, dict)

    def test_sentiment_trend(self):
        self.analyzer.analyze_all(SAMPLE_ENTRIES)
        trend = self.analyzer.get_sentiment_trend(SAMPLE_ENTRIES)
        self.assertIsInstance(trend, list)

    def test_sentiment_summary(self):
        self.analyzer.analyze_all(SAMPLE_ENTRIES)
        summary = self.analyzer.get_sentiment_summary(SAMPLE_ENTRIES)
        self.assertIn("avg_score", summary)
        self.assertIn("total_days", summary)
        self.assertIn("positive_days", summary)


class TestTrendAnalyzer(unittest.TestCase):
    def setUp(self):
        self.analyzer = TrendAnalyzer()
        self.entries = SAMPLE_ENTRIES[:]

    def test_extract_keywords(self):
        kws = self.analyzer.extract_keywords("今天跑步很开心，跑步真好", 5)
        self.assertIsInstance(kws, list)

    def test_empty_text(self):
        kws = self.analyzer.extract_keywords("", 5)
        self.assertEqual(kws, [])

    def test_analyze_entry_keywords(self):
        self.analyzer.analyze_entry_keywords(self.entries[0])
        self.assertIsInstance(self.entries[0].keywords, list)

    def test_monthly_keywords(self):
        kws = self.analyzer.get_monthly_keywords(self.entries, 2024, 1)
        self.assertIsInstance(kws, list)

    def test_monthly_keywords_empty(self):
        kws = self.analyzer.get_monthly_keywords(self.entries, 2099, 1)
        self.assertEqual(kws, [])

    def test_analyze_categories(self):
        cats = self.analyzer.analyze_categories(self.entries[0])
        self.assertIsInstance(cats, dict)
        for cat in cats:
            self.assertGreaterEqual(cats[cat], 0.0)

    def test_empty_entry_categories(self):
        empty = DiaryEntry(date=date(2024,1,1), content="", filename="test.txt")
        cats = self.analyzer.analyze_categories(empty)
        self.assertIsInstance(cats, dict)

    def test_focus_shift(self):
        for e in self.entries:
            self.analyzer.analyze_categories(e)
        result = self.analyzer.get_focus_shift_analysis(self.entries)
        self.assertIsInstance(result, dict)

    def test_negative_patterns(self):
        SentimentAnalyzer().analyze_all(self.entries)
        patterns = self.analyzer.detect_negative_patterns(self.entries)
        self.assertIsInstance(patterns, list)

    def test_analyze_all(self):
        self.analyzer.analyze_all(self.entries)
        for e in self.entries:
            self.assertIsInstance(e.keywords, list)
            self.assertIsInstance(e.categories, dict)


class TestASCIIChart(unittest.TestCase):
    def setUp(self):
        self.chart = ASCIIChart(height=10, width=40)

    def test_line_chart_basic(self):
        data = {"01": 0.5, "02": 0.6, "03": 0.7}
        result = self.chart.plot_line_chart(data, title="Test")
        self.assertIsInstance(result, str)
        self.assertIn("●", result)

    def test_line_chart_empty(self):
        result = self.chart.plot_line_chart({})
        self.assertEqual(result, "暂无数据可显示")

    def test_line_chart_single_point(self):
        data = {"01": 0.5}
        result = self.chart.plot_line_chart(data)
        self.assertIsInstance(result, str)

    def test_bar_chart_basic(self):
        data = {"工作": 10, "健康": 8}
        result = self.chart.plot_bar_chart(data, title="Test")
        self.assertIsInstance(result, str)
        self.assertIn("█", result)

    def test_bar_chart_empty(self):
        result = self.chart.plot_bar_chart({})
        self.assertEqual(result, "暂无数据可显示")

    def test_monthly_calendar(self):
        data = {"1": 0.8, "2": 0.5, "3": 0.3}
        result = self.chart.plot_monthly_calendar(data, 2024, 1)
        self.assertIsInstance(result, str)

    def test_category_radar(self):
        data = {"工作压力": 0.3, "健康生活": 0.5}
        result = self.chart.plot_category_radar(data)
        self.assertIsInstance(result, str)

    def test_line_chart_non_numeric_values(self):
        data = {"01": "bad", "02": 0.5}
        result = self.chart.plot_line_chart(data)
        self.assertIsInstance(result, str)


class TestSearchEngine(unittest.TestCase):
    def setUp(self):
        self.entries = SAMPLE_ENTRIES[:]
        self.engine = SearchEngine(self.entries)

    def test_search_basic(self):
        results = self.engine.search("跑步")
        self.assertGreater(len(results), 0)

    def test_search_no_match(self):
        results = self.engine.search("量子物理")
        self.assertEqual(len(results), 0)

    def test_search_empty_query(self):
        results = self.engine.search("")
        self.assertEqual(results, [])

    def test_search_by_keywords_match_all(self):
        results = self.engine.search_by_keywords(["跑步", "健康"], match_all=True)
        self.assertIsInstance(results, list)

    def test_search_by_keywords_match_any(self):
        results = self.engine.search_by_keywords(["跑步", "工作"], match_all=False)
        self.assertGreater(len(results), 0)

    def test_qa_when_question(self):
        result = self.engine.answer_question("我什么时候提到过跑步？")
        self.assertIn("answer", result)
        self.assertIn("跑步", result["answer"])

    def test_qa_count_question(self):
        result = self.engine.answer_question("我提到工作多少次？")
        self.assertIn("answer", result)

    def test_qa_superlative_best(self):
        SentimentAnalyzer().analyze_all(self.entries)
        result = self.engine.answer_question("我最开心的是哪天？")
        self.assertIn("answer", result)

    def test_qa_superlative_worst(self):
        SentimentAnalyzer().analyze_all(self.entries)
        result = self.engine.answer_question("我最沮丧的是哪天？")
        self.assertIn("answer", result)

    def test_qa_emotion_question(self):
        SentimentAnalyzer().analyze_all(self.entries)
        result = self.engine.answer_question("我最近的情绪怎么样？")
        self.assertIn("answer", result)

    def test_qa_time_range_year_month(self):
        result = self.engine.answer_question("2024年1月我提到了什么？")
        self.assertIn("answer", result)
        self.assertNotIn("到了", result["answer"])

    def test_qa_time_range_this_year(self):
        result = self.engine.answer_question("今年我提到了什么？")
        self.assertIn("answer", result)

    def test_qa_time_range_last_year(self):
        result = self.engine.answer_question("去年情绪如何？")
        self.assertIn("answer", result)

    def test_qa_time_range_recent_weeks(self):
        result = self.engine.answer_question("最近3周心情如何？")
        self.assertIn("answer", result)

    def test_qa_time_range_quarter(self):
        result = self.engine.answer_question("2024年第1季度有什么？")
        self.assertIn("answer", result)

    def test_qa_time_range_last_month(self):
        result = self.engine.answer_question("上个月的心情如何？")
        self.assertIn("answer", result)

    def test_search_multi_word(self):
        results = self.engine.search("跑步 工作 压力")
        self.assertIsInstance(results, list)
        if results:
            self.assertIn("matched_keywords", results[0])

    def test_search_multi_keyword_highlight(self):
        from display_utils import DisplayUtils
        highlighted = DisplayUtils.highlight_search_result(
            "今天去跑步了，工作很顺利，没有压力",
            ["跑步", "工作", "压力"]
        )
        self.assertIn("\033[1m", highlighted)

    def test_search_tokenize_query(self):
        tokens = self.engine._tokenize_query("跑步，工作和压力")
        self.assertIsInstance(tokens, list)
        self.assertIn("跑步", tokens)
        self.assertIn("工作", tokens)

    def test_qa_emotion_question(self):
        SentimentAnalyzer().analyze_all(self.entries)
        result = self.engine.answer_question("我最近的情绪怎么样？")
        self.assertIn("answer", result)


class TestReportGenerator(unittest.TestCase):
    def setUp(self):
        self.entries = SAMPLE_ENTRIES[:]
        self.generator = ReportGenerator(self.entries)

    def test_monthly_report(self):
        report = self.generator.generate_monthly_report(2024, 1)
        self.assertIsInstance(report, str)
        self.assertGreater(len(report), 0)

    def test_monthly_report_empty(self):
        report = self.generator.generate_monthly_report(2099, 1)
        self.assertIn("没有日记记录", report)

    def test_yearly_report(self):
        report = self.generator.generate_yearly_report(2024)
        self.assertIsInstance(report, str)
        self.assertGreater(len(report), 0)

    def test_growth_report(self):
        report = self.generator.generate_personal_growth_report()
        self.assertIsInstance(report, str)

    def test_empty_entries(self):
        gen = ReportGenerator([])
        report = gen.generate_personal_growth_report()
        self.assertIsInstance(report, str)


class TestDataExporter(unittest.TestCase):
    def setUp(self):
        self.entries = SAMPLE_ENTRIES[:]
        SentimentAnalyzer().analyze_all(self.entries)
        TrendAnalyzer().analyze_all(self.entries)
        self.exporter = DataExporter(self.entries)

    def test_export_json(self):
        path = self.exporter.export_to_json("test_unit_export.json", anonymize=False)
        self.assertTrue(Path(path).exists())
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        self.assertIn("summary", data)
        self.assertIn("entries", data)

    def test_export_anonymized(self):
        path = self.exporter.export_to_json("test_unit_anon.json", anonymize=True)
        self.assertTrue(Path(path).exists())
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        self.assertTrue(data["summary"]["anonymized"])

    def test_export_sentiment(self):
        path = self.exporter.export_sentiment_data(2024, 1)
        self.assertTrue(Path(path).exists())

    def test_export_keywords(self):
        path = self.exporter.export_keyword_frequency()
        self.assertTrue(Path(path).exists())

    def test_empty_entries(self):
        exporter = DataExporter([])
        path = exporter.export_to_json("test_unit_empty.json")
        self.assertTrue(Path(path).exists())


class TestDisplayUtils(unittest.TestCase):
    def test_highlight_positive(self):
        text = "今天很开心"
        result = DisplayUtils.highlight_keywords(text)
        self.assertIn(Color.GREEN, result)

    def test_highlight_negative(self):
        text = "今天很焦虑"
        result = DisplayUtils.highlight_keywords(text)
        self.assertIn(Color.RED, result)

    def test_highlight_empty(self):
        result = DisplayUtils.highlight_keywords("")
        self.assertEqual(result, "")

    def test_format_score_high(self):
        result = DisplayUtils.format_sentiment_score(0.8)
        self.assertIn("😊", result)

    def test_format_score_low(self):
        result = DisplayUtils.format_sentiment_score(0.2)
        self.assertIn("😢", result)

    def test_format_score_none(self):
        result = DisplayUtils.format_sentiment_score(None)
        self.assertIn("🙂", result)

    def test_search_highlight(self):
        result = DisplayUtils.highlight_search_result("今天去跑步了", "跑步")
        self.assertIn(Color.BOLD, result)


class TestWeatherRecommender(unittest.TestCase):
    def test_weather_manager_load(self):
        wm = WeatherManager()
        self.assertIsInstance(wm.weather_data, dict)

    def test_weather_add_record(self):
        tmpfile = Path(tempfile.mkdtemp()) / "weather_test.json"
        wm = WeatherManager(tmpfile)
        wm.add_weather_record("2024-01-01", "晴", 20)
        self.assertIn("2024-01-01", wm.weather_data)

    def test_weather_add_empty(self):
        tmpfile = Path(tempfile.mkdtemp()) / "weather_test.json"
        wm = WeatherManager(tmpfile)
        wm.add_weather_record("", "晴")
        self.assertEqual(len(wm.weather_data), 0)

    def test_weather_correlation(self):
        tmpfile = Path(tempfile.mkdtemp()) / "weather_test.json"
        wm = WeatherManager(tmpfile)
        wm.add_weather_record("2024-01-01", "晴", 20)
        wm.add_weather_record("2024-01-02", "雨", 10)
        entries = SAMPLE_ENTRIES[:2]
        SentimentAnalyzer().analyze_all(entries)
        corr = wm.get_weather_correlation(entries)
        self.assertIsInstance(corr, dict)

    def test_action_recommender(self):
        SentimentAnalyzer().analyze_all(SAMPLE_ENTRIES)
        ar = ActionRecommender(SAMPLE_ENTRIES)
        plan = ar.get_daily_recommendation()
        self.assertIn("actions", plan)
        self.assertGreater(len(plan["actions"]), 0)

    def test_action_empty_entries(self):
        ar = ActionRecommender([])
        plan = ar.get_daily_recommendation()
        self.assertIn("actions", plan)

    def test_action_plan(self):
        SentimentAnalyzer().analyze_all(SAMPLE_ENTRIES)
        ar = ActionRecommender(SAMPLE_ENTRIES)
        plan = ar.generate_action_plan()
        self.assertIn("daily_actions", plan)
        self.assertIn("weekly_focus", plan)


class TestEdgeCases(unittest.TestCase):
    def test_entry_with_none_content(self):
        entry = DiaryEntry(date=date(2024,1,1), content="", filename="t.txt")
        sa = SentimentAnalyzer()
        score = sa.analyze_entry(entry)
        self.assertEqual(score, 0.5)

    def test_very_long_content(self):
        entry = make_entry("2024-01-01", "开心" * 10000)
        sa = SentimentAnalyzer()
        score = sa.analyze_entry(entry)
        self.assertGreater(score, 0.5)

    def test_special_chars_in_search(self):
        engine = SearchEngine(SAMPLE_ENTRIES)
        results = engine.search(".*+?")
        self.assertIsInstance(results, list)

    def test_chart_with_extreme_values(self):
        chart = ASCIIChart()
        data = {"01": 0.0, "02": 1.0, "03": 0.5}
        result = chart.plot_line_chart(data)
        self.assertIsInstance(result, str)

    def test_chart_with_negative_values(self):
        chart = ASCIIChart()
        data = {"01": -0.5, "02": 0.5}
        result = chart.plot_line_chart(data)
        self.assertIsInstance(result, str)

    def test_search_engine_none_entries(self):
        engine = SearchEngine(None)
        result = engine.answer_question("测试")
        self.assertIn("answer", result)

    def test_exporter_none_entries(self):
        exporter = DataExporter(None)
        path = exporter.export_to_json("test_none.json")
        self.assertTrue(Path(path).exists())

    def test_report_generator_none_entries(self):
        gen = ReportGenerator(None)
        report = gen.generate_monthly_report(2024, 1)
        self.assertIn("没有日记记录", report)


class TestLogger(unittest.TestCase):
    def test_logger_creation(self):
        from logger_config import get_logger, log_info, log_error
        logger = get_logger("test")
        self.assertIsNotNone(logger)

    def test_log_info(self):
        from logger_config import get_logger, log_info
        logger = get_logger("test_info")
        log_info(logger, "测试信息")
        self.assertTrue(True)

    def test_log_error(self):
        from logger_config import get_logger, log_error
        logger = get_logger("test_error")
        log_error(logger, "测试错误", None)
        self.assertTrue(True)

    def test_log_search(self):
        from logger_config import get_logger, log_search
        logger = get_logger("test_search")
        log_search(logger, "跑步", 3)
        self.assertTrue(True)

    def test_get_recent_errors(self):
        from logger_config import get_recent_errors
        errors = get_recent_errors(5)
        self.assertIsInstance(errors, list)


if __name__ == "__main__":
    unittest.main(verbosity=2)
