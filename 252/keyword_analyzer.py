import re
from collections import Counter
import math
import string

STOP_WORDS = set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
    'the', 'to', 'was', 'were', 'will', 'with', 'this', 'but', 'they',
    'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'can', 'just', 'should', 'now', 'i', 'you', 'we', 'your', 'my',
    'me', 'him', 'her', 'them', 'their', 'our', 'us', 'if', 'then', 'else',
    'do', 'does', 'did', 'done', 'been', 'being', 'would', 'could', 'about',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up',
    'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once', 'here',
    'there', 'any', 'because', 'while', 'also', 'the', 'and', 'or', 'but'
])

CHINESE_STOP_WORDS = set([
    '的', '了', '和', '是', '在', '我', '有', '也', '就', '都', '而', '及',
    '与', '等', '这', '那', '个', '之', '以', '于', '上', '下', '中', '为',
    '对', '将', '会', '要', '可', '能', '或', '者', '被', '把', '让', '给',
    '到', '从', '向', '由', '所', '得', '着', '过', '来', '去', '做', '用',
    '如', '若', '使', '该', '并', '地', '得', '很', '最', '更', '已', '经',
    '还', '又', '再', '不', '没', '没有', '不是', '但是', '然后', '因为',
    '所以', '因此', '然而', '虽然', '如果', '需要', '主要', '相关', '包括',
    '通过', '进行', '实现', '提供', '支持', '可以', '能够', '具有', '完成'
])

def is_chinese(text):
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def tokenize(text):
    text = text.lower()
    text = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', text)
    
    if is_chinese(text):
        words = re.findall(r'[\u4e00-\u9fff]+|[a-zA-Z]+', text)
        words = [w for w in words if w not in CHINESE_STOP_WORDS and len(w) > 1]
    else:
        words = text.split()
        words = [w.strip(string.punctuation) for w in words]
        words = [w for w in words if w not in STOP_WORDS and len(w) > 1]
    
    return words

def extract_keywords(text, top_n=30):
    words = tokenize(text)
    word_counts = Counter(words)
    return word_counts.most_common(top_n)

def calculate_tf(keywords, text):
    words = tokenize(text)
    word_counts = Counter(words)
    total_words = len(words) if words else 1
    
    tf_scores = {}
    for keyword in keywords:
        keyword_lower = keyword.lower()
        count = word_counts.get(keyword_lower, 0)
        tf_scores[keyword] = count / total_words
    
    return tf_scores

def calculate_match_score(resume_text, job_keywords, custom_weights=None):
    if custom_weights is None:
        custom_weights = {}
    
    resume_words = set(tokenize(resume_text))
    resume_text_lower = resume_text.lower()
    
    matched_keywords = []
    missing_keywords = []
    keyword_details = []
    
    total_weight = 0
    weighted_matches = 0
    
    for keyword_info in job_keywords:
        if isinstance(keyword_info, dict):
            keyword = keyword_info.get('keyword', keyword_info.get('term', ''))
            weight = keyword_info.get('weight', 1)
        else:
            keyword = keyword_info
            weight = custom_weights.get(keyword.lower(), 1)
        
        keyword_lower = keyword.lower()
        total_weight += weight
        
        found = keyword_lower in resume_text_lower
        occurrences = len(re.findall(r'\b' + re.escape(keyword_lower) + r'\b', resume_text_lower))
        
        detail = {
            'keyword': keyword,
            'found': found,
            'occurrences': occurrences,
            'weight': weight,
            'density': occurrences / max(len(resume_text_lower.split()), 1) * 100
        }
        
        if found:
            matched_keywords.append(keyword)
            weighted_matches += weight
            detail['status'] = 'matched'
        else:
            missing_keywords.append(keyword)
            detail['status'] = 'missing'
        
        keyword_details.append(detail)
    
    coverage = len(matched_keywords) / len(job_keywords) if job_keywords else 0
    weighted_score = weighted_matches / total_weight if total_weight > 0 else 0
    
    return {
        'coverage': coverage,
        'weighted_score': weighted_score,
        'matched_keywords': matched_keywords,
        'missing_keywords': missing_keywords,
        'keyword_details': keyword_details,
        'total_keywords': len(job_keywords),
        'matched_count': len(matched_keywords)
    }

def calculate_density(resume_text, keywords):
    text_lower = resume_text.lower()
    total_words = len(text_lower.split())
    density_info = []
    
    for keyword in keywords:
        keyword_lower = keyword.lower()
        count = len(re.findall(r'\b' + re.escape(keyword_lower) + r'\b', text_lower))
        density = (count / total_words) * 100 if total_words > 0 else 0
        
        density_info.append({
            'keyword': keyword,
            'count': count,
            'density': round(density, 2),
            'recommended_min': 0.5,
            'recommended_max': 3.0
        })
    
    return density_info

def generate_optimization_suggestions(match_result, density_info):
    suggestions = []
    
    missing = match_result['missing_keywords']
    if missing:
        if len(missing) <= 5:
            suggestions.append({
                'type': 'add_keywords',
                'priority': 'high',
                'message': f"建议添加以下关键词: {', '.join(missing)}",
                'keywords': missing
            })
        else:
            suggestions.append({
                'type': 'add_keywords',
                'priority': 'high',
                'message': f"建议添加以下关键词（前10个最重要）: {', '.join(missing[:10])}",
                'keywords': missing[:10]
            })
    
    for item in density_info:
        if item['count'] == 0:
            pass
        elif item['density'] < item['recommended_min']:
            suggestions.append({
                'type': 'increase_occurrence',
                'priority': 'medium',
                'message': f"关键词 '{item['keyword']}' 出现次数不足（{item['count']}次），建议增加1-2次",
                'keyword': item['keyword'],
                'current': item['count'],
                'recommended': max(2, item['count'] + 1)
            })
        elif item['density'] > item['recommended_max']:
            suggestions.append({
                'type': 'decrease_occurrence',
                'priority': 'medium',
                'message': f"关键词 '{item['keyword']}' 出现频率过高（{item['density']}%），可能被判定为关键词堆砌",
                'keyword': item['keyword'],
                'current_density': item['density']
            })
    
    coverage = match_result['coverage']
    if coverage < 0.4:
        suggestions.append({
            'type': 'coverage_warning',
            'priority': 'critical',
            'message': f"关键词覆盖率仅为{coverage*100:.1f}%，严重低于ATS系统要求（建议至少60%）",
            'current_coverage': coverage
        })
    elif coverage < 0.6:
        suggestions.append({
            'type': 'coverage_warning',
            'priority': 'high',
            'message': f"关键词覆盖率为{coverage*100:.1f}%，建议提升至60%以上",
            'current_coverage': coverage
        })
    
    return suggestions

def generate_keyword_examples(keyword):
    examples = {
        'python': [
            "使用Python开发数据处理脚本，提升工作效率50%",
            "基于Python Django框架构建RESTful API服务",
            "利用Python进行数据分析和可视化展示"
        ],
        'java': [
            "负责Java后端服务的开发与维护",
            "使用Java Spring Boot框架构建微服务架构",
            "主导Java应用性能优化，响应时间降低40%"
        ],
        'javascript': [
            "使用JavaScript开发交互性强的前端应用",
            "基于JavaScript React框架构建用户界面",
            "实现JavaScript前后端数据交互功能"
        ],
        '项目管理': [
            "负责XX项目的整体规划和项目管理",
            "运用敏捷开发方法进行项目管理，按期交付率100%",
            "主导跨部门协作的项目管理工作"
        ],
        '数据分析': [
            "负责业务数据分析，输出月度分析报告",
            "运用SQL和Python进行数据分析，发现关键业务洞察",
            "建立数据分析模型，支撑决策制定"
        ],
        '机器学习': [
            "参与机器学习模型的训练与优化",
            "基于机器学习算法构建预测模型",
            "运用机器学习技术解决实际业务问题"
        ],
        '团队领导': [
            "担任技术团队领导，管理10人研发团队",
            "团队领导经验丰富，成功交付多个大型项目",
            "作为团队领导，负责技术选型和人员培养"
        ]
    }
    
    keyword_lower = keyword.lower()
    for key, ex_list in examples.items():
        if key in keyword_lower or keyword_lower in key:
            return ex_list
    
    return [
        f"在项目中运用{keyword}技能解决实际问题",
        f"负责{keyword}相关的设计与开发工作",
        f"具有丰富的{keyword}实战经验"
    ]

def batch_compare_resumes(resume_texts, job_keywords, custom_weights=None):
    results = []
    
    for idx, resume_info in enumerate(resume_texts):
        text = resume_info.get('text', '')
        name = resume_info.get('name', f'简历{idx + 1}')
        
        match_result = calculate_match_score(text, job_keywords, custom_weights)
        
        ats_score = calculate_ats_score(text, match_result)
        
        results.append({
            'rank': 0,
            'name': name,
            'coverage': match_result['coverage'],
            'weighted_score': match_result['weighted_score'],
            'matched_count': match_result['matched_count'],
            'total_keywords': match_result['total_keywords'],
            'ats_score': ats_score,
            'pass_probability': ats_score / 100
        })
    
    results.sort(key=lambda x: (x['weighted_score'], x['coverage']), reverse=True)
    
    for idx, result in enumerate(results):
        result['rank'] = idx + 1
    
    return results

def calculate_ats_score(resume_text, match_result):
    score = 0
    
    coverage = match_result.get('coverage', 0)
    score += min(coverage * 40, 40)
    
    text_length = len(resume_text.split())
    if 300 <= text_length <= 800:
        score += 10
    elif 200 <= text_length < 300 or 800 < text_length <= 1000:
        score += 5
    
    sections = ['experience', 'education', 'skill', '项目经验', '教育背景', '技能']
    section_count = sum(1 for s in sections if s.lower() in resume_text.lower())
    score += min(section_count * 5, 15)
    
    action_verbs = ['led', 'managed', 'created', 'developed', 'implemented', 'increased', 'improved',
                    '主导', '负责', '开发', '设计', '实现', '提升', '优化']
    verb_count = sum(1 for v in action_verbs if v.lower() in resume_text.lower())
    score += min(verb_count * 2, 15)
    
    contact_info = ['@', 'tel', 'phone', '邮箱', '电话', '手机']
    contact_count = sum(1 for c in contact_info if c.lower() in resume_text.lower())
    score += min(contact_count * 3, 10)
    
    quantifiable = sum(1 for num in re.findall(r'\d+%|\d+\s*年|\d+\s*万', resume_text) if num)
    score += min(quantifiable * 2, 10)
    
    return min(score, 100)
