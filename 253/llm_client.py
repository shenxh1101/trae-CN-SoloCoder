import json
from typing import List, Dict, Any, Optional
from config import config
from models import PodcastTopic, StylePreference
from mock_data import (
    generate_mock_topics,
    generate_mock_broadcast_window,
    generate_mock_tasks,
    generate_mock_style_preference,
    generate_mock_comparison
)


class LLMClient:
    def __init__(self):
        self._mock_mode = config.is_mock_mode
        self.client = None
        if not self._mock_mode:
            try:
                from openai import OpenAI
                self.client = OpenAI(
                    api_key=config.llm.api_key,
                    base_url=config.llm.api_base
                )
            except Exception:
                self._mock_mode = True
        self.model = config.llm.model

    @property
    def is_mock(self) -> bool:
        return self._mock_mode

    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        if self._mock_mode:
            raise RuntimeError("Mock模式，不可调用LLM")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=config.llm.temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"LLM调用失败: {str(e)}")

    def generate_topics(
        self,
        position: str,
        audience: str,
        keywords: str,
        count: int,
        style_pref: Optional[StylePreference] = None
    ) -> List[Dict[str, Any]]:
        if self._mock_mode:
            return generate_mock_topics(position, audience, keywords, count, style_pref)

        system_prompt = """你是一个专业的播客选题策划专家，擅长根据播客定位、目标听众和热点关键词生成高质量的播客选题。
请严格按照JSON格式输出结果，不要包含任何额外的解释文字。"""

        style_hint = ""
        if style_pref:
            style_hint = f"""
风格偏好参考：
- 标题风格: {style_pref.title_length}
- 语气风格: {style_pref.tone}
- 结构偏好: {style_pref.structure}
- 偏好标签: {', '.join(style_pref.preferred_tags)}
"""

        user_prompt = f"""请为以下播客生成{count}个选题：

播客定位：{position}
目标听众：{audience}
热点关键词：{keywords}
{style_hint}

每个选题必须包含以下字段：
- title: 选题标题（吸引人且符合播客定位）
- outline: 讨论大纲，3-5个要点的字符串数组
- guest_type: 建议邀请的嘉宾类型（具体职业或身份）
- duration: 预估时长（如"30-45分钟"）

请以JSON数组格式输出，只返回JSON，不要其他内容。"""

        result = self._call_llm(system_prompt, user_prompt)
        try:
            topics = json.loads(result)
            if not isinstance(topics, list):
                topics = [topics]
            return topics[:count]
        except json.JSONDecodeError:
            start = result.find('[')
            end = result.rfind(']') + 1
            if start >= 0 and end > start:
                return json.loads(result[start:end])[:count]
            raise Exception("无法解析LLM返回的JSON")

    def generate_broadcast_window(self, keywords: str, title: str) -> str:
        if self._mock_mode:
            return generate_mock_broadcast_window(keywords, title)

        system_prompt = "你是一个内容时效性分析专家，擅长预测热点话题的最佳播出时间窗口。"
        user_prompt = f"""分析以下播客选题的时效性，给出推荐的播出时间窗口：

选题标题：{title}
关键词：{keywords}

请考虑：
1. 当前热点的热度周期
2. 相关事件的时间节点
3. 听众的关注度趋势

输出格式示例：
- "本周内（高热度期）"
- "未来2-4周（上升期）"
- "本月内（平稳期）"
- "建议在[特定事件]前后播出"

只给出简洁的时间窗口建议。"""

        return self._call_llm(system_prompt, user_prompt).strip()

    def generate_tasks(self, topic: PodcastTopic) -> List[str]:
        if self._mock_mode:
            return generate_mock_tasks(topic)

        system_prompt = "你是一个专业的播客制作人，擅长将选题拆解为可执行的任务清单。"
        user_prompt = f"""为以下播客选题生成详细的待办任务清单，分为：联系嘉宾、资料准备、录制准备三个阶段：

选题：{topic.title}
嘉宾类型：{topic.guest_type}
大纲：{chr(10).join(topic.outline)}

每个阶段给出2-3个具体任务，输出为字符串数组JSON格式。"""

        result = self._call_llm(system_prompt, user_prompt)
        try:
            tasks = json.loads(result)
            if isinstance(tasks, list):
                return tasks
            return []
        except:
            return generate_mock_tasks(topic)

    def analyze_style_preference(self, history_topics: List[Dict[str, Any]]) -> StylePreference:
        if self._mock_mode:
            return generate_mock_style_preference(history_topics)

        system_prompt = "你是一个内容风格分析专家，擅长从历史内容中学习用户偏好。"
        user_prompt = f"""分析以下高播放量的历史播客选题，总结用户的风格偏好：

历史选题：
{json.dumps(history_topics, ensure_ascii=False, indent=2)}

请分析：
1. 标题长度偏好（short/medium/long）
2. 语气风格（professional/casual/enthusiastic/serious）
3. 内容结构偏好（structured/conversational/debate/interview）
4. 提取5-10个常用风格标签

以JSON格式输出：
{{
    "title_length": "...",
    "tone": "...",
    "structure": "...",
    "preferred_tags": ["..."]
}}"""

        result = self._call_llm(system_prompt, user_prompt)
        try:
            pref = json.loads(result)
            return StylePreference(**pref, learned_from_history=True)
        except:
            return generate_mock_style_preference(history_topics)

    def compare_topics(self, batch_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if self._mock_mode:
            return generate_mock_comparison(batch_results)

        system_prompt = "你是一个播客选题评估专家，擅长对比分析不同定位的选题方案。"
        user_prompt = f"""对比分析以下多组选题方案，给出每组的评分和分析：

选题方案：
{json.dumps(batch_results, ensure_ascii=False, indent=2)}

请为每组方案评估：
1. keyword_match_score: 关键词匹配度 (0-100)
2. audience_fit_score: 听众适配度 (0-100)
3. overall_score: 综合评分 (0-100)
4. 简短分析说明

以JSON数组格式输出。"""

        result = self._call_llm(system_prompt, user_prompt)
        try:
            comparison = json.loads(result)
            return comparison if isinstance(comparison, list) else [comparison]
        except:
            return generate_mock_comparison(batch_results)
