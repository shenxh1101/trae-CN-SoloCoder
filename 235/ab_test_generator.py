import random
from typing import List, Dict, Tuple


class ABTestGenerator:
    def __init__(self):
        self.test_dimensions = [
            ("陈述式", "疑问式"),
            ("情感式", "理性式"),
            ("数字型", "文字型"),
            ("悬念型", "直白型"),
            ("短标题", "长标题"),
            ("第一人称", "第三人称"),
            ("痛点型", "利益型")
        ]

    def generate_test_pairs(
        self,
        topic: str,
        generator,
        predictor,
        platform: str = "wechat",
        pairs_count: int = 3
    ) -> List[Dict]:
        results = []
        
        for i in range(pairs_count):
            dimension = random.choice(self.test_dimensions)
            pair = self._generate_pair(topic, generator, platform, dimension)
            
            title_a, title_b = pair
            pred_a = predictor.predict(title_a, platform)
            pred_b = predictor.predict(title_b, platform)
            
            results.append({
                "test_id": i + 1,
                "dimension": f"{dimension[0]} vs {dimension[1]}",
                "title_a": title_a,
                "title_b": title_b,
                "prediction_a": pred_a,
                "prediction_b": pred_b,
                "recommendation": self._get_recommendation(pred_a, pred_b)
            })
        
        return results

    def _generate_pair(
        self,
        topic: str,
        generator,
        platform: str,
        dimension: Tuple[str, str]
    ) -> Tuple[str, str]:
        platform_config = generator.templates[platform]
        templates = platform_config["templates"]
        question_templates = platform_config["question_templates"]
        emotional_words = platform_config["emotional_words"]
        
        style_a, style_b = dimension
        
        if style_a == "陈述式":
            title_a = random.choice(templates).format(topic=topic)
            title_b = random.choice(question_templates).format(topic=topic)
        elif style_a == "情感式":
            emotion = random.choice(emotional_words)
            title_a = f"{emotion}！{random.choice(templates).format(topic=topic)}"
            title_b = random.choice(templates).format(topic=topic)
        elif style_a == "数字型":
            num = random.choice([3, 5, 7, 9, 10])
            title_a = f"{num}个{topic}的真相，看完沉默了"
            title_b = f"{topic}的真相，看完沉默了"
        elif style_a == "悬念型":
            title_a = f"{topic}的秘密，99%的人不知道"
            title_b = f"关于{topic}，你需要知道这些"
        elif style_a == "短标题":
            title_a = f"{topic}？真相了"
            title_b = f"深度解析{topic}背后不为人知的真相与逻辑"
        elif style_a == "第一人称":
            title_a = f"我花了3年研究{topic}，终于明白了"
            title_b = f"研究表明{topic}会产生重大影响"
        elif style_a == "痛点型":
            title_a = f"{topic}正在毁掉你的生活，快醒醒"
            title_b = f"掌握{topic}的方法，让人生更高效"
        else:
            title_a = random.choice(templates).format(topic=topic)
            title_b = random.choice(templates).format(topic=topic)
        
        return self._clean(title_a), self._clean(title_b)

    def _clean(self, title: str) -> str:
        import re
        title = re.sub(r"\s+", "", title)
        return title

    def _get_recommendation(self, pred_a: Dict, pred_b: Dict) -> str:
        score_a = pred_a["composite_score"]
        score_b = pred_b["composite_score"]
        
        diff = abs(score_a - score_b)
        
        if diff < 0.5:
            return "两个标题表现相当，建议都测试"
        elif score_a > score_b:
            return f"A版本预期表现更好（领先{diff:.2f}分）"
        else:
            return f"B版本预期表现更好（领先{diff:.2f}分）"

    def generate_test_plan(
        self,
        topic: str,
        generator,
        predictor,
        platform: str = "wechat"
    ) -> Dict:
        pairs = self.generate_test_pairs(topic, generator, predictor, platform, 3)
        
        all_titles = []
        for pair in pairs:
            all_titles.append((pair["title_a"], pair["prediction_a"]))
            all_titles.append((pair["title_b"], pair["prediction_b"]))
        
        all_titles.sort(key=lambda x: x[1]["composite_score"], reverse=True)
        
        return {
            "topic": topic,
            "platform": platform,
            "test_pairs": pairs,
            "total_variants": len(all_titles),
            "top_performer": {
                "title": all_titles[0][0],
                "prediction": all_titles[0][1]
            },
            "testing_guide": self._get_testing_guide()
        }

    def _get_testing_guide(self) -> str:
        return """
A/B测试建议：
1. 测试周期：建议测试24-48小时，确保数据量充足
2. 样本量：每组至少需要1000次曝光才有统计意义
3. 测试变量：每次只测试一个维度，控制其他变量一致
4. 数据分析：关注点击率(CTR)、阅读完成率、互动率
5. 统计显著：使用卡方检验或Z检验判断结果是否显著
"""
