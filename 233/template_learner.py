import json
from pathlib import Path
from typing import Dict, Any
from llm_client import LLMClient
from prompts import build_template_analysis_prompt
from config import Config


class TemplateLearner:
    def __init__(self):
        self.llm = LLMClient()
        Config.ensure_dirs()
    
    def analyze_template(self, template_content: str) -> Dict[str, Any]:
        prompt = build_template_analysis_prompt(template_content)
        return self.llm.generate_json(prompt, "你是一位文档结构分析专家。")
    
    def analyze_template_file(self, template_path: str) -> Dict[str, Any]:
        template_path = Path(template_path)
        if not template_path.exists():
            raise FileNotFoundError(f"模板文件不存在: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return self.analyze_template(content)
    
    def save_template_analysis(self, analysis: Dict[str, Any], template_name: str) -> str:
        output_path = Config.TEMPLATE_DIR / f"{template_name}_analysis.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2)
        return str(output_path)
    
    def load_template_analysis(self, template_name: str) -> Dict[str, Any]:
        template_path = Config.TEMPLATE_DIR / f"{template_name}_analysis.json"
        if not template_path.exists():
            raise FileNotFoundError(f"模板分析文件不存在: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def list_templates(self) -> list:
        templates = []
        if Config.TEMPLATE_DIR.exists():
            for f in Config.TEMPLATE_DIR.glob("*_analysis.json"):
                templates.append(f.stem.replace('_analysis', ''))
        return templates
    
    def create_sample_template(self, template_name: str = "default") -> str:
        sample_analysis = {
            "structure": [
                {
                    "title": "产品概述",
                    "content_type": "introduction",
                    "key_points": ["产品定位", "核心价值", "目标用户", "主要特点"]
                },
                {
                    "title": "规格参数",
                    "content_type": "specifications",
                    "key_points": ["技术参数表格", "物理参数", "性能指标", "环境要求"]
                },
                {
                    "title": "功能详解",
                    "content_type": "features",
                    "key_points": ["每个功能的详细说明", "使用场景", "技术优势"]
                },
                {
                    "title": "使用注意事项",
                    "content_type": "precautions",
                    "key_points": ["安全注意事项", "使用限制", "维护建议", "常见问题"]
                },
                {
                    "title": "包装清单",
                    "content_type": "packing",
                    "key_points": ["产品主体", "配件列表", "文档资料"]
                }
            ],
            "style": "professional",
            "tone": "正式、专业、严谨",
            "key_elements": ["数据准确", "结构清晰", "术语规范", "逻辑严谨"],
            "writing_tips": ["使用专业术语", "数据精确到小数点后两位", "采用正式书面语", "避免口语化表达"]
        }
        
        return self.save_template_analysis(sample_analysis, template_name)
