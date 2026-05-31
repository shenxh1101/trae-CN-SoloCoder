#!/usr/bin/env python3
import sys
from pathlib import Path
from datetime import date

print("=" * 70)
print("                    AI 日记分析工具 - 功能测试")
print("=" * 70)

def setup_sample_diaries():
    sample_diaries = [
        ("2024-01-01", "今天是新年第一天，心情很好，和家人一起吃了丰盛的晚餐。明天开始要坚持跑步，保持健康的生活方式。"),
        ("2024-01-02", "工作压力有点大，加班到很晚。不过晚上回家后做了冥想，感觉平静了很多。"),
        ("2024-01-03", "今天和朋友聚会很开心，聊了很多有趣的话题。感觉自己需要多参加社交活动，减少独处时间。"),
        ("2024-01-04", "早起去跑步了，空气清新，感觉整个人都充满活力。工作效率也提高了，完成了重要的项目任务。"),
        ("2024-01-05", "遇到了一些挫折，心情有点沮丧。不过想到之前的努力，还是决定继续坚持下去。"),
        ("2024-01-06", "周末了，读了一本好书，学到了很多新知识。下午去公园散步，享受阳光。"),
        ("2024-01-07", "为下周制定了详细的学习计划。感觉自己在不断成长，对未来充满希望。"),
        ("2024-01-08", "工作压力依然很大，但学会了调整心态。晚上做了瑜伽，身体很放松。"),
        ("2024-01-09", "今天跑步时遇到了邻居，一起聊了很多关于健康的话题。决定以后每周跑步三次。"),
        ("2024-01-10", "项目取得了进展，感到很有成就感。晚上和家人庆祝了一下，很幸福。"),
        ("2024-01-11", "有点焦虑，可能是因为任务太多。需要学会合理安排时间，避免过度劳累。"),
        ("2024-01-12", "今天的天气很好，心情也跟着好起来。完成了所有的工作任务，感觉很满足。"),
        ("2024-01-13", "去健身房锻炼了，身体很累但很舒服。晚上看了一部电影，放松了一下。"),
        ("2024-01-14", "和家人通了电话，听到他们的声音感觉很温暖。这周的目标基本完成了。"),
        ("2024-01-15", "新的一周开始了，充满干劲。工作上有了新的想法，很期待实现。"),
    ]

    diaries_dir = Path(__file__).parent / "diaries"
    diaries_dir.mkdir(exist_ok=True)

    for date_str, content in sample_diaries:
        file_path = diaries_dir / f"{date_str}.txt"
        if not file_path.exists():
            file_path.write_text(content, encoding="utf-8")

setup_sample_diaries()

passed = 0
failed = 0
errors = []

def test(name):
    def decorator(func):
        global passed, failed, errors
        try:
            func()
            print(f"✓ {name}")
            passed += 1
        except Exception as e:
            print(f"✗ {name}")
            print(f"  错误: {e}")
            errors.append((name, str(e)))
            failed += 1
        return func
    return decorator

@test("1. 日记文件读取")
def test_diary_reader():
    from diary_reader import DiaryReader
    reader = DiaryReader()
    assert len(reader.entries) > 0, "没有日记条目"
    assert reader.entries[0].date is not None
    assert reader.entries[0].content is not None

@test("2. 情绪分析")
def test_sentiment():
    from diary_reader import DiaryReader
    from sentiment_analyzer import SentimentAnalyzer
    reader = DiaryReader()
    sa = SentimentAnalyzer()
    sa.analyze_all(reader.entries)
    for entry in reader.entries:
        assert entry.sentiment_score is not None
        assert 0 <= entry.sentiment_score <= 1

@test("3. 关键词分析")
def test_keywords():
    from diary_reader import DiaryReader
    from trend_analyzer import TrendAnalyzer
    reader = DiaryReader()
    ta = TrendAnalyzer()
    ta.analyze_all(reader.entries)
    for entry in reader.entries:
        assert isinstance(entry.keywords, list)

@test("4. 月度关键词统计")
def test_monthly_keywords():
    from diary_reader import DiaryReader
    from trend_analyzer import TrendAnalyzer
    reader = DiaryReader()
    ta = TrendAnalyzer()
    keywords = ta.get_monthly_keywords(reader.entries, 2024, 1)
    assert isinstance(keywords, list)
    assert len(keywords) > 0

@test("5. ASCII 折线图")
def test_ascii_line_chart():
    from ascii_chart import ASCIIChart
    chart = ASCIIChart()
    data = {'01': 0.5, '02': 0.6, '03': 0.7, '04': 0.55, '05': 0.65}
    result = chart.plot_line_chart(data, title="测试")
    assert isinstance(result, str)
    assert len(result) > 0

@test("6. ASCII 柱状图")
def test_ascii_bar_chart():
    from ascii_chart import ASCIIChart
    chart = ASCIIChart()
    data = {'工作': 10, '健康': 8, '家人': 5}
    result = chart.plot_bar_chart(data, title="测试")
    assert isinstance(result, str)
    assert len(result) > 0

@test("7. 搜索功能")
def test_search():
    from diary_reader import DiaryReader
    from search_engine import SearchEngine
    reader = DiaryReader()
    se = SearchEngine(reader.entries)
    results = se.search('跑步')
    assert isinstance(results, list)

@test("8. 问答功能")
def test_qa():
    from diary_reader import DiaryReader
    from search_engine import SearchEngine
    reader = DiaryReader()
    se = SearchEngine(reader.entries)
    result = se.answer_question("我什么时候提到过跑步？")
    assert isinstance(result, dict)
    assert "answer" in result

@test("9. 关注点变化分析")
def test_focus_shift():
    from diary_reader import DiaryReader
    from trend_analyzer import TrendAnalyzer
    reader = DiaryReader()
    ta = TrendAnalyzer()
    result = ta.get_focus_shift_analysis(reader.entries)
    assert isinstance(result, dict)

@test("10. 负面模式检测")
def test_negative_patterns():
    from diary_reader import DiaryReader
    from trend_analyzer import TrendAnalyzer
    reader = DiaryReader()
    ta = TrendAnalyzer()
    patterns = ta.detect_negative_patterns(reader.entries)
    assert isinstance(patterns, list)

@test("11. 个人成长报告")
def test_growth_report():
    from diary_reader import DiaryReader
    from report_generator import ReportGenerator
    reader = DiaryReader()
    rg = ReportGenerator(reader.entries)
    report = rg.generate_personal_growth_report()
    assert isinstance(report, str)
    assert len(report) > 0

@test("12. 月度报告")
def test_monthly_report():
    from diary_reader import DiaryReader
    from report_generator import ReportGenerator
    reader = DiaryReader()
    rg = ReportGenerator(reader.entries)
    report = rg.generate_monthly_report(2024, 1)
    assert isinstance(report, str)
    assert len(report) > 0

@test("13. 关键词高亮")
def test_highlight():
    from display_utils import DisplayUtils
    text = "今天很开心，但是工作压力很大"
    result = DisplayUtils.highlight_keywords(text)
    assert isinstance(result, str)

@test("14. 情绪分数格式化")
def test_sentiment_format():
    from display_utils import DisplayUtils
    result = DisplayUtils.format_sentiment_score(0.8)
    assert isinstance(result, str)

@test("15. 连续日记提醒检查")
def test_reminder_check():
    from diary_reader import DiaryReader
    reader = DiaryReader()
    days_missing, should_remind = reader.check_consecutive_missing_days()
    assert isinstance(days_missing, int)
    assert isinstance(should_remind, bool)

@test("16. 今日推荐行动")
def test_recommendations():
    from diary_reader import DiaryReader
    from weather_recommender import ActionRecommender
    reader = DiaryReader()
    ar = ActionRecommender(reader.entries)
    plan = ar.get_daily_recommendation()
    assert isinstance(plan, dict)
    assert "actions" in plan

@test("17. 数据导出（JSON）")
def test_export_json():
    from diary_reader import DiaryReader
    from data_exporter import DataExporter
    reader = DiaryReader()
    de = DataExporter(reader.entries)
    path = de.export_to_json("test_export.json", anonymize=False)
    assert isinstance(path, str)

@test("18. 匿名数据导出")
def test_export_anonymized():
    from diary_reader import DiaryReader
    from data_exporter import DataExporter
    reader = DiaryReader()
    de = DataExporter(reader.entries)
    path = de.export_to_json("test_anon.json", anonymize=True)
    assert isinstance(path, str)

@test("19. 情绪数据导出")
def test_export_sentiment():
    from diary_reader import DiaryReader
    from data_exporter import DataExporter
    reader = DiaryReader()
    de = DataExporter(reader.entries)
    path = de.export_sentiment_data(2024, 1)
    assert isinstance(path, str)

@test("20. 天气关联分析")
def test_weather_correlation():
    from diary_reader import DiaryReader
    from weather_recommender import WeatherManager
    reader = DiaryReader()
    wm = WeatherManager()
    correlation = wm.get_weather_correlation(reader.entries)
    assert isinstance(correlation, dict)

print("\n" + "=" * 70)
print(f"测试结果: {passed} 通过, {failed} 失败")
print("=" * 70)

if errors:
    print("\n详细错误:")
    for name, error in errors:
        print(f"  - {name}: {error}")
else:
    print("\n🎉 所有功能测试通过！")

sys.exit(failed)
