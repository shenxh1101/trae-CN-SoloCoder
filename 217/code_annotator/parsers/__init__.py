from .base import BaseParser
from .python_parser import PythonParser
from .javascript_parser import JavaScriptParser
from .java_parser import JavaParser
from .. import ParseResult


class ParserFactory:
    _parsers = {
        'python': PythonParser,
        'javascript': JavaScriptParser,
        'java': JavaParser,
    }

    _extensions = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.java': 'java',
    }

    @classmethod
    def get_parser(cls, language: str = None, file_path: str = None) -> BaseParser:
        if language:
            lang = language.lower()
        elif file_path:
            import os
            ext = os.path.splitext(file_path)[1].lower()
            lang = cls._extensions.get(ext)
            if not lang:
                raise ValueError(f"Unsupported file extension: {ext}")
        else:
            raise ValueError("Must provide either language or file_path")

        parser_class = cls._parsers.get(lang)
        if not parser_class:
            raise ValueError(f"Unsupported language: {lang}")

        return parser_class()

    @classmethod
    def get_language_from_file(cls, file_path: str) -> str:
        import os
        ext = os.path.splitext(file_path)[1].lower()
        return cls._extensions.get(ext)

    @classmethod
    def is_supported(cls, file_path: str) -> bool:
        import os
        ext = os.path.splitext(file_path)[1].lower()
        return ext in cls._extensions
