import random
import re
import jieba
from typing import Dict, List, Tuple


class PerformancePredictor:
    def __init__(self):
        self.high_ctr_words = [
            "震惊", "秘密", "揭秘", "真相", "可怕", "吓人", "曝光",
            "内幕", "绝了", "离谱", "破防", "真香", "必看", "收藏",
            "干货", "最新", "突发", "紧急", "重要", "90%", "99%",
            "100%", "千万", "万万", "终于", "竟然", "居然", "原来"
        ]
        
        self.high_share_words = [
            "收藏", "干货", "实用", "转发", "分享", "建议", "推荐",
            "值得", "有用", "方法", "技巧", "攻略", "教程", "大全",
            "总结", "盘点", "排行榜", "十大", "最好", "最牛"
        ]
        
        self.high_interaction_words = [
            "你觉得", "怎么看", "有没有", "只有我", "评论区", "说说",
            "投票", "你会", "你认为", "大家", "我们", "一起",
            "？", "吗", "呢", "吧", "啊"
        ]
        
        self.negative_words = [
            "可能", "也许", "大概", "或许", "应该", "一般", "普通",
            "还行", "凑合", "勉强"
        ]
        
        self.user_word_weights = {}
        self.user_template_weights = {}
        self.user_feature_boost = False

    def enable_user_feedback(self, feedback_features: Dict):
        self.user_word_weights = feedback_features.get("word_weights", {})
        self.user_template_weights = feedback_features.get("template_weights", {})
        self.user_feature_boost = feedback_features.get("total_feedback", 0) >= 5

    def disable_user_feedback(self):
        self.user_word_weights = {}
        self.user_template_weights = {}
        self.user_feature_boost = False

    def predict(self, title: str, platform: str = "wechat") -> Dict[str, float]:
        ctr = self._predict_ctr(title, platform)
        share_rate = self._predict_share_rate(title, platform)
        interaction_rate = self._predict_interaction_rate(title, platform)
        
        if self.user_feature_boost:
            boost = self._calculate_user_boost(title)
            ctr += boost["ctr"]
            share_rate += boost["share"]
            interaction_rate += boost["interaction"]
        
        ctr, share_rate, interaction_rate = self._normalize_scores(
            ctr, share_rate, interaction_rate
        )
        
        return {
            "ctr": round(ctr, 2),
            "share_rate": round(share_rate, 2),
            "interaction_rate": round(interaction_rate, 2),
            "composite_score": round((ctr * 0.4 + share_rate * 0.3 + interaction_rate * 0.3), 2),
            "is_weighted": self.user_feature_boost
        }

    def _calculate_user_boost(self, title: str) -> Dict[str, float]:
        boost = {"ctr": 0, "share": 0, "interaction": 0}
        
        words = jieba.lcut(title)
        word_score = 0
        for word in words:
            word_score += self.user_word_weights.get(word, 0)
        
        if word_score > 3:
            boost["ctr"] += min(1.5, word_score * 0.15)
            boost["share"] += min(1.0, word_score * 0.1)
            boost["interaction"] += min(0.8, word_score * 0.08)
        
        return boost

    def _predict_ctr(self, title: str, platform: str) -> float:
        base_score = random.uniform(3.0, 8.0)
        
        word_score = 0
        for word in self.high_ctr_words:
            if word in title:
                word_score += 1.5
        
        for word in self.negative_words:
            if word in title:
                word_score -= 1.0
        
        if re.search(r"\d+%|\d+个|\d+分钟", title):
            word_score += 1.0
        
        if "？" in title or "?" in title:
            word_score += 0.8
        
        length = len(title)
        if platform == "toutiao":
            if 15 <= length <= 25:
                word_score += 1.0
        elif platform == "bilibili":
            if 10 <= length <= 30:
                word_score += 1.0
        else:
            if 20 <= length <= 40:
                word_score += 1.0
        
        if platform == "toutiao":
            base_score += 1.5
        elif platform == "bilibili":
            base_score += 0.5
        
        score = base_score + word_score + random.uniform(-0.5, 0.5)
        return max(1.0, min(15.0, score))

    def _predict_share_rate(self, title: str, platform: str) -> float:
        base_score = random.uniform(2.0, 6.0)
        
        word_score = 0
        for word in self.high_share_words:
            if word in title:
                word_score += 1.2
        
        if "干货" in title or "收藏" in title or "实用" in title:
            word_score += 2.0
        
        if re.search(r"方法|技巧|攻略|教程|大全|总结", title):
            word_score += 1.5
        
        if platform == "wechat":
            base_score += 1.0
        
        score = base_score + word_score + random.uniform(-0.3, 0.3)
        return max(0.5, min(12.0, score))

    def _predict_interaction_rate(self, title: str, platform: str) -> float:
        base_score = random.uniform(1.0, 4.0)
        
        word_score = 0
        for word in self.high_interaction_words:
            if word in title:
                word_score += 1.0
        
        if title.endswith("？") or title.endswith("?"):
            word_score += 1.5
        
        if re.search(r"你|我|我们|大家", title):
            word_score += 0.8
        
        if platform == "bilibili":
            base_score += 1.5
        elif platform == "toutiao":
            base_score += 0.5
        
        words = jieba.lcut(title)
        if len(words) >= 2 and words[-1] in ["吗", "呢", "吧", "啊"]:
            word_score += 0.5
        
        score = base_score + word_score + random.uniform(-0.2, 0.2)
        return max(0.3, min(10.0, score))

    def _normalize_scores(
        self, ctr: float, share_rate: float, interaction_rate: float
    ) -> Tuple[float, float, float]:
        ctr = max(1.0, min(15.0, ctr))
        share_rate = max(0.5, min(12.0, share_rate))
        interaction_rate = max(0.3, min(10.0, interaction_rate))
        
        return ctr, share_rate, interaction_rate

    def analyze_title_factors(self, title: str) -> Dict[str, List[str]]:
        factors = {
            "ctr_positive": [],
            "ctr_negative": [],
            "share_positive": [],
            "share_negative": [],
            "interaction_positive": [],
            "interaction_negative": [],
            "user_boost_words": []
        }
        
        for word in self.high_ctr_words:
            if word in title:
                factors["ctr_positive"].append(word)
        
        for word in self.high_share_words:
            if word in title:
                factors["share_positive"].append(word)
        
        for word in self.high_interaction_words:
            if word in title:
                factors["interaction_positive"].append(word)
        
        for word in self.negative_words:
            if word in title:
                factors["ctr_negative"].append(word)
                factors["share_negative"].append(word)
        
        if re.search(r"\d+%|\d+个|\d+分钟", title):
            factors["ctr_positive"].append("数字强化")
        
        if "？" in title or "?" in title:
            factors["ctr_positive"].append("疑问句")
            factors["interaction_positive"].append("疑问句")
        
        if self.user_feature_boost:
            words = jieba.lcut(title)
            for word in words:
                if self.user_word_weights.get(word, 0) > 1:
                    factors["user_boost_words"].append(f"{word}(+{self.user_word_weights[word]:.1f})")
        
        return factors
