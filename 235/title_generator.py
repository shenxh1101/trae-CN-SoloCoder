import json
import random
import os
import re
import jieba
from typing import List, Dict, Optional, Tuple


class TitleGenerator:
    def __init__(self, template_path: str = None):
        if template_path is None:
            template_path = os.path.join(
                os.path.dirname(__file__), "data", "platform_templates.json"
            )
        with open(template_path, "r", encoding="utf-8") as f:
            self.templates = json.load(f)
        
        self.learned_patterns: List[str] = []
        self.learned_words: List[str] = []
        
        self.weighted_templates: Dict[str, List[Tuple[str, float]]] = {}
        self.weighted_emotional_words: Dict[str, List[Tuple[str, float]]] = {}
        self.user_feature_weights: Dict = {}
        self._init_weighted_templates()

    def _init_weighted_templates(self):
        for platform in self.templates:
            self.weighted_templates[platform] = [
                (t, 1.0) for t in self.templates[platform]["templates"]
            ]
            self.weighted_emotional_words[platform] = [
                (w, 1.0) for w in self.templates[platform]["emotional_words"]
            ]

    def get_platforms(self) -> Dict[str, Dict]:
        return self.templates

    def apply_user_weights(self, feedback_features: Dict):
        self.user_feature_weights = feedback_features
        
        template_weights = feedback_features.get("template_weights", {})
        word_weights = feedback_features.get("word_weights", {})
        
        for platform in self.templates:
            new_weighted = []
            for template, base_weight in self.weighted_templates[platform]:
                user_weight = template_weights.get(template, 0)
                total_weight = base_weight + user_weight * 0.5
                new_weighted.append((template, max(0.1, total_weight)))
            self.weighted_templates[platform] = new_weighted
            
            new_weighted_words = []
            for word, base_weight in self.weighted_emotional_words[platform]:
                user_word_weight = word_weights.get(word, 0)
                total_weight = base_weight + user_word_weight * 0.3
                new_weighted_words.append((word, max(0.1, total_weight)))
            self.weighted_emotional_words[platform] = new_weighted_words

    def _weighted_choice(self, weighted_list: List[Tuple[str, float]]) -> str:
        if not weighted_list:
            return ""
        
        total_weight = sum(w for _, w in weighted_list)
        r = random.uniform(0, total_weight)
        
        current = 0
        for item, weight in weighted_list:
            current += weight
            if r <= current:
                return item
        
        return weighted_list[-1][0]

    def generate_titles(
        self,
        topic: str,
        platform: str = "wechat",
        count: int = 5,
        use_learned: bool = False,
        custom_templates: Optional[List[str]] = None,
        use_weighted: bool = True,
    ) -> List[str]:
        if platform not in self.templates:
            raise ValueError(f"未知平台: {platform}，可用平台: {list(self.templates.keys())}")

        platform_config = self.templates[platform]
        max_length = platform_config["max_length"]
        
        if use_weighted and platform in self.weighted_templates:
            templates = [t for t, _ in self.weighted_templates[platform]]
            emotional_words = [w for w, _ in self.weighted_emotional_words[platform]]
        else:
            templates = platform_config["templates"].copy()
            emotional_words = platform_config["emotional_words"].copy()
        
        question_templates = platform_config["question_templates"].copy()

        if custom_templates:
            templates = custom_templates + templates[: len(templates) // 2]
        
        if use_learned and self.learned_patterns:
            templates = self.learned_patterns + templates

        if self.user_feature_weights and use_weighted:
            templates = self._adjust_templates_by_features(templates)
            emotional_words = self._adjust_words_by_features(emotional_words)

        generated = set()
        results = []

        while len(results) < count:
            template_type = self._weighted_template_type()
            
            if template_type == "normal":
                if use_weighted and platform in self.weighted_templates:
                    template = self._weighted_choice(self.weighted_templates[platform])
                else:
                    template = random.choice(templates)
                title = template.format(topic=topic)
            elif template_type == "question":
                template = random.choice(question_templates)
                title = template.format(topic=topic)
            elif template_type == "emotion":
                if use_weighted and platform in self.weighted_emotional_words:
                    emotion_word = self._weighted_choice(self.weighted_emotional_words[platform])
                else:
                    emotion_word = random.choice(emotional_words)
                if use_weighted and platform in self.weighted_templates:
                    base_template = self._weighted_choice(self.weighted_templates[platform])
                else:
                    base_template = random.choice(templates)
                title = f"{emotion_word}！{base_template.format(topic=topic)}"
            else:
                if use_weighted and platform in self.weighted_templates:
                    template = self._weighted_choice(self.weighted_templates[platform])
                else:
                    template = random.choice(templates)
                title = template.format(topic=topic)
                if random.random() > 0.5:
                    if use_weighted and platform in self.weighted_emotional_words:
                        emotion_word = self._weighted_choice(self.weighted_emotional_words[platform])
                    else:
                        emotion_word = random.choice(emotional_words)
                    if len(title) + len(emotion_word) + 3 <= max_length:
                        title = f"{emotion_word}！{title}"

            title = self._clean_title(title)
            
            if len(title) > max_length:
                title = title[:max_length]
            
            if title not in generated:
                generated.add(title)
                results.append(title)

        return results

    def _weighted_template_type(self) -> str:
        if not self.user_feature_weights:
            return random.choice(["normal", "question", "emotion", "hybrid"])
        
        q_ratio = self.user_feature_weights.get("question_ratio", 0.3)
        e_ratio = self.user_feature_weights.get("exclamation_ratio", 0.2)
        
        r = random.random()
        if r < q_ratio * 0.8:
            return "question"
        elif r < q_ratio * 0.8 + e_ratio * 0.6:
            return "emotion"
        elif r < 0.8:
            return "normal"
        else:
            return "hybrid"

    def _adjust_templates_by_features(self, templates: List[str]) -> List[str]:
        n_ratio = self.user_feature_weights.get("number_ratio", 0.3)
        if n_ratio > 0.5:
            for template in templates[:5]:
                num = random.choice([3, 5, 7, 9, 10])
                num_template = template.replace("{topic}", f"{num}个{topic}")
                if num_template not in templates:
                    templates.insert(0, template.replace("{topic}", f"{num}个{topic}"))
        return templates

    def _adjust_words_by_features(self, words: List[str]) -> List[str]:
        word_weights = self.user_feature_weights.get("word_weights", {})
        if word_weights:
            weighted_words = sorted(
                words,
                key=lambda w: word_weights.get(w, 0),
                reverse=True
            )
            top_words = [w for w in weighted_words if word_weights.get(w, 0) > 1][:5]
            return top_words + words
        return words

    def _clean_title(self, title: str) -> str:
        title = re.sub(r"\s+", "", title)
        title = re.sub(r"[!！]{2,}", "！", title)
        title = re.sub(r"[?？]{2,}", "？", title)
        title = re.sub(r"[，,]{2,}", "，", title)
        return title

    def learn_style(self, titles: List[str]):
        self.learned_patterns = []
        self.learned_words = []
        
        for title in titles:
            title = title.strip()
            if not title:
                continue
            
            words = list(jieba.cut(title))
            self.learned_words.extend(words)
            
            pattern = self._extract_pattern(title)
            if pattern and pattern not in self.learned_patterns:
                self.learned_patterns.append(pattern)

        for template in self.learned_patterns[:]:
            for i in range(1, 10):
                num_pattern = template.replace("{topic}", f"{i}个{topic}")
                if num_pattern not in self.learned_patterns:
                    self.learned_patterns.append(num_pattern)

    def _extract_pattern(self, title: str) -> Optional[str]:
        common_topics = ["加班", "赚钱", "年轻人", "健康", "学习", "职场", "副业", "创业"]
        for topic in common_topics:
            if topic in title:
                pattern = title.replace(topic, "{topic}")
                return pattern
        return None

    def generate_ab_test_pair(
        self,
        topic: str,
        platform: str = "wechat",
    ) -> Dict[str, List[str]]:
        platform_config = self.templates[platform]
        
        if platform in self.weighted_templates:
            templates = [t for t, _ in self.weighted_templates[platform]]
            emotional_words = [w for w, _ in self.weighted_emotional_words[platform]]
        else:
            templates = platform_config["templates"]
            emotional_words = platform_config["emotional_words"]
        
        question_templates = platform_config["question_templates"]
        
        template_a = random.choice(templates)
        template_b = random.choice(question_templates)
        
        title_a1 = template_a.format(topic=topic)
        title_a2 = random.choice(templates).format(topic=topic)
        title_b1 = template_b.format(topic=topic)
        title_b2 = random.choice(question_templates).format(topic=topic)
        
        emotion = random.choice(emotional_words)
        title_a3 = f"{emotion}！{template_a.format(topic=topic)}"
        
        return {
            "陈述式": [self._clean_title(title_a1), self._clean_title(title_a2)],
            "疑问式": [self._clean_title(title_b1), self._clean_title(title_b2)],
            "情感式": [self._clean_title(title_a3), self._clean_title(f"{emotion}！{title_a2}")],
        }
