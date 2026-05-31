from typing import List, Dict, Tuple
from collections import defaultdict

try:
    from snownlp import SnowNLP
    SNOWNLP_AVAILABLE = True
except ImportError:
    SNOWNLP_AVAILABLE = False
    print("Warning: SnowNLP not available. Using simple sentiment analysis.")

from config import POSITIVE_WORDS, NEGATIVE_WORDS
from diary_reader import DiaryEntry


class SentimentAnalyzer:
    def __init__(self):
        self.use_snownlp = SNOWNLP_AVAILABLE

    def analyze_entry(self, entry: DiaryEntry) -> float:
        if self.use_snownlp:
            score = self._analyze_with_snownlp(entry.content)
        else:
            score = self._analyze_with_keywords(entry.content)

        entry.sentiment_score = score
        return score

    def _analyze_with_snownlp(self, content: str) -> float:
        try:
            s = SnowNLP(content)
            return s.sentiments
        except Exception:
            return self._analyze_with_keywords(content)

    def _analyze_with_keywords(self, content: str) -> float:
        positive_count = sum(1 for word in POSITIVE_WORDS if word in content)
        negative_count = sum(1 for word in NEGATIVE_WORDS if word in content)
        total = positive_count + negative_count

        if total == 0:
            return 0.5

        return positive_count / total

    def analyze_all(self, entries: List[DiaryEntry]) -> List[DiaryEntry]:
        for entry in entries:
            if entry.sentiment_score is None:
                self.analyze_entry(entry)
        return entries

    def get_monthly_sentiment(self, entries: List[DiaryEntry], year: int, month: int) -> Dict[str, float]:
        monthly_entries = [
            e for e in entries
            if e.date.year == year and e.date.month == month and e.sentiment_score is not None
        ]

        if not monthly_entries:
            return {}

        daily_scores = defaultdict(list)
        for entry in monthly_entries:
            daily_scores[entry.date.day].append(entry.sentiment_score)

        return {
            str(day): sum(scores) / len(scores)
            for day, scores in sorted(daily_scores.items())
        }

    def get_yearly_sentiment(self, entries: List[DiaryEntry], year: int) -> Dict[str, float]:
        yearly_entries = [
            e for e in entries
            if e.date.year == year and e.sentiment_score is not None
        ]

        if not yearly_entries:
            return {}

        monthly_scores = defaultdict(list)
        for entry in yearly_entries:
            monthly_scores[entry.date.month].append(entry.sentiment_score)

        return {
            f"{month:02d}": sum(scores) / len(scores)
            for month, scores in sorted(monthly_scores.items())
        }

    def get_sentiment_trend(self, entries: List[DiaryEntry], window_size: int = 7) -> List[Tuple[str, float]]:
        sorted_entries = sorted(
            [e for e in entries if e.sentiment_score is not None],
            key=lambda x: x.date
        )

        if not sorted_entries:
            return []

        trend = []
        for i in range(len(sorted_entries)):
            start = max(0, i - window_size + 1)
            window = sorted_entries[start:i + 1]
            avg_score = sum(e.sentiment_score for e in window) / len(window)
            trend.append((sorted_entries[i].date.strftime("%Y-%m-%d"), avg_score))

        return trend

    def get_sentiment_summary(self, entries: List[DiaryEntry]) -> Dict:
        scored_entries = [e for e in entries if e.sentiment_score is not None]

        if not scored_entries:
            return {
                "avg_score": 0.5,
                "min_score": 0.5,
                "max_score": 0.5,
                "positive_days": 0,
                "neutral_days": 0,
                "negative_days": 0,
                "total_days": 0
            }

        scores = [e.sentiment_score for e in scored_entries]

        positive_days = sum(1 for s in scores if s > 0.6)
        neutral_days = sum(1 for s in scores if 0.4 <= s <= 0.6)
        negative_days = sum(1 for s in scores if s < 0.4)

        return {
            "avg_score": sum(scores) / len(scores),
            "min_score": min(scores),
            "max_score": max(scores),
            "positive_days": positive_days,
            "neutral_days": neutral_days,
            "negative_days": negative_days,
            "total_days": len(scored_entries)
        }
