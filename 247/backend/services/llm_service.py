from typing import Dict, Optional, List
import json
import requests
import logging
from config import Config

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.provider = Config.LLM_PROVIDER
        self.api_key = Config.LLM_API_KEY
        self.model = Config.LLM_MODEL
        self.temperature = Config.LLM_TEMPERATURE
        self.max_tokens = Config.LLM_MAX_TOKENS
        self.base_url = Config.LLM_BASE_URL.rstrip('/') if Config.LLM_BASE_URL else ''

    def generate_answer(self, question: str, knowledge: Dict, style: str, context: Optional[List[Dict]] = None) -> str:
        answer_points = knowledge.get("answer_points", [])
        legal_refs = knowledge.get("legal_references", [])

        if self.provider == "mock" or not self.api_key:
            logger.info("使用mock模式生成回答 (provider=%s, api_key=%s)", self.provider, "已配置" if self.api_key else "未配置")
            return self._mock_generate(question, answer_points, legal_refs, style, context)

        try:
            logger.info("调用LLM API: base_url=%s, model=%s", self.base_url, self.model)
            return self._call_llm_api(question, answer_points, legal_refs, style, context)
        except requests.exceptions.Timeout:
            logger.error("LLM API调用超时")
            return self._mock_generate(question, answer_points, legal_refs, style, context)
        except requests.exceptions.ConnectionError as e:
            logger.error("LLM API连接失败: %s", str(e))
            return self._mock_generate(question, answer_points, legal_refs, style, context)
        except requests.exceptions.HTTPError as e:
            logger.error("LLM API返回HTTP错误: %s", str(e))
            return self._mock_generate(question, answer_points, legal_refs, style, context)
        except Exception as e:
            logger.error("LLM API调用异常: %s", str(e))
            return self._mock_generate(question, answer_points, legal_refs, style, context)

    def _call_llm_api(self, question: str, answer_points: List[str], legal_refs: List[str], style: str, context: Optional[List[Dict]]) -> str:
        system_prompt = self._build_system_prompt(style)
        user_prompt = self._build_user_prompt(question, answer_points, legal_refs, context)

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        if context:
            for msg in context:
                role = msg.get("role", "user")
                if role == "user":
                    messages.append({"role": "user", "content": msg["content"]})
                elif role == "assistant":
                    messages.append({"role": "assistant", "content": msg["content"]})

        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        url = f"{self.base_url}/chat/completions"
        logger.debug("POST %s  payload=%s", url, json.dumps(payload, ensure_ascii=False)[:500])

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=60
        )

        if response.status_code != 200:
            logger.error("LLM API错误响应: status=%d body=%s", response.status_code, response.text[:500])

        response.raise_for_status()

        result = response.json()
        content = result["choices"][0]["message"]["content"].strip()
        logger.info("LLM API调用成功, 回答长度=%d", len(content))
        return content

    def _build_system_prompt(self, style: str) -> str:
        if style == "professional":
            return """你是一位专业的劳动法律师，擅长用专业的法律语言解答问题。
请严格基于提供的法律知识库内容进行回答，不要编造法律分析，确保回答准确专业。
回答格式要规范，使用法律术语，结构清晰。
在回答末尾附上免责声明：本意见仅供参考，具体法律问题建议咨询专业律师。"""
        else:
            return """你是一位友善的劳动法律咨询顾问，擅长用通俗易懂的语言解答法律问题。
请严格基于提供的法律知识库内容进行回答，不要编造法律知识。
回答要亲切自然，让普通人容易理解。
在回答末尾附上免责声明：本意见仅供参考，具体法律问题建议咨询专业律师。"""

    def _build_user_prompt(self, question: str, answer_points: List[str], legal_refs: List[str], context: Optional[List[Dict]]) -> str:
        prompt_parts = []

        prompt_parts.append("【当前问题】")
        prompt_parts.append(question)
        prompt_parts.append("")

        prompt_parts.append("【法律知识库】")
        prompt_parts.append("请基于以下法律知识回答：")
        for i, point in enumerate(answer_points, 1):
            prompt_parts.append(f"{i}. {point}")

        if legal_refs:
            prompt_parts.append("")
            prompt_parts.append("【相关法律条文】")
            for ref in legal_refs:
                prompt_parts.append(f"- {ref}")

        prompt_parts.append("")
        prompt_parts.append("请基于以上法律知识，用中文回答用户的问题。回答中应明确引用相关法律条文。")

        return "\n".join(prompt_parts)

    def _mock_generate(self, question: str, answer_points: List[str], legal_refs: List[str], style: str, context: Optional[List[Dict]]) -> str:
        if style == "professional":
            return self._generate_professional(question, answer_points, legal_refs, context)
        else:
            return self._generate_simple(question, answer_points, legal_refs, context)

    def _generate_simple(self, question: str, answer_points: List[str], legal_refs: List[str], context: Optional[List[Dict]]) -> str:
        parts = []

        if context and len(context) > 0:
            parts.append("根据您之前的咨询，")

        parts.append(f"关于您的问题：{question}")
        parts.append("")

        for i, point in enumerate(answer_points, 1):
            parts.append(f"{i}. {point}")

        parts.append("")

        if legal_refs:
            parts.append("相关法律依据：")
            for ref in legal_refs:
                parts.append(f"  • {ref}")
            parts.append("")

        parts.append("免责声明：本意见仅供参考，具体法律问题建议咨询专业律师。")

        return "\n".join(parts)

    def _generate_professional(self, question: str, answer_points: List[str], legal_refs: List[str], context: Optional[List[Dict]]) -> str:
        parts = []

        parts.append("【法律咨询意见】")
        parts.append("")
        parts.append(f"咨询问题：{question}")
        parts.append("")

        if context and len(context) > 0:
            parts.append("【此前对话背景】")
            for m in context[-6:]:
                role = "咨询人" if m["role"] == "user" else "律师"
                parts.append(f"{role}：{m['content'][:200]}")
            parts.append("")

        parts.append("【法律分析】")
        for i, point in enumerate(answer_points, 1):
            parts.append(f"{i}. {point}")

        parts.append("")

        if legal_refs:
            parts.append("【法律依据】")
            for ref in legal_refs:
                parts.append(f"  ▪ {ref}")
            parts.append("")

        parts.append("【免责声明】本意见仅供参考，具体法律问题建议咨询专业律师。")

        return "\n".join(parts)
