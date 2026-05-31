import re
from typing import Dict, List, Optional
from collections import defaultdict


class WorkAnalyzer:
    CATEGORY_KEYWORDS = {
        "开发": ["开发", "编码", "实现", "修复", "debug", "改bug", "功能", "模块", "重构", "优化代码"],
        "会议": ["会议", "评审", "讨论", "对齐", "同步", "沟通会", "站会", "周会"],
        "设计": ["设计", "方案", "架构", "UI", "原型", "文档", "技术方案"],
        "测试": ["测试", "联调", "验收", "bug验证", "回归", "用例"],
        "沟通": ["沟通", "对接", "协调", "回复", "答疑", "咨询"],
        "学习": ["学习", "研究", "调研", "技术分享", "培训", "文档学习"],
        "其他": []
    }

    @staticmethod
    def analyze_time_distribution(work_items: List[str]) -> Dict[str, int]:
        category_scores = defaultdict(int)
        
        for item in work_items:
            item_lower = item.lower()
            matched = False
            
            for category, keywords in WorkAnalyzer.CATEGORY_KEYWORDS.items():
                for keyword in keywords:
                    if keyword.lower() in item_lower:
                        category_scores[category] += 1
                        matched = True
                        break
            
            if not matched:
                category_scores["其他"] += 1
        
        total = sum(category_scores.values()) if category_scores else 1
        
        result = {}
        for category, score in category_scores.items():
            if score > 0:
                percentage = round((score / total) * 100)
                result[category] = percentage
        
        if not result:
            return {"开发": 100}
        
        total_pct = sum(result.values())
        if total_pct != 100:
            diff = 100 - total_pct
            max_category = max(result.items(), key=lambda x: x[1])[0]
            result[max_category] += diff
        
        return result

    @staticmethod
    def extract_todos(sections: Dict[str, List[str]]) -> List[Dict]:
        todos = []
        
        next_plan_sections = ["下周计划", "下周工作", "后续计划", "待办", "下一步"]
        
        for section_name, items in sections.items():
            is_next_plan = any(keyword in section_name for keyword in next_plan_sections)
            
            for item in items:
                todo_item = WorkAnalyzer._parse_todo_item(item)
                if todo_item:
                    if is_next_plan:
                        todo_item["priority"] = WorkAnalyzer._assess_priority(item, is_high=True)
                    else:
                        if any(keyword in item for keyword in ["需要", "待", "计划", "准备", "将要", "后续"]):
                            todo_item["priority"] = WorkAnalyzer._assess_priority(item)
                        else:
                            continue
                    todos.append(todo_item)
        
        return todos

    @staticmethod
    def _parse_todo_item(text: str) -> Optional[Dict]:
        text = text.strip()
        
        patterns_to_remove = [
            r'^[-*•]\s*',
            r'^\d+[.、)]\s*',
            r'^\[[ xX]\]\s*',
        ]
        
        for pattern in patterns_to_remove:
            text = re.sub(pattern, '', text)
        
        if not text or len(text) < 2:
            return None
        
        action_verbs = ["完成", "开发", "实现", "修复", "优化", "编写", "整理", "对接", "沟通", "学习", "调研", "准备", "参加", "进行"]
        
        has_action = any(verb in text for verb in action_verbs)
        
        return {
            "task": text,
            "priority": "medium",
            "has_action_verb": has_action
        }

    @staticmethod
    def _assess_priority(text: str, is_high: bool = False) -> str:
        text_lower = text.lower()
        
        high_keywords = ["紧急", "重要", "必须", "马上", "立即", "截止", "deadline", "高优", "优先"]
        low_keywords = ["可选", "有时间", "后续", "远期", "规划", "低优", "可以"]
        
        if any(keyword in text_lower for keyword in high_keywords):
            return "high"
        if any(keyword in text_lower for keyword in low_keywords):
            return "low"
        
        return "high" if is_high else "medium"

    @staticmethod
    def extract_key_insights(report: Dict) -> Dict:
        insights = {
            "main_achievements": [],
            "blockers": [],
            "focus_areas": []
        }
        
        sections = report.get("sections", {})
        
        completed = sections.get("本周完成", [])
        if completed:
            insights["main_achievements"] = completed[:3]
        
        problems = sections.get("遇到的问题", [])
        if problems:
            insights["blockers"] = problems
        
        time_analysis = report.get("time_analysis", {})
        if time_analysis:
            top_areas = sorted(time_analysis.items(), key=lambda x: -x[1])[:3]
            insights["focus_areas"] = [f"{area} ({pct}%)" for area, pct in top_areas]
        
        return insights

    @staticmethod
    def generate_summary_report(reports: List[Dict]) -> Dict:
        if not reports:
            return {}
        
        all_time_analysis = defaultdict(int)
        all_todos = []
        all_achievements = []
        
        for report in reports:
            time_analysis = report.get("time_analysis", {})
            for category, pct in time_analysis.items():
                all_time_analysis[category] += pct
            
            todos = report.get("todo_list", [])
            all_todos.extend(todos)
            
            sections = report.get("sections", {})
            completed = sections.get("本周完成", [])
            all_achievements.extend(completed)
        
        total_reports = len(reports)
        avg_time_analysis = {
            category: round(pct / total_reports) 
            for category, pct in all_time_analysis.items()
        }
        
        return {
            "total_members": total_reports,
            "avg_time_distribution": avg_time_analysis,
            "total_todos": len(all_todos),
            "total_achievements": len(all_achievements),
            "all_achievements": all_achievements,
            "all_todos": all_todos
        }
