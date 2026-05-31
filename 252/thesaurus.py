RESUME_VERBS = {
    "负责": ["主导", "统筹", "管理", "督导", "协调", "组织", "监督"],
    "做": ["执行", "实施", "开展", "完成", "达成", "推进", "落实"],
    "参与": ["深度参与", "核心参与", "牵头参与", "协助", "配合", "支援"],
    "帮助": ["协助", "支持", "促进", "推动", "赋能", "助力"],
    "使用": ["熟练运用", "精通", "掌握", "实操", "应用", "部署"],
    "学习": ["钻研", "研究", "掌握", "攻克", "深耕"],
    "工作": ["任职", "供职", "服务", "履职", "担当"],
    "完成": ["如期完成", "超额完成", "圆满完成", "交付", "达成"],
    "提高": ["提升", "优化", "增强", "改善", "精进", "拔高"],
    "降低": ["削减", "压缩", "控制", "节约", "减少"],
    "管理": ["统筹管理", "精细化管理", "规范化管理", "治理", "管控"],
    "开发": ["自主开发", "设计开发", "研发", "搭建", "构建"],
    "设计": ["精心设计", "创新设计", "规划设计", "架构设计"],
    "解决": ["有效解决", "妥善解决", "攻克", "破解", "化解"],
    "带领": ["带领团队", "率领", "牵头", "领军", "主导"],
    "沟通": ["深度沟通", "高效沟通", "协调沟通", "对接", "磋商"],
    "分析": ["深入分析", "系统分析", "数据分析", "研判", "诊断"],
    "报告": ["汇报", "呈报", "总结", "出具", "编制"],
    "计划": ["规划", "统筹规划", "制定计划", "擘画", "布局"],
    "培训": ["系统培训", "专业培训", "带教", "指导", "培养"],
    "do": ["execute", "perform", "accomplish", "conduct", "carry out"],
    "does": ["executes", "performs", "accomplishes", "conducts"],
    "doing": ["executing", "performing", "accomplishing"],
    "did": ["executed", "performed", "accomplished", "conducted", "carried out"],
    "make": ["build", "construct", "create", "develop", "design"],
    "makes": ["builds", "constructs", "creates", "develops"],
    "making": ["building", "constructing", "creating", "developing"],
    "made": ["built", "constructed", "fabricated", "shaped", "forged"],
    "get": ["obtain", "acquire", "attain", "secure", "gain"],
    "gets": ["obtains", "acquires", "attains", "secures"],
    "getting": ["obtaining", "acquiring", "attaining"],
    "got": ["obtained", "acquired", "attained", "secured", "gained"],
    "gotten": ["obtained", "acquired", "attained", "secured"],
    "work": ["serve", "collaborate", "contribute", "perform", "function"],
    "works": ["serves", "collaborates", "contributes", "performs"],
    "working": ["serving", "collaborating", "contributing", "performing"],
    "worked": ["served", "collaborated", "contributed", "performed", "functioned"],
    "use": ["utilize", "leverage", "employ", "deploy", "apply"],
    "uses": ["utilizes", "leverages", "employs", "deploys"],
    "using": ["utilizing", "leveraging", "employing", "deploying"],
    "used": ["utilized", "leveraged", "employed", "deployed", "applied"],
    "help": ["facilitate", "enable", "empower", "support", "assist"],
    "helps": ["facilitates", "enables", "empowers", "supports"],
    "helping": ["facilitating", "enabling", "empowering"],
    "helped": ["facilitated", "enabled", "empowered", "supported", "assisted"],
    "have": ["possess", "hold", "maintain", "demonstrate", "exhibit"],
    "has": ["possesses", "holds", "maintains", "demonstrates"],
    "had": ["possessed", "held", "maintained", "demonstrated"],
    "start": ["found", "establish", "launch", "initiate", "instigate"],
    "started": ["founded", "established", "launched", "initiated", "instigated"],
    "talk": ["communicate", "collaborate", "negotiate", "present", "consult"],
    "talked": ["communicated", "collaborated", "negotiated", "presented", "consulted"],
    "think": ["analyze", "evaluate", "strategize", "conceptualize", "envision"],
    "thought": ["analyzed", "evaluated", "strategized", "conceptualized", "envisioned"],
    "achieve": ["accomplish", "attain", "realize", "deliver", "secure"],
    "achieved": ["accomplished", "attained", "realized", "delivered", "secured"],
    "manage": ["orchestrate", "direct", "spearhead", "oversee", "supervise"],
    "manages": ["orchestrates", "directs", "spearheads", "oversees"],
    "managing": ["orchestrating", "directing", "spearheading", "overseeing"],
    "managed": ["orchestrated", "directed", "spearheaded", "oversaw", "supervised"],
    "lead": ["champion", "head", "pioneer", "captain", "guide"],
    "leads": ["champions", "heads", "pioneers", "captains"],
    "leading": ["championing", "heading", "pioneering", "captaining"],
    "led": ["championed", "headed", "pioneered", "captained", "guided"],
    "create": ["develop", "formulate", "design", "engineer", "establish"],
    "creates": ["develops", "formulates", "designs", "engineers"],
    "creating": ["developing", "formulating", "designing", "engineering"],
    "created": ["developed", "formulated", "designed", "engineered", "established"],
    "improve": ["enhance", "optimize", "transform", "revitalize", "elevate"],
    "improved": ["enhanced", "optimized", "transformed", "revitalized", "elevated"],
    "increase": ["boost", "accelerate", "expand", "grow", "amplify"],
    "increased": ["boosted", "accelerated", "expanded", "grew", "amplified"],
    "reduce": ["decrease", "minimize", "lower", "cut", "slash"],
    "reduced": ["decreased", "minimized", "lowered", "cut", "slashed"],
    "handle": ["manage", "oversee", "coordinate", "execute", "process"],
    "handled": ["managed", "oversaw", "coordinated", "executed", "processed"],
    "responsible": ["accountable", "in charge", "tasked with", "entrusted with"],
    "responsibilities": ["accountabilities", "duties", "obligations", "tasks"]
}

POWER_VERBS = [
    "Accelerated", "Accomplished", "Achieved", "Activated", "Adapted",
    "Advanced", "Analyzed", "Architected", "Assessed", "Automated",
    "Balanced", "Bolstered", "Boosted", "Built", "Capitalized",
    "Championed", "Changed", "Classified", "Coached", "Commanded",
    "Communicated", "Compared", "Compiled", "Completed", "Conceived",
    "Conducted", "Consolidated", "Constructed", "Consulted", "Controlled",
    "Converted", "Coordinated", "Created", "Cultivated", "Customized",
    "Decreased", "Defined", "Delivered", "Demonstrated", "Designed",
    "Developed", "Devised", "Directed", "Drove", "Eliminated",
    "Enhanced", "Established", "Evaluated", "Executed", "Expanded",
    "Expedited", "Explored", "Forecasted", "Formulated", "Founded",
    "Generated", "Guided", "Harmonized", "Headed", "Identified",
    "Implemented", "Improved", "Increased", "Influenced", "Initiated",
    "Innovated", "Inspected", "Installed", "Instituted", "Integrated",
    "Led", "Leveraged", "Maintained", "Managed", "Maximized",
    "Mentored", "Merchandised", "Minimized", "Modeled", "Modified",
    "Motivated", "Negotiated", "Operated", "Optimized", "Organized",
    "Originated", "Overhauled", "Oversaw", "Performed", "Planned",
    "Predicted", "Prepared", "Presented", "Prioritized", "Processed",
    "Produced", "Programmed", "Projected", "Promoted", "Proposed",
    "Prospected", "Provided", "Published", "Raised", "Realized",
    "Rebuilt", "Received", "Recognized", "Redesigned", "Reduced",
    "Reorganized", "Reported", "Represented", "Researched", "Resolved",
    "Restructured", "Retrieved", "Reviewed", "Revitalized", "Saved",
    "Scheduled", "Secured", "Selected", "Served", "Set",
    "Simplified", "Sold", "Solved", "Spearheaded", "Specified",
    "Staffed", "Standardized", "Started", "Streamlined", "Strengthened",
    "Structured", "Studied", "Suggested", "Summarized", "Supervised",
    "Supported", "Surpassed", "Systemized", "Targeted", "Taught",
    "Tested", "Trained", "Transformed", "Translated", "Traveled",
    "Troubleshot", "Unified", "Updated", "Upgraded", "Used",
    "Utilized", "Validated", "Verified", "Won", "Wrote"
]

def get_synonyms(word):
    word_lower = word.lower()
    if word_lower in RESUME_VERBS:
        return RESUME_VERBS[word_lower]
    return []

def suggest_power_verbs(text):
    suggestions = []
    words = text.split()
    
    for word in words:
        word_clean = word.strip('.,!?()[]{}"\'').lower()
        synonyms = get_synonyms(word_clean)
        if synonyms:
            suggestions.append({
                "original": word,
                "suggestions": synonyms[:5]
            })
    
    return suggestions

def get_power_verb_categories():
    categories = {
        "领导力": ["Led", "Championed", "Directed", "Spearheaded", "Headed", "Commanded", "Pioneered", "Captained"],
        "成就": ["Achieved", "Accomplished", "Attained", "Delivered", "Realized", "Secured", "Surpassed", "Earned"],
        "创新": ["Created", "Designed", "Developed", "Formulated", "Engineered", "Established", "Innovated", "Pioneered"],
        "改进": ["Improved", "Enhanced", "Optimized", "Transformed", "Revitalized", "Elevated", "Boosted", "Advanced"],
        "管理": ["Managed", "Oversaw", "Coordinated", "Organized", "Supervised", "Controlled", "Administered", "Regulated"],
        "分析": ["Analyzed", "Evaluated", "Researched", "Examined", "Studied", "Diagnosed", "Measured", "Assessed"],
        "沟通": ["Communicated", "Presented", "Negotiated", "Consulted", "Collaborated", "Reported", "Liaised", "Mediated"],
        "技术": ["Programmed", "Engineered", "Developed", "Architected", "Built", "Constructed", "Implemented", "Integrated"]
    }
    return categories
