import re
from collections import Counter
from difflib import SequenceMatcher


class CompetitorAnalyzer:
    STOP_WORDS = {
        "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都",
        "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你",
        "会", "着", "没有", "看", "好", "自己", "这", "他", "她", "它",
        "们", "那", "些", "什么", "怎么", "可以", "还", "把", "被", "让",
        "给", "从", "用", "对", "比", "为", "而", "但", "或", "如", "与",
        "及", "等", "能", "才", "将", "已", "所", "之", "其", "以",
        "因为", "所以", "如果", "虽然", "但是", "而且", "或者", "还是",
        "这个", "那个", "这些", "那些", "这样", "那样", "这么", "那么",
    }

    MARKETING_KEYWORDS = {
        "限量", "抢购", "秒杀", "特惠", "优惠", "折扣", "福利", "首发",
        "新品", "爆款", "热卖", "畅销", "推荐", "必备", "首选", "精选",
        "升级", "新款", "旗舰", "至尊", "超值", "划算", "便宜", "省钱",
        "高效", "智能", "便携", "静音", "节能", "环保", "健康", "安全",
        "舒适", "方便", "简单", "快速", "专业", "严选", "甄选", "热销",
        "断货", "售罄", "补货", "独家", "限定", "定制", "专享", "特惠",
    }

    EMOTIONAL_WORDS = {
        "惊艳", "绝了", "太棒", "完美", "超赞", "爱了", "心动", "种草",
        "真香", "靠谱", "放心", "满意", "惊喜", "震撼", "无敌", "牛",
        "炸裂", "爽", "治愈", "上头", "YYDS", "封神", "必入", "闭眼入",
        "回购", "囤货", "安利", "墙裂推荐", "相见恨晚", "爱不释手",
    }

    URGENCY_WORDS = {
        "限时", "倒计时", "最后", "仅剩", "速来", "手慢无", "错过",
        "立即", "马上", "赶紧", "截止", "即将", "倒计时", "秒杀",
        "今日", "仅限", "专属", "仅此一天", "售完即止", "不等人",
    }

    def analyze(self, competitor_text: str) -> dict:
        try:
            import jieba
            words = list(jieba.cut(competitor_text))
        except ImportError:
            words = self._simple_cut(competitor_text)

        filtered = [w for w in words if len(w) >= 2 and w not in self.STOP_WORDS]
        word_freq = Counter(filtered)
        top_keywords = word_freq.most_common(15)

        marketing_hits = [w for w in filtered if w in self.MARKETING_KEYWORDS]
        marketing_freq = Counter(marketing_hits).most_common(10)

        emotional_hits = [w for w in filtered if w in self.EMOTIONAL_WORDS]
        emotional_freq = Counter(emotional_hits).most_common(5)

        urgency_hits = [w for w in filtered if w in self.URGENCY_WORDS]
        urgency_freq = Counter(urgency_hits).most_common(5)

        features = self._extract_features(competitor_text)

        writing_style = self._analyze_writing_style(competitor_text)

        sentiment = self._analyze_sentiment(emotional_hits, urgency_hits, marketing_hits)

        keyword_density = self._calculate_keyword_density(filtered, marketing_hits + emotional_hits + urgency_hits)

        return {
            "top_keywords": [{"word": w, "count": c} for w, c in top_keywords],
            "marketing_keywords": [{"word": w, "count": c} for w, c in marketing_freq],
            "emotional_keywords": [{"word": w, "count": c} for w, c in emotional_freq],
            "urgency_keywords": [{"word": w, "count": c} for w, c in urgency_freq],
            "product_features": features,
            "writing_style": writing_style,
            "sentiment": sentiment,
            "keyword_density": keyword_density,
            "suggested_keywords": self._suggest_keywords(top_keywords, marketing_hits, emotional_hits, urgency_hits),
            "optimization_suggestions": self._generate_optimization_suggestions(
                marketing_freq, emotional_freq, urgency_freq, features, writing_style
            ),
            "text_length": len(competitor_text),
            "word_count": len(filtered),
        }

    def compare_copies(self, original_copy: str, optimized_copy: str, competitor_analysis: dict) -> dict:
        original_words = self._tokenize(original_copy)
        optimized_words = self._tokenize(optimized_copy)

        competitor_keywords = [kw["word"] for kw in competitor_analysis["marketing_keywords"]]
        competitor_keywords += [kw["word"] for kw in competitor_analysis["emotional_keywords"]]
        competitor_keywords += [kw["word"] for kw in competitor_analysis["urgency_keywords"]]

        original_hit = sum(1 for w in original_words if w in competitor_keywords)
        optimized_hit = sum(1 for w in optimized_words if w in competitor_keywords)

        original_marketing = sum(1 for w in original_words if w in self.MARKETING_KEYWORDS)
        optimized_marketing = sum(1 for w in optimized_words if w in self.MARKETING_KEYWORDS)

        original_emotional = sum(1 for w in original_words if w in self.EMOTIONAL_WORDS)
        optimized_emotional = sum(1 for w in optimized_words if w in self.EMOTIONAL_WORDS)

        original_urgency = sum(1 for w in original_words if w in self.URGENCY_WORDS)
        optimized_urgency = sum(1 for w in optimized_words if w in self.URGENCY_WORDS)

        added_keywords = []
        removed_keywords = []
        for kw in competitor_keywords:
            if kw in optimized_words and kw not in original_words:
                added_keywords.append(kw)
            if kw in original_words and kw not in optimized_words:
                removed_keywords.append(kw)

        similarity = SequenceMatcher(None, original_copy, optimized_copy).ratio()

        diff = self._highlight_diff(original_copy, optimized_copy)

        estimated_improvement = self._estimate_improvement(
            original_hit, optimized_hit, len(original_words), len(optimized_words)
        )

        return {
            "original_copy": original_copy,
            "optimized_copy": optimized_copy,
            "original_stats": {
                "total_words": len(original_words),
                "competitor_keyword_hits": original_hit,
                "marketing_keywords": original_marketing,
                "emotional_keywords": original_emotional,
                "urgency_keywords": original_urgency,
                "keyword_match_rate": f"{round(original_hit / len(competitor_keywords) * 100, 1)}%" if competitor_keywords else "0%",
            },
            "optimized_stats": {
                "total_words": len(optimized_words),
                "competitor_keyword_hits": optimized_hit,
                "marketing_keywords": optimized_marketing,
                "emotional_keywords": optimized_emotional,
                "urgency_keywords": optimized_urgency,
                "keyword_match_rate": f"{round(optimized_hit / len(competitor_keywords) * 100, 1)}%" if competitor_keywords else "0%",
            },
            "improvement": {
                "competitor_keywords_added": optimized_hit - original_hit,
                "marketing_keywords_added": optimized_marketing - original_marketing,
                "emotional_keywords_added": optimized_emotional - original_emotional,
                "urgency_keywords_added": optimized_urgency - original_urgency,
                "match_rate_improvement": f"{round((optimized_hit - original_hit) / max(len(competitor_keywords), 1) * 100, 1)}%",
            },
            "added_keywords": added_keywords,
            "removed_keywords": removed_keywords,
            "text_similarity": round(similarity * 100, 1),
            "diff_highlight": diff,
            "estimated_improvement": estimated_improvement,
        }

    def get_optimized_keywords(self, competitor_text: str) -> list[str]:
        analysis = self.analyze(competitor_text)
        keywords = []
        for item in analysis["marketing_keywords"][:5]:
            keywords.append(item["word"])
        for item in analysis["emotional_keywords"][:3]:
            if item["word"] not in keywords:
                keywords.append(item["word"])
        for item in analysis["urgency_keywords"][:2]:
            if item["word"] not in keywords:
                keywords.append(item["word"])
        for item in analysis["top_keywords"][:5]:
            if item["word"] not in keywords:
                keywords.append(item["word"])
        return keywords[:12]

    def _tokenize(self, text: str) -> list[str]:
        try:
            import jieba
            return list(jieba.cut(text))
        except ImportError:
            return self._simple_cut(text)

    def _simple_cut(self, text: str) -> list[str]:
        result = []
        i = 0
        while i < len(text):
            if text[i].strip() == "":
                i += 1
                continue
            matched = False
            for length in [4, 3, 2]:
                if i + length <= len(text):
                    word = text[i:i + length]
                    if any(kw in word for kw in self.MARKETING_KEYWORDS | self.EMOTIONAL_WORDS | self.URGENCY_WORDS):
                        result.append(word)
                        i += length
                        matched = True
                        break
            if not matched:
                result.append(text[i])
                i += 1
        return result

    def _extract_features(self, text: str) -> list[dict]:
        patterns = [
            (r'(\d+\.?\d*[%％])', '百分比'),
            (r'(\d+小时)', '时长'),
            (r'(\d+分钟)', '时长'),
            (r'(\d+天)', '周期'),
            (r'(\d+度)', '温度'),
            (r'(\d+dB)', '噪音'),
            (r'(\d+[mLmL][Ll]?)', '容量'),
            (r'(\d+W)', '功率'),
            (r'(\d+V)', '电压'),
        ]
        features = []
        for pattern, ftype in patterns:
            matches = re.findall(pattern, text)
            for m in matches:
                features.append({"value": m, "type": ftype, "raw": m})

        feature_patterns = [
            r'([\u4e00-\u9fff]{2,6}(?:技术|功能|设计|系统|模式|材质|工艺|认证))',
        ]
        for pattern in feature_patterns:
            matches = re.findall(pattern, text)
            for m in matches:
                features.append({"value": m, "type": "产品特性", "raw": m})

        seen = set()
        unique_features = []
        for f in features:
            key = f["raw"]
            if key not in seen:
                seen.add(key)
                unique_features.append(f)

        return unique_features[:10]

    def _analyze_writing_style(self, text: str) -> dict:
        sentence_count = max(1, text.count("。") + text.count("！") + text.count("？"))
        avg_sentence_length = len(text) / sentence_count

        emoji_count = len(re.findall(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]', text))
        hashtag_count = text.count("#")
        exclamation_count = text.count("！")
        question_count = text.count("？")

        if avg_sentence_length < 15:
            style = "短句明快型"
        elif avg_sentence_length < 30:
            style = "中规中矩型"
        else:
            style = "长句细致型"

        return {
            "style": style,
            "avg_sentence_length": round(avg_sentence_length, 1),
            "sentence_count": sentence_count,
            "emoji_count": emoji_count,
            "hashtag_count": hashtag_count,
            "exclamation_count": exclamation_count,
            "question_count": question_count,
            "emoji_density": round(emoji_count / max(len(text), 1) * 1000, 2),
            "exclamation_density": round(exclamation_count / max(sentence_count, 1), 2),
        }

    def _analyze_sentiment(self, emotional_hits: list, urgency_hits: list, marketing_hits: list) -> dict:
        positive_words = len([w for w in emotional_hits if w in ["超赞", "爱了", "心动", "惊艳", "完美", "太棒"]])
        urgent_words = len(urgency_hits)
        promotion_words = len([w for w in marketing_hits if w in ["优惠", "折扣", "秒杀", "限量"]])

        total_hits = len(emotional_hits) + len(urgency_hits) + len(marketing_hits)
        if total_hits == 0:
            sentiment = "中性客观"
        elif positive_words > urgent_words:
            sentiment = "感性种草型"
        elif urgent_words > positive_words:
            sentiment = "紧迫营销型"
        elif promotion_words > positive_words:
            sentiment = "促销导向型"
        else:
            sentiment = "综合平衡型"

        return {
            "sentiment_type": sentiment,
            "positive_word_count": positive_words,
            "urgency_word_count": urgent_words,
            "promotion_word_count": promotion_words,
        }

    def _calculate_keyword_density(self, all_words: list, target_words: list) -> dict:
        total = len(all_words)
        if total == 0:
            return {"density": "0%", "count": 0, "recommendation": "正常"}

        count = len(target_words)
        density = count / total * 100

        if density < 2:
            recommendation = "偏低，可适当增加关键词"
        elif density < 8:
            recommendation = "适中 ✅"
        else:
            recommendation = "偏高，可能被判定为关键词堆砌 ⚠️"

        return {
            "density": f"{round(density, 1)}%",
            "count": count,
            "total_words": total,
            "recommendation": recommendation,
        }

    def _suggest_keywords(
        self,
        top_keywords: list[tuple],
        marketing_hits: list,
        emotional_hits: list,
        urgency_hits: list,
    ) -> list[str]:
        suggestions = []
        seen = set()

        for word in ["限时", "限量", "秒杀", "特惠", "高效", "智能", "静音"]:
            if word not in marketing_hits and word not in seen:
                suggestions.append(word)
                seen.add(word)

        for word in ["超赞", "爱了", "心动", "惊艳", "真香"]:
            if word not in emotional_hits and word not in seen:
                suggestions.append(word)
                seen.add(word)

        for word, _ in top_keywords[:5]:
            if word not in seen:
                suggestions.append(word)
                seen.add(word)

        return suggestions[:8]

    def _generate_optimization_suggestions(
        self,
        marketing_freq: list,
        emotional_freq: list,
        urgency_freq: list,
        features: list,
        writing_style: dict,
    ) -> list[dict]:
        suggestions = []

        if not marketing_freq:
            suggestions.append({
                "category": "营销词",
                "priority": "高",
                "suggestion": "建议增加营销词汇（如：限量、秒杀、特惠、爆款等），提升转化力",
            })
        elif len(marketing_freq) < 3:
            suggestions.append({
                "category": "营销词",
                "priority": "中",
                "suggestion": f"目前使用 {len(marketing_freq)} 个营销词，可适当补充更多营销词汇",
            })

        if not emotional_freq:
            suggestions.append({
                "category": "情感词",
                "priority": "高",
                "suggestion": "建议增加情感词汇（如：超赞、爱了、心动、惊艳等），激发用户共鸣",
            })

        if not urgency_freq:
            suggestions.append({
                "category": "紧迫感",
                "priority": "高",
                "suggestion": "建议增加紧迫感词汇（如：限时、手慢无、最后、倒计时等），促进立即转化",
            })

        if len(features) < 3:
            suggestions.append({
                "category": "产品特性",
                "priority": "中",
                "suggestion": "建议补充更多具体的产品特性参数（如：续航时长、功率、容量等数据指标）",
            })

        if writing_style["emoji_count"] == 0:
            suggestions.append({
                "category": "表达形式",
                "priority": "低",
                "suggestion": "可以适当使用 emoji 表情，增加文案的视觉吸引力和亲和力",
            })

        if writing_style["avg_sentence_length"] > 40:
            suggestions.append({
                "category": "句式",
                "priority": "中",
                "suggestion": f"平均句长 {writing_style['avg_sentence_length']} 字偏长，建议拆分为短句，提升可读性",
            })

        return suggestions

    def _highlight_diff(self, original: str, optimized: str) -> dict:
        matcher = SequenceMatcher(None, original, optimized)
        opcodes = matcher.get_opcodes()

        added_parts = []
        removed_parts = []

        for tag, i1, i2, j1, j2 in opcodes:
            if tag == 'replace':
                removed_parts.append(original[i1:i2])
                added_parts.append(optimized[j1:j2])
            elif tag == 'delete':
                removed_parts.append(original[i1:i2])
            elif tag == 'insert':
                added_parts.append(optimized[j1:j2])

        return {
            "added": [p for p in added_parts if p.strip()],
            "removed": [p for p in removed_parts if p.strip()],
        }

    def _estimate_improvement(self, orig_hit: int, opt_hit: int, orig_len: int, opt_len: int) -> dict:
        if orig_hit == 0:
            ctr_improvement = opt_hit * 2.0 if opt_hit > 0 else 0
        else:
            ctr_improvement = ((opt_hit - orig_hit) / orig_hit) * 15

        ctr_improvement = min(max(ctr_improvement, -30), 50)

        if ctr_improvement >= 20:
            improvement_level = "显著提升 🔥"
        elif ctr_improvement >= 10:
            improvement_level = "明显提升 👍"
        elif ctr_improvement >= 0:
            improvement_level = "略有提升 📈"
        else:
            improvement_level = "效果不明显 ⚠️"

        return {
            "estimated_ctr_improvement_pct": round(ctr_improvement, 1),
            "improvement_level": improvement_level,
            "expected_impact": "预估点击率提升 " + str(round(ctr_improvement, 1)) + "%",
        }
