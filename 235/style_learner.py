import jieba
import re
from typing import List, Dict, Tuple
from collections import Counter


class StyleLearner:
    def __init__(self):
        self.patterns: List[str] = []
        self.word_frequency: Counter = Counter()
        self.title_structures: List[List[str]] = []
        self.average_length: float = 0.0
        self.question_ratio: float = 0.0
        self.exclamation_ratio: float = 0.0
        self.number_ratio: float = 0.0
        self.emotional_words: List[str] = []
        self.learned_templates: List[str] = []

    def learn(self, titles: List[str]) -> Dict:
        if not titles:
            raise ValueError("标题列表不能为空")

        titles = [t.strip() for t in titles if t.strip()]
        
        total = len(titles)
        self.average_length = sum(len(t) for t in titles) / total
        
        question_count = sum(1 for t in titles if "？" in t or "?" in t)
        exclamation_count = sum(1 for t in titles if "！" in t or "!" in t)
        number_count = sum(1 for t in titles if re.search(r"\d", t))
        
        self.question_ratio = question_count / total
        self.exclamation_ratio = exclamation_count / total
        self.number_ratio = number_count / total
        
        all_words = []
        for title in titles:
            words = jieba.lcut(title)
            self.title_structures.append(words)
            all_words.extend(words)
        
        self.word_frequency = Counter(all_words)
        
        self._extract_emotional_words(titles)
        self._extract_templates(titles)
        
        return self.get_style_summary()

    def _extract_emotional_words(self, titles: List[str]):
        emotional_markers = [
            "震惊", "泪目", "扎心", "真实", "深刻", "必看", "收藏",
            "干货", "硬核", "真相", "绝了", "离谱", "破防", "真香",
            "可怕", "吓人", "秘密", "揭秘", "最新", "突发", "重要"
        ]
        
        found = []
        for title in titles:
            for marker in emotional_markers:
                if marker in title:
                    found.append(marker)
        
        self.emotional_words = list(set(found))

    def _extract_templates(self, titles: List[str]):
        common_patterns = [
            (r"为什么.*？", "为什么{topic}？"),
            (r".*的真相", "{topic}的真相"),
            (r".*的秘密", "{topic}的秘密"),
            (r"深度解析.*", "深度解析：{topic}"),
            (r".*到底是怎么回事", "{topic}到底是怎么回事"),
            (r"关于.*我想说", "关于{topic}，我想说"),
            (r"当我开始.*", "当我开始{topic}"),
            (r"花了.*时间.*", "花了{time}，终于搞懂了{topic}"),
            (r"90%的人.*", "90%的人都不知道的{topic}真相"),
            (r"看完.*就懂了", "看完{topic}你就懂了"),
            (r".*的3个.*", "{topic}的3个真相"),
            (r".*的5个.*", "{topic}的5个信号"),
            (r"震惊！.*", "震惊！{topic}竟然是这样的"),
            (r"揭秘：.*", "揭秘：{topic}不为人知的一面"),
        ]
        
        self.learned_templates = []
        for regex, template in common_patterns:
            match_count = sum(1 for t in titles if re.search(regex, t))
            if match_count >= len(titles) * 0.1:
                self.learned_templates.append(template)

        for title in titles:
            for common_topic in ["加班", "赚钱", "年轻人", "健康", "学习", "职场", "副业"]:
                if common_topic in title:
                    template = title.replace(common_topic, "{topic}")
                    if template not in self.learned_templates:
                        self.learned_templates.append(template)

    def get_style_summary(self) -> Dict:
        top_words = self.word_frequency.most_common(20)
        
        return {
            "total_titles": len(self.title_structures),
            "average_length": round(self.average_length, 1),
            "question_ratio": round(self.question_ratio * 100, 1),
            "exclamation_ratio": round(self.exclamation_ratio * 100, 1),
            "number_ratio": round(self.number_ratio * 100, 1),
            "top_keywords": [w for w, c in top_words if len(w) > 1],
            "emotional_words": self.emotional_words,
            "template_count": len(self.learned_templates)
        }

    def generate_similar_titles(
        self,
        topic: str,
        generator,
        count: int = 5
    ) -> List[str]:
        if not self.learned_templates:
            return generator.generate_titles(topic, count=count)
        
        custom_templates = self.learned_templates.copy()
        
        if self.question_ratio > 0.5:
            for t in self.learned_templates[:5]:
                if "？" not in t:
                    custom_templates.append(f"{t}？")
        
        if self.exclamation_ratio > 0.3:
            for t in self.learned_templates[:5]:
                if "！" not in t and self.emotional_words:
                    emotion = random.choice(self.emotional_words)
                    custom_templates.append(f"{emotion}！{t}")
        
        return generator.generate_titles(
            topic,
            count=count,
            custom_templates=custom_templates,
            use_learned=True
        )

    def load_from_file(self, filepath: str) -> Dict:
        with open(filepath, "r", encoding="utf-8") as f:
            titles = [line.strip() for line in f if line.strip()]
        return self.learn(titles)

    def save_style(self, filepath: str):
        import json
        data = {
            "patterns": self.learned_templates,
            "emotional_words": self.emotional_words,
            "word_frequency": dict(self.word_frequency),
            "average_length": self.average_length,
            "question_ratio": self.question_ratio,
            "exclamation_ratio": self.exclamation_ratio,
            "number_ratio": self.number_ratio
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


import random
