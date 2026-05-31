import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class LLMConfig(BaseModel):
    api_key: str = os.getenv("OPENAI_API_KEY", "")
    api_base: str = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    model: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    temperature: float = 0.7


class AppConfig(BaseModel):
    llm: LLMConfig = LLMConfig()
    default_count: int = 10
    feedback_file: str = ".feedback_history.json"
    style_file: str = ".style_preferences.json"

    @property
    def is_mock_mode(self) -> bool:
        return not bool(self.llm.api_key and self.llm.api_key != "your_api_key_here")


config = AppConfig()
