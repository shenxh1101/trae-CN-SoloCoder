import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from .config import Config


class LLMClient:
    def __init__(self, backend: str = None, api_key: str = None, base_url: str = None, model: str = None):
        self.backend = backend or Config.detect_llm_backend()
        self.api_key = api_key or Config.OPENAI_API_KEY
        self.base_url = base_url or Config.OPENAI_BASE_URL
        self.model = model or Config.OPENAI_MODEL
        self.temperature = Config.TEMPERATURE
        self.max_tokens = Config.MAX_TOKENS

        self._openai_client = None
        if self.backend == "openai" and self.api_key:
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url
                )
            except ImportError:
                pass

    def is_available(self) -> bool:
        if self.backend == "openai":
            return self._openai_client is not None
        elif self.backend == "ollama":
            return self._check_ollama_available()
        return False

    def _check_ollama_available(self) -> bool:
        try:
            req = urllib.request.Request(
                f"{Config.OLLAMA_BASE_URL}/api/tags", method="GET"
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                return resp.status == 200
        except Exception:
            return False

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[str] = None
    ) -> str:
        if self.backend == "openai":
            return self._generate_openai(system_prompt, user_prompt, response_format)
        elif self.backend == "ollama":
            return self._generate_ollama(system_prompt, user_prompt)
        else:
            raise RuntimeError(
                "没有可用的LLM后端。请配置以下任一方式:\n"
                "  1. 在 .env 中设置 OPENAI_API_KEY (使用 OpenAI API)\n"
                "  2. 启动 Ollama 本地服务 (使用本地模型)\n"
                "  3. 设置 LLM_BACKEND=ollama 或 LLM_BACKEND=openai"
            )

    def _generate_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[str] = None
    ) -> str:
        if not self._openai_client:
            raise RuntimeError("OpenAI 客户端未初始化，请检查 API Key 配置")

        kwargs = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}

        response = self._openai_client.chat.completions.create(**kwargs)
        return response.choices[0].message.content.strip()

    def _generate_ollama(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> str:
        url = f"{Config.OLLAMA_BASE_URL}/api/chat"
        payload = json.dumps({
            "model": Config.OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens
            }
        }).encode('utf-8')

        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                return result.get("message", {}).get("content", "").strip()
        except urllib.error.URLError as e:
            raise RuntimeError(
                f"Ollama 服务连接失败: {e}\n"
                f"请确保 Ollama 已启动 (ollama serve)，且模型 {Config.OLLAMA_MODEL} 已下载"
            )
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            raise RuntimeError(f"Ollama API 返回错误 {e.code}: {body}")

    def generate_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        if self.backend == "openai":
            content = self.generate(system_prompt, user_prompt, response_format="json")
        elif self.backend == "ollama":
            content = self.generate(system_prompt, user_prompt)
        else:
            return {"error": "No LLM backend available"}

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            json_match = None
            for delimiter in ['```json', '```']:
                if delimiter in content:
                    start = content.index(delimiter) + len(delimiter)
                    end = content.index('```', start) if '```' in content[start:] else len(content)
                    json_match = content[start:end].strip()
                    break

            if json_match:
                try:
                    return json.loads(json_match)
                except json.JSONDecodeError:
                    pass

            return {"error": "Failed to parse JSON response", "raw_content": content}

    def get_status(self) -> Dict[str, Any]:
        status = {
            "backend": self.backend,
            "available": self.is_available()
        }
        if self.backend == "openai":
            status["model"] = self.model
            status["base_url"] = self.base_url
            status["api_key_set"] = bool(self.api_key)
        elif self.backend == "ollama":
            status["model"] = Config.OLLAMA_MODEL
            status["base_url"] = Config.OLLAMA_BASE_URL
        return status
