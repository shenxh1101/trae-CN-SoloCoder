import csv
import json
import os
import re
import jieba
from datetime import datetime
from collections import Counter
from typing import List, Dict, Optional, Tuple


class DataExporter:
    def __init__(self, export_dir: str = None):
        if export_dir is None:
            export_dir = os.path.join(os.path.dirname(__file__), "exports")
        self.export_dir = export_dir
        os.makedirs(export_dir, exist_ok=True)

    def export_to_csv(
        self,
        results: List[Dict],
        filename: str = None,
        include_predictions: bool = True,
        include_seo: bool = False
    ) -> str:
        if not results:
            raise ValueError("没有可导出的数据")

        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"titles_{timestamp}.csv"

        filepath = os.path.join(self.export_dir, filename)

        fieldnames = ["序号", "标题", "平台", "主题"]
        if include_predictions:
            fieldnames.extend(["点击率(%)", "分享率(%)", "互动率(%)", "综合评分"])
        if include_seo:
            fieldnames.extend(["SEO关键词", "SEO评分"])
        fieldnames.extend(["用户评分", "导出时间"])

        with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for i, result in enumerate(results, 1):
                row = {
                    "序号": i,
                    "标题": result.get("title", ""),
                    "平台": result.get("platform", ""),
                    "主题": result.get("topic", ""),
                }

                if include_predictions and "prediction" in result:
                    pred = result["prediction"]
                    row.update({
                        "点击率(%)": pred.get("ctr", ""),
                        "分享率(%)": pred.get("share_rate", ""),
                        "互动率(%)": pred.get("interaction_rate", ""),
                        "综合评分": pred.get("composite_score", "")
                    })

                if include_seo and "seo" in result:
                    seo = result["seo"]
                    row.update({
                        "SEO关键词": ",".join(seo.get("keywords", [])),
                        "SEO评分": seo.get("score", "")
                    })

                row["用户评分"] = result.get("user_rating", "")
                row["导出时间"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                writer.writerow(row)

        return filepath

    def export_to_json(
        self,
        results: List[Dict],
        filename: str = None
    ) -> str:
        if not results:
            raise ValueError("没有可导出的数据")

        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"titles_{timestamp}.json"

        filepath = os.path.join(self.export_dir, filename)

        export_data = {
            "export_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_count": len(results),
            "results": results
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        return filepath

    def export_ab_test_to_csv(
        self,
        test_plan: Dict,
        filename: str = None
    ) -> str:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"ab_test_{timestamp}.csv"

        filepath = os.path.join(self.export_dir, filename)

        fieldnames = [
            "测试ID", "测试维度", "版本", "标题",
            "点击率(%)", "分享率(%)", "互动率(%)", "综合评分",
            "推荐", "备注"
        ]

        with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for pair in test_plan.get("test_pairs", []):
                writer.writerow({
                    "测试ID": pair["test_id"],
                    "测试维度": pair["dimension"],
                    "版本": "A",
                    "标题": pair["title_a"],
                    "点击率(%)": pair["prediction_a"]["ctr"],
                    "分享率(%)": pair["prediction_a"]["share_rate"],
                    "互动率(%)": pair["prediction_a"]["interaction_rate"],
                    "综合评分": pair["prediction_a"]["composite_score"],
                    "推荐": pair["recommendation"],
                    "备注": ""
                })
                writer.writerow({
                    "测试ID": pair["test_id"],
                    "测试维度": pair["dimension"],
                    "版本": "B",
                    "标题": pair["title_b"],
                    "点击率(%)": pair["prediction_b"]["ctr"],
                    "分享率(%)": pair["prediction_b"]["share_rate"],
                    "互动率(%)": pair["prediction_b"]["interaction_rate"],
                    "综合评分": pair["prediction_b"]["composite_score"],
                    "推荐": pair["recommendation"],
                    "备注": ""
                })

        return filepath


class FeedbackManager:
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), "user_data")
        self.data_dir = data_dir
        self.feedback_file = os.path.join(data_dir, "feedback.json")
        os.makedirs(data_dir, exist_ok=True)

        if not os.path.exists(self.feedback_file):
            self._init_feedback_file()

    def _init_feedback_file(self):
        with open(self.feedback_file, "w", encoding="utf-8") as f:
            json.dump({"feedback": [], "stats": {}}, f, ensure_ascii=False, indent=2)

    def add_feedback(
        self,
        title: str,
        topic: str,
        platform: str,
        rating: int,
        note: str = ""
    ) -> Dict:
        if not 1 <= rating <= 5:
            raise ValueError("评分必须在1-5之间")

        feedback = {
            "id": int(datetime.now().timestamp()),
            "title": title,
            "topic": topic,
            "platform": platform,
            "rating": rating,
            "note": note,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        data = self._load_feedback()
        data["feedback"].append(feedback)
        data["stats"] = self._calculate_stats(data["feedback"])

        with open(self.feedback_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return feedback

    def _load_feedback(self) -> Dict:
        with open(self.feedback_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _calculate_stats(self, feedback_list: List[Dict]) -> Dict:
        if not feedback_list:
            return {}

        total = len(feedback_list)
        avg_rating = sum(f["rating"] for f in feedback_list) / total

        platform_stats = {}
        topic_stats = {}

        for f in feedback_list:
            platform = f["platform"]
            topic = f["topic"]

            if platform not in platform_stats:
                platform_stats[platform] = {"count": 0, "total_rating": 0}
            platform_stats[platform]["count"] += 1
            platform_stats[platform]["total_rating"] += f["rating"]

            if topic not in topic_stats:
                topic_stats[topic] = {"count": 0, "total_rating": 0}
            topic_stats[topic]["count"] += 1
            topic_stats[topic]["total_rating"] += f["rating"]

        for platform in platform_stats:
            s = platform_stats[platform]
            s["avg_rating"] = round(s["total_rating"] / s["count"], 2)

        for topic in topic_stats:
            s = topic_stats[topic]
            s["avg_rating"] = round(s["total_rating"] / s["count"], 2)

        high_rated_titles = [
            f for f in feedback_list if f["rating"] >= 4
        ]
        high_rated_templates = self._extract_templates_from_feedback(high_rated_titles)

        return {
            "total_feedback": total,
            "average_rating": round(avg_rating, 2),
            "platform_stats": platform_stats,
            "topic_stats": topic_stats,
            "high_rated_templates": high_rated_templates
        }

    def _extract_templates_from_feedback(self, high_rated: List[Dict]) -> List[str]:
        templates = []
        for f in high_rated:
            title = f["title"]
            topic = f["topic"]
            if topic in title:
                template = title.replace(topic, "{topic}")
                if template not in templates:
                    templates.append(template)
        return templates

    def get_stats(self) -> Dict:
        data = self._load_feedback()
        return data.get("stats", {})

    def get_high_rated_templates(self, min_rating: int = 4) -> List[str]:
        data = self._load_feedback()
        return data["stats"].get("high_rated_templates", [])

    def get_feedback_history(self, limit: int = 100) -> List[Dict]:
        data = self._load_feedback()
        return list(reversed(data["feedback"]))[:limit]

    def get_weighted_features(self, min_rating: int = 4) -> Dict:
        feedback_list = self.get_feedback_history(limit=500)
        if not feedback_list:
            return self._get_default_weights()

        high_rated = [f for f in feedback_list if f["rating"] >= min_rating]
        low_rated = [f for f in feedback_list if f["rating"] <= 2]

        if not high_rated:
            return self._get_default_weights()

        high_words = Counter()
        high_templates = []
        high_lengths = []
        high_has_question = []
        high_has_exclamation = []
        high_has_number = []
        high_structures = []

        for f in high_rated:
            title = f["title"]
            words = jieba.lcut(title)
            rating_weight = f["rating"] - 3
            for word in words:
                if len(word) > 1:
                    high_words[word] += rating_weight

            template = self._extract_template_from_title(title, f["topic"])
            if template:
                high_templates.append((template, rating_weight))

            high_lengths.append(len(title))
            high_has_question.append(1 if "？" in title or "?" in title else 0)
            high_has_exclamation.append(1 if "！" in title or "!" in title else 0)
            high_has_number.append(1 if re.search(r"\d", title) else 0)
            high_structures.append(self._analyze_structure(title))

        low_word_penalty = Counter()
        for f in low_rated:
            words = jieba.lcut(f["title"])
            for word in words:
                if len(word) > 1:
                    low_word_penalty[word] += 1

        word_weights = {}
        for word, count in high_words.items():
            penalty = low_word_penalty.get(word, 0)
            weight = max(0.5, count - penalty * 0.5)
            word_weights[word] = weight

        template_weights = {}
        for template, weight in high_templates:
            if template not in template_weights:
                template_weights[template] = 0
            template_weights[template] += weight

        avg_length = sum(high_lengths) / len(high_lengths) if high_lengths else 25
        question_ratio = sum(high_has_question) / len(high_has_question) if high_has_question else 0.3
        exclamation_ratio = sum(high_has_exclamation) / len(high_has_exclamation) if high_has_exclamation else 0.2
        number_ratio = sum(high_has_number) / len(high_has_number) if high_has_number else 0.3

        structure_counter = Counter(high_structures)
        dominant_structure = structure_counter.most_common(1)[0][0] if structure_counter else "normal"

        return {
            "word_weights": word_weights,
            "template_weights": template_weights,
            "avg_length": avg_length,
            "question_ratio": question_ratio,
            "exclamation_ratio": exclamation_ratio,
            "number_ratio": number_ratio,
            "dominant_structure": dominant_structure,
            "high_rated_count": len(high_rated),
            "total_feedback": len(feedback_list)
        }

    def _get_default_weights(self) -> Dict:
        return {
            "word_weights": {},
            "template_weights": {},
            "avg_length": 25,
            "question_ratio": 0.3,
            "exclamation_ratio": 0.2,
            "number_ratio": 0.3,
            "dominant_structure": "normal",
            "high_rated_count": 0,
            "total_feedback": 0
        }

    def _extract_template_from_title(self, title: str, topic: str) -> Optional[str]:
        if topic and topic in title:
            return title.replace(topic, "{topic}")
        for common_topic in ["加班", "赚钱", "年轻人", "健康", "学习", "职场", "副业", "创业"]:
            if common_topic in title:
                return title.replace(common_topic, "{topic}")
        return None

    def _analyze_structure(self, title: str) -> str:
        if title.endswith("？") or title.endswith("?"):
            return "question"
        elif "！" in title or "!" in title:
            return "exclamation"
        elif re.search(r"\d+", title):
            return "numeric"
        elif title.startswith("深度") or title.startswith("揭秘") or title.startswith("解析"):
            return "deep_dive"
        else:
            return "normal"

    def get_prediction_boost(self, title: str) -> Dict[str, float]:
        features = self.get_weighted_features()
        if features["total_feedback"] < 5:
            return {"ctr_boost": 0, "share_boost": 0, "interaction_boost": 0}

        boost = {"ctr_boost": 0, "share_boost": 0, "interaction_boost": 0}

        words = jieba.lcut(title)
        word_score = 0
        for word in words:
            word_score += features["word_weights"].get(word, 0)

        if word_score > 5:
            boost["ctr_boost"] += min(2.0, word_score * 0.2)
            boost["share_boost"] += min(1.5, word_score * 0.15)
            boost["interaction_boost"] += min(1.0, word_score * 0.1)

        template = self._extract_template_from_title(title, "")
        if template and template in features["template_weights"]:
            template_weight = features["template_weights"][template]
            boost["ctr_boost"] += min(1.5, template_weight * 0.3)
            boost["share_boost"] += min(1.0, template_weight * 0.2)

        length = len(title)
        length_diff = abs(length - features["avg_length"])
        if length_diff < 5:
            boost["ctr_boost"] += 0.5
        elif length_diff > 15:
            boost["ctr_boost"] -= 0.3

        has_question = "？" in title or "?" in title
        if has_question and features["question_ratio"] > 0.5:
            boost["interaction_boost"] += 0.8
        elif not has_question and features["question_ratio"] < 0.2:
            boost["interaction_boost"] += 0.3

        has_exclamation = "！" in title or "!" in title
        if has_exclamation and features["exclamation_ratio"] > 0.4:
            boost["ctr_boost"] += 0.5
        elif not has_exclamation and features["exclamation_ratio"] < 0.1:
            boost["ctr_boost"] += 0.2

        return boost
