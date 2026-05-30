from abc import ABC, abstractmethod
from .. import CodeBlock, CodeBlockType


class BaseFormatter(ABC):
    @abstractmethod
    def format(self, block: CodeBlock, description: str, lang: str = "en") -> str:
        pass

    @abstractmethod
    def get_style_name(self) -> str:
        pass

    def _build_param_descriptions(self, params: list, description: str) -> dict:
        param_descs = {}
        for p in params:
            param_descs[p] = ""
        return param_descs

    def _format_date(self, date_str: str = None) -> str:
        from datetime import datetime
        if date_str:
            return date_str
        return datetime.now().strftime("%Y-%m-%d")
