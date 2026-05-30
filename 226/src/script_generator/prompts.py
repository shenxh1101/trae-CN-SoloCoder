"""
提示词模板模块 - 管理各种生成任务的提示词
"""

from typing import Dict, Any, Optional


class PromptTemplates:
    @staticmethod
    def dialogue_generation(
        scene: str,
        character1: Dict[str, str],
        character2: Dict[str, str],
        min_turns: int = 4,
        max_turns: int = 6,
        include_emotion: bool = True,
        character_history: Optional[str] = None,
        mood_reference: Optional[str] = None
    ) -> str:
        emotion_instruction = ""
        if include_emotion:
            emotion_instruction = """
- 每句对话都要附带情绪标签，格式为：角色（情绪描述）：对话内容
- 情绪标签要具体生动，如"紧张地结巴"、"狡黠地笑"、"若有所思地"等"""

        history_instruction = ""
        if character_history:
            history_instruction = f"""
## 角色历史语气参考
请参考以下历史对话中的角色语气风格，保持一致性：
{character_history}
"""

        mood_instruction = ""
        if mood_reference:
            mood_instruction = f"""
## 整体氛围参考
{mood_reference}
"""

        return f"""你是一位专业的编剧助手。请根据以下设定创作一段对话剧本。

## 场景设定
{scene}

## 角色设定
角色1 - {character1['name']}：{character1['personality']}
角色2 - {character2['name']}：{character2['personality']}
{history_instruction}
{mood_instruction}
## 创作要求
- 生成 {min_turns}-{max_turns} 轮对话（每个角色说话算一轮）
- 对话要自然流畅，符合角色性格
- 要有戏剧张力和情感变化
- 避免过于直白的表达，让对话有潜台词
{emotion_instruction}

请以JSON格式输出，结构如下：
{{
    "dialogue": [
        {{
            "speaker": "角色名",
            "text": "对话内容",
            "emotion": "情绪描述",
            "sentiment": {{
                "joy": 0.5,
                "sadness": 0.1,
                "anger": 0.0,
                "fear": 0.2,
                "surprise": 0.1,
                "tension": 0.4,
                "affection": 0.3
            }}
        }}
    ]
}}

sentiment字段的情感值范围为0-1，所有值的和不必为1，只需反映该句对话中各情感的强度。
"""

    @staticmethod
    def cross_over_generation(
        character1: Dict[str, str],
        character2: Dict[str, str],
        scenario: str,
        min_turns: int = 4,
        max_turns: int = 6,
        include_emotion: bool = True
    ) -> str:
        emotion_instruction = ""
        if include_emotion:
            emotion_instruction = """
- 每句对话都要附带情绪标签，格式为：角色（情绪描述）：对话内容"""

        return f"""你是一位专业的编剧助手。请为两个来自不同作品的角色创作一段"梦幻联动"对话。

## 联动场景
{scenario}

## 角色设定
角色1 - {character1['name']}（出自：{character1.get('source', '未知')}）：
性格特点：{character1['personality']}
经典台词风格：{character1.get('style', '保持原作风格')}

角色2 - {character2['name']}（出自：{character2.get('source', '未知')}）：
性格特点：{character2['personality']}
经典台词风格：{character2.get('style', '保持原作风格')}

## 创作要求
- 生成 {min_turns}-{max_turns} 轮对话
- 严格保持两个角色的原有性格和说话风格
- 对话要体现角色间的碰撞和化学反应
- 可以加入对各自原作的致敬梗
- 对话逻辑要自然，即使是跨世界观的相遇也要合理
{emotion_instruction}

请以JSON格式输出，结构同前。
"""

    @staticmethod
    def sentiment_analysis(dialogue_text: str) -> str:
        return f"""请分析以下对话的情感弧线，为每一句对话标注情感值。

对话内容：
{dialogue_text}

请为每一句对话分析以下情感维度的强度（0-1）：
- joy（喜悦）
- sadness（悲伤）
- anger（愤怒）
- fear（恐惧）
- surprise（惊讶）
- tension（紧张）
- affection（爱慕/亲近）

输出JSON格式：
{{
    "analysis": [
        {{
            "line_index": 0,
            "speaker": "角色名",
            "sentiment": {{
                "joy": 0.5,
                "sadness": 0.1,
                "anger": 0.0,
                "fear": 0.2,
                "surprise": 0.1,
                "tension": 0.4,
                "affection": 0.3
            }}
        }}
    ],
    "overall_arc": "情感弧线描述"
}}
"""

    @staticmethod
    def style_extraction(dialogue_history: str) -> str:
        return f"""请分析以下历史对话，提取角色的说话风格和语气特点。

历史对话：
{dialogue_history}

请输出JSON格式的角色风格分析：
{{
    "character_styles": {{
        "角色名": {{
            "speaking_style": "说话风格描述",
            "vocabulary": ["常用词汇1", "常用词汇2"],
            "sentence_pattern": "句式特点",
            "tone": "语气特点"
        }}
    }}
}}
"""
