from .base import BaseFormatter
from .. import CodeBlock, CodeBlockType
from ..template import TemplateEngine


class JavaDocFormatter(BaseFormatter):
    def get_style_name(self) -> str:
        return "javadoc"

    def format(self, block: CodeBlock, description: str, lang: str = "en",
               template: str = None, author: str = None, date: str = None) -> str:
        indent = block.indent
        template_engine = TemplateEngine()

        if block.block_type == CodeBlockType.COMPLEX_LOGIC:
            return self._format_logic_comment(block, description, indent, lang)

        if template:
            return template_engine.render(template, block, description, lang, author=author, date=date)

        lines = []
        lines.append(f'{indent}/**')
        lines.append(f'{indent} * {description}')
        lines.append(f'{indent} *')

        if block.params:
            for param in block.params:
                lines.append(f'{indent} * @param {param} -')

        if block.return_type:
            lines.append(f'{indent} * @return {block.return_type} -')

        if author:
            lines.append(f'{indent} * @author {author}')
        if date:
            lines.append(f'{indent} * @since {self._format_date(date)}')

        lines.append(f'{indent} */')
        return '\n'.join(lines)

    def _format_logic_comment(self, block: CodeBlock, description: str, indent: str, lang: str) -> str:
        return f'{indent}// {description}'
