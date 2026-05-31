import re
import hashlib
from typing import List, Optional
from datetime import datetime, timedelta
from .models import Priority


def generate_id(*args: str) -> str:
    content = "|".join(str(arg) for arg in args)
    return hashlib.md5(content.encode()).hexdigest()[:8]


def extract_names(text: str) -> List[str]:
    names = set()
    
    speaker_patterns = [
        r'([\u4e00-\u9fa5]{2,4})\s*[：:]',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[：:]',
    ]
    
    for pattern in speaker_patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            if len(match) >= 2 and not is_stop_word(match):
                names.add(match)
    
    common_names = ["张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十",
                    "小明", "小红", "小华", "小李", "小王", "老张", "老王",
                    "Tom", "Jerry", "Alice", "Bob", "Charlie", "David", "Eve", "Frank"]
    
    for name in common_names:
        pattern = r'(?<![\u4e00-\u9fa5a-zA-Z])' + re.escape(name) + r'(?![\u4e00-\u9fa5a-zA-Z])'
        if re.search(pattern, text):
            names.add(name)
            continue
        
        pattern2 = r'(?:^|[\s，。、]|[和与跟及同])' + re.escape(name) + r'(?:$|[\s，。、]|[和与跟及同一起来去])'
        if re.search(pattern2, text):
            names.add(name)
            continue
        
        escaped_name = re.escape(name)
        pattern3 = r'{name}(?:负责|需要|牵头|跟进|完成|处理|说|表示|认为|觉得|同意|反对)'.format(name=escaped_name)
        if re.search(pattern3, text):
            names.add(name)
            continue
        
        pattern4 = r'(?:请|让|由|指派|安排|分配)[^，。、]*{name}'.format(name=escaped_name)
        if re.search(pattern4, text):
            names.add(name)
    
    action_pattern = r'([\u4e00-\u9fa5]{2,4}|[A-Z][a-z]+)\s*(?:负责|需要|牵头|跟进|完成|处理)'
    matches = re.findall(action_pattern, text)
    for match in matches:
        if len(match) >= 2 and not is_stop_word(match):
            names.add(match)
    
    english_name_pattern = r'(?<![a-zA-Z])([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)(?![a-zA-Z])'
    matches = re.findall(english_name_pattern, text)
    for match in matches:
        if not is_stop_word(match):
            names.add(match)
    
    return sorted(list(names))


def is_stop_word(word: str) -> bool:
    stop_words = {
        "的", "是", "在", "有", "和", "与", "及", "等", "也", "都", "了", "吗", "呢", "啊",
        "the", "and", "or", "but", "for", "with", "from", "that", "this", "please",
        "可以", "需要", "应该", "必须", "负责", "跟进", "完成", "处理", "安排",
        "明天", "后天", "今天", "昨天", "下周", "本周", "本月", "下月",
        "周一", "周二", "周三", "周四", "周五", "周六", "周日",
        "会议", "讨论", "决定", "同意", "反对", "问题", "方案", "报告",
        "一下", "一个", "一些", "什么", "怎么", "如何", "这样", "那样",
        "我们", "你们", "他们", "大家", "好的", "没问题",
    }
    return word.lower() in stop_words or len(word) == 1


def extract_dates(text: str) -> List[str]:
    dates = []
    today = datetime.now()
    
    year_in_text = None
    year_match = re.search(r'(\d{4})年', text)
    if year_match:
        year_in_text = int(year_match.group(1))
    
    absolute_pattern = r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?'
    matches = re.findall(absolute_pattern, text)
    for year, month, day in matches:
        dates.append(f"{year}-{int(month):02d}-{int(day):02d}")
        if not year_in_text:
            year_in_text = int(year)
    
    ref_year = year_in_text or today.year
    
    relative_pattern = r'(\d{1,2})月(\d{1,2})[日号]'
    matches = re.findall(relative_pattern, text)
    for month, day in matches:
        dates.append(f"{ref_year}-{int(month):02d}-{int(day):02d}")
    
    weekday_map = {
        '一': 0, '1': 0,
        '二': 1, '2': 1,
        '三': 2, '3': 2,
        '四': 3, '4': 3,
        '五': 4, '5': 4,
        '六': 5, '6': 5,
        '日': 6, '天': 6, '7': 6,
    }
    
    weekday_pattern = r'(本|下)?周([一二三四五六日1-7天])'
    matches = re.findall(weekday_pattern, text)
    for prefix, weekday in matches:
        target_weekday = weekday_map.get(weekday)
        if target_weekday is None:
            continue
        
        current_weekday = today.weekday()
        if prefix == '下':
            days_ahead = (target_weekday - current_weekday + 7) % 7 + 7
        else:
            days_ahead = (target_weekday - current_weekday + 7) % 7
            if days_ahead == 0:
                days_ahead = 7
        
        target_date = today + timedelta(days=days_ahead)
        dates.append(target_date.strftime("%Y-%m-%d"))
    
    if '明天' in text:
        dates.append((today + timedelta(days=1)).strftime("%Y-%m-%d"))
    if '后天' in text:
        dates.append((today + timedelta(days=2)).strftime("%Y-%m-%d"))
    if '大后天' in text:
        dates.append((today + timedelta(days=3)).strftime("%Y-%m-%d"))
    if '下周' in text and not re.search(r'周[一二三四五六日1-7天]', text):
        dates.append((today + timedelta(days=7)).strftime("%Y-%m-%d"))
    
    days_pattern = r'(\d+)天(后|内)?'
    matches = re.findall(days_pattern, text)
    for days, _ in matches:
        days = int(days)
        dates.append((today + timedelta(days=days)).strftime("%Y-%m-%d"))
    
    return list(set(dates))


def parse_priority(text: str) -> Priority:
    text_lower = text.lower()
    high_keywords = ["紧急", "重要", "立刻", "马上", "立即", "critical", "urgent", "high", "重要且紧急"]
    medium_keywords = ["尽快", "优先", "推荐", "medium", "normal", "重要不紧急"]
    low_keywords = ["可选", "后续", "未来", "低", "low", "nice to have"]
    
    for kw in high_keywords:
        if kw in text_lower:
            return Priority.HIGH
    for kw in low_keywords:
        if kw in text_lower:
            return Priority.LOW
    for kw in medium_keywords:
        if kw in text_lower:
            return Priority.MEDIUM
    
    return Priority.MEDIUM


def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    return text


def read_file(file_path: str) -> str:
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Could not read file {file_path} with any known encoding")
