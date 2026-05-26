import re
import math
from typing import Set, Dict
from collections import Counter


def tokenize(text: str) -> Set[str]:
    english_words = re.findall(r'[a-zA-Z]+', text.lower())
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    return set(english_words + chinese_chars)


def tokenize_with_counts(text: str) -> Counter:
    english_words = re.findall(r'[a-zA-Z]+', text.lower())
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    return Counter(english_words + chinese_chars)


def jaccard_similarity(text1: str, text2: str) -> float:
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    
    if not tokens1 and not tokens2:
        return 1.0
    if not tokens1 or not tokens2:
        return 0.0
    
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    
    return round(len(intersection) / len(union) * 100, 2)


def cosine_similarity(text1: str, text2: str) -> float:
    counter1 = tokenize_with_counts(text1)
    counter2 = tokenize_with_counts(text2)
    
    if not counter1 and not counter2:
        return 100.0
    if not counter1 or not counter2:
        return 0.0
    
    all_tokens = set(counter1.keys()).union(set(counter2.keys()))
    
    dot_product = 0
    magnitude1 = 0
    magnitude2 = 0
    
    for token in all_tokens:
        count1 = counter1.get(token, 0)
        count2 = counter2.get(token, 0)
        
        dot_product += count1 * count2
        magnitude1 += count1 ** 2
        magnitude2 += count2 ** 2
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    similarity = dot_product / (math.sqrt(magnitude1) * math.sqrt(magnitude2))
    return round(similarity * 100, 2)


def compare_texts(text1: str, text2: str, method: str = 'cosine') -> Dict:
    if method == 'jaccard':
        similarity = jaccard_similarity(text1, text2)
    elif method == 'cosine':
        similarity = cosine_similarity(text1, text2)
    else:
        raise ValueError(f"未知的相似度算法: {method}。请使用 'jaccard' 或 'cosine'。")
    
    return {
        'method': method,
        'similarity_percentage': similarity,
        'interpretation': _get_similarity_interpretation(similarity)
    }


def _get_similarity_interpretation(similarity: float) -> str:
    if similarity >= 90:
        return "极高相似度，两段文本几乎完全相同"
    elif similarity >= 70:
        return "高相似度，两段文本内容非常相似"
    elif similarity >= 50:
        return "中等相似度，两段文本有较多共同内容"
    elif similarity >= 30:
        return "低相似度，两段文本仅有少量共同内容"
    else:
        return "极低相似度，两段文本内容差异很大"
