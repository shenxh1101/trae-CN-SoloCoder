import re
from collections import Counter, defaultdict
from typing import List, Dict, Tuple
from datetime import date

try:
    import jieba
    JIEBA_AVAILABLE = True
except ImportError:
    JIEBA_AVAILABLE = False
    print("Warning: jieba not available. Using simple word splitting.")

from config import STOP_WORDS, EMOTION_CATEGORIES
from diary_reader import DiaryEntry


class TrendAnalyzer:
    def __init__(self):
        self.use_jieba = JIEBA_AVAILABLE

    def extract_keywords(self, text: str, top_n: int = 20) -> List[Tuple[str, int]]:
        words = self._split_text(text)
        filtered_words = [w for w in words if w not in STOP_WORDS and len(w) > 1]
        counter = Counter(filtered_words)
        return counter.most_common(top_n)

    def _split_text(self, text: str) -> List[str]:
        text = re.sub(r'[^\w\s]', '', text)
        text = re.sub(r'\d+', '', text)

        if self.use_jieba:
            return list(jieba.cut(text))
        else:
            return list(text)

    def analyze_entry_keywords(self, entry: DiaryEntry, top_n: int = 10) -> List[str]:
        keywords = self.extract_keywords(entry.content, top_n)
        entry.keywords = [kw for kw, _ in keywords]
        return entry.keywords

    def get_monthly_keywords(self, entries: List[DiaryEntry], year: int, month: int, top_n: int = 15) -> List[Tuple[str, int]]:
        monthly_entries = [
            e for e in entries
            if e.date.year == year and e.date.month == month
        ]

        all_text = " ".join(e.content for e in monthly_entries)
        return self.extract_keywords(all_text, top_n)

    def get_yearly_keywords(self, entries: List[DiaryEntry], year: int, top_n: int = 20) -> List[Tuple[str, int]]:
        yearly_entries = [
            e for e in entries
            if e.date.year == year
        ]

        all_text = " ".join(e.content for e in yearly_entries)
        return self.extract_keywords(all_text, top_n)

    def analyze_categories(self, entry: DiaryEntry) -> Dict[str, float]:
        scores = {}
        content_lower = entry.content.lower()

        for category, keywords in EMOTION_CATEGORIES.items():
            count = sum(
                1 for kw in keywords
                if kw.lower() in content_lower
            )
            scores[category] = count

        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}

        entry.categories = scores
        return scores

    def get_category_trend(self, entries: List[DiaryEntry], category: str) -> List[Tuple[str, float]]:
        sorted_entries = sorted(entries, key=lambda x: x.date)
        trend = []

        for entry in sorted_entries:
            if not entry.categories:
                self.analyze_categories(entry)
            trend.append((
                entry.date.strftime("%Y-%m-%d"),
                entry.categories.get(category, 0.0)
            ))

        return trend

    def get_focus_shift_analysis(self, entries: List[DiaryEntry]) -> Dict:
        if len(entries) < 2:
            return {"message": "Need more entries for focus shift analysis"}

        sorted_entries = sorted(entries, key=lambda x: x.date)
        mid_point = len(sorted_entries) // 2

        first_half = sorted_entries[:mid_point]
        second_half = sorted_entries[mid_point:]

        first_categories = defaultdict(float)
        for e in first_half:
            if not e.categories:
                self.analyze_categories(e)
            for cat, score in e.categories.items():
                first_categories[cat] += score

        second_categories = defaultdict(float)
        for e in second_half:
            if not e.categories:
                self.analyze_categories(e)
            for cat, score in e.categories.items():
                second_categories[cat] += score

        first_total = sum(first_categories.values()) or 1
        second_total = sum(second_categories.values()) or 1

        first_normalized = {k: v / first_total for k, v in first_categories.items()}
        second_normalized = {k: v / second_total for k, v in second_categories.items()}

        shifts = []
        for cat in EMOTION_CATEGORIES.keys():
            first_score = first_normalized.get(cat, 0)
            second_score = second_normalized.get(cat, 0)
            change = second_score - first_score
            if abs(change) > 0.05:
                direction = "增加" if change > 0 else "减少"
                shifts.append({
                    "category": cat,
                    "first_half": first_score,
                    "second_half": second_score,
                    "change": change,
                    "direction": direction
                })

        shifts.sort(key=lambda x: abs(x["change"]), reverse=True)

        return {
            "significant_shifts": shifts,
            "first_half_dominant": max(first_normalized.items(), key=lambda x: x[1])[0] if first_normalized else None,
            "second_half_dominant": max(second_normalized.items(), key=lambda x: x[1])[0] if second_normalized else None
        }

    def detect_negative_patterns(self, entries: List[DiaryEntry]) -> List[Dict]:
        if len(entries) < 5:
            return []

        sorted_entries = sorted(entries, key=lambda x: x.date)
        negative_entries = [
            e for e in sorted_entries
            if e.sentiment_score is not None and e.sentiment_score < 0.4
        ]

        if len(negative_entries) < 3:
            return []

        all_negative_text = " ".join(e.content for e in negative_entries)
        negative_keywords = self.extract_keywords(all_negative_text, 10)

        patterns = []
        for kw, count in negative_keywords:
            if count >= 2:
                kw_dates = [
                    e.date.strftime("%Y-%m-%d")
                    for e in negative_entries
                    if kw in e.content
                ]
                if len(kw_dates) >= 2:
                    patterns.append({
                        "keyword": kw,
                        "frequency": count,
                        "occurrences": kw_dates
                    })

        return patterns

    def analyze_all(self, entries: List[DiaryEntry]) -> None:
        for entry in entries:
            self.analyze_entry_keywords(entry)
            self.analyze_categories(entry)
