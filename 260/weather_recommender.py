import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from datetime import date, datetime
from collections import defaultdict

from config import WEATHER_FILE
from diary_reader import DiaryEntry


class WeatherManager:
    def __init__(self, weather_file: Path = None):
        self.weather_file = weather_file or WEATHER_FILE
        self.weather_data = self._load_weather_data()

    def _load_weather_data(self) -> Dict[str, Dict]:
        if not self.weather_file.exists():
            return {}

        try:
            with open(self.weather_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_weather_data(self) -> None:
        try:
            with open(self.weather_file, 'w', encoding='utf-8') as f:
                json.dump(self.weather_data, f, ensure_ascii=False, indent=2)
        except OSError as e:
            print(f"Warning: Cannot save weather data: {e}")

    def add_weather_record(self, date_str: str, weather: str, temperature: float = None,
                          humidity: float = None, notes: str = "") -> None:
        if not date_str or not weather:
            return
        self.weather_data[date_str] = {
            "weather": weather,
            "temperature": temperature,
            "humidity": humidity,
            "notes": notes or "",
            "updated_at": datetime.now().isoformat()
        }
        self._save_weather_data()

    def get_weather(self, target_date: date) -> Optional[Dict]:
        date_str = target_date.isoformat()
        return self.weather_data.get(date_str)

    def get_weather_correlation(self, entries: List[DiaryEntry]) -> Dict[str, Dict]:
        weather_sentiment = defaultdict(list)

        for entry in entries:
            weather_info = self.get_weather(entry.date)
            if weather_info and entry.sentiment_score is not None:
                weather_type = weather_info.get("weather", "未知")
                weather_sentiment[weather_type].append(entry.sentiment_score)

        correlation = {}
        for weather_type, scores in weather_sentiment.items():
            if scores:
                correlation[weather_type] = {
                    "count": len(scores),
                    "avg_sentiment": sum(scores) / len(scores),
                    "min_sentiment": min(scores),
                    "max_sentiment": max(scores)
                }

        return correlation

    def analyze_weather_impact(self, entries: List[DiaryEntry]) -> List[str]:
        correlation = self.get_weather_correlation(entries)

        if len(correlation) < 2:
            return ["需要更多天气数据来分析天气对情绪的影响"]

        insights = []
        sorted_by_sentiment = sorted(
            correlation.items(),
            key=lambda x: x[1]["avg_sentiment"],
            reverse=True
        )

        if sorted_by_sentiment:
            best_weather = sorted_by_sentiment[0]
            worst_weather = sorted_by_sentiment[-1]

            insights.append(
                f"天气最好的时候: {best_weather[0]} (平均情绪 {best_weather[1]['avg_sentiment']:.2f})"
            )
            insights.append(
                f"天气最差的时候: {worst_weather[0]} (平均情绪 {worst_weather[1]['avg_sentiment']:.2f})"
            )

            diff = best_weather[1]["avg_sentiment"] - worst_weather[1]["avg_sentiment"]
            if diff > 0.2:
                insights.append(f"天气对您的情绪影响较大，差异达 {diff:.2f}")

        return insights


class ActionRecommender:
    def __init__(self, entries: List[DiaryEntry]):
        self.entries = entries or []
        self.weather_manager = WeatherManager()

    def get_daily_recommendation(self) -> Dict:
        if len(self.entries) < 3:
            return {
                "title": "开始记录",
                "actions": [
                    "写下今天发生的3件好事",
                    "记录今天的情绪状态",
                    "设定一个明天的小目标"
                ],
                "reason": "积累更多日记数据后，将能提供更个性化的推荐"
            }

        positive_actions = self._extract_positive_patterns()
        negative_patterns = self._extract_negative_patterns()

        recommendations = []

        if positive_actions:
            recommendations.extend(positive_actions[:2])

        if negative_patterns:
            recommendations.append(f"注意避免: {negative_patterns[0]}")

        today_weekday = datetime.now().weekday()
        weekday_recommendation = self._get_weekday_recommendation(today_weekday)
        if weekday_recommendation:
            recommendations.append(weekday_recommendation)

        return {
            "title": "今日推荐行动",
            "actions": recommendations[:5] if recommendations else [
                "保持日常作息",
                "花10分钟冥想",
                "联系一位朋友"
            ],
            "reason": "基于您历史日记中的成功经验"
        }

    def _extract_positive_patterns(self) -> List[str]:
        positive_entries = [
            e for e in self.entries
            if e.sentiment_score is not None and e.sentiment_score > 0.7
        ]

        if not positive_entries:
            return []

        action_patterns = [
            ("跑步", "去跑步或做一些有氧运动"),
            ("运动", "进行30分钟的体育锻炼"),
            ("冥想", "花10分钟冥想放松"),
            ("读书", "阅读几页书"),
            ("朋友", "约朋友见面或通话"),
            ("家人", "和家人共度时光"),
            ("旅行", "计划一次短途出游"),
            ("音乐", "听喜欢的音乐"),
            ("早睡", "今晚早点休息"),
            ("早起", "明天早起开始新的一天"),
            ("学习", "学习一项新技能"),
            ("感恩", "记录3件感恩的事")
        ]

        found_actions = set()
        for entry in positive_entries:
            for keyword, action in action_patterns:
                if keyword in entry.content:
                    found_actions.add(action)

        return list(found_actions)

    def _extract_negative_patterns(self) -> List[str]:
        negative_entries = [
            e for e in self.entries
            if e.sentiment_score is not None and e.sentiment_score < 0.4
        ]

        if not negative_entries:
            return []

        patterns = []
        negative_keywords = [
            ("加班", "过度工作"),
            ("熬夜", "睡眠不足"),
            ("压力", "工作压力过大"),
            ("焦虑", "过度焦虑"),
            ("生气", "情绪失控"),
            ("孤独", "社交隔离")
        ]

        for keyword, pattern in negative_keywords:
            count = sum(1 for e in negative_entries if keyword in e.content)
            if count >= 2:
                patterns.append(pattern)

        return patterns

    def _get_weekday_recommendation(self, weekday: int) -> Optional[str]:
        weekday_recommendations = {
            0: "周一: 设定本周小目标，开启积极的一周",
            1: "周二: 专注工作，保持节奏",
            2: "周三: 周中调整，适当放松",
            3: "周四: 加速推进，迎接周末",
            4: "周五: 完成本周任务，规划周末放松",
            5: "周六: 享受休闲，做自己喜欢的事",
            6: "周日: 休息调整，为下周做准备"
        }
        return weekday_recommendations.get(weekday)

    def get_weather_based_recommendation(self) -> List[str]:
        today = date.today()
        weather_info = self.weather_manager.get_weather(today)

        if not weather_info:
            return []

        recommendations = []
        weather_type = weather_info.get("weather", "")

        weather_actions = {
            "晴": ["适合户外运动", "可以散步晒太阳", "安排户外活动"],
            "多云": ["适合轻度运动", "可以出门办事"],
            "阴": ["适合室内活动", "读一本好书", "看一部电影"],
            "雨": ["室内健身", "学习新技能", "整理房间"],
            "雪": ["注意保暖", "可以欣赏雪景", "喝杯热饮放松"],
            "风": ["减少外出", "室内瑜伽或冥想"]
        }

        for key, actions in weather_actions.items():
            if key in weather_type:
                recommendations.extend(actions)

        return recommendations

    def generate_action_plan(self) -> Dict:
        daily_rec = self.get_daily_recommendation()
        weather_rec = self.get_weather_based_recommendation()

        all_actions = daily_rec["actions"]
        if weather_rec:
            all_actions.extend(weather_rec[:2])

        return {
            "daily_actions": list(dict.fromkeys(all_actions))[:5],
            "weekly_focus": self._get_weekly_focus(),
            "long_term_goals": self._get_long_term_suggestions()
        }

    def _get_weekly_focus(self) -> str:
        if len(self.entries) < 7:
            return "建立每日日记习惯"

        from trend_analyzer import TrendAnalyzer
        trend_analyzer = TrendAnalyzer()

        last_7_days = sorted(self.entries, key=lambda x: x.date)[-7:]
        categories = defaultdict(float)

        for entry in last_7_days:
            cats = trend_analyzer.analyze_categories(entry)
            for cat, score in cats.items():
                categories[cat] += score

        if categories:
            min_cat = min(categories.items(), key=lambda x: x[1])[0]
            return f"本周重点关注: {min_cat}"

        return "保持平衡发展"

    def _get_long_term_suggestions(self) -> List[str]:
        if len(self.entries) < 30:
            return ["继续坚持记录，观察长期趋势"]

        return [
            "回顾本月成长",
            "设定下个月目标",
            "庆祝取得的进步"
        ]
