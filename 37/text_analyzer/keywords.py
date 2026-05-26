import re
import math
from typing import Dict, List, Set
from collections import Counter
from .stopwords_manager import load_stopwords


def tokenize(text: str) -> List[str]:
    english_words = re.findall(r'[a-zA-Z]+', text.lower())
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    return english_words + chinese_chars


def compute_tf(tokens: List[str]) -> Dict[str, float]:
    tf_dict = {}
    total_tokens = len(tokens)
    if total_tokens == 0:
        return tf_dict
    
    token_counts = Counter(tokens)
    for token, count in token_counts.items():
        tf_dict[token] = count / total_tokens
    
    return tf_dict


def compute_idf(documents: List[List[str]]) -> Dict[str, float]:
    idf_dict = {}
    total_docs = len(documents)
    if total_docs == 0:
        return idf_dict
    
    for doc in documents:
        unique_tokens = set(doc)
        for token in unique_tokens:
            idf_dict[token] = idf_dict.get(token, 0) + 1
    
    for token, doc_freq in idf_dict.items():
        idf_dict[token] = math.log((total_docs + 1) / (doc_freq + 1)) + 1
    
    return idf_dict


def compute_tfidf_single(text: str, stopwords: Set[str] = None) -> Dict[str, float]:
    if stopwords is None:
        stopwords = set()
    
    tokens = tokenize(text)
    tokens = [t for t in tokens if t not in stopwords]
    
    tf = compute_tf(tokens)
    documents = [tokens]
    idf = compute_idf(documents)
    
    tfidf = {}
    for token in tf:
        tfidf[token] = tf[token] * idf.get(token, 1.0)
    
    return tfidf


def extract_keywords(text: str, top_n: int = 5, stopwords_language: str = 'english') -> List[tuple]:
    try:
        stopwords = load_stopwords(stopwords_language)
    except ValueError:
        stopwords = set()
    
    tfidf_scores = compute_tfidf_single(text, stopwords)
    
    if not tfidf_scores:
        return []
    
    sorted_keywords = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)
    return [(kw, round(score, 4)) for kw, score in sorted_keywords[:top_n]]


def extract_keywords_with_custom_stopwords(text: str, top_n: int = 5, 
                                            custom_stopwords: Set[str] = None) -> List[tuple]:
    stopwords = custom_stopwords if custom_stopwords else set()
    
    tfidf_scores = compute_tfidf_single(text, stopwords)
    
    if not tfidf_scores:
        return []
    
    sorted_keywords = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)
    return [(kw, round(score, 4)) for kw, score in sorted_keywords[:top_n]]
