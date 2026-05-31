#!/usr/bin/env python3
import sys
from datetime import date, datetime
from pathlib import Path

from diary_reader import DiaryReader
from sentiment_analyzer import SentimentAnalyzer
from trend_analyzer import TrendAnalyzer
from ascii_chart import ASCIIChart
from search_engine import SearchEngine
from report_generator import ReportGenerator
from data_exporter import DataExporter
from display_utils import DisplayUtils, Color
from weather_recommender import ActionRecommender, WeatherManager
from logger_config import get_logger, log_error, log_info, log_search, log_qa

logger = get_logger("main")


class DiaryAnalyzerApp:
    def __init__(self):
        try:
            self.diary_reader = DiaryReader()
            self.entries = self.diary_reader.entries
            log_info(logger, f"加载日记: {len(self.entries)} 篇")
        except Exception as e:
            log_error(logger, "加载日记失败", e)
            print(f"{Color.RED}加载日记失败: {e}{Color.RESET}")
            self.diary_reader = DiaryReader()
            self.entries = []

        DisplayUtils.print_welcome()

        try:
            missing_days, should_remind = self.diary_reader.check_consecutive_missing_days()
            if should_remind:
                log_info(logger, f"连续未写日记提醒: {missing_days} 天")
                DisplayUtils.print_reminder(missing_days)
        except Exception as e:
            log_error(logger, "检查连续缺失天数失败", e)

        if not self.entries:
            DisplayUtils.print_info("没有找到日记文件，请将日记放在 diaries 目录下")
            DisplayUtils.print_info("文件命名格式: YYYY-MM-DD.txt (如: 2024-01-01.txt)")
            try:
                self._create_sample_diaries()
                self.entries = self.diary_reader.entries
            except OSError as e:
                log_error(logger, "创建示例日记失败", e)
                DisplayUtils.print_error(f"无法创建示例日记: {e}")

        self._initialize_analyzers()

    def _initialize_analyzers(self):
        DisplayUtils.print_info("正在分析日记内容...")

        try:
            self.sentiment_analyzer = SentimentAnalyzer()
            self.sentiment_analyzer.analyze_all(self.entries)
            log_info(logger, "情绪分析完成")
        except Exception as e:
            log_error(logger, "情绪分析初始化失败", e)
            DisplayUtils.print_error(f"情绪分析初始化失败: {e}")
            self.sentiment_analyzer = SentimentAnalyzer()

        try:
            self.trend_analyzer = TrendAnalyzer()
            self.trend_analyzer.analyze_all(self.entries)
            log_info(logger, "趋势分析完成")
        except Exception as e:
            log_error(logger, "趋势分析初始化失败", e)
            DisplayUtils.print_error(f"趋势分析初始化失败: {e}")
            self.trend_analyzer = TrendAnalyzer()

        try:
            self.chart = ASCIIChart()
            self.search_engine = SearchEngine(self.entries)
            self.report_generator = ReportGenerator(self.entries)
            self.data_exporter = DataExporter(self.entries)
            self.action_recommender = ActionRecommender(self.entries)
            self.weather_manager = WeatherManager()
        except Exception as e:
            log_error(logger, "模块初始化失败", e)
            DisplayUtils.print_error(f"部分模块初始化失败: {e}")

        DisplayUtils.print_success(f"成功加载 {len(self.entries)} 篇日记")

    def _create_sample_diaries(self):
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

        self.diary_reader = DiaryReader()

        DisplayUtils.print_success("已创建示例日记文件，位于 diaries 目录下")

    def run(self):
        while True:
            DisplayUtils.print_menu()

            try:
                choice = input(f"\n{Color.BOLD}请输入选项: {Color.RESET}").strip()

                if choice == "0" or choice.lower() == "q":
                    DisplayUtils.print_info("感谢使用，再见！")
                    break
                elif choice == "1":
                    self.show_monthly_chart()
                elif choice == "2":
                    self.show_yearly_chart()
                elif choice == "3":
                    self.show_monthly_keywords()
                elif choice == "4":
                    self.search_diaries()
                elif choice == "5":
                    self.generate_growth_report()
                elif choice == "6":
                    self.generate_monthly_report()
                elif choice == "7":
                    self.generate_yearly_report()
                elif choice == "8":
                    self.export_data()
                elif choice == "9":
                    self.show_daily_recommendation()
                elif choice == "10":
                    self.show_diary_list()
                elif choice == "11":
                    self.view_diary_entry()
                else:
                    DisplayUtils.print_error("无效选项，请重新选择")

                input(f"\n{Color.BLUE}按 Enter 继续...{Color.RESET}")

            except KeyboardInterrupt:
                DisplayUtils.print_info("\n感谢使用，再见！")
                break
            except Exception as e:
                DisplayUtils.print_error(f"发生错误: {e}")

    def show_monthly_chart(self):
        year = self._input_year()
        month = self._input_month()

        try:
            monthly_sentiment = self.sentiment_analyzer.get_monthly_sentiment(
                self.entries, year, month
            )
        except Exception as e:
            DisplayUtils.print_error(f"获取情绪数据失败: {e}")
            return

        if not monthly_sentiment:
            DisplayUtils.print_error(f"{year}年{month}月没有日记记录")
            return

        print()
        print(self.chart.plot_line_chart(
            monthly_sentiment,
            title=f"{year}年{month}月情绪趋势",
            x_label="日期",
            y_label="情绪分数"
        ))
        print()

        print(self.chart.plot_monthly_calendar(monthly_sentiment, year, month))

    def show_yearly_chart(self):
        year = self._input_year()

        try:
            yearly_sentiment = self.sentiment_analyzer.get_yearly_sentiment(
                self.entries, year
            )
        except Exception as e:
            DisplayUtils.print_error(f"获取情绪数据失败: {e}")
            return

        if not yearly_sentiment:
            DisplayUtils.print_error(f"{year}年没有日记记录")
            return

        print()
        print(self.chart.plot_line_chart(
            yearly_sentiment,
            title=f"{year}年月度情绪均值",
            x_label="月份",
            y_label="情绪分数"
        ))
        print()

    def show_monthly_keywords(self):
        year = self._input_year()
        month = self._input_month()

        keywords = self.trend_analyzer.get_monthly_keywords(
            self.entries, year, month, top_n=15
        )

        if not keywords:
            DisplayUtils.print_error(f"{year}年{month}月没有日记记录")
            return

        DisplayUtils.print_keywords(keywords, f"{year}年{month}月高频词汇")

    def search_diaries(self):
        query = input(f"{Color.BOLD}请输入搜索关键词或问题: {Color.RESET}").strip()

        if not query:
            DisplayUtils.print_error("请输入有效的搜索内容")
            return

        is_question = any(q in query for q in [
            "？", "?", "什么", "怎么", "何时", "多少",
            "情绪", "心情", "最近", "哪天", "几次",
            "开心", "难过", "焦虑", "压力", "比较", "对比"
        ])

        if is_question:
            try:
                result = self.search_engine.answer_question(query)
                log_qa(logger, query, result.get("answer_type", "general"), len(result.get("results", [])))
                print(f"\n{Color.BOLD}{Color.GREEN}回答: {result['answer']}{Color.RESET}\n")

                if result.get("results"):
                    search_term = query
                    for kw in self.search_engine._keyword_pool:
                        if kw in query:
                            search_term = kw
                            break
                    DisplayUtils.print_search_results(result["results"], search_term)
            except Exception as e:
                log_error(logger, f"问答处理失败: {query}", e)
                DisplayUtils.print_error(f"问答处理失败: {e}")
        else:
            try:
                results = self.search_engine.search(query)
                log_search(logger, query, len(results))
                DisplayUtils.print_search_results(results, query)
            except Exception as e:
                log_error(logger, f"搜索失败: {query}", e)
                DisplayUtils.print_error(f"搜索失败: {e}")

    def generate_growth_report(self):
        try:
            report = self.report_generator.generate_personal_growth_report()
            log_info(logger, "生成个人成长报告")
            DisplayUtils.print_divider()
            print(report)
            DisplayUtils.print_divider()
        except Exception as e:
            log_error(logger, "生成成长报告失败", e)
            DisplayUtils.print_error(f"生成报告失败: {e}")

    def generate_monthly_report(self):
        year = self._input_year()
        month = self._input_month()

        try:
            report = self.report_generator.generate_monthly_report(year, month)
            log_info(logger, f"生成月度报告: {year}年{month}月")
            print()
            print(report)
            print()
        except Exception as e:
            log_error(logger, f"生成月度报告失败: {year}年{month}月", e)
            DisplayUtils.print_error(f"生成报告失败: {e}")

    def generate_yearly_report(self):
        year = self._input_year()

        try:
            report = self.report_generator.generate_yearly_report(year)
            log_info(logger, f"生成年度报告: {year}年")
            print()
            print(report)
            print()
        except Exception as e:
            log_error(logger, f"生成年度报告失败: {year}年", e)
            DisplayUtils.print_error(f"生成报告失败: {e}")

    def export_data(self):
        print(f"\n{Color.BOLD}数据导出选项:{Color.RESET}")
        print(f"  {Color.GREEN}1.{Color.RESET} 导出所有数据 (包含原文)")
        print(f"  {Color.GREEN}2.{Color.RESET} 导出匿名数据 (去除个人信息)")
        print(f"  {Color.GREEN}3.{Color.RESET} 导出情绪数据")
        print(f"  {Color.GREEN}4.{Color.RESET} 导出关键词频率")

        choice = input(f"\n{Color.BOLD}请选择: {Color.RESET}").strip()

        try:
            if choice == "1":
                path = self.data_exporter.export_to_json(anonymize=False)
                log_info(logger, f"导出所有数据: {path}")
                DisplayUtils.print_success(f"数据已导出到: {path}")
            elif choice == "2":
                path = self.data_exporter.export_to_json(anonymize=True)
                log_info(logger, f"导出匿名数据: {path}")
                DisplayUtils.print_success(f"匿名数据已导出到: {path}")
            elif choice == "3":
                path = self.data_exporter.export_sentiment_data()
                log_info(logger, f"导出情绪数据: {path}")
                DisplayUtils.print_success(f"情绪数据已导出到: {path}")
            elif choice == "4":
                path = self.data_exporter.export_keyword_frequency()
                log_info(logger, f"导出关键词频率: {path}")
                DisplayUtils.print_success(f"关键词频率已导出到: {path}")
            else:
                DisplayUtils.print_error("无效选项")
        except Exception as e:
            log_error(logger, "数据导出失败", e)
            DisplayUtils.print_error(f"导出失败: {e}")

    def show_daily_recommendation(self):
        try:
            plan = self.action_recommender.generate_action_plan()
            log_info(logger, "生成每日推荐计划")
        except Exception as e:
            log_error(logger, "生成推荐计划失败", e)
            DisplayUtils.print_error(f"生成推荐失败: {e}")
            return

        DisplayUtils.print_divider()
        print(f"{Color.BOLD}{Color.CYAN}                    {plan['daily_actions'][0] if plan['daily_actions'] else '今日推荐行动'}{Color.RESET}")
        DisplayUtils.print_divider("-")

        print(f"\n{Color.BOLD}推荐行动:{Color.RESET}")
        for i, action in enumerate(plan["daily_actions"], 1):
            print(f"  {Color.GREEN}{i}.{Color.RESET} {action}")

        print(f"\n{Color.BOLD}本周重点:{Color.RESET}")
        print(f"  {Color.YELLOW}🎯{Color.RESET} {plan['weekly_focus']}")

        print(f"\n{Color.BOLD}长期建议:{Color.RESET}")
        for goal in plan["long_term_goals"]:
            print(f"  {Color.BLUE}✨{Color.RESET} {goal}")

        try:
            weather_insights = self.weather_manager.analyze_weather_impact(self.entries)
            if weather_insights:
                print(f"\n{Color.BOLD}天气影响分析:{Color.RESET}")
                for insight in weather_insights:
                    print(f"  {Color.MAGENTA}☁️{Color.RESET} {insight}")
        except Exception as e:
            log_error(logger, "天气影响分析失败", e)

        DisplayUtils.print_divider()

    def show_diary_list(self):
        if not self.entries:
            DisplayUtils.print_error("没有日记记录")
            return

        try:
            DisplayUtils.print_divider()
            print(f"{Color.BOLD}日记列表 (共 {len(self.entries)} 篇){Color.RESET}")
            DisplayUtils.print_divider("-")

            for i, entry in enumerate(sorted(self.entries, key=lambda x: x.date, reverse=True)[:30], 1):
                sentiment_display = ""
                if entry.sentiment_score is not None:
                    sentiment_display = f"  {DisplayUtils.format_sentiment_score(entry.sentiment_score)}"

                print(f"  {i:2d}. {entry.date.strftime('%Y-%m-%d')}{sentiment_display}")

            if len(self.entries) > 30:
                print(f"\n  ... 还有 {len(self.entries) - 30} 篇日记")

            DisplayUtils.print_divider()
        except Exception as e:
            log_error(logger, "显示日记列表失败", e)
            DisplayUtils.print_error(f"显示失败: {e}")

    def view_diary_entry(self):
        date_str = input(f"{Color.BOLD}请输入日期 (YYYY-MM-DD): {Color.RESET}").strip()

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            DisplayUtils.print_error("日期格式无效，请使用 YYYY-MM-DD")
            return

        entry = self.diary_reader.get_entry_by_date(target_date)

        if not entry:
            DisplayUtils.print_error(f"找不到 {date_str} 的日记")
            return

        if entry.sentiment_score is None:
            self.sentiment_analyzer.analyze_entry(entry)
        if not entry.keywords:
            self.trend_analyzer.analyze_entry_keywords(entry)

        DisplayUtils.print_diary_entry(entry)

    def _input_year(self) -> int:
        available_years = self.diary_reader.get_available_years()
        default_year = date.today().year

        if available_years:
            print(f"\n可用年份: {', '.join(map(str, available_years))}")

        while True:
            try:
                year_input = input(f"{Color.BOLD}请输入年份 (默认 {default_year}): {Color.RESET}").strip()
                if not year_input:
                    return default_year
                year = int(year_input)
                return year
            except ValueError:
                DisplayUtils.print_error("请输入有效的年份")

    def _input_month(self) -> int:
        while True:
            try:
                month_input = input(f"{Color.BOLD}请输入月份 (1-12): {Color.RESET}").strip()
                month = int(month_input)
                if 1 <= month <= 12:
                    return month
                DisplayUtils.print_error("月份必须在 1-12 之间")
            except ValueError:
                DisplayUtils.print_error("请输入有效的月份")


def main():
    try:
        app = DiaryAnalyzerApp()
        app.run()
    except KeyboardInterrupt:
        print(f"\n{Color.GREEN}感谢使用，再见！{Color.RESET}")
        sys.exit(0)
    except ModuleNotFoundError as e:
        print(f"\n{Color.RED}缺少必要依赖: {e}{Color.RESET}")
        print(f"{Color.YELLOW}请运行: pip install -r requirements.txt{Color.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Color.RED}程序异常退出: {e}{Color.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
