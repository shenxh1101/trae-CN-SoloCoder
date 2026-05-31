import json
import os
import jieba
from typing import List, Dict, Tuple


class SEOAnalyzer:
    def __init__(self, keywords_path: str = None):
        if keywords_path is None:
            keywords_path = os.path.join(
                os.path.dirname(__file__), "data", "seo_keywords.json"
            )
        with open(keywords_path, "r", encoding="utf-8") as f:
            self.seo_data = json.load(f)

    def analyze_topic(self, topic: str) -> Dict:
        words = jieba.lcut(topic)
        hot_words = []
        
        for category, keywords in self.seo_data["categories"].items():
            for kw in keywords:
                if kw in topic or kw in words:
                    hot_words.append({"keyword": kw, "category": category})
        
        for topic_kw, related_words in self.seo_data["hot_words_by_topic"].items():
            if topic_kw in topic:
                for rw in related_words:
                    if rw not in [hw["keyword"] for hw in hot_words]:
                        hot_words.append({"keyword": rw, "category": "related"})
        
        return {
            "topic": topic,
            "segments": words,
            "hot_words": hot_words,
            "recommendations": self._generate_recommendations(topic, hot_words)
        }

    def _generate_recommendations(self, topic: str, hot_words: List[Dict]) -> List[Dict]:
        recommendations = []
        
        for hw in hot_words[:5]:
            kw = hw["keyword"]
            patterns = self.seo_data["seo_patterns"]
            
            for pattern in patterns[:3]:
                seo_title = pattern.format(keyword=kw)
                if topic not in seo_title:
                    seo_title = f"{topic}：{seo_title}"
                
                score = self._calculate_seo_score(seo_title, kw)
                recommendations.append({
                    "title": seo_title,
                    "keyword": kw,
                    "category": hw["category"],
                    "seo_score": score
                })
        
        recommendations.sort(key=lambda x: x["seo_score"], reverse=True)
        return recommendations[:8]

    def _calculate_seo_score(self, title: str, keyword: str) -> float:
        score = 0.0
        
        if title.startswith(keyword):
            score += 30
        elif keyword in title[:10]:
            score += 20
        elif keyword in title:
            score += 10
        
        if len(title) <= 30:
            score += 20
        elif len(title) <= 40:
            score += 10
        
        if title.endswith("？") or title.endswith("?"):
            score += 15
        
        if re.search(r"\d+", title):
            score += 10
        
        hot_markers = ["最新", "推荐", "十大", "排行榜", "最好"]
        for marker in hot_markers:
            if marker in title:
                score += 10
        
        return min(100, score)

    def insert_keywords(self, title: str, topic: str) -> Tuple[str, List[str]]:
        analysis = self.analyze_topic(topic)
        inserted = []
        
        new_title = title
        
        for hw in analysis["hot_words"][:3]:
            kw = hw["keyword"]
            if kw not in new_title:
                if random.random() > 0.5:
                    new_title = f"{kw}｜{new_title}"
                else:
                    new_title = f"{new_title}【{kw}】"
                inserted.append(kw)
        
        return new_title, inserted

    def get_trending_keywords(self, category: str = None) -> List[str]:
        if category:
            return self.seo_data["categories"].get(category, [])
        
        all_keywords = []
        for cat, kws in self.seo_data["categories"].items():
            all_keywords.extend(kws)
        return all_keywords

    def generate_seo_titles(self, topic: str, count: int = 5) -> List[Dict]:
        analysis = self.analyze_topic(topic)
        titles = []
        
        patterns = self.seo_data["seo_patterns"]
        
        for hw in analysis["hot_words"]:
            kw = hw["keyword"]
            for pattern in patterns:
                seo_title = pattern.format(keyword=kw)
                if topic not in seo_title:
                    seo_title = f"{topic}：{seo_title}"
                score = self._calculate_seo_score(seo_title, kw)
                titles.append({
                    "title": seo_title,
                    "keyword": kw,
                    "seo_score": score,
                    "category": hw["category"]
                })
        
        titles.sort(key=lambda x: x["seo_score"], reverse=True)
        return titles[:count]


import random
import re
