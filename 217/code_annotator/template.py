from . import CodeBlock, CodeBlockType
from datetime import datetime


class TemplateEngine:
    BUILTIN_TEMPLATES = {
        'docstring': '''"""{description}

{params_section}{returns_section}{meta_section}
"""''',

        'jsdoc': '''/**
 * {description}
{params_section}{returns_section}{meta_section}
 */''',

        'javadoc': '''/**
 * {description}
{params_section}{returns_section}{meta_section}
 */''',
    }

    def render(self, template_str: str, block: CodeBlock, description: str,
               lang: str = "en", author: str = None, date: str = None) -> str:
        indent = block.indent
        if block.block_type not in (CodeBlockType.COMPLEX_LOGIC,) and block.block_type != CodeBlockType.CLASS:
            if block.language == "python":
                indent = block.indent + "    "

        params_section = self._render_params(template_str, block, indent, lang)
        returns_section = self._render_returns(template_str, block, indent, lang)
        meta_section = self._render_meta(template_str, block, indent, author, date)

        result = template_str
        result = result.replace('{description}', description)
        result = result.replace('{name}', block.name)
        result = result.replace('{params_section}', params_section)
        result = result.replace('{returns_section}', returns_section)
        result = result.replace('{meta_section}', meta_section)
        result = result.replace('{author}', author or '')
        result = result.replace('{date}', date or datetime.now().strftime("%Y-%m-%d"))
        result = result.replace('{indent}', indent)

        if block.parent_class:
            result = result.replace('{parent_class}', block.parent_class)

        result = '\n'.join(line for line in result.split('\n'))
        return result

    def _render_params(self, template_str: str, block: CodeBlock, indent: str, lang: str) -> str:
        if not block.params:
            return ""

        style = self._detect_style(template_str)
        lines = []

        if style == 'docstring':
            if lang == "zh":
                lines.append(f'{indent}参数:')
            else:
                lines.append(f'{indent}Args:')
            for param in block.params:
                param_name = param.split(':')[0].strip() if ':' in param else param
                lines.append(f'{indent}    {param_name}: ')
        elif style == 'jsdoc':
            for param in block.params:
                param_name = param.split('=')[0].strip()
                lines.append(f'{indent} * @param {{*}} {param_name} -')
        elif style == 'javadoc':
            for param in block.params:
                lines.append(f'{indent} * @param {param} -')

        return '\n'.join(lines)

    def _render_returns(self, template_str: str, block: CodeBlock, indent: str, lang: str) -> str:
        if not block.return_type:
            return ""

        style = self._detect_style(template_str)
        lines = []

        if style == 'docstring':
            if lang == "zh":
                lines.append(f'{indent}返回:')
                lines.append(f'{indent}    {block.return_type}: ')
            else:
                lines.append(f'{indent}Returns:')
                lines.append(f'{indent}    {block.return_type}: ')
        elif style == 'jsdoc':
            lines.append(f'{indent} * @returns {{{block.return_type}}} -')
        elif style == 'javadoc':
            lines.append(f'{indent} * @return {block.return_type} -')

        return '\n'.join(lines)

    def _render_meta(self, template_str: str, block: CodeBlock, indent: str,
                     author: str = None, date: str = None) -> str:
        lines = []
        style = self._detect_style(template_str)

        if not author and not date:
            return ""

        if style == 'docstring':
            if author:
                lines.append(f'{indent}Author: {author}')
            if date:
                lines.append(f'{indent}Date: {date or datetime.now().strftime("%Y-%m-%d")}')
        elif style in ('jsdoc', 'javadoc'):
            if author:
                lines.append(f'{indent} * @author {author}')
            if date:
                tag = '@since' if style == 'javadoc' else '@date'
                lines.append(f'{indent} * {tag} {date or datetime.now().strftime("%Y-%m-%d")}')

        return '\n'.join(lines)

    def _detect_style(self, template_str: str) -> str:
        if '/**' in template_str and '@param' in template_str:
            if '@return' in template_str:
                return 'javadoc'
            return 'jsdoc'
        if '"""' in template_str or "'''" in template_str:
            return 'docstring'
        return 'docstring'

    @classmethod
    def load_template_from_file(cls, file_path: str) -> str:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
