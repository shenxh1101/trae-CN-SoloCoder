import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any

from models import PodcastTopic, StylePreference

POSITION_TEMPLATES = {
    "科技趋势访谈": {
        "titles": [
            "大模型时代的程序员生存指南",
            "AI Agent：从概念到落地实战",
            "产品经理如何与AI协作",
            "开源大模型的商业化路径",
            "Prompt Engineering 进阶技巧",
            "AI芯片战争：谁将主导未来算力",
            "多模态大模型如何重塑创意产业",
            "从Copilot到Autopilot：AI编程的进化之路",
            "数据隐私与AI：如何平衡创新与合规",
            "AI原生应用：下一波创业浪潮"
        ],
        "outlines": [
            ["AI编程工具如何改变开发效率", "哪些技能在大模型时代更重要", "如何利用AI提升代码质量", "程序员职业发展新路径"],
            ["什么是AI Agent，核心能力解析", "企业级Agent应用案例分享", "Agent开发的技术挑战与解决方案", "多Agent协作的未来趋势"],
            ["AI时代产品经理的新角色", "用AI辅助需求分析和用户研究", "避免AI产品的常见陷阱", "从0到1打造AI原生产品"],
            ["主流开源大模型对比分析", "企业如何选择适合的开源模型", "开源vs闭源的商业价值对比", "开源生态的可持续发展"],
            ["高质量Prompt的设计原则", "常用Prompt模式和案例", "如何评估Prompt效果", "Prompt优化的进阶策略"],
            ["全球AI芯片竞争格局", "国产芯片的机遇与挑战", "算力需求趋势与瓶颈", "芯片自主可控的战略意义"],
            ["多模态技术的最新突破", "创意产业的AI变革案例", "从文字到视频的生成之路", "创作者如何拥抱AI工具"],
            ["AI编程助手的发展历程", "从代码补全到自主编程", "人类开发者的新协作模式", "未来编程范式的预判"],
            ["AI数据合规的最新法规解读", "隐私保护技术的进展", "企业合规实践分享", "全球化背景下的数据治理"],
            ["什么是AI原生应用", "AI原生与传统应用的差异", "值得关注的AI原生创业方向", "投资人的视角与建议"]
        ],
        "guests": [
            "资深技术总监", "AI架构师", "AI产品负责人", "开源社区负责人",
            "AI应用开发专家", "半导体行业分析师", "创意技术总监",
            "开发者工具产品经理", "数据合规律师", "科技领域投资人"
        ],
        "durations": ["30-45分钟", "40-50分钟", "35-45分钟", "45-60分钟", "30-40分钟", "50-60分钟"]
    },
    "商业深度对话": {
        "titles": [
            "独角兽公司的增长密码",
            "从0到1：创业者的至暗时刻",
            "ESG投资：风口还是趋势",
            "新消费品牌的破圈法则",
            "SaaS创业的中国路径",
            "创始人IP：个人品牌如何赋能企业",
            "供应链革命的隐形赢家",
            "出海东南亚：机遇与风险并存",
            "AI+行业：哪些赛道值得重仓",
            "组织进化的底层逻辑"
        ],
        "outlines": [
            ["增长飞轮的设计与执行", "用户留存的底层方法论", "融资节奏与战略选择", "如何避免增长陷阱"],
            ["创业最艰难的决策时刻", "如何度过现金流危机", "团队重建的心路历程", "从失败中获得的宝贵经验"],
            ["ESG投资的全球趋势", "中国ESG实践的挑战", "绿色金融的机会窗口", "企业如何做好ESG披露"],
            ["新消费品牌的增长策略", "社群运营的核心方法", "产品差异化如何打造", "从网红到长红的转变"],
            ["中国SaaS市场现状分析", "PLG在中国是否可行", "大客户销售的实战经验", "SaaS公司的盈利路径"],
            ["创始人IP的构建方法", "个人品牌与企业品牌的协同", "社交媒体运营策略", "IP变现的多元化路径"],
            ["供应链数字化的最新趋势", "柔性供应链的构建方法", "供应链创新的标杆案例", "地缘政治下的供应链重构"],
            ["东南亚市场的真实画像", "本地化运营的关键策略", "跨境支付的挑战与方案", "文化差异带来的商业洞察"],
            ["AI+医疗的落地进展", "AI+教育的机会与瓶颈", "AI+金融的合规挑战", "投资人如何评估AI项目"],
            ["从管理到赋能的转型", "自组织的实践与反思", "远程协作的效率提升", "OKR落地的真实经验"]
        ],
        "guests": [
            "独角兽公司CEO", "连续创业者", "ESG投资总监", "消费品牌创始人",
            "SaaS公司联合创始人", "个人品牌顾问", "供应链专家",
            "出海企业CEO", "科技投资人", "组织发展顾问"
        ],
        "durations": ["45-60分钟", "50-60分钟", "40-50分钟", "35-50分钟", "40-55分钟"]
    },
    "文化生活漫谈": {
        "titles": [
            "数字游民：自由还是漂泊",
            "独立书店的生存实验",
            "播客文化：声音的复兴运动",
            "极简生活的哲学与实践",
            "城市漫步：重新发现身边的城市",
            "手艺人的坚守与创新",
            "数字断联：一次心灵实验",
            "跨文化婚姻的真实故事",
            "中年转行：人生下半场的重新定义",
            "社区营造：从陌生人到邻居"
        ],
        "outlines": [
            ["数字游民的生活方式解析", "自由职业的经济挑战", "社群归属感的缺失与弥补", "未来工作形态的展望"],
            ["独立书店的商业模式探索", "书店作为文化空间的价值", "线上线下的融合之道", "书店主理人的坚守故事"],
            ["播客兴起的背景与原因", "中文播客的独特生态", "从听众到创作者的蜕变", "播客商业化路径探讨"],
            ["极简主义的核心理念", "断舍离的实操方法", "消费主义反思", "极简不等于贫乏"],
            ["城市漫步的文化起源", "如何开始你的城市漫步", "发现被忽视的城市角落", "城市记忆与个人故事"],
            ["传统手艺的当代困境", "手艺人的创新尝试", "非遗传承的新路径", "手艺与设计的跨界融合"],
            ["数字断联实验的设计", "断联期间的身心变化", "重新定义与技术的关系", "数字极简主义实践"],
            ["跨文化婚姻的挑战与甜蜜", "文化差异中的理解与包容", "混合家庭的教育选择", "多元文化视角的收获"],
            ["中年转行的心理准备", "技能迁移的方法论", "转行后的生活变化", "给考虑转行者的建议"],
            ["社区营造的理念与方法", "成功社区案例分享", "邻里关系的重建", "从个体到共同体的转变"]
        ],
        "guests": [
            "数字游民社群发起人", "独立书店主理人", "播客创作者", "极简生活倡导者",
            "城市文化研究者", "非遗传承人", "数字极简实践者", "跨文化关系研究者",
            "职业规划顾问", "社区营造师"
        ],
        "durations": ["30-40分钟", "35-45分钟", "40-50分钟", "25-35分钟", "30-45分钟"]
    }
}

DEFAULT_TEMPLATE = POSITION_TEMPLATES["科技趋势访谈"]

TASK_TEMPLATES = {
    "联系嘉宾": [
        "整理候选嘉宾名单并排序",
        "通过社交媒体或行业人脉联系嘉宾",
        "发送正式邀请函和选题大纲",
        "确认嘉宾档期并预约录制时间"
    ],
    "查资料": [
        "收集选题相关的最新行业报告和数据",
        "整理嘉宾的背景资料和观点",
        "准备深度访谈问题清单",
        "调研竞品播客类似选题的听众反馈"
    ],
    "录制": [
        "测试录音设备和远程录制工具",
        "准备开场白和过渡语",
        "正式录制节目",
        "后期剪辑和添加片头片尾",
        "撰写节目简介和ShowNotes",
        "发布到各播客平台并推广"
    ]
}

BROADCAST_HOTSPOT_MAP = {
    "大模型": ("hot", 14),
    "AI Agent": ("hot", 7),
    "AI": ("hot", 10),
    "开源": ("warm", 21),
    "芯片": ("warm", 30),
    "创业": ("warm", 21),
    "投资": ("warm", 14),
    "消费": ("warm", 14),
    "数字游民": ("cool", 30),
    "文化": ("cool", 30),
    "社区": ("cool", 30),
    "ESG": ("warm", 21),
    "SaaS": ("warm", 14),
    "出海": ("warm", 21),
    "隐私": ("warm", 14),
    "合规": ("warm", 14),
}


def _pick_template(position: str) -> dict:
    for key in POSITION_TEMPLATES:
        if key in position or position in key:
            return POSITION_TEMPLATES[key]
    return DEFAULT_TEMPLATE


def generate_mock_topics(
    position: str,
    audience: str,
    keywords: str,
    count: int = 10,
    style_pref: StylePreference = None
) -> List[Dict[str, Any]]:
    template = _pick_template(position)
    titles = list(template["titles"])
    outlines = list(template["outlines"])
    guests = list(template["guests"])
    durations = list(template["durations"])

    kw_list = [k.strip() for k in keywords.replace("，", ",").split(",") if k.strip()]

    extra_titles = []
    extra_outlines = []
    for kw in kw_list:
        extra_titles.append(f"深度解析{kw}：从趋势到实践")
        extra_outlines.append([f"{kw}的起源与发展脉络", f"{kw}在当前行业的应用现状", f"{kw}面临的核心挑战", f"{kw}的未来发展方向预判"])

    all_titles = extra_titles + titles
    all_outlines = extra_outlines + outlines

    random.shuffle(all_titles)
    random.shuffle(all_outlines)

    result = []
    for i in range(min(count, len(all_titles))):
        title = all_titles[i]
        outline = all_outlines[i] if i < len(all_outlines) else ["背景介绍", "核心问题分析", "解决方案探讨", "未来展望"]
        guest = random.choice(guests)
        duration = random.choice(durations)

        if style_pref and style_pref.preferred_tags:
            tag = random.choice(style_pref.preferred_tags)
            title = f"{title}（{tag}视角）"

        result.append({
            "title": title,
            "outline": outline,
            "guest_type": guest,
            "duration": duration
        })

    while len(result) < count:
        idx = len(result)
        kw = random.choice(kw_list) if kw_list else "热门话题"
        result.append({
            "title": f"第{idx + 1}期：{kw}的深度解读",
            "outline": [f"{kw}的基本概念", f"{kw}的行业应用", f"{kw}的争议与思考", f"展望{kw}的未来"],
            "guest_type": random.choice(guests),
            "duration": random.choice(durations)
        })

    return result[:count]


def generate_mock_broadcast_window(keywords: str, title: str) -> str:
    kw_list = [k.strip() for k in keywords.replace("，", ",").split(",") if k.strip()]
    now = datetime.now()

    best_level = "cool"
    best_days = 30

    for kw in kw_list:
        for key, (level, days) in BROADCAST_HOTSPOT_MAP.items():
            if key in kw or kw in key:
                if level == "hot":
                    best_level = level
                    best_days = min(best_days, days)
                elif level == "warm" and best_level != "hot":
                    best_level = level
                    best_days = min(best_days, days)
                break

    start = now + timedelta(days=1)
    end = now + timedelta(days=best_days)

    level_labels = {
        "hot": "高热度期",
        "warm": "持续关注期",
        "cool": "平稳期"
    }

    return f"{start.strftime('%m/%d')} - {end.strftime('%m/%d')}（{level_labels[best_level]}）"


def generate_mock_tasks(topic: PodcastTopic) -> List[str]:
    tasks = []
    for phase, items in TASK_TEMPLATES.items():
        for item in items:
            tasks.append(f"[{phase}] {item}")
    tasks.append(f"[联系嘉宾] 确认{topic.guest_type}的参与意向")
    tasks.append(f"[查资料] 搜索\"{topic.title}\"相关最新报道")
    return tasks


def generate_mock_style_preference(history_topics: List[Dict[str, Any]]) -> StylePreference:
    avg_title_len = sum(len(t.get("title", "")) for t in history_topics) / max(len(history_topics), 1)

    if avg_title_len < 10:
        title_length = "short"
    elif avg_title_len < 18:
        title_length = "medium"
    else:
        title_length = "long"

    all_outlines = []
    for t in history_topics:
        all_outlines.extend(t.get("outline", []))
    avg_outline_len = sum(len(o) for o in all_outlines) / max(len(all_outlines), 1)

    if avg_outline_len < 10:
        tone = "concise"
        structure = "structured"
    elif avg_outline_len < 20:
        tone = "professional"
        structure = "interview"
    else:
        tone = "enthusiastic"
        structure = "conversational"

    tags = []
    tag_pool = ["深度分析", "趋势预判", "实战经验", "技术解析", "商业洞察", "行业案例", "方法论", "前沿探索", "创新思维", "人本视角"]
    tags = random.sample(tag_pool, min(5, len(tag_pool)))

    return StylePreference(
        title_length=title_length,
        tone=tone,
        structure=structure,
        preferred_tags=tags,
        learned_from_history=True
    )


def generate_mock_comparison(batch_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    comparisons = []
    for br in batch_results:
        keyword_count = len(br.get("keywords", "").replace("，", ",").split(","))
        audience_count = len(br.get("audience", "").replace("，", ",").split(","))

        keyword_score = min(95, 50 + keyword_count * 15 + random.randint(-5, 10))
        audience_score = min(95, 50 + audience_count * 10 + random.randint(-5, 10))
        overall = round((keyword_score * 0.4 + audience_score * 0.6) + random.uniform(-5, 5), 1)
        overall = max(40, min(98, overall))

        comparisons.append({
            "position": br.get("position", ""),
            "keyword_match_score": keyword_score,
            "audience_fit_score": audience_score,
            "overall_score": overall
        })

    return comparisons
