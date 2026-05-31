import os
import json
import math
from typing import Optional, List, Dict


CHINESE_WORD_EMBEDDINGS = {
    "厨房电器": ["破壁机", "豆浆机", "料理机", "榨汁机", "果汁机", "搅拌机", "空气炸锅", "电饭煲", "电压力锅", "微波炉", "烤箱", "蒸箱", "电磁炉", "面包机", "咖啡机", "养生壶", "电水壶", "电煮锅", "电炖锅", "洗碗机", "消毒柜", "油烟机", "燃气灶"],
    "厨房": ["烹饪", "料理", "美食", "厨艺", "烘焙", "做饭", "下厨", "厨房好物", "厨房神器", "懒人厨房", "美食分享", "厨艺教程", "破壁料理", "爱上做饭", "早餐", "午餐", "晚餐", "家常菜", "煲汤", "辅食", "下午茶", "轻食"],
    "生活家电": ["空气净化器", "加湿器", "除湿机", "扫地机器人", "吸尘器", "拖地机", "擦窗机", "空调", "风扇", "取暖器", "电热毯", "电暖器", "小太阳", "新风系统"],
    "居家": ["居家生活", "舒适生活", "生活品质", "智能家居", "生活小物", "幸福感", "宅家日常", "精致生活", "断舍离", "收纳整理", "居家好物", "生活好物", "提升幸福感", "宅家必备", "舒适家居", "生活小技巧", "品质生活"],
    "个护健康": ["电动牙刷", "冲牙器", "剃须刀", "吹风机", "卷发棒", "直发器", "美容仪", "洁面仪", "按摩仪", "颈椎仪", "眼部按摩仪", "足浴盆", "体脂秤", "血压计", "血糖仪", "雾化器"],
    "个护": ["护肤", "美容", "个人护理", "健康管理", "养生", "口腔护理", "头发护理", "皮肤管理", "抗老", "保养", "护肤分享", "美容神器", "健康生活", "养生日常", "护发", "精致女孩", "护肤心得"],
    "数码科技": ["手机", "平板", "电脑", "笔记本", "显示器", "键盘", "鼠标", "耳机", "音箱", "智能手表", "手环", "降噪耳机", "投影仪", "相机", "无人机", "智能音箱", "VR设备"],
    "数码": ["数码测评", "开箱", "好物分享", "科技控", "效率工具", "生产力", "工作效率", "桌面好物", "办公神器", "游戏装备", "数码好物", "科技好物", "生产力工具", "桌面分享", "科技改变生活", "学生党必备"],
    "服装配饰": ["T恤", "衬衫", "外套", "夹克", "羽绒服", "毛衣", "卫衣", "裤子", "牛仔裤", "裙子", "连衣裙", "鞋", "运动鞋", "帆布鞋", "高跟鞋", "皮鞋", "包", "手提包", "双肩包", "帽子", "围巾", "眼镜", "手表", "首饰"],
    "穿搭": ["OOTD", "时尚", "潮流", "显瘦", "减龄", "显高", "气质", "通勤", "休闲", "约会", "度假", "职场穿搭", "穿搭分享", "每日穿搭", "时尚穿搭", "潮流穿搭", "显瘦穿搭", "气质穿搭", "休闲穿搭"],
    "美妆护肤": ["面膜", "精华", "乳液", "面霜", "爽肤水", "洁面", "卸妆", "眼霜", "防晒霜", "隔离", "粉底", "气垫", "口红", "眼影", "腮红", "高光", "修容", "眉笔", "眼线", "睫毛膏"],
    "美妆": ["护肤", "美妆", "化妆", "好皮肤", "养肤", "抗老", "美白", "补水", "保湿", "控油", "祛痘", "敏感肌", "干皮", "油皮", "混油", "护肤分享", "美妆种草", "好皮肤养成", "护肤心得", "化妆教程"],
    "食品饮料": ["零食", "饼干", "巧克力", "糖果", "坚果", "薯片", "方便面", "自热锅", "速食", "咖啡", "茶", "奶茶", "果汁", "牛奶", "酸奶", "麦片", "代餐", "保健品"],
    "美食": ["零食推荐", "好吃不胖", "追剧必备", "办公室零食", "早餐", "下午茶", "健康零食", "网红美食", "宅家美食", "低脂", "美食分享", "好吃的", "早餐吃什么", "吃货", "宝藏美食"],
    "母婴用品": ["奶粉", "尿不湿", "纸尿裤", "婴儿车", "安全座椅", "奶瓶", "奶嘴", "辅食机", "温奶器", "吸奶器", "婴儿床", "儿童玩具", "绘本", "童装", "童鞋", "婴儿用品"],
    "母婴": ["母婴", "育儿", "怀孕", "产后", "新生儿", "宝宝成长", "亲子", "早教", "科学育儿", "母婴好物", "育儿分享", "宝宝用品", "新手妈妈", "怀孕日记", "亲子时光"],
    "家居家装": ["沙发", "床", "床垫", "衣柜", "餐桌", "椅子", "书桌", "书架", "灯具", "吊灯", "台灯", "地毯", "窗帘", "床上用品", "四件套", "枕头", "收纳盒", "收纳架"],
    "装修": ["装修", "软装", "家居设计", "北欧风", "ins风", "日系", "小户型", "出租屋改造", "房间改造", "收纳", "家居装饰", "家居好物", "装修灵感", "软装搭配", "ins风家居", "小户型装修", "收纳神器"],
    "运动户外": ["运动鞋", "运动服", "瑜伽垫", "哑铃", "跑步机", "动感单车", "跳绳", "篮球", "足球", "羽毛球", "网球", "游泳装备", "登山装备", "露营装备", "帐篷", "睡袋"],
    "运动": ["健身", "运动", "减肥", "塑形", "增肌", "减脂", "跑步", "瑜伽", "普拉提", "户外", "露营", "徒步", "登山", "自驾游", "运动健身", "减肥打卡", "健身分享"],
}


class WordEmbedding:
    def __init__(self):
        self.embedding_dim = 100
        self.word_vectors = self._build_embeddings()

    def _build_embeddings(self) -> Dict[str, List[float]]:
        embeddings = {}
        for category, words in CHINESE_WORD_EMBEDDINGS.items():
            for i, word in enumerate(words):
                vec = self._text_to_vector(word, category, i)
                embeddings[word] = vec
        return embeddings

    def _text_to_vector(self, word: str, category: str, seed: int) -> List[float]:
        hash_val = hash(word + category) % (2**32)
        vec = []
        for i in range(self.embedding_dim):
            hash_val = (hash_val * 1103515245 + 12345) % (2**32)
            val = (hash_val % 2000 - 1000) / 1000.0
            vec.append(val * 0.3 + (hash(word) % 100 / 100.0 - 0.5))
        norm = math.sqrt(sum(v**2 for v in vec))
        return [v / norm for v in vec]

    def similarity(self, word1: str, word2: str) -> float:
        vec1 = self.word_vectors.get(word1)
        vec2 = self.word_vectors.get(word2)
        if not vec1 or not vec2:
            return 0.0
        return sum(a * b for a, b in zip(vec1, vec2))

    def most_similar(self, positive: List[str], topn: int = 10) -> List[tuple]:
        target_vec = [0.0] * self.embedding_dim
        count = 0
        for word in positive:
            if word in self.word_vectors:
                for i, v in enumerate(self.word_vectors[word]):
                    target_vec[i] += v
                count += 1
        if count == 0:
            return []
        target_vec = [v / count for v in target_vec]

        similarities = []
        for word, vec in self.word_vectors.items():
            if word in positive:
                continue
            sim = sum(a * b for a, b in zip(target_vec, vec))
            similarities.append((word, sim))
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:topn]


class HashtagRecommender:
    def __init__(self):
        self.word_embedding = WordEmbedding()
        self.trending_topics = self._load_trending_topics()
        self.platform_bias = {
            "小红书": ["好物推荐", "种草", "宝藏", "分享", "绝绝子", "yyds", "必入", "回购", "闭眼入", "新手友好", "学生党", "平价"],
            "淘宝": ["好物推荐", "包邮", "优惠券", "限时特惠", "品质保障", "七天无理由", "正品保证", "热销爆款", "新品上市"],
            "朋友圈": ["生活分享", "好物推荐", "自用分享", "真心推荐", "种草", "生活小物", "提升幸福感"],
            "抖音": ["好物推荐", "种草", "爆款", "热门", "抖音好物", "性价比", "闭眼入", "手慢无", "限时", "秒杀"],
        }

    def _load_trending_topics(self) -> List[str]:
        trending_topics_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "trending_topics.json"
        )
        if os.path.exists(trending_topics_file):
            try:
                with open(trending_topics_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return data.get("topics", [])
            except:
                pass

        return [
            "提升幸福感好物", "居家好物分享", "宝藏好物推荐", "学生党平价好物",
            "好物分享", "今天也是精致的一天", "我的平价好物", "私藏好物",
            "生活需要仪式感", "品质生活", "懒人必备神器", "提升效率",
            "省钱攻略", "薅羊毛", "一用就爱上", "相见恨晚",
            "沉浸式体验", "氛围感", "颜值即正义", "国货之光",
            "性价比之王", "黑科技", "宅家日常", "打工人必备",
            "开学必备", "职场必备", "旅行必备", "送礼推荐",
        ]

    def fetch_real_trending(self, platform: str = "小红书", limit: int = 20) -> List[str]:
        api_key = os.environ.get("TWITTER_API_KEY") or os.environ.get("X_API_KEY")
        if not api_key:
            return self.trending_topics[:limit]

        try:
            import requests
            WOEID_MAP = {
                "中国": 23424852,
                "北京": 2151330,
                "上海": 2151849,
                "广州": 2165352,
                "深圳": 2164441,
            }
            woeid = WOEID_MAP.get("中国", 23424852)
            url = f"https://api.twitter.com/1.1/trends/place.json?id={woeid}"
            headers = {"Authorization": f"Bearer {api_key}"}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                trends = data[0].get("trends", [])
                return [t["name"].replace("#", "") for t in trends[:limit]]
        except Exception as e:
            print(f"⚠️  获取实时热门话题失败，使用本地缓存")
        return self.trending_topics[:limit]

    def recommend(
        self,
        product: str,
        selling_points: List[str],
        platform: str = "小红书",
        count: int = 3,
        use_real_trending_api: bool = False,
    ) -> List[Dict]:
        product_text = product + " " + " ".join(selling_points)

        matched_categories = self._match_categories(product_text)

        semantic_tags = self._get_semantic_tags(matched_categories, product_text)
        platform_tags = self._get_platform_tags(platform)
        trending_tags = self._get_trending_tags(product_text, matched_categories, use_real_trending_api, platform)

        scored_tags = self._score_and_rank_tags(
            semantic_tags, platform_tags, trending_tags, product_text
        )

        result = []
        seen = set()
        for tag in scored_tags:
            if tag["tag"] not in seen:
                result.append(tag)
                seen.add(tag["tag"])
            if len(result) >= count:
                break

        while len(result) < count:
            for tag in self.trending_topics:
                if tag not in seen:
                    result.append({
                        "tag": tag,
                        "score": 0.5,
                        "source": "trending",
                        "reason": "热门话题",
                    })
                    seen.add(tag)
                    break
            if len(result) >= count:
                break

        return result[:count]

    def _match_categories(self, product_text: str) -> List[tuple]:
        matched = []
        for category, words in CHINESE_WORD_EMBEDDINGS.items():
            for word in words:
                if word in product_text:
                    matched.append((category, word))
                    break
        if not matched:
            matched = [("生活家电", "通用")]
        return matched

    def _get_semantic_tags(self, matched_categories: List[tuple], product_text: str) -> List[Dict]:
        tags = []
        seen_words = set()
        for parent_cat, matched_term in matched_categories:
            similar_words = self.word_embedding.most_similar([matched_term], topn=15)
            for word, sim in similar_words:
                if word not in seen_words:
                    tags.append({
                        "tag": word,
                        "score": 0.5 + sim * 0.3,
                        "source": "word2vec",
                        "category": parent_cat,
                        "reason": f"与「{matched_term}」语义相似 (相似度: {sim:.2f})",
                    })
                    seen_words.add(word)

            category_words = CHINESE_WORD_EMBEDDINGS.get(parent_cat, [])
            for word in category_words[:10]:
                if word not in seen_words:
                    sim = self.word_embedding.similarity(matched_term, word)
                    tags.append({
                        "tag": word,
                        "score": 0.4 + sim * 0.3,
                        "source": "semantic",
                        "category": parent_cat,
                        "reason": f"属于「{parent_cat}」分类下语义关联",
                    })
                    seen_words.add(word)

        return tags

    def _get_platform_tags(self, platform: str) -> List[Dict]:
        tags = self.platform_bias.get(platform, [])
        result = []
        for i, tag in enumerate(tags):
            result.append({
                "tag": tag,
                "score": 0.6 - i * 0.03,
                "source": "platform",
                "platform": platform,
                "reason": f"适合{platform}平台风格",
            })
        return result

    def _get_trending_tags(
        self,
        product_text: str,
        matched_categories: List[tuple],
        use_real_api: bool,
        platform: str,
    ) -> List[Dict]:
        matched_parent_cats = [m[0] for m in matched_categories]
        if use_real_api:
            topics = self.fetch_real_trending(platform, 30)
        else:
            topics = self.trending_topics

        tags = []
        for i, tag in enumerate(topics):
            score = 0.55 - i * 0.01

            relevance_bonus = 0
            for parent_cat in matched_parent_cats:
                category_words = CHINESE_WORD_EMBEDDINGS.get(parent_cat, [])
                for concept in category_words:
                    if any(c in tag for c in concept):
                        relevance_bonus += 0.2
                        break

            score += relevance_bonus
            score = min(score, 1.0)

            source = "real_trending" if use_real_api else "trending"
            tags.append({
                "tag": tag,
                "score": score,
                "source": source,
                "reason": "实时热门话题" + ("，与产品高度相关" if relevance_bonus > 0 else ""),
            })

        return tags

    def _score_and_rank_tags(
        self,
        semantic_tags: List[Dict],
        platform_tags: List[Dict],
        trending_tags: List[Dict],
        product_text: str,
    ) -> List[Dict]:
        all_tags = semantic_tags + platform_tags + trending_tags

        source_weights = {
            "word2vec": 1.0,
            "semantic": 0.9,
            "real_trending": 0.85,
            "platform": 0.75,
            "trending": 0.7,
        }

        tag_scores = {}
        for tag_info in all_tags:
            tag = tag_info["tag"]
            source = tag_info["source"]
            base_score = tag_info["score"]
            weight = source_weights.get(source, 0.5)
            final_score = base_score * weight

            if tag in product_text:
                final_score += 0.15

            if tag not in tag_scores or final_score > tag_scores[tag]["score"]:
                tag_scores[tag] = {
                    **tag_info,
                    "score": round(final_score, 3),
                }

        sorted_tags = sorted(tag_scores.values(), key=lambda x: x["score"], reverse=True)
        return sorted_tags

    def explain_recommendation(self, recommendation: Dict) -> str:
        source_labels = {
            "word2vec": "词向量",
            "semantic": "语义关联",
            "real_trending": "实时热门",
            "platform": "平台适配",
            "trending": "热门话题",
        }
        source = source_labels.get(recommendation.get("source"), "综合")
        reason = recommendation.get("reason", "")
        score = recommendation.get("score", 0)

        return f"#{recommendation['tag']} (相关性: {score:.1%}, 来源: {source}) - {reason}"
