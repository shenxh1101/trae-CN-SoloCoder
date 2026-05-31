import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()


class Config:
    BASE_DIR = Path(__file__).parent
    TEMPLATE_DIR = BASE_DIR / os.getenv("TEMPLATE_DIR", "templates")
    OUTPUT_DIR = BASE_DIR / os.getenv("OUTPUT_DIR", "output")
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4")
    
    DEFAULT_OUTPUT_FORMAT = os.getenv("DEFAULT_OUTPUT_FORMAT", "markdown")
    DEFAULT_LANGUAGE = os.getenv("DEFAULT_LANGUAGE", "zh")
    DEFAULT_STYLE = os.getenv("DEFAULT_STYLE", "professional")
    
    SUPPORTED_FORMATS = ["markdown", "html", "text"]
    SUPPORTED_LANGUAGES = ["zh", "en"]
    SUPPORTED_STYLES = ["professional", "simple", "marketing"]
    
    @classmethod
    def ensure_dirs(cls):
        cls.TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
        cls.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
