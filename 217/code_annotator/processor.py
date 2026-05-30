import os
from typing import Optional, List
from . import CodeBlock, ParseResult, CodeBlockType
from .parsers import ParserFactory
from .formatters import FormatterFactory
from .ai_backend import AIBackend, AIServiceError
from .template import TemplateEngine


class AnnotationResult:
    def __init__(self, file_path: str, original_code: str, annotated_code: str,
                 blocks_processed: int, comments_added: int, comment_lines: int,
                 language: str, ai_error: str = None):
        self.file_path = file_path
        self.original_code = original_code
        self.annotated_code = annotated_code
        self.blocks_processed = blocks_processed
        self.comments_added = comments_added
        self.comment_lines = comment_lines
        self.language = language
        self.ai_error = ai_error


class Processor:
    def __init__(self, style: str = None, language: str = "en", comment_lang: str = "en",
                 api_url: str = None, api_key: str = None, model: str = None,
                 backend_type: str = "openai", template: str = None,
                 template_file: str = None, author: str = None, date: str = None,
                 skip_commented: bool = True):
        self.style = style
        self.language = language
        self.comment_lang = comment_lang
        self.skip_commented = skip_commented
        self.author = author
        self.date = date
        self.backend_type = backend_type

        if template_file and os.path.exists(template_file):
            self.template = TemplateEngine.load_template_from_file(template_file)
        else:
            self.template = template

        self.ai = AIBackend(
            api_url=api_url,
            api_key=api_key,
            model=model,
            language=comment_lang,
            backend_type=backend_type,
        )

    def process_file(self, file_path: str, output_path: str = None) -> Optional[AnnotationResult]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(file_path, 'r', encoding='utf-8') as f:
            source_code = f.read()

        result = self.process_code(source_code, file_path)

        if output_path:
            os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(result.annotated_code)

        return result

    def process_code(self, source_code: str, file_path: str = "") -> AnnotationResult:
        detected_lang = ParserFactory.get_language_from_file(file_path) if file_path else self.language
        language = detected_lang or self.language or "python"

        parser = ParserFactory.get_parser(language=language, file_path=file_path)
        parse_result = parser.parse(source_code, file_path)

        style = self.style or FormatterFactory.get_default_style(language)
        formatter = FormatterFactory.get_formatter(style=style, language=language)

        blocks_to_annotate = []
        if self.skip_commented:
            blocks_to_annotate = [b for b in parse_result.blocks if not b.has_comment]
        else:
            blocks_to_annotate = parse_result.blocks

        annotated_lines = list(parse_result.lines)
        comments_added = 0
        comment_lines_total = 0
        offset = 0

        ai_error = None
        for block in blocks_to_annotate:
            try:
                description = self.ai.generate_comment(block)
            except AIServiceError as e:
                ai_error = str(e)
                break

            comment = formatter.format(
                block, description, lang=self.comment_lang,
                template=self.template, author=self.author, date=self.date,
            )

            insert_line = block.start_line + offset

            if block.block_type == CodeBlockType.COMPLEX_LOGIC:
                annotated_lines.insert(insert_line, comment)
                offset += 1
                comment_lines_total += 1
            else:
                comment_lines = comment.split('\n')
                for i, cl in enumerate(comment_lines):
                    annotated_lines.insert(insert_line + i, cl)
                offset += len(comment_lines)
                comment_lines_total += len(comment_lines)

            comments_added += 1

        annotated_code = '\n'.join(annotated_lines)

        return AnnotationResult(
            file_path=file_path,
            original_code=source_code,
            annotated_code=annotated_code,
            blocks_processed=len(blocks_to_annotate),
            comments_added=comments_added,
            comment_lines=comment_lines_total,
            language=language,
            ai_error=ai_error,
        )
