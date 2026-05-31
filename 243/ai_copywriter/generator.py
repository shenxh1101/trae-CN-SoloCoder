import os
import json
import random
from typing import Optional

PLATFORMS = ["小红书", "淘宝", "朋友圈", "抖音"]
TONES = ["亲切", "专业", "幽默", "紧迫"]

PLATFORM_TEMPLATES = {
    "小红书": {
        "亲切": [
            "姐妹们！今天必须安利这个{product}！💕\n{selling_points_formatted}\n用了之后真的回不去了～\n谁用谁知道，反正我已经爱了！\n#好物分享 #种草推荐 #{product_tag}",
            "家人们！这个{product}也太绝了吧！✨\n{selling_points_formatted}\n每天用都觉得幸福感满满～\n真的不是我夸张，是它真的太好用了！\n#宝藏好物 #{product_tag} #生活必备",
        ],
        "专业": [
            "{product}深度测评来啦📋\n{selling_points_formatted}\n从专业角度来看，这款{product}在同类产品中表现突出。\n核心优势在于技术层面的创新突破，值得入手。\n#测评 #{product_tag} #专业推荐",
            "{product}使用报告｜干货满满\n{selling_points_formatted}\n经过两周深度体验，综合评分：⭐⭐⭐⭐⭐\n各方面都超出预期，推荐指数拉满。\n#深度测评 #{product_tag} #好物评测",
        ],
        "幽默": [
            "我宣布，{product}是我的年度最佳单！🏆\n{selling_points_formatted}\n不是我说，用完之后我家其他电器都失宠了😂\n买它！不买后悔一辈子！\n#搞笑种草 #{product_tag} #真香警告",
            "救命啊！{product}也太香了吧！🤣\n{selling_points_formatted}\n我：我只看看不买\n钱包：不，你想买\n现在：真香！\n#真香 #{product_tag} #种草成功",
        ],
        "紧迫": [
            "⚡限时通知！{product}马上就要断货了！\n{selling_points_formatted}\n库存告急！手慢无！\n别犹豫了，再犹豫就真的没有了！\n#限时抢购 #{product_tag} #手慢无",
            "🔥紧急！{product}最后一波优惠！\n{selling_points_formatted}\n优惠倒计时，错过再等一年！\n现在下单立省XX元！冲！\n#抢购 #{product_tag} #薅羊毛",
        ],
    },
    "淘宝": {
        "亲切": [
            "亲～这款{product}您一定喜欢！\n{selling_points_formatted}\n贴心设计，让生活更轻松～\n好评率99%，回头客超多哦！",
            "宝贝们看过来！{product}来啦～\n{selling_points_formatted}\n居家好帮手，用了都说好！\n现在下单还有惊喜优惠哦～",
        ],
        "专业": [
            "{product}｜品质之选\n{selling_points_formatted}\n严选材质，精密工艺，品质保障。\n品牌直销，正品承诺，售后无忧。",
            "{product}旗舰品质，匠心之作\n{selling_points_formatted}\n行业领先技术，多项专利认证。\n全国联保，7天无理由退换。",
        ],
        "幽默": [
            "买了{product}之后，我只想说：\n相见恨晚啊！{selling_points_formatted}\n它来了它来了，它带着快乐走来了！\n再不买，邻居都比你先享受了！",
            '{product}——你以为它只是个普通货？\n错！{selling_points_formatted}\n它可是"懒人经济"的天花板！\n手慢拍大腿系列，冲！',
        ],
        "紧迫": [
            "🔥{product}限量抢购中！\n{selling_points_formatted}\n仅剩最后XX件！售完即止！\n⏰限时特惠，错过今天不再有！",
            "⚡{product}秒杀倒计时！\n{selling_points_formatted}\n库存告急！抢完恢复原价！\n🔥现在买最划算！手慢无！",
        ],
    },
    "朋友圈": {
        "亲切": [
            "最近入手了{product}，真的好好用！\n{selling_points_formatted}\n生活质量瞬间提升，朋友们可以了解一下～😊",
            "分享一个让我幸福感up的小东西～{product}\n{selling_points_formatted}\n真心推荐，好用不贵！💕",
        ],
        "专业": [
            "{product}使用体验：超出预期。\n{selling_points_formatted}\n技术参数过硬，使用体验流畅。值得推荐。",
            "经过实际使用验证，{product}表现优异。\n{selling_points_formatted}\n专业品质，值得信赖。推荐。",
        ],
        "幽默": [
            "自从有了{product}，我的懒癌更严重了😂\n{selling_points_formatted}\n反正就是：用了就回不去了！",
            "报告！{product}已成功收编本人为自来水💪\n{selling_points_formatted}\n谁用谁知道，我是真的服了！",
        ],
        "紧迫": [
            "⚠️{product}优惠最后一天！\n{selling_points_formatted}\n需要的赶紧！错过真没了！",
            "秒杀提醒！{product}限时特惠！\n{selling_points_formatted}\n马上截止，速来！",
        ],
    },
    "抖音": {
        "亲切": [
            "（视频开场）家人们！今天给你们种草{product}！\n{selling_points_formatted}\n（展示使用画面）看到没！就是这么好用！\n（结尾）点赞收藏不迷路，下次继续分享好物～",
            "（镜头拉近）姐妹们看这个！{product}！\n{selling_points_formatted}\n（实际演示）效果肉眼可见！\n（结尾）关注我，带你发现更多宝藏！",
        ],
        "专业": [
            "（专业镜头）{product}硬核评测\n{selling_points_formatted}\n（数据对比）看这组数据，优势明显\n（总结）综合评测：强烈推荐",
            "（开箱画面）{product}开箱实测\n{selling_points_formatted}\n（对比测试）性能远超同类产品\n（结论）性价比之王，值得入手",
        ],
        "幽默": [
            "（夸张表情）救命！{product}也太离谱了！\n{selling_points_formatted}\n（搞笑演示）你们看这效果！😂\n（结尾）不说了，我去再买一个！",
            "（反转剧情）我以为{product}是智商税…\n{selling_points_formatted}\n（真香现场）啪啪打脸！真香！\n（结尾）关注我，看更多真香时刻！",
        ],
        "紧迫": [
            "（紧急语气）家人们快冲！{product}限时秒杀！\n{selling_points_formatted}\n（展示优惠）这个价格绝了！\n（催促）链接在主页！手慢无！",
            "（倒计时画面）3！2！1！{product}开抢！\n{selling_points_formatted}\n（库存画面）看！库存疯狂减少！\n（催促）点链接！现在！立刻！马上！",
        ],
    },
}

SELLING_POINT_FORMATS = {
    "小红书": "✨{point}",
    "淘宝": "• {point}",
    "朋友圈": "→ {point}",
    "抖音": "✅{point}",
}


class CopyGenerator:
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-3.5-turbo", force_template: bool = False):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        self.client = None
        self.force_template = force_template
        self._init_client()

    def _init_client(self):
        if self.force_template or not self.api_key:
            self.client = None
            return
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
        except ImportError:
            print("⚠️  未安装 openai 库，将回退到模板模式")
            print("   安装命令: pip install openai")
            self.client = None
        except Exception as e:
            print(f"⚠️  OpenAI 客户端初始化失败: {e}")
            self.client = None

    def is_ai_mode(self) -> bool:
        return self.client is not None

    def generate(
        self,
        product: str,
        selling_points: list[str],
        platform: str,
        tone: str,
        competitor_keywords: Optional[list[str]] = None,
    ) -> dict:
        if platform not in PLATFORMS:
            raise ValueError(f"不支持的平台: {platform}，可选: {PLATFORMS}")
        if tone not in TONES:
            raise ValueError(f"不支持的语调: {tone}，可选: {TONES}")

        if self.client:
            return self._generate_ai(product, selling_points, platform, tone, competitor_keywords)
        return self._generate_template(product, selling_points, platform, tone)

    def _generate_ai(
        self,
        product: str,
        selling_points: list[str],
        platform: str,
        tone: str,
        competitor_keywords: Optional[list[str]] = None,
    ) -> dict:
        points_str = "、".join(selling_points)
        platform_guide = {
            "小红书": "小红书种草笔记风格，使用emoji，注重种草感和分享感，200-300字",
            "淘宝": "淘宝商品详情页短文案，突出卖点，简洁有力，100-150字",
            "朋友圈": "朋友圈广告语，轻松自然，适合社交分享，50-100字",
            "抖音": "抖音短视频脚本，包含镜头指示和旁白，有节奏感，150-250字",
        }
        tone_guide = {
            "亲切": "亲切温暖，像朋友推荐一样",
            "专业": "专业严谨，突出技术参数和品质",
            "幽默": "幽默风趣，加入反转和趣味表达",
            "紧迫": "紧迫感十足，制造稀缺感和限时感",
        }

        extra = ""
        if competitor_keywords:
            extra = f"\n\n请参考以下竞品关键词优化文案，融入但不要照搬：{', '.join(competitor_keywords)}"

        prompt = (
            f"你是一个专业的营销文案撰写师。请为以下产品生成营销文案。\n\n"
            f"产品名称：{product}\n"
            f"核心卖点：{points_str}\n"
            f"目标平台：{platform}（{platform_guide[platform]}）\n"
            f"语调风格：{tone}（{tone_guide[tone]}）\n"
            f"{extra}\n\n"
            f"请直接输出文案内容，不要添加标题或额外说明。"
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一位资深营销文案专家，擅长为不同平台撰写具有转化力的营销文案。"},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.8,
                max_tokens=500,
            )
            copy_text = response.choices[0].message.content.strip()
            source = "ai"
        except Exception as e:
            raise RuntimeError(f"OpenAI API 调用失败: {e}\n请检查 API Key 或网络连接，或使用 --force-template 参数启用模板模式。") from None

        return {
            "product": product,
            "selling_points": selling_points,
            "platform": platform,
            "tone": tone,
            "copy": copy_text,
            "source": source,
        }

    def _generate_template(
        self,
        product: str,
        selling_points: list[str],
        platform: str,
        tone: str,
    ) -> dict:
        templates = PLATFORM_TEMPLATES[platform][tone]
        template = random.choice(templates)
        point_format = SELLING_POINT_FORMATS[platform]
        formatted_points = "\n".join(point_format.format(point=p) for p in selling_points)
        product_tag = product.replace(" ", "")

        copy_text = template.format(
            product=product,
            selling_points_formatted=formatted_points,
            product_tag=product_tag,
        )

        return {
            "product": product,
            "selling_points": selling_points,
            "platform": platform,
            "tone": tone,
            "copy": copy_text,
            "source": "template",
        }

    def generate_multi(
        self,
        product: str,
        selling_points: list[str],
        platforms: Optional[list[str]] = None,
        tones: Optional[list[str]] = None,
        competitor_keywords: Optional[list[str]] = None,
    ) -> list[dict]:
        platforms = platforms or PLATFORMS
        tones = tones or TONES
        results = []
        for platform in platforms:
            for tone in tones:
                result = self.generate(product, selling_points, platform, tone, competitor_keywords)
                results.append(result)
        return results
