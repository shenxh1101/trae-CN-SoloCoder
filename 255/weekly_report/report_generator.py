from typing import Dict, List, Optional
from datetime import datetime
from .llm_client import LLMClient
from .config import Config


class ReportGenerator:
    def __init__(self, llm_client: LLMClient, config: Config):
        self.llm = llm_client
        self.config = config

    def generate(self, work_items: List[str], style: str = "detailed", 
                 user_name: str = "", extra_context: str = "") -> Dict:
        sections = self.config.report_sections
        time_categories = self.config.time_categories
        
        system_prompt = f"""你是一个专业的周报撰写助手。请根据用户提供的工作要点，生成一份结构清晰、内容详实的周报。
周报风格：{'详细版，需要展开描述每个工作项的细节、成果和影响' if style == 'detailed' else '简要版，简洁明了，突出重点'}
语气：专业、正式
"""
        
        prompt = f"""请根据以下工作要点生成周报：

工作要点：
{chr(10).join([f'- {item}' for item in work_items])}

{f"额外上下文：{extra_context}" if extra_context else ""}
{f"报告人：{user_name}" if user_name else ""}
日期：{datetime.now().strftime("%Y年%m月%d日")}

请按照以下章节结构生成：
{chr(10).join([f'{i+1}. {section}' for i, section in enumerate(sections)])}

同时，请分析各项工作所属类别并估算耗时占比，类别包括：{', '.join(time_categories)}

另外，请从下周计划中提取可执行的待办事项列表。

请以JSON格式返回，结构如下：
{{
    "title": "周报标题",
    "date": "日期",
    "author": "报告人",
    "sections": {{
        "本周完成": ["内容项1", "内容项2"...],
        "进行中工作": ["内容项1"...],
        "遇到的问题": ["内容项1"...],
        "下周计划": ["内容项1"...]
    }},
    "time_analysis": {{
        "开发": 60,
        "会议": 20,
        ...
    }},
    "todo_list": [
        {{"task": "任务描述", "priority": "high/medium/low"}},
        ...
    ],
    "summary": "本周工作总结"
}}
"""
        
        result = self.llm.generate_structured(prompt, system_prompt)
        
        if "sections" not in result:
            result["sections"] = {s: [] for s in sections}
        if "time_analysis" not in result:
            result["time_analysis"] = {}
        if "todo_list" not in result:
            result["todo_list"] = []
        if "date" not in result:
            result["date"] = datetime.now().strftime("%Y年%m月%d日")
        if "author" not in result:
            result["author"] = user_name
        
        return result

    def generate_from_git_log(self, git_log: str, style: str = "detailed", 
                              user_name: str = "") -> Dict:
        system_prompt = "你是一个专业的代码提交分析助手，能够从git commit日志中提取工作要点并生成周报。"
        
        prompt = f"""请分析以下git commit日志，提取本周的主要工作内容：

{git_log}

请先提取关键工作要点，然后生成周报。

工作要点提取要求：
1. 合并相似的提交
2. 提炼出有意义的工作项
3. 区分功能开发、bug修复、优化等不同类型

然后按照正常周报格式生成。
"""
        
        result = self.llm.generate_structured(prompt, system_prompt)
        
        if "sections" not in result:
            sections = self.config.report_sections
            result["sections"] = {s: [] for s in sections}
        if "time_analysis" not in result:
            result["time_analysis"] = {}
        if "todo_list" not in result:
            result["todo_list"] = []
        if "date" not in result:
            result["date"] = datetime.now().strftime("%Y年%m月%d日")
        if "author" not in result:
            result["author"] = user_name
        
        return result

    def enhance_with_preferences(self, report: Dict, preferences: Dict) -> Dict:
        tone = preferences.get("tone", "professional")
        detail_level = preferences.get("detail_level", "detailed")
        
        if not report.get("sections"):
            return report
        
        system_prompt = f"请根据用户偏好调整周报内容。语气：{tone}，详细程度：{detail_level}"
        
        sections_text = "\n".join([
            f"[{k}]\n{chr(10).join(v)}" for k, v in report["sections"].items()
        ])
        
        prompt = f"""请优化以下周报内容：

原报告：
{sections_text}

请保持原有结构，但根据偏好调整内容的详细程度和语气。
返回JSON格式，结构为：
{{
    "sections": {{
        "本周完成": ["..."],
        ...
    }}
}}
"""
        
        try:
            enhanced = self.llm.generate_structured(prompt, system_prompt)
            if "sections" in enhanced:
                report["sections"] = enhanced["sections"]
        except Exception:
            pass
        
        return report
