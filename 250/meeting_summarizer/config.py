import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    TTS_ENGINE = os.getenv("TTS_ENGINE", "gtts")
    LANGUAGE = os.getenv("LANGUAGE", "zh-CN")
    TEMPERATURE = float(os.getenv("TEMPERATURE", "0.1"))
    MAX_TOKENS = int(os.getenv("MAX_TOKENS", "4000"))

    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

    LLM_BACKEND = os.getenv("LLM_BACKEND", "auto")

    @classmethod
    def is_llm_available(cls) -> bool:
        if cls.LLM_BACKEND == "ollama":
            return True
        return bool(cls.OPENAI_API_KEY)

    @classmethod
    def detect_llm_backend(cls) -> str:
        if cls.LLM_BACKEND != "auto":
            return cls.LLM_BACKEND

        if cls.OPENAI_API_KEY:
            return "openai"

        try:
            import urllib.request
            req = urllib.request.Request(f"{cls.OLLAMA_BASE_URL}/api/tags", method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    return "ollama"
        except Exception:
            pass

        return "none"
