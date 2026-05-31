import json
import os
from datetime import datetime

DEFAULT_SNIPPETS = [
    {
        "id": 1,
        "category": "技术项目经验",
        "content": "主导微服务架构设计与实现，服务可用性达到99.9%，支持日均100万+次API调用。",
        "keywords": ["微服务", "架构设计", "高可用"],
        "rating": 4.8,
        "created_at": "2024-01-15"
    },
    {
        "id": 2,
        "category": "技术项目经验",
        "content": "基于Spark构建大数据处理平台，日处理数据量达5TB，性能优化提升60%。",
        "keywords": ["Spark", "大数据", "性能优化"],
        "rating": 4.7,
        "created_at": "2024-01-20"
    },
    {
        "id": 3,
        "category": "管理经验",
        "content": "带领15人技术团队，负责产品全生命周期管理，连续5个季度项目交付率100%。",
        "keywords": ["团队管理", "项目交付", "技术团队"],
        "rating": 4.9,
        "created_at": "2024-02-01"
    },
    {
        "id": 4,
        "category": "技术项目经验",
        "content": "使用React和Node.js开发企业级SaaS应用，服务付费客户超过2000家。",
        "keywords": ["React", "Node.js", "SaaS"],
        "rating": 4.6,
        "created_at": "2024-02-10"
    },
    {
        "id": 5,
        "category": "业绩成果",
        "content": "通过算法优化，将系统响应时间从2000ms降低至300ms，用户满意度提升35%。",
        "keywords": ["算法优化", "性能提升", "用户体验"],
        "rating": 4.8,
        "created_at": "2024-02-15"
    },
    {
        "id": 6,
        "category": "技术项目经验",
        "content": "设计并实现CI/CD流水线，部署时间从2小时缩短至15分钟，自动化覆盖率达90%。",
        "keywords": ["CI/CD", "DevOps", "自动化"],
        "rating": 4.7,
        "created_at": "2024-02-20"
    },
    {
        "id": 7,
        "category": "技术项目经验",
        "content": "基于TensorFlow构建推荐系统模型，用户点击率提升28%，转化率提升15%。",
        "keywords": ["TensorFlow", "推荐系统", "机器学习"],
        "rating": 4.9,
        "created_at": "2024-03-01"
    },
    {
        "id": 8,
        "category": "管理经验",
        "content": "主导技术栈升级规划，成功完成从单体应用到微服务架构的平滑迁移。",
        "keywords": ["技术升级", "架构迁移", "微服务"],
        "rating": 4.6,
        "created_at": "2024-03-05"
    },
    {
        "id": 9,
        "category": "技能专长",
        "content": "精通Java/Python双栈开发，熟悉Spring Boot、Django等主流框架，代码质量评分持续Top 5%。",
        "keywords": ["Java", "Python", "Spring Boot"],
        "rating": 4.5,
        "created_at": "2024-03-10"
    },
    {
        "id": 10,
        "category": "教育背景",
        "content": "985高校计算机科学硕士，GPA 3.8/4.0，发表SCI论文2篇，获国家奖学金。",
        "keywords": ["计算机科学", "硕士", "学术成果"],
        "rating": 4.7,
        "created_at": "2024-03-15"
    }
]

def ensure_data_file(file_path, default_data):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    if not os.path.exists(file_path):
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)
        return default_data
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except (json.JSONDecodeError, FileNotFoundError):
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)
        return default_data

class ResumeSnippetStore:
    def __init__(self, file_path):
        self.file_path = file_path
        self.snippets = ensure_data_file(file_path, DEFAULT_SNIPPETS)
    
    def get_all_snippets(self, category=None):
        if category:
            return [s for s in self.snippets if s.get('category') == category]
        return self.snippets
    
    def search_snippets(self, keyword):
        keyword_lower = keyword.lower()
        results = []
        for snippet in self.snippets:
            if (keyword_lower in snippet.get('content', '').lower() or
                any(keyword_lower in kw.lower() for kw in snippet.get('keywords', []))):
                results.append(snippet)
        return results
    
    def add_snippet(self, content, category, keywords):
        new_id = max([s.get('id', 0) for s in self.snippets], default=0) + 1
        new_snippet = {
            "id": new_id,
            "category": category,
            "content": content,
            "keywords": keywords,
            "rating": 0,
            "votes": 0,
            "created_at": datetime.now().strftime("%Y-%m-%d")
        }
        self.snippets.append(new_snippet)
        self._save()
        return new_snippet
    
    def rate_snippet(self, snippet_id, rating):
        for snippet in self.snippets:
            if snippet.get('id') == snippet_id:
                current_rating = snippet.get('rating', 0)
                votes = snippet.get('votes', 0)
                new_votes = votes + 1
                new_rating = ((current_rating * votes) + rating) / new_votes
                snippet['rating'] = round(new_rating, 1)
                snippet['votes'] = new_votes
                self._save()
                return True
        return False
    
    def get_categories(self):
        return list(set([s.get('category', '未分类') for s in self.snippets]))
    
    def get_top_rated(self, limit=5):
        rated = [s for s in self.snippets if s.get('rating', 0) > 0]
        rated.sort(key=lambda x: x.get('rating', 0), reverse=True)
        return rated[:limit]
    
    def _save(self):
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(self.snippets, f, ensure_ascii=False, indent=2)

class AnalysisHistory:
    def __init__(self, file_path):
        self.file_path = file_path
        self.history = ensure_data_file(file_path, [])
    
    def add_record(self, job_description, resume_name, score, coverage):
        record = {
            "id": len(self.history) + 1,
            "timestamp": datetime.now().isoformat(),
            "job_description": job_description[:100] + "...",
            "resume_name": resume_name,
            "score": score,
            "coverage": coverage
        }
        self.history.append(record)
        self._save()
        return record
    
    def get_history(self, limit=20):
        return self.history[-limit:][::-1]
    
    def _save(self):
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, ensure_ascii=False, indent=2)
