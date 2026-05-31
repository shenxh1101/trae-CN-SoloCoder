SYSTEM_PROMPTS = {
    "professional": "你是一位资深的技术文档写作专家，擅长撰写专业严谨的产品说明书。你的写作风格正式、准确、规范，注重技术细节和数据的准确性。",
    "simple": "你是一位擅长科普的技术作家，擅长用通俗易懂的语言向普通用户解释产品功能。你的写作风格亲切、简单、易懂，避免使用专业术语。",
    "marketing": "你是一位资深的营销文案专家，擅长撰写具有感染力的产品介绍。你的写作风格热情、有吸引力，突出产品优势和用户价值。"
}

SECTION_DESCRIPTIONS = {
    "overview": "产品概述",
    "specifications": "规格参数",
    "features": "功能详解",
    "precautions": "使用注意事项",
    "packing_list": "包装清单"
}


def build_manual_prompt(product_name: str, features: list, positioning: str, 
                        style: str = "professional", language: str = "zh", 
                        template_structure: dict = None) -> str:
    lang_suffix = "请用英文撰写" if language == "en" else "请用中文撰写"
    
    if template_structure:
        structure_desc = json.dumps(template_structure, ensure_ascii=False, indent=2)
        structure_prompt = f"\n请参考以下模板结构来组织内容：\n{structure_desc}\n"
    else:
        structure_prompt = """
请包含以下章节：
1. 产品概述 - 介绍产品的定位、核心价值和主要特点
2. 规格参数 - 列出产品的技术参数表格
3. 功能详解 - 详细描述每个核心功能点，每个功能单独成节
4. 使用注意事项 - 列出使用产品时的安全注意事项和维护建议
5. 包装清单 - 列出产品包装内包含的所有物品
"""
    
    features_str = "\n- ".join(features)
    
    prompt = f"""
请为一款产品撰写完整的产品说明书。

产品名称：{product_name}
产品定位：{positioning}
核心功能点：
- {features_str}

{structure_prompt}

写作风格要求：{style}
{lang_suffix}

请确保内容结构清晰、信息完整、专业准确。
"""
    return prompt


def build_slogan_prompt(product_name: str, features: list, positioning: str, 
                         language: str = "zh", style: str = "marketing") -> str:
    lang_suffix = "请用英文" if language == "en" else "请用中文"
    
    features_str = "\n- ".join(features)
    
    prompt = f"""
请为以下产品提炼一段吸引人的广告语：

产品名称：{product_name}
产品定位：{positioning}
核心功能点：
- {features_str}

{lang_suffix}撰写，风格要求：{style}。
广告语要简洁有力、容易记忆、突出产品核心卖点。
长度控制在20-50字之间。
"""
    return prompt


def build_revision_prompt(original_content: str, revision_suggestions: str, 
                          section: str = None, style: str = "professional",
                          language: str = "zh") -> str:
    lang_suffix = "请用英文" if language == "en" else "请用中文"
    
    section_hint = f"仅针对章节：{section}" if section else "对整个文档"
    
    prompt = f"""
请根据以下修改意见重新撰写产品说明书内容：

原始内容：
{original_content}

修改意见：
{revision_suggestions}

{section_hint}进行修改。
保持{style}的写作风格。{lang_suffix}输出。
"""
    return prompt


def build_template_analysis_prompt(template_content: str) -> str:
    prompt = f"""
请分析以下产品说明书模板，提取其结构和写作特点：

模板内容：
{template_content}

请以JSON格式输出分析结果，包含以下字段：
- structure: 章节结构列表，每个章节包含title、content_type、key_points
- style: 写作风格分析
- tone: 语气特点
- key_elements: 关键内容元素列表
- writing_tips: 写作建议
"""
    return prompt


import json
