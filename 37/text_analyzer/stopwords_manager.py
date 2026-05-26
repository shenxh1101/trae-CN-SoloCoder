import os
from typing import Set

STOPWORDS_DIR = os.path.join(os.path.dirname(__file__), 'stopwords')


def load_stopwords(language: str = 'english') -> Set[str]:
    stopwords_file = os.path.join(STOPWORDS_DIR, f'{language}.txt')
    
    if not os.path.exists(stopwords_file):
        available = [f.replace('.txt', '') for f in os.listdir(STOPWORDS_DIR) if f.endswith('.txt')]
        raise ValueError(f"停用词表 '{language}' 不存在。可用的停用词表: {available}")
    
    stopwords = set()
    with open(stopwords_file, 'r', encoding='utf-8') as f:
        for line in f:
            word = line.strip()
            if word:
                stopwords.add(word)
    
    return stopwords


def get_available_stopwords() -> list:
    if not os.path.exists(STOPWORDS_DIR):
        return []
    return [f.replace('.txt', '') for f in os.listdir(STOPWORDS_DIR) if f.endswith('.txt')]
