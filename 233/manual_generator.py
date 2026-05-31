import json
from typing import List, Dict, Any, Optional
from pathlib import Path
from llm_client import LLMClient
from prompts import SYSTEM_PROMPTS, build_manual_prompt, build_slogan_prompt, build_revision_prompt
from config import Config


class ProductManual:
    def __init__(self, product_name: str, features: List[str], positioning: str,
                 style: str = "professional", language: str = "zh"):
        self.product_name = product_name
        self.features = features
        self.positioning = positioning
        self.style = style
        self.language = language
        self.content = ""
        self.sections = {}
        self.slogan = ""
        self.metadata = {
            "product_name": product_name,
            "features": features,
            "positioning": positioning,
            "style": style,
            "language": language
        }
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "metadata": self.metadata,
            "content": self.content,
            "sections": self.sections,
            "slogan": self.slogan
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProductManual':
        manual = cls(
            product_name=data["metadata"]["product_name"],
            features=data["metadata"]["features"],
            positioning=data["metadata"]["positioning"],
            style=data["metadata"]["style"],
            language=data["metadata"]["language"]
        )
        manual.content = data["content"]
        manual.sections = data["sections"]
        manual.slogan = data["slogan"]
        return manual


class ManualGenerator:
    def __init__(self):
        self.llm = LLMClient()
        Config.ensure_dirs()
    
    def generate(self, product_name: str, features: List[str], positioning: str,
                 style: str = "professional", language: str = "zh",
                 template_structure: Dict = None) -> ProductManual:
        manual = ProductManual(product_name, features, positioning, style, language)
        
        system_prompt = SYSTEM_PROMPTS.get(style, SYSTEM_PROMPTS["professional"])
        prompt = build_manual_prompt(product_name, features, positioning, style, language, template_structure)
        
        print(f"正在生成 {product_name} 的产品说明书...")
        manual.content = self.llm.generate(prompt, system_prompt)
        
        manual.sections = self._parse_sections(manual.content)
        manual.slogan = self.generate_slogan(product_name, features, positioning, language, style)
        
        return manual
    
    def generate_slogan(self, product_name: str, features: List[str], positioning: str,
                        language: str = "zh", style: str = "marketing") -> str:
        prompt = build_slogan_prompt(product_name, features, positioning, language, style)
        return self.llm.generate(prompt, SYSTEM_PROMPTS.get(style, SYSTEM_PROMPTS["marketing"]))
    
    def revise(self, manual: ProductManual, revision_suggestions: str, 
               section: str = None) -> ProductManual:
        if section and section in manual.sections:
            original_content = manual.sections[section]
        else:
            original_content = manual.content
        
        prompt = build_revision_prompt(original_content, revision_suggestions, section, 
                                       manual.style, manual.language)
        system_prompt = SYSTEM_PROMPTS.get(manual.style, SYSTEM_PROMPTS["professional"])
        
        revised_content = self.llm.generate(prompt, system_prompt)
        
        if section and section in manual.sections:
            manual.sections[section] = revised_content
            manual.content = self._rebuild_content(manual.sections)
        else:
            manual.content = revised_content
            manual.sections = self._parse_sections(revised_content)
        
        return manual
    
    def _parse_sections(self, content: str) -> Dict[str, str]:
        sections = {}
        lines = content.split('\n')
        current_section = "overview"
        current_content = []
        
        section_patterns = {
            "overview": ["产品概述", "概述", "简介", "产品简介"],
            "specifications": ["规格参数", "技术参数", "参数", "技术规格"],
            "features": ["功能详解", "功能介绍", "核心功能", "产品功能"],
            "precautions": ["使用注意事项", "注意事项", "安全须知", "使用说明"],
            "packing_list": ["包装清单", "装箱清单", "包装内容"]
        }
        
        for line in lines:
            line_stripped = line.strip().lstrip('#').strip()
            found_section = False
            
            for section_key, keywords in section_patterns.items():
                for keyword in keywords:
                    if keyword in line_stripped and len(line_stripped) < 50:
                        if current_section and current_content:
                            sections[current_section] = '\n'.join(current_content).strip()
                        current_section = section_key
                        current_content = []
                        found_section = True
                        break
                if found_section:
                    break
            
            if not found_section:
                current_content.append(line)
        
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections
    
    def _rebuild_content(self, sections: Dict[str, str]) -> str:
        content_parts = []
        section_titles = {
            "overview": "产品概述",
            "specifications": "规格参数",
            "features": "功能详解",
            "precautions": "使用注意事项",
            "packing_list": "包装清单"
        }
        
        for section_key, title in section_titles.items():
            if section_key in sections:
                content_parts.append(f"# {title}\n\n{sections[section_key]}")
        
        return '\n\n'.join(content_parts)
    
    def save_manual(self, manual: ProductManual, output_path: str = None, 
                    format: str = "markdown") -> str:
        if format not in Config.SUPPORTED_FORMATS:
            raise ValueError(f"不支持的格式: {format}")
        
        if output_path is None:
            safe_name = manual.product_name.replace(' ', '_').replace('/', '_')
            output_path = Config.OUTPUT_DIR / f"{safe_name}.{self._get_format_extension(format)}"
        else:
            output_path = Path(output_path)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        content = self._format_content(manual, format)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return str(output_path)
    
    def _get_format_extension(self, format: str) -> str:
        extensions = {
            "markdown": "md",
            "html": "html",
            "text": "txt"
        }
        return extensions.get(format, "md")
    
    def _format_content(self, manual: ProductManual, format: str) -> str:
        if format == "markdown":
            return self._to_markdown(manual)
        elif format == "html":
            return self._to_html(manual)
        elif format == "text":
            return self._to_text(manual)
        return manual.content
    
    def _to_markdown(self, manual: ProductManual) -> str:
        md_content = f"# {manual.product_name} 产品说明书\n\n"
        if manual.slogan:
            md_content += f"> {manual.slogan}\n\n"
        md_content += f"**产品定位**: {manual.positioning}\n\n"
        md_content += "---\n\n"
        md_content += manual.content
        return md_content
    
    def _to_html(self, manual: ProductManual) -> str:
        import markdown
        md_content = self._to_markdown(manual)
        html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
        
        html_template = f"""<!DOCTYPE html>
<html lang="{manual.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{manual.product_name} - 产品说明书</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }}
        h1, h2, h3 {{ color: #333; }}
        h1 {{ border-bottom: 2px solid #007AFF; padding-bottom: 0.5rem; }}
        blockquote {{ border-left: 4px solid #007AFF; margin: 1rem 0; padding-left: 1rem; color: #666; font-style: italic; }}
        table {{ border-collapse: collapse; width: 100%; margin: 1rem 0; }}
        th, td {{ border: 1px solid #ddd; padding: 0.5rem; text-align: left; }}
        th {{ background-color: #f5f5f5; }}
    </style>
</head>
<body>
{html_content}
</body>
</html>"""
        return html_template
    
    def _to_text(self, manual: ProductManual) -> str:
        import re
        text = f"{manual.product_name} 产品说明书\n"
        text += "=" * 50 + "\n\n"
        if manual.slogan:
            text += f"{manual.slogan}\n\n"
        text += f"产品定位: {manual.positioning}\n\n"
        text += "-" * 50 + "\n\n"
        
        content = manual.content
        content = re.sub(r'^#{1,6}\s*', '', content, flags=re.MULTILINE)
        content = re.sub(r'\*\*(.*?)\*\*', r'\1', content)
        content = re.sub(r'\*(.*?)\*', r'\1', content)
        
        text += content
        return text
