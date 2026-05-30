import json
import time
import logging
from typing import Dict, List, Any, Optional
from config import Config

try:
    from openai import OpenAI, APIError, APIConnectionError, RateLimitError, APITimeoutError
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    APIError = Exception
    APIConnectionError = Exception
    RateLimitError = Exception
    APITimeoutError = Exception

logger = logging.getLogger(__name__)


class LLMClient:
    DEFAULT_TIMEOUT = 60
    DEFAULT_MAX_RETRIES = 3
    RETRY_DELAYS = [2, 5, 10]

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None,
                 base_url: Optional[str] = None, timeout: int = None,
                 max_retries: int = None):
        self.api_key = api_key or Config.OPENAI_API_KEY
        self.model = model or Config.OPENAI_MODEL
        self.base_url = base_url or Config.OPENAI_BASE_URL
        self.timeout = timeout or self.DEFAULT_TIMEOUT
        self.max_retries = max_retries if max_retries is not None else self.DEFAULT_MAX_RETRIES
        self.client = None
        self._last_error = None

        if OPENAI_AVAILABLE and self.api_key:
            self._init_openai_client()

    def _init_openai_client(self):
        try:
            kwargs = {
                "api_key": self.api_key,
                "timeout": self.timeout,
                "max_retries": 0,
            }
            if self.base_url:
                kwargs["base_url"] = self.base_url
            self.client = OpenAI(**kwargs)
            logger.info(f"LLM客户端初始化成功: model={self.model}, base_url={self.base_url or 'default'}")
        except Exception as e:
            self.client = None
            self._last_error = str(e)
            logger.error(f"LLM客户端初始化失败: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def get_last_error(self) -> Optional[str]:
        return self._last_error

    def _call_with_retry(self, func, *args, **kwargs):
        last_exception = None

        for attempt in range(self.max_retries + 1):
            try:
                return func(*args, **kwargs)
            except RateLimitError as e:
                last_exception = e
                if attempt < self.max_retries:
                    delay = self.RETRY_DELAYS[min(attempt, len(self.RETRY_DELAYS) - 1)]
                    logger.warning(f"API限流，{delay}秒后重试 (第{attempt + 1}次)...")
                    print(f"  ⚠ API限流，{delay}秒后重试 (第{attempt + 1}/{self.max_retries}次)...")
                    time.sleep(delay)
                else:
                    logger.error(f"API限流，已达最大重试次数({self.max_retries})")
            except APITimeoutError as e:
                last_exception = e
                if attempt < self.max_retries:
                    delay = self.RETRY_DELAYS[min(attempt, len(self.RETRY_DELAYS) - 1)]
                    logger.warning(f"API超时，{delay}秒后重试 (第{attempt + 1}次)...")
                    print(f"  ⚠ API超时，{delay}秒后重试 (第{attempt + 1}/{self.max_retries}次)...")
                    time.sleep(delay)
                else:
                    logger.error(f"API超时，已达最大重试次数({self.max_retries})")
            except APIConnectionError as e:
                last_exception = e
                if attempt < self.max_retries:
                    delay = self.RETRY_DELAYS[min(attempt, len(self.RETRY_DELAYS) - 1)]
                    logger.warning(f"API连接失败: {e}，{delay}秒后重试...")
                    print(f"  ⚠ API连接失败，{delay}秒后重试 (第{attempt + 1}/{self.max_retries}次)...")
                    time.sleep(delay)
                else:
                    logger.error(f"API连接失败，已达最大重试次数({self.max_retries}): {e}")
            except APIError as e:
                status_code = getattr(e, 'status_code', None)
                if status_code == 401:
                    self._last_error = f"API Key无效或已过期 (HTTP {status_code})"
                    logger.error(self._last_error)
                    raise LLMCallError(self._last_error, original_error=e)
                elif status_code == 402:
                    self._last_error = f"API余额不足 (HTTP {status_code})"
                    logger.error(self._last_error)
                    raise LLMCallError(self._last_error, original_error=e)
                elif status_code and 400 <= status_code < 500:
                    self._last_error = f"API请求错误 (HTTP {status_code}): {e}"
                    logger.error(self._last_error)
                    raise LLMCallError(self._last_error, original_error=e)
                elif status_code and status_code >= 500:
                    last_exception = e
                    if attempt < self.max_retries:
                        delay = self.RETRY_DELAYS[min(attempt, len(self.RETRY_DELAYS) - 1)]
                        logger.warning(f"API服务端错误 (HTTP {status_code})，{delay}秒后重试...")
                        print(f"  ⚠ API服务端错误，{delay}秒后重试 (第{attempt + 1}/{self.max_retries}次)...")
                        time.sleep(delay)
                    else:
                        self._last_error = f"API服务端错误，已达最大重试次数: {e}"
                        logger.error(self._last_error)
                else:
                    self._last_error = f"API错误: {e}"
                    logger.error(self._last_error)
                    raise LLMCallError(self._last_error, original_error=e)
            except json.JSONDecodeError as e:
                self._last_error = f"API响应JSON解析失败: {e}"
                logger.error(self._last_error)
                raise LLMCallError(self._last_error, original_error=e)
            except Exception as e:
                self._last_error = f"未知错误: {e}"
                logger.error(self._last_error)
                raise LLMCallError(self._last_error, original_error=e)

        error_msg = f"API调用失败，已达最大重试次数({self.max_retries}): {last_exception}"
        self._last_error = error_msg
        raise LLMCallError(error_msg, original_error=last_exception)

    def chat_completion(self, messages: List[Dict[str, str]],
                       temperature: float = 0.3,
                       max_tokens: int = 2000) -> str:
        if not self.is_available():
            raise LLMCallError("LLM客户端未初始化，请检查API Key配置")

        def _do_call():
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content.strip()

        return self._call_with_retry(_do_call)

    def chat_completion_with_json(self, messages: List[Dict[str, str]],
                                  temperature: float = 0.2,
                                  max_tokens: int = 3000) -> Dict[str, Any]:
        if not self.is_available():
            raise LLMCallError("LLM客户端未初始化，请检查API Key配置")

        def _do_call():
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content.strip()
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"raw_content": content, "_parse_warning": "响应不是有效JSON，已保留原始内容"}

        return self._call_with_retry(_do_call)


class LLMCallError(Exception):
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.original_error = original_error


class BaseLLMService:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    def _build_system_prompt(self) -> str:
        raise NotImplementedError

    def _build_user_prompt(self, *args, **kwargs) -> str:
        raise NotImplementedError

    def execute(self, *args, **kwargs) -> Any:
        raise NotImplementedError
