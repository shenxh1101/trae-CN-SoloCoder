import random
import time
import hashlib
from typing import Dict, Any


class MockLLMClient:
    def __init__(self):
        self._counter = 0
        self._template_variations = {
            'professional': [
                '采用业界领先的{}技术方案',
                '基于先进的{}架构',
                '运用前沿的{}算法',
                '通过精密的{}优化'
            ],
            'marketing': [
                '革命性的{}体验',
                '颠覆性的{}创新',
                '震撼的{}表现',
                '极致的{}享受'
            ],
            'simple': [
                '简单易用的{}功能',
                '贴心的{}设计',
                '实用的{}特性',
                '方便的{}操作'
            ]
        }
        
    def _hash(self, *args):
        self._counter += 1
        h = hashlib.md5((str(args) + str(time.time()) + str(self._counter)).encode()).hexdigest()
        return h[:8]
    
    def generate(self, prompt: str, system_prompt: str = "你是一个专业的技术文档写作专家。",
                 temperature: float = 0.7, max_tokens: int = 4000) -> str:
        seed = self._hash(prompt, temperature, time.time(), system_prompt)
        random.seed(seed)
        
        time.sleep(0.3)
        
        if "广告语" in prompt or "slogan" in prompt.lower():
            return self._generate_slogan(prompt)
        elif "修改" in prompt or "重新撰写" in prompt or "revise" in prompt.lower():
            return self._generate_revision(prompt)
        else:
            return self._generate_manual(prompt)
    
    def generate_json(self, prompt: str, system_prompt: str = "你是一位文档结构分析专家。",
                      temperature: float = 0.7, max_tokens: int = 4000) -> Dict[str, Any]:
        time.sleep(0.2)
        return {
            "structure": [
                {
                    "title": "产品概述",
                    "content_type": "introduction",
                    "key_points": ["产品定位", "核心价值", "目标用户", "主要特点"]
                },
                {
                    "title": "规格参数",
                    "content_type": "specifications",
                    "key_points": ["技术参数表格", "物理参数", "性能指标", "环境要求"]
                },
                {
                    "title": "功能详解",
                    "content_type": "features",
                    "key_points": ["每个功能的详细说明", "使用场景", "技术优势"]
                },
                {
                    "title": "使用注意事项",
                    "content_type": "precautions",
                    "key_points": ["安全注意事项", "使用限制", "维护建议", "常见问题"]
                },
                {
                    "title": "包装清单",
                    "content_type": "packing",
                    "key_points": ["产品主体", "配件列表", "文档资料"]
                }
            ],
            "style": random.choice(["professional", "elegant", "modern", "concise"]),
            "tone": random.choice(["正式专业", "亲切友好", "热情活力", "简洁高效"]),
            "key_elements": ["数据准确", "结构清晰", "术语规范", "逻辑严谨"],
            "writing_tips": ["使用专业术语", "数据精确到小数点后两位", "采用正式书面语"]
        }
    
    def _generate_manual(self, prompt: str) -> str:
        product_name = self._extract(prompt, "产品名称：", "\n") or "智能产品"
        positioning = self._extract(prompt, "产品定位：", "\n") or "高端智能设备"
        features_str = self._extract(prompt, "核心功能点：", "\n\n") or ""
        
        style = "marketing"
        if "专业严谨" in prompt:
            style = "professional"
        elif "通俗易懂" in prompt:
            style = "simple"
        
        features = [f.strip().lstrip('- ').strip() for f in features_str.split('\n') if f.strip() and '- ' in f]
        if not features:
            features = ["智能互联", "高性能", "长续航"]
        
        is_english = "英文" in prompt or "English" in prompt
        
        if is_english:
            return self._generate_english(product_name, positioning, features, style)
        else:
            return self._generate_chinese(product_name, positioning, features, style)
    
    def _extract(self, text: str, start: str, end: str) -> str:
        try:
            start_idx = text.find(start)
            if start_idx == -1:
                return ""
            start_idx += len(start)
            end_idx = text.find(end, start_idx)
            if end_idx == -1:
                end_idx = len(text)
            return text[start_idx:end_idx].strip()
        except:
            return ""
    
    def _variation(self, style: str, feature: str) -> str:
        templates = self._template_variations.get(style, self._template_variations['professional'])
        return random.choice(templates).format(feature)
    
    def _generate_chinese(self, product_name, positioning, features, style):
        feature_content = ""
        for i, feat in enumerate(features):
            detail = self._generate_feature_detail(feat, style, i)
            feature_content += f"\n### {feat}\n\n{detail}\n\n"
        
        advantages = self._generate_advantages(style)
        specs = self._generate_specs_table(features)
        precautions = self._generate_precautions(style)
        packing = self._generate_packing_list(product_name, style)
        
        intro_templates = {
            'professional': f"{product_name}是专为{positioning}打造的专业级智能产品。融合{random.randint(8, 20)}项自主研发技术，以卓越品质和可靠性能为核心，树立行业新标杆。",
            'marketing': f"{product_name}——为{positioning}而生的革命性智能旗舰。突破传统边界，融合{random.randint(5, 15)}项创新黑科技，重新定义您的智能生活体验。",
            'simple': f"{product_name}是一款专为{positioning}设计的智能产品。简单易用，功能强大，让科技真正融入您的日常生活。"
        }
        
        intro = intro_templates.get(style, intro_templates['professional'])
        
        return f"""# 产品概述

{intro}

**核心优势**：
{advantages}

# 规格参数

| 参数类别 | 具体规格 |
|----------|----------|
| 产品尺寸 | {random.randint(140, 170)}.{random.randint(0, 9)} × {random.randint(70, 80)}.{random.randint(0, 9)} × {random.randint(7, 10)}.{random.randint(0, 9)} mm |
| 产品重量 | {random.randint(180, 220)}g |
| 屏幕尺寸 | {random.randint(6, 7)}.{random.randint(1, 9)} 英寸 |
| 屏幕类型 | {random.choice(['AMOLED', 'LTPO AMOLED', 'OLED'])} |
| 屏幕分辨率 | {random.randint(2400, 3200)} × {random.randint(1080, 1440)} FHD+ |
| 屏幕刷新率 | {random.choice([120, 144, 165])}Hz 自适应 |
| 处理器 | {random.choice(['第三代骁龙8 Gen3', '天玑9300+', '苹果A18 Pro', '麒麟9020'])} |
| 内存规格 | {random.choice([12, 16, 24])}GB LPDDR5X + {random.choice([256, 512, 1024])}GB UFS 4.1 |
| 电池容量 | {random.randint(4800, 5500)}mAh |
| 充电功率 | {random.choice([65, 80, 100, 120])}W 超级快充 |
| 操作系统 | {random.choice(['Android 14', 'iOS 18', 'HarmonyOS 5.0'])} |
{specs}
# 功能详解
{feature_content}
# 使用注意事项

{precautions}

# 包装清单

{packing}
"""
    
    def _generate_feature_detail(self, feature, style, index):
        tech_terms = {
            '充电': ["氮化镓技术", "电荷泵技术", "双电芯串联架构", "无线充电线圈"],
            '防水': ["纳米涂层", "密封胶圈", "防水结构设计", "IP68级认证"],
            '拍照': ["大底传感器", "计算摄影", "OIS光学防抖", "多帧合成算法"],
            '5G': ["全频段天线", "毫米波技术", "SA/NSA双模", "5G增强技术"],
            '显示': ["LTPO技术", "DC调光", "HDR10+", "10bit色深"],
            '指纹': ["超声波指纹", "光学指纹", "大面积传感器", "3D结构光"]
        }
        
        related_terms = []
        for key, terms in tech_terms.items():
            if key in feature:
                related_terms = terms
                break
        
        if not related_terms:
            related_terms = ["AI算法优化", "智能调度", "低功耗设计", "用户体验"]
        
        tech = random.choice(related_terms)
        
        descriptions = {
            'professional': [
                f"{feature}系统采用{tech}，在保持{random.randint(25, 45)}%能效提升的同时，将响应延迟控制在{random.randint(10, 50)}毫秒以内。经过{random.randint(1000, 5000)}小时的严格测试验证，确保长期稳定运行。",
                f"基于{tech}实现的{feature}功能，支持{random.randint(5, 20)}种工作模式自适应调节，综合性能较上一代提升{random.randint(20, 60)}%。",
                f"{feature}模块集成了{tech}核心技术，通过系统性的软硬件协同优化，在{random.choice(['性能', '功耗', '稳定性', '安全性'])}方面达到业界领先水平。"
            ],
            'marketing': [
                f"全新升级的{feature}——搭载革命性{tech}，让您感受前所未有的{random.choice(['极速', '震撼', '极致', '完美'])}体验。每一次使用，都是一次惊喜。",
                f"{feature}重新定义：{tech}带来{random.randint(2, 5)}倍性能提升，{random.randint(30, 80)}%功耗降低。这就是旗舰该有的样子。",
                f"不止于{feature}，更有{tech}为您开启智能新时代。告别平庸，拥抱卓越。"
            ],
            'simple': [
                f"{feature}功能简单好用，采用{tech}，让您轻松上手。日常使用非常方便。",
                f"我们精心设计了{feature}，基于{tech}确保稳定可靠。您只需要享受使用的乐趣。",
                f"{feature}是最受欢迎的功能之一，{tech}让一切变得简单。"
            ]
        }
        
        return random.choice(descriptions.get(style, descriptions['professional']))
    
    def _generate_advantages(self, style):
        adv_templates = {
            'professional': [
                "- 旗舰级处理器平台，算力可达{}TOPS，提供强劲性能保障",
                "- 精密工艺打造，{}维立体散热系统，持续高性能输出",
                "- 全链路{}bit色彩管理，专业级显示效果",
                "- 多维安全防护体系，全方位保障数据安全"
            ],
            'marketing': [
                "- 性能怪兽！{}TOPS AI算力，超越想象",
                "- 轻薄美学！{}mm超薄机身，{}道精密工序打磨",
                "- 全能影像！{}万像素旗舰级影像系统",
                "- 续航怪兽！{}mAh大电池，{}W快充"
            ],
            'simple': [
                "- 性能强劲，日常使用流畅",
                "- 外观好看，手感舒适",
                "- 拍照清晰，记录美好瞬间",
                "- 续航持久，一天无忧"
            ]
        }
        
        templates = adv_templates.get(style, adv_templates['professional'])
        result = []
        for t in templates:
            placeholder_count = t.count('{}')
            if placeholder_count == 0:
                result.append(t)
            elif placeholder_count == 1:
                if 'TOPS' in t:
                    result.append(t.format(random.randint(20, 80)))
                elif '万' in t:
                    result.append(t.format(random.choice([5000, 6400, 10800])))
                elif 'mAh' in t:
                    result.append(t.format(random.randint(4800, 5500)))
                elif 'mm' in t:
                    result.append(t.format(round(random.uniform(7.0, 9.5), 1)))
                elif 'W' in t:
                    result.append(t.format(random.choice([65, 80, 100, 120])))
                else:
                    result.append(t.format(random.randint(3, 10)))
            elif placeholder_count == 2:
                if 'mm' in t and '道' in t:
                    result.append(t.format(round(random.uniform(7.0, 9.5), 1), random.randint(100, 500)))
                elif 'mAh' in t and 'W' in t:
                    result.append(t.format(random.randint(4800, 5500), random.choice([65, 80, 100, 120])))
                else:
                    result.append(t.format(random.randint(3, 10), random.randint(3, 10)))
        return '\n'.join(result)
    
    def _generate_specs_table(self, features):
        specs = ""
        for feat in features:
            if "防水" in feat or "water" in feat.lower():
                specs += f"| 防水等级 | IP{random.choice(['67', '68'])}级，{random.randint(1, 3)}米水深{random.randint(15, 60)}分钟 |\n"
            if "无线充电" in feat or "wireless" in feat.lower():
                specs += f"| 无线充电 | 支持 {random.choice([27, 50, 80])}W 无线快充，兼容Qi协议 |\n"
            if "5G" in feat:
                specs += f"| 5G网络 | {random.choice(['n1/n3/n5/n8/n28/n77/n78/n79 全频段', 'Sub-6GHz+毫米波'])} |\n"
            if "拍照" in feat or "摄像" in feat or "camera" in feat.lower():
                specs += f"| 主摄像素 | {random.choice(['5000万', '6400万', '1亿'])}像素，{random.choice(['1/1.12', '1/1.3', '1/1.56'])}英寸大底 |\n"
                specs += f"| 影像配置 | 主摄+超广角+长焦 {random.randint(3, 5)}摄组合，OIS光学防抖 |\n"
            if "指纹" in feat or "解锁" in feat:
                specs += f"| 生物识别 | {random.choice(['超声波', '光学'])}屏下指纹 + 面部识别 |\n"
        return specs
    
    def _generate_precautions(self, style):
        sections = {
            'professional': {
                '安全使用': [
                    "请使用官方认证的充电器和数据线，避免使用劣质配件",
                    f"工作温度范围: {random.randint(0, 10)}°C ~ {random.randint(35, 45)}°C",
                    "请勿在潮湿或强电磁环境下使用",
                    "如发现设备异常发热、鼓胀等现象，请立即停止使用并联系客服"
                ],
                '日常维护': [
                    "使用干净柔软的超细纤维布清洁设备表面",
                    "避免接触腐蚀性液体和尖锐物品",
                    "建议每月进行一次完整充放电循环",
                    "定期备份重要数据至云端或外部存储"
                ],
                '保修服务': [
                    f"整机保修 {random.choice([1, 2])} 年，主要部件保修 {random.choice([12, 24])} 个月",
                    "全国 {random.randint(500, 2000)}+ 家授权服务中心",
                    f"提供 {random.choice(['7', '15'])} 天无理由退换货服务",
                    "支持线上预约上门维修服务"
                ]
            },
            'marketing': {
                '温馨提示': [
                    "为获得最佳体验，请使用我们为您精心搭配的原装配件",
                    "您的尊享服务已激活，享受专属客服通道",
                    "注册产品即延长保修期，详情请访问官网",
                    "加入会员俱乐部，获取专属优惠和新品优先体验"
                ]
            },
            'simple': {
                '注意事项': [
                    "充电时请使用原装充电器",
                    "避免掉进水里或摔落",
                    "不要自己拆开机器",
                    "有问题找客服"
                ]
            }
        }
        
        result = ""
        sec_dict = sections.get(style, sections['professional'])
        for title, items in sec_dict.items():
            result += f"## {title}\n\n"
            for item in items:
                result += f"- {item}\n"
            result += "\n"
        return result
    
    def _generate_packing_list(self, product_name, style):
        base_items = [
            f"{product_name} 主机 × 1",
            f"{random.choice(['原装超级快充', '氮化镓充电器', '电源适配器'])} × 1",
            f"{random.choice(['Type-C', 'USB-C'])} 数据线 × 1",
            f"{random.choice(['快速入门指南', '使用说明书'])} × 1",
            f"{random.choice(['保修卡', '权益服务卡'])} × 1",
            f"{random.choice(['取卡针', 'SIM卡针'])} × 1"
        ]
        
        extra_items = {
            'professional': [
                "高透钢化膜 × 1",
                "抗菌保护壳 × 1",
                "品牌礼盒包装"
            ],
            'marketing': [
                "尊享定制保护壳 × 1",
                "品牌定制礼盒",
                "会员尊享卡 × 1",
                "惊喜赠品盲盒"
            ],
            'simple': [
                "透明保护壳 × 1"
            ]
        }
        
        all_items = base_items + extra_items.get(style, [])
        return '\n'.join([f"- {item}" for item in all_items])
    
    def _generate_english(self, product_name, positioning, features, style):
        feature_content = ""
        for feat in features:
            templates = [
                f"{feat} leverages industry-leading {random.choice(['AI algorithms', 'chip architecture', 'sensor technology', 'optimization engine'])}, delivering {random.randint(25, 50)}% faster response times with {random.randint(20, 40)}% lower power consumption.",
                f"Powered by advanced {random.choice(['neural networks', 'machine learning', 'edge computing', 'computer vision'])}, {feat} intelligently {random.choice(['adapts to your behavior', 'predicts your needs', 'optimizes performance', 'enhances experience'])}.",
                f"{feat} is the result of {random.randint(2, 5)} years of research with {random.randint(100, 500)} engineers. It supports {random.choice(['multi-device sync', 'voice control', 'gesture interaction', 'AI automation'])}."
            ]
            feature_content += f"\n### {feat}\n\n{random.choice(templates)}\n\n"
        
        return f"""# Product Overview

{product_name} is a {random.choice(['revolutionary', 'flagship', 'premium', 'innovative'])} {positioning}. Featuring {random.randint(5, 15)} patented technologies, it redefines the standard for intelligent devices.

## Key Highlights
- **Performance**: Powered by {random.choice(['next-gen flagship', 'premium octa-core', 'AI-enhanced'])} processor with {random.randint(15, 80)} TOPS AI capability
- **Design**: {random.choice(['Premium', 'Crafted', 'Elegant'])} {random.choice(['titanium alloy', 'ceramic', 'glass'])} body, only {random.uniform(7.0, 9.5):.1f}mm thin
- **Display**: {random.randint(6, 7)}.{random.randint(1, 9)}" {random.choice(['AMOLED', 'LTPO', 'OLED'])} with {random.choice([120, 144, 165])}Hz refresh rate
- **Battery**: {random.randint(4500, 5500)}mAh with {random.choice([65, 80, 100, 120])}W {random.choice(['SuperVOOC', 'FlashCharge', 'TurboCharge'])}

# Specifications

| Category | Specification |
|----------|---------------|
| Dimensions | {random.randint(140, 170)} x {random.randint(70, 80)} x {random.uniform(7.0, 9.5):.1f} mm |
| Weight | {random.randint(180, 220)}g |
| Display | {random.randint(6, 7)}.{random.randint(1, 9)}" {random.choice(['AMOLED', 'LTPO AMOLED', 'OLED'])} |
| Resolution | {random.randint(2400, 3200)} x {random.randint(1080, 1440)} |
| Processor | {random.choice(['Snapdragon 8 Gen3', 'Dimensity 9300+', 'Apple A18 Pro'])} |
| Memory | {random.choice([12, 16, 24])}GB RAM + {random.choice([256, 512, 1024])}GB Storage |
| Battery | {random.randint(4500, 5500)}mAh |
| Charging | {random.choice([65, 80, 100, 120])}W Fast Charge |
| OS | {random.choice(['Android 14', 'iOS 18', 'HarmonyOS 5.0'])} |

# Key Features
{feature_content}
# Precautions

## Safety
- Use only {random.choice(['official', 'certified', 'original'])} chargers and cables
- Operating temperature: {random.randint(0, 10)}°C to {random.randint(35, 45)}°C
- Keep away from {random.choice(['water', 'magnetic fields', 'extreme temperatures'])}

## Maintenance
- Clean with {random.choice(['microfiber cloth', 'soft dry cloth', 'screen cleaner'])}
- {random.choice(['Update firmware regularly', 'Backup data monthly', 'Restart weekly'])}
- Avoid {random.choice(['sharp objects', 'corrosive liquids', 'direct sunlight'])}

## Warranty
- {random.choice([1, 2])}-year limited warranty
- {random.choice([500, 1000, 2000])}+ service centers worldwide
- {random.choice(['7', '14', '30'])}-day return policy

# Packing List

- {product_name} × 1
- {random.choice(['Original Charger', 'Power Adapter', 'Fast Charger'])} × 1
- {random.choice(['USB-C', 'Type-C'])} Cable × 1
- {random.choice(['Quick Start Guide', 'User Manual'])} × 1
- {random.choice(['Warranty Card', 'VIP Card'])} × 1
- {random.choice(['SIM Eject Tool', 'Case', 'Screen Protector'])} × 1
- {random.choice(['Gift Box Packaging', 'Premium Package', 'Eco-Friendly Box'])}
"""
    
    def _generate_slogan(self, prompt: str) -> str:
        product_name = self._extract(prompt, "产品名称：", "\n") or "产品"
        positioning = self._extract(prompt, "产品定位：", "\n") or ""
        
        is_english = "英文" in prompt or "English" in prompt
        
        if is_english:
            slogans = [
                f"{product_name} - {random.choice(['Experience', 'Discover', 'Unleash', 'Embrace', 'Redefine'])} the Future",
                f"{product_name} - {random.choice(['Innovation', 'Excellence', 'Perfection', 'Revolution', 'Elegance'])} at Your Fingertips",
                f"{product_name} - {random.choice(['Designed', 'Built', 'Crafted', 'Engineered', 'Created'])} for Greatness",
                f"{product_name} - {random.choice(['Where', 'Beyond', 'Above', 'More than'])} Technology Meets {random.choice(['Life', 'Art', 'Excellence', 'Perfection'])}",
                f"{product_name} - {random.choice(['The', 'Your', 'Next', 'Elevate'])} {random.choice(['Future', 'Experience', 'Journey', 'Lifestyle'])} Starts Here"
            ]
        else:
            slogans = [
                f"{product_name} - {random.choice(['智享', '创享', '悦享', '定义', '开启'])}未来生活",
                f"{product_name} - {random.choice(['科技', '创新', '品质', '匠心', '极致'])}成就非凡",
                f"{product_name} - {random.choice(['让科技更有温度', '重新定义', '开启智能新时代', '探索无限可能'])}",
                f"{product_name} - {random.choice(['不止于', '超越', '突破', '引领', '预见'])}想象",
                f"{product_name} - {random.choice(['所见即所得', '为极致而生', '品质生活', '科技以人为本'])}",
                f"{product_name} - {random.choice(['旗舰标杆', '智慧之选', '未来已来', '匠心之作'])}"
            ]
        return random.choice(slogans)
    
    def _generate_revision(self, prompt: str) -> str:
        original = self._extract(prompt, "原始内容：", "\n修改意见：")
        suggestions = self._extract(prompt, "修改意见：", "进行修改")
        if not suggestions:
            suggestions = self._extract(prompt, "修改意见：", "进行修改") or "优化内容"
        
        time.sleep(0.4)
        
        revision_styles = [
            f"【根据修改意见优化版】\n\n{original}\n\n---\n\n✅ 已应用优化：{suggestions}\n\n本次优化重点：\n1. 增强了内容的专业表述和数据支撑\n2. 调整了段落结构，提升可读性\n3. 补充了更多细节和使用场景说明",
            f"【优化后版本】\n\n{original}\n\n\n💡 编辑注记：\n根据您的反馈「{suggestions}」进行了全面优化。",
            f"{original}\n\n[已更新] 基于修改意见「{suggestions}」完成优化，内容已升级。"
        ]
        
        return random.choice(revision_styles)
