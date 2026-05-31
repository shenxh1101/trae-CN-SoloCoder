import jieba
import re
import json
import os
from typing import Dict, List, Tuple, Optional
from collections import defaultdict


class EmailClassifier:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.custom_keywords_file = os.path.join(data_dir, "custom_keywords.json")
        self.default_categories = {
            "咨询": {
                "keywords": ["咨询", "请问", "如何", "怎么", "什么是", "哪里", "谁能", "如何使用", "教程", "帮助", "疑问", "问题", "想了解", "询价", "价格", "费用", "多少钱"],
                "weight": 1.0
            },
            "投诉": {
                "keywords": ["投诉", "不满", "太差", "垃圾", "无法使用", "故障", "bug", "问题", "错误", "失败", "退款", "退货", "维权", "不合理", "不负责", "骗人", "诈骗", "态度差", "慢", "延迟", "不回复"],
                "weight": 1.5
            },
            "合作": {
                "keywords": ["合作", "商务", "洽谈", "代理", "加盟", "投资", "并购", "战略", "伙伴", "共赢", "项目", "方案", "报价", "招标", "投标", "供应商", "采购", "长期", "批量"],
                "weight": 1.0
            },
            "退订": {
                "keywords": ["退订", "取消", "注销", "不再", "停止", "退费", "退钱", "退会员", "退服务", "不续费", "取消订阅", "取消订单", "取消预约"],
                "weight": 1.0
            },
            "表扬": {
                "keywords": ["表扬", "感谢", "满意", "点赞", "优秀", "很棒", "好极了", "推荐", "赞赏", "认可", "好评", "称赞", "给力", "专业"],
                "weight": 1.0
            }
        }
        self.sentiment_keywords = {
            "positive": ["感谢", "满意", "优秀", "很棒", "好", "赞", "喜欢", "支持", "认可", "好评", "称赞", "给力", "专业", "贴心", "周到", "快速", "及时", "完美", "值得"],
            "negative": ["投诉", "不满", "太差", "垃圾", "错误", "失败", "退款", "退货", "维权", "不合理", "不负责", "骗人", "诈骗", "态度差", "慢", "延迟", "不回复", "糟糕", "失望", "愤怒", "气愤", "差劲", "恶心"],
            "neutral": ["咨询", "请问", "如何", "怎么", "什么是", "哪里", "合作", "商务", "洽谈", "了解", "查询"]
        }
        self.priority_keywords = {
            "high": ["紧急", "立刻", "马上", "立即", "尽快", "十万火急", "重要", "重大", "严重", "损失", "赔偿", "起诉", "律师", "曝光", "媒体", "投诉到", "315", "消协", "总部", "老板", "CEO", "已经", "多次", "反复"],
            "medium": ["尽快", "希望", "麻烦", "请", "需要", "比较急", "有点急", "尽早"],
            "low": ["不急", "有空", "方便的时候", "有时间", "下次", "以后", "随便", "看看"]
        }
        self.category_keywords = self._load_custom_keywords()
        self.response_time = {
            "咨询": "24小时内",
            "投诉": "4小时内",
            "合作": "12小时内",
            "退订": "8小时内",
            "表扬": "48小时内"
        }

    def _load_custom_keywords(self) -> Dict:
        if os.path.exists(self.custom_keywords_file):
            try:
                with open(self.custom_keywords_file, 'r', encoding='utf-8') as f:
                    custom = json.load(f)
                    merged = self.default_categories.copy()
                    for cat, data in custom.items():
                        if cat in merged:
                            merged[cat]["keywords"] = list(set(merged[cat]["keywords"] + data.get("keywords", [])))
                            merged[cat]["weight"] = data.get("weight", merged[cat]["weight"])
                        else:
                            merged[cat] = data
                    return merged
            except Exception:
                return self.default_categories.copy()
        return self.default_categories.copy()

    def save_custom_keywords(self, category: str, keywords: List[str], weight: float = 1.0) -> bool:
        try:
            custom = {}
            if os.path.exists(self.custom_keywords_file):
                with open(self.custom_keywords_file, 'r', encoding='utf-8') as f:
                    custom = json.load(f)
            
            if category in custom:
                existing_keywords = custom[category].get("keywords", [])
                custom[category]["keywords"] = list(set(existing_keywords + keywords))
                custom[category]["weight"] = weight
            else:
                custom[category] = {
                    "keywords": keywords,
                    "weight": weight
                }
            
            os.makedirs(self.data_dir, exist_ok=True)
            with open(self.custom_keywords_file, 'w', encoding='utf-8') as f:
                json.dump(custom, f, ensure_ascii=False, indent=2)
            
            self.category_keywords = self._load_custom_keywords()
            
            if category not in self.response_time:
                self.response_time[category] = "24小时内"
            
            return True
        except Exception as e:
            print(f"保存自定义关键词失败: {e}")
            return False

    def train_from_examples(self, category: str, examples: List[str]) -> bool:
        keywords = []
        for example in examples:
            words = jieba.lcut(example)
            for word in words:
                if len(word) >= 2 and not re.match(r'^[\d\W_]+$', word):
                    keywords.append(word)
        
        word_count = defaultdict(int)
        for word in keywords:
            word_count[word] += 1
        
        threshold = max(1, len(examples) // 3)
        top_keywords = [w for w, c in sorted(word_count.items(), key=lambda x: x[1], reverse=True) if c >= threshold][:20]
        
        if not top_keywords:
            top_keywords = [w for w, c in sorted(word_count.items(), key=lambda x: x[1], reverse=True)][:10]
        
        if top_keywords:
            if category not in self.response_time:
                self.response_time[category] = "24小时内"
            return self.save_custom_keywords(category, top_keywords)
        return False

    def _segment(self, text: str) -> List[str]:
        text = re.sub(r'[^\w\u4e00-\u9fa5]', ' ', text)
        words = jieba.lcut(text.lower())
        return [w.strip() for w in words if w.strip() and len(w.strip()) > 0]

    def classify(self, text: str) -> Dict:
        words = self._segment(text)
        scores = defaultdict(float)
        
        for category, data in self.category_keywords.items():
            for keyword in data["keywords"]:
                keyword_lower = keyword.lower()
                for word in words:
                    if keyword_lower in word or word in keyword_lower:
                        scores[category] += data["weight"]
        
        if not scores:
            for category, data in self.category_keywords.items():
                for keyword in data["keywords"]:
                    if keyword.lower() in text.lower():
                        scores[category] += data["weight"]
        
        if scores:
            sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            top_category = sorted_scores[0][0]
            top_score = sorted_scores[0][1]
            
            if len(sorted_scores) > 1 and sorted_scores[1][1] == top_score:
                top_category = sorted_scores[0][0]
            
            matched_keywords = []
            for keyword in self.category_keywords[top_category]["keywords"]:
                if keyword.lower() in text.lower():
                    matched_keywords.append(keyword)
            
            explanation = f"检测到关键词: {', '.join(matched_keywords[:5])}" if matched_keywords else f"基于内容相似度分析归类为{top_category}"
            
            return {
                "category": top_category,
                "confidence": min(top_score / 5.0, 1.0),
                "explanation": explanation,
                "scores": dict(scores)
            }
        
        return {
            "category": "咨询",
            "confidence": 0.3,
            "explanation": "未匹配到明确关键词，默认归类为咨询",
            "scores": {}
        }

    def analyze_sentiment(self, text: str) -> Dict:
        words = self._segment(text)
        scores = {"positive": 0, "negative": 0, "neutral": 0}
        
        for sentiment, keywords in self.sentiment_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text.lower():
                    scores[sentiment] += 1
        
        total = sum(scores.values())
        if total == 0:
            return {
                "sentiment": "中性",
                "confidence": 0.5,
                "explanation": "未检测到明显情绪倾向"
            }
        
        if scores["negative"] > 0:
            sentiment = "负面"
            conf = scores["negative"] / total
        elif scores["positive"] > 0:
            sentiment = "正面"
            conf = scores["positive"] / total
        else:
            sentiment = "中性"
            conf = scores["neutral"] / total
        
        indicators = []
        for kw in self.sentiment_keywords.get(sentiment.lower(), []):
            if kw.lower() in text.lower():
                indicators.append(kw)
        
        explanation = f"检测到{'负面' if sentiment == '负面' else '正面' if sentiment == '正面' else '中性'}词: {', '.join(indicators[:3])}" if indicators else f"整体情绪倾向为{sentiment}"
        
        return {
            "sentiment": sentiment,
            "confidence": conf,
            "explanation": explanation,
            "scores": scores
        }

    def determine_priority(self, text: str, category: str, sentiment: str) -> Dict:
        priority_score = 0
        matched_keywords = []
        
        for priority, keywords in self.priority_keywords.items():
            weight = 3 if priority == "high" else 2 if priority == "medium" else 1
            for keyword in keywords:
                if keyword.lower() in text.lower():
                    priority_score += weight
                    matched_keywords.append(keyword)
        
        if category == "投诉":
            priority_score += 3
        elif category == "退订":
            priority_score += 2
        elif category == "合作":
            priority_score += 1
        
        if sentiment == "负面":
            priority_score += 2
        elif sentiment == "正面":
            priority_score -= 1
        
        if priority_score >= 4:
            priority = "高"
        elif priority_score >= 2:
            priority = "中"
        else:
            priority = "低"
        
        factors = []
        if matched_keywords:
            factors.append(f"紧急关键词: {', '.join(matched_keywords[:3])}")
        if category in ["投诉", "退订"]:
            factors.append(f"{category}类邮件需优先处理")
        if sentiment == "负面":
            factors.append("负面情绪需要及时响应")
        
        explanation = "；".join(factors) if factors else "无明显紧急特征"
        
        return {
            "priority": priority,
            "score": priority_score,
            "explanation": explanation,
            "response_time": self.response_time.get(category, "24小时内")
        }

    def process_email(self, email_content: str, email_id: Optional[str] = None) -> Dict:
        classification = self.classify(email_content)
        sentiment = self.analyze_sentiment(email_content)
        priority = self.determine_priority(email_content, classification["category"], sentiment["sentiment"])
        
        result = {
            "email_id": email_id,
            "content": email_content,
            "summary": self._generate_summary(email_content),
            "category": classification["category"],
            "category_confidence": classification["confidence"],
            "category_explanation": classification["explanation"],
            "sentiment": sentiment["sentiment"],
            "sentiment_confidence": sentiment["confidence"],
            "sentiment_explanation": sentiment["explanation"],
            "priority": priority["priority"],
            "priority_score": priority["score"],
            "priority_explanation": priority["explanation"],
            "suggested_response_time": priority["response_time"],
            "all_scores": classification.get("scores", {})
        }
        
        return result

    def _generate_summary(self, text: str, max_length: int = 100) -> str:
        cleaned = re.sub(r'\s+', ' ', text).strip()
        if len(cleaned) <= max_length:
            return cleaned
        sentences = re.split(r'[。！？.!?]', cleaned)
        summary = ""
        for sent in sentences:
            if len(summary) + len(sent) <= max_length:
                summary += sent + "。"
            else:
                break
        return summary.strip() if summary else cleaned[:max_length] + "..."

    def get_available_categories(self) -> List[str]:
        return list(self.category_keywords.keys())

    def get_response_time(self, category: str) -> str:
        return self.response_time.get(category, "24小时内")
