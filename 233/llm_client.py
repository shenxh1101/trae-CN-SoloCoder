import json
import os
from typing import Optional, Dict, Any
from config import Config

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

from mock_llm import MockLLMClient


class LLMClient:
    def __init__(self, use_mock: bool = None):
        if use_mock is None:
            use_mock = os.getenv("USE_MOCK_LLM", "true").lower() == "true"
        
        self.use_mock = use_mock
        
        if use_mock or not HAS_OPENAI or not Config.OPENAI_API_KEY:
            self.use_mock = True
            self.mock_client = MockLLMClient()
            print("ℹ️  使用Mock LLM模式（演示用）")
        else:
            self.client = OpenAI(
                api_key=Config.OPENAI_API_KEY,
                base_url=Config.OPENAI_BASE_URL
            )
            self.model = Config.OPENAI_MODEL
    
    def generate(self, prompt: str, system_prompt: str = "你是一个专业的技术文档写作专家。", 
                 temperature: float = 0.7, max_tokens: int = 4000) -> str:
        if self.use_mock:
            return self.mock_client.generate(prompt, system_prompt, temperature, max_tokens)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"LLM API调用失败: {str(e)}")
    
    def generate_json(self, prompt: str, system_prompt: str = "你是一个专业的技术文档写作专家。请输出JSON格式。",
                      temperature: float = 0.7, max_tokens: int = 4000) -> Dict[str, Any]:
        if self.use_mock:
            return self.mock_client.generate_json(prompt, system_prompt, temperature, max_tokens)
        
        content = self.generate(prompt, system_prompt, temperature, max_tokens)
        try:
            json_str = content
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].strip()
            return json.loads(json_str)
        except Exception as e:
            raise Exception(f"JSON解析失败: {str(e)}\n原始内容: {content}")
