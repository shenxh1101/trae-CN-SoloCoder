from typing import Dict, List, Optional
from datetime import datetime
from collections import defaultdict
from .config import Config


class PreferenceLearner:
    def __init__(self, config: Config):
        self.config = config

    def add_rating(self, report_id: str, rating: int, feedback: str = "", 
                   style: str = "detailed") -> None:
        if rating < 1 or rating > 5:
            raise ValueError("Rating must be between 1 and 5")
        
        rating_data = {
            "report_id": report_id,
            "rating": rating,
            "feedback": feedback,
            "style": style,
            "timestamp": datetime.now().isoformat()
        }
        
        self.config.add_rating(rating_data)

    def get_preferences(self) -> Dict:
        ratings = self.config.get_ratings()
        
        if not ratings:
            return self.config.get("preference", {
                "tone": "professional",
                "detail_level": "detailed",
                "format": "markdown"
            })
        
        style_scores = defaultdict(list)
        for rating_data in ratings:
            style = rating_data.get("style", "detailed")
            rating = rating_data.get("rating", 3)
            style_scores[style].append(rating)
        
        style_avg = {}
        for style, scores in style_scores.items():
            style_avg[style] = sum(scores) / len(scores)
        
        preferred_style = max(style_avg.items(), key=lambda x: x[1])[0] if style_avg else "detailed"
        
        high_ratings = [r for r in ratings if r.get("rating", 0) >= 4]
        tone_keywords = ["专业", "正式", "简洁", "详细", "轻松"]
        preferred_tone = "professional"
        
        for rating_data in high_ratings:
            feedback = rating_data.get("feedback", "").lower()
            for keyword in tone_keywords:
                if keyword in feedback:
                    if keyword in ["简洁", "简要"]:
                        preferred_tone = "concise"
                    elif keyword in ["详细", "展开"]:
                        preferred_tone = "detailed"
                    elif keyword in ["轻松", "友好"]:
                        preferred_tone = "friendly"
                    break
        
        return {
            "tone": preferred_tone,
            "detail_level": preferred_style,
            "format": self.config.get_preference("format", "markdown"),
            "confidence": len(ratings) / 10.0 if len(ratings) < 10 else 1.0
        }

    def get_statistics(self) -> Dict:
        ratings = self.config.get_ratings()
        
        if not ratings:
            return {"total_ratings": 0, "average_rating": 0}
        
        total = len(ratings)
        avg_rating = sum(r.get("rating", 0) for r in ratings) / total
        
        rating_distribution = {i: 0 for i in range(1, 6)}
        for rating_data in ratings:
            rating = rating_data.get("rating", 0)
            if 1 <= rating <= 5:
                rating_distribution[rating] += 1
        
        style_stats = defaultdict(list)
        for rating_data in ratings:
            style = rating_data.get("style", "detailed")
            rating = rating_data.get("rating", 3)
            style_stats[style].append(rating)
        
        style_avg = {}
        for style, scores in style_stats.items():
            style_avg[style] = round(sum(scores) / len(scores), 2)
        
        return {
            "total_ratings": total,
            "average_rating": round(avg_rating, 2),
            "rating_distribution": rating_distribution,
            "style_performance": style_avg
        }

    def get_suggested_style(self) -> str:
        prefs = self.get_preferences()
        return prefs.get("detail_level", "detailed")

    def export_preferences(self, filepath: str) -> None:
        import json
        
        data = {
            "preferences": self.get_preferences(),
            "statistics": self.get_statistics(),
            "exported_at": datetime.now().isoformat()
        }
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def clear_history(self) -> None:
        self.config.set("ratings", [])
