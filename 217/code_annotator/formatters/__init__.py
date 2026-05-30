from .docstring import DocstringFormatter
from .jsdoc import JSDocFormatter
from .javadoc import JavaDocFormatter
from .base import BaseFormatter


class FormatterFactory:
    _formatters = {
        'docstring': DocstringFormatter,
        'jsdoc': JSDocFormatter,
        'javadoc': JavaDocFormatter,
    }

    _language_defaults = {
        'python': 'docstring',
        'javascript': 'jsdoc',
        'java': 'javadoc',
    }

    @classmethod
    def get_formatter(cls, style: str = None, language: str = None) -> BaseFormatter:
        if style:
            s = style.lower()
        elif language:
            s = cls._language_defaults.get(language.lower(), 'docstring')
        else:
            s = 'docstring'

        formatter_class = cls._formatters.get(s)
        if not formatter_class:
            raise ValueError(f"Unknown comment style: {s}. Available: {list(cls._formatters.keys())}")

        return formatter_class()

    @classmethod
    def get_default_style(cls, language: str) -> str:
        return cls._language_defaults.get(language.lower(), 'docstring')

    @classmethod
    def available_styles(cls):
        return list(cls._formatters.keys())
