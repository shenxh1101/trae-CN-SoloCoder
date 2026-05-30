"""
LLM调用模块 - 处理与语言模型的交互
"""

import os
import sys
import json
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from dotenv import load_dotenv
import yaml

load_dotenv()


@dataclass
class LLMConfig:
    api_key: str
    base_url: str
    model: str
    temperature: float = 0.8


class LLMClient:
    def __init__(self, config_path: Optional[str] = None, test_connection: bool = True):
        self.config = self._load_config(config_path)
        self.client = self._init_client()
        if test_connection:
            self._test_connection()

    def _load_config(self, config_path: Optional[str]) -> LLMConfig:
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        temperature = 0.8
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                yaml_config = yaml.safe_load(f)
                temperature = yaml_config.get('defaults', {}).get('temperature', 0.8)

        return LLMConfig(
            api_key=api_key,
            base_url=base_url,
            model=model,
            temperature=temperature
        )

    def _init_client(self):
        if OpenAI is None:
            print("\n❌ 错误：未安装 openai 库，请运行: pip install openai")
            sys.exit(1)

        if not self.config.api_key or self.config.api_key == "your_api_key_here":
            print("\n" + "=" * 60)
            print("❌ 错误：未配置有效的 OPENAI_API_KEY")
            print("=" * 60)
            print("\n请按以下步骤配置API：")
            print("\n  方式1：运行配置向导")
            print('    python configure_api.py setup')
            print("\n  方式2：手动创建 .env 文件")
            print('    在项目根目录创建 .env 文件，内容如下：')
            print('    OPENAI_API_KEY=sk-your-actual-api-key')
            print('    OPENAI_BASE_URL=https://api.openai.com/v1  (可选)')
            print('    OPENAI_MODEL=gpt-4o-mini  (可选)')
            print("\n  方式3：设置系统环境变量")
            print('    export OPENAI_API_KEY=sk-your-actual-api-key')
            print("\n获取API密钥：https://platform.openai.com/api-keys")
            print("=" * 60 + "\n")
            sys.exit(1)

        return OpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url
        )

    def _test_connection(self) -> bool:
        print(f"  正在验证API连接... (模型: {self.config.model})")
        try:
            response = self.client.chat.completions.create(
                model=self.config.model,
                messages=[{"role": "user", "content": "请回复'ok'"}],
                max_tokens=5,
                temperature=0,
                timeout=30
            )
            content = response.choices[0].message.content.strip()
            print(f"  ✓ API连接验证成功，响应: {content}")
            return True
        except Exception as e:
            print("\n" + "=" * 60)
            print("❌ API连接验证失败")
            print("=" * 60)
            print(f"\n错误信息: {e}")
            print("\n可能的原因和解决方法：")

            error_str = str(e).lower()
            if "api key" in error_str or "unauthorized" in error_str or "401" in error_str:
                print("  • API密钥无效或已过期")
                print("    请检查 .env 文件中的 OPENAI_API_KEY 是否正确")
            elif "connection" in error_str or "timeout" in error_str or "network" in error_str:
                print("  • 网络连接问题")
                print("    请检查网络连接，或配置正确的OPENAI_BASE_URL")
                print("    如果在中国大陆使用，可能需要配置代理或使用中转API")
            elif "model" in error_str or "404" in error_str:
                print(f"  • 模型 '{self.config.model}' 不可用")
                print("    请检查模型名称是否正确，或您的账户是否有权限使用该模型")
                print("    可用的模型: gpt-4o-mini, gpt-4o, gpt-3.5-turbo 等")
            elif "quota" in error_str or "rate" in error_str or "429" in error_str:
                print("  • API配额不足或速率限制")
                print("    请检查您的账户余额，或稍后再试")
            elif "insufficient" in error_str or "billing" in error_str:
                print("  • 账户余额不足")
                print("    请在OpenAI控制台充值后再试")

            print("\n运行配置向导重新配置: python configure_api.py setup")
            print("=" * 60 + "\n")
            sys.exit(1)

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        response_format: Optional[str] = None,
        max_retries: int = 3,
        show_progress: bool = True
    ) -> str:
        kwargs = {
            "model": self.config.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.config.temperature,
        }

        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}

        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                if show_progress and attempt == 1:
                    print(f"  正在调用LLM... (模型: {self.config.model})", flush=True)

                response = self.client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content

                if not content or not content.strip():
                    raise ValueError("LLM返回了空内容")

                if show_progress:
                    tokens_used = getattr(response.usage, 'total_tokens', 0)
                    if tokens_used:
                        print(f"  ✓ LLM调用完成，使用了 {tokens_used} tokens")

                return content

            except Exception as e:
                last_error = e
                if attempt < max_retries:
                    wait = attempt * 2
                    error_preview = str(e)[:50] + "..." if len(str(e)) > 50 else str(e)
                    print(f"  ⚠ 调用失败（第{attempt}/{max_retries}次），{wait}秒后重试... 错误: {error_preview}")
                    time.sleep(wait)
                else:
                    print(f"\n❌ LLM调用失败（已重试{max_retries}次）")
                    print(f"  错误: {e}")
                    print(f"  提示: 您可以运行 python configure_api.py test 来测试API连接")
                    raise RuntimeError(f"LLM调用失败: {e}") from last_error

    def get_config_status(self) -> Dict[str, Any]:
        return {
            "model": self.config.model,
            "base_url": self.config.base_url,
            "has_api_key": bool(self.config.api_key) and self.config.api_key != "your_api_key_here",
            "api_key_masked": self.config.api_key[:8] + "****" + self.config.api_key[-4:] if self.config.api_key else ""
        }
