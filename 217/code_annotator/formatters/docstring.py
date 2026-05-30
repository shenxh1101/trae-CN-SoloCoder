from .base import BaseFormatter
from .. import CodeBlock, CodeBlockType
from ..template import TemplateEngine


class DocstringFormatter(BaseFormatter):
    def get_style_name(self) -> str:
        return "docstring"

    def format(self, block: CodeBlock, description: str, lang: str = "en",
               template: str = None, author: str = None, date: str = None) -> str:
        indent = block.indent
        template_engine = TemplateEngine()

        if block.block_type == CodeBlockType.COMPLEX_LOGIC:
            return self._format_logic_comment(block, description, indent, lang)

        if template:
            return template_engine.render(template, block, description, lang, author=author, date=date)

        lines = []
        lines.append(f'{indent}"""')

        lines.append(f'{indent}{description}')

        if block.params:
            lines.append(f'{indent}')
            if lang == "zh":
                lines.append(f'{indent}参数:')
            else:
                lines.append(f'{indent}Args:')

            for param in block.params:
                param_name = param.split(':')[0].strip() if ':' in param else param
                param_type = param.split(':')[1].strip() if ':' in param else None
                if param_type:
                    if lang == "zh":
                        lines.append(f'{indent}    {param_name} ({param_type}): ')
                    else:
                        lines.append(f'{indent}    {param_name} ({param_type}): ')
                else:
                    lines.append(f'{indent}    {param_name}: ')

        if block.return_type:
            lines.append(f'{indent}')
            if lang == "zh":
                lines.append(f'{indent}返回:')
                lines.append(f'{indent}    {block.return_type}: ')
            else:
                lines.append(f'{indent}Returns:')
                lines.append(f'{indent}    {block.return_type}: ')

        if author or date:
            lines.append(f'{indent}')
            if author:
                lines.append(f'{indent}Author: {author}')
            if date:
                lines.append(f'{indent}Date: {self._format_date(date)}')

        lines.append(f'{indent}"""')
        return '\n'.join(lines)

    def _format_logic_comment(self, block: CodeBlock, description: str, indent: str, lang: str) -> str:
        return f'{indent}# {description}'
