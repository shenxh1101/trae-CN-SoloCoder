from typing import List, Dict
from datetime import date, datetime
from collections import defaultdict

from diary_reader import DiaryEntry
from sentiment_analyzer import SentimentAnalyzer
from trend_analyzer import TrendAnalyzer
from ascii_chart import ASCIIChart


class ReportGenerator:
    def __init__(self, entries: List[DiaryEntry]):
        self.entries = entries or []
        self.sentiment_analyzer = SentimentAnalyzer()
        self.trend_analyzer = TrendAnalyzer()
        self.chart = ASCIIChart()
        self._analyze_entries()

    def _analyze_entries(self) -> None:
        try:
            self.sentiment_analyzer.analyze_all(self.entries)
        except Exception:
            pass
        try:
            self.trend_analyzer.analyze_all(self.entries)
        except Exception:
            pass

    def generate_monthly_report(self, year: int, month: int) -> str:
        monthly_entries = [
            e for e in self.entries
            if e.date.year == year and e.date.month == month
        ]

        if not monthly_entries:
            return f"{year}年{month}月没有日记记录"

        report = []
        report.append("=" * 60)
        report.append(f"                {year}年{month}月 个人成长报告")
        report.append("=" * 60)
        report.append("")

        sentiment_summary = self.sentiment_analyzer.get_sentiment_summary(monthly_entries)
        report.append("【情绪概览】")
        report.append(f"  记录天数: {sentiment_summary['total_days']} 天")
        report.append(f"  平均情绪分数: {sentiment_summary['avg_score']:.2f}")
        report.append(f"  情绪最好: {sentiment_summary['max_score']:.2f} | 情绪最差: {sentiment_summary['min_score']:.2f}")
        report.append(f"  积极天数: {sentiment_summary['positive_days']} | 中性天数: {sentiment_summary['neutral_days']} | 消极天数: {sentiment_summary['negative_days']}")
        report.append("")

        monthly_sentiment = self.sentiment_analyzer.get_monthly_sentiment(self.entries, year, month)
        if monthly_sentiment:
            report.append("【月度情绪趋势】")
            report.append(self.chart.plot_line_chart(
                monthly_sentiment,
                title=f"{year}年{month}月情绪走势",
                x_label="日期",
                y_label="情绪分数"
            ))
            report.append("")

        keywords = self.trend_analyzer.get_monthly_keywords(self.entries, year, month, top_n=10)
        if keywords:
            report.append("【本月高频词汇】")
            keyword_dict = {kw: count for kw, count in keywords}
            report.append(self.chart.plot_bar_chart(keyword_dict, title="高频词汇统计"))
            report.append("")

        category_analysis = self._get_monthly_category_analysis(monthly_entries)
        if category_analysis:
            report.append("【关注领域分布】")
            report.append(self.chart.plot_category_radar(category_analysis))
            report.append("")

        negative_patterns = self.trend_analyzer.detect_negative_patterns(monthly_entries)
        if negative_patterns:
            report.append("【需要关注的负面模式】")
            for pattern in negative_patterns[:3]:
                report.append(f"  - {pattern['keyword']}: 出现 {pattern['frequency']} 次")
                report.append(f"    日期: {', '.join(pattern['occurrences'][:3])}")
            report.append("")

        report.append("【正向变化与成长】")
        positive_changes = self._identify_positive_changes(monthly_entries)
        for change in positive_changes:
            report.append(f"  ✓ {change}")
        report.append("")

        report.append("【改进建议】")
        suggestions = self._generate_suggestions(monthly_entries)
        for suggestion in suggestions:
            report.append(f"  💡 {suggestion}")
        report.append("")

        report.append("=" * 60)

        return "\n".join(report)

    def generate_yearly_report(self, year: int) -> str:
        yearly_entries = [
            e for e in self.entries
            if e.date.year == year
        ]

        if not yearly_entries:
            return f"{year}年没有日记记录"

        report = []
        report.append("=" * 70)
        report.append(f"                      {year}年度 个人成长报告")
        report.append("=" * 70)
        report.append("")

        sentiment_summary = self.sentiment_analyzer.get_sentiment_summary(yearly_entries)
        report.append("【年度概览】")
        report.append(f"  记录天数: {sentiment_summary['total_days']} 天")
        report.append(f"  年度平均情绪: {sentiment_summary['avg_score']:.2f}")
        report.append(f"  积极/中性/消极: {sentiment_summary['positive_days']}/{sentiment_summary['neutral_days']}/{sentiment_summary['negative_days']}")
        report.append("")

        yearly_sentiment = self.sentiment_analyzer.get_yearly_sentiment(self.entries, year)
        if yearly_sentiment:
            report.append("【年度情绪走势】")
            report.append(self.chart.plot_line_chart(
                yearly_sentiment,
                title=f"{year}年月度情绪均值",
                x_label="月份",
                y_label="情绪分数"
            ))
            report.append("")

        focus_shift = self.trend_analyzer.get_focus_shift_analysis(yearly_entries)
        if "significant_shifts" in focus_shift and focus_shift["significant_shifts"]:
            report.append("【关注点变化】")
            for shift in focus_shift["significant_shifts"][:5]:
                direction = "↑ 上升" if shift["direction"] == "增加" else "↓ 下降"
                report.append(f"  {shift['category']}: {direction} ({abs(shift['change']):.1%})")
            report.append("")

        yearly_keywords = self.trend_analyzer.get_yearly_keywords(self.entries, year, top_n=15)
        if yearly_keywords:
            report.append("【年度热词】")
            for i, (kw, count) in enumerate(yearly_keywords[:10], 1):
                report.append(f"  {i:2d}. {kw}: {count}次")
            report.append("")

        negative_patterns = self.trend_analyzer.detect_negative_patterns(yearly_entries)
        if negative_patterns:
            report.append("【年度负面模式分析】")
            for pattern in negative_patterns[:5]:
                report.append(f"  - {pattern['keyword']}: {pattern['frequency']}次")
            report.append("")

        report.append("【年度成长总结】")
        for summary in self._generate_yearly_summary(yearly_entries):
            report.append(f"  {summary}")
        report.append("")

        report.append("【下一年目标建议】")
        for goal in self._generate_yearly_goals(yearly_entries):
            report.append(f"  🎯 {goal}")
        report.append("")

        report.append("=" * 70)

        return "\n".join(report)

    def generate_personal_growth_report(self) -> str:
        if len(self.entries) < 7:
            return "需要至少7天的日记记录才能生成个人成长报告"

        report = []
        report.append("=" * 70)
        report.append("                        个人成长分析报告")
        report.append("=" * 70)
        report.append("")

        sorted_entries = sorted(self.entries, key=lambda x: x.date)

        sentiment_trend = self.sentiment_analyzer.get_sentiment_trend(self.entries)
        if sentiment_trend:
            report.append("【情绪变化趋势】")
            trend_data = dict(sentiment_trend[-30:])
            report.append(self.chart.plot_line_chart(
                trend_data,
                title="近30天情绪趋势(7日移动平均)",
                x_label="日期",
                y_label="情绪分数"
            ))
            report.append("")

        focus_shift = self.trend_analyzer.get_focus_shift_analysis(self.entries)
        if "significant_shifts" in focus_shift and focus_shift["significant_shifts"]:
            report.append("【关注点显著变化】")
            for shift in focus_shift["significant_shifts"]:
                change = "增加" if shift["change"] > 0 else "减少"
                report.append(f"  • {shift['category']}: {change} {abs(shift['change']):.1%}")
            report.append("")

        report.append("【正向变化】")
        positive_changes = self._identify_positive_changes(sorted_entries)
        for i, change in enumerate(positive_changes[:5], 1):
            report.append(f"  {i}. {change}")
        report.append("")

        report.append("【改进空间】")
        improvements = self._identify_improvements(sorted_entries)
        for i, imp in enumerate(improvements[:5], 1):
            report.append(f"  {i}. {imp}")
        report.append("")

        negative_patterns = self.trend_analyzer.detect_negative_patterns(self.entries)
        if negative_patterns:
            report.append("【需要打破的循环】")
            for pattern in negative_patterns[:3]:
                report.append(f"  - '{pattern['keyword']}' 反复出现，影响情绪")
            report.append("")

        report.append("=" * 70)

        return "\n".join(report)

    def _get_monthly_category_analysis(self, entries: List[DiaryEntry]) -> Dict[str, float]:
        category_totals = defaultdict(float)
        for entry in entries:
            for cat, score in entry.categories.items():
                category_totals[cat] += score

        total = sum(category_totals.values()) or 1
        return {k: v / total for k, v in category_totals.items()}

    def _identify_positive_changes(self, entries: List[DiaryEntry]) -> List[str]:
        changes = []

        if len(entries) >= 14:
            first_half = entries[:len(entries)//2]
            second_half = entries[len(entries)//2:]

            first_avg = sum(e.sentiment_score or 0.5 for e in first_half) / len(first_half)
            second_avg = sum(e.sentiment_score or 0.5 for e in second_half) / len(second_half)

            if second_avg > first_avg + 0.1:
                changes.append(f"整体情绪提升显著，平均值从 {first_avg:.2f} 提升到 {second_avg:.2f}")

        positive_entries = [e for e in entries if e.sentiment_score and e.sentiment_score > 0.7]
        if positive_entries:
            positive_keywords = self.trend_analyzer.extract_keywords(
                " ".join(e.content for e in positive_entries), 5
            )
            for kw, _ in positive_keywords:
                changes.append(f"{kw} 带来积极影响")

        if not changes:
            changes.append("继续保持记录习惯，观察更多积极变化")

        return changes

    def _identify_improvements(self, entries: List[DiaryEntry]) -> List[str]:
        improvements = []

        negative_entries = [e for e in entries if e.sentiment_score and e.sentiment_score < 0.4]
        if len(negative_entries) >= 3:
            improvements.append(f"有 {len(negative_entries)} 天情绪较低，关注触发因素")

        negative_patterns = self.trend_analyzer.detect_negative_patterns(entries)
        for pattern in negative_patterns[:2]:
            improvements.append(f"尝试减少 '{pattern['keyword']}' 相关的负面影响")

        categories = defaultdict(float)
        for entry in entries:
            for cat, score in entry.categories.items():
                categories[cat] += score

        if categories:
            min_category = min(categories.items(), key=lambda x: x[1])[0]
            improvements.append(f"可以更多关注 {min_category} 领域")

        if not improvements:
            improvements.append("保持当前状态，继续探索成长方向")

        return improvements

    def _generate_suggestions(self, entries: List[DiaryEntry]) -> List[str]:
        suggestions = []
        sentiment_summary = self.sentiment_analyzer.get_sentiment_summary(entries)

        if sentiment_summary["negative_days"] > 5:
            suggestions.append("尝试记录情绪低落时的具体原因，寻找改善方法")

        if sentiment_summary["avg_score"] < 0.5:
            suggestions.append("每天记录3件值得感恩的小事，提升幸福感")

        category_analysis = self._get_monthly_category_analysis(entries)
        if "健康生活" in category_analysis and category_analysis["健康生活"] < 0.1:
            suggestions.append("增加运动和健康饮食的关注")

        if len(suggestions) < 3:
            suggestions.append("继续保持日记记录习惯")
            suggestions.append("尝试在日记中设定每日小目标")

        return suggestions[:5]

    def _generate_yearly_summary(self, entries: List[DiaryEntry]) -> List[str]:
        summaries = []

        total = len(entries)
        summaries.append(f"全年共记录 {total} 篇日记，保持了良好的反思习惯")

        sentiment_summary = self.sentiment_analyzer.get_sentiment_summary(entries)
        if sentiment_summary["avg_score"] > 0.55:
            summaries.append(f"整体情绪积极向上，平均分数 {sentiment_summary['avg_score']:.2f}")
        else:
            summaries.append(f"情绪有起伏波动，平均分数 {sentiment_summary['avg_score']:.2f}")

        focus_shift = self.trend_analyzer.get_focus_shift_analysis(entries)
        if focus_shift.get("first_half_dominant") and focus_shift.get("second_half_dominant"):
            if focus_shift["first_half_dominant"] != focus_shift["second_half_dominant"]:
                summaries.append(
                    f"关注点从 {focus_shift['first_half_dominant']} 转向 {focus_shift['second_half_dominant']}"
                )

        return summaries

    def _generate_yearly_goals(self, entries: List[DiaryEntry]) -> List[str]:
        goals = []

        category_analysis = self._get_monthly_category_analysis(entries)
        for category, score in sorted(category_analysis.items(), key=lambda x: x[1])[:3]:
            goals.append(f"增加对 {category} 的关注和投入")

        sentiment_summary = self.sentiment_analyzer.get_sentiment_summary(entries)
        if sentiment_summary["avg_score"] < 0.6:
            goals.append("提升整体情绪状态，建立更多积极体验")

        if len(goals) < 3:
            goals.append("继续坚持每日日记反思")
            goals.append("尝试新的自我提升方式")

        return goals[:5]
