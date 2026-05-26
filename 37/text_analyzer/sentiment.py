import os
import re
from typing import Dict, Set, Tuple


LEXICON_DIR = os.path.join(os.path.dirname(__file__), 'lexicon')


def load_lexicon(filename: str) -> Set[str]:
    filepath = os.path.join(LEXICON_DIR, filename)
    words = set()
    
    if not os.path.exists(filepath):
        return words
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            word = line.strip()
            if word:
                words.add(word)
    
    return words


def tokenize(text: str) -> Tuple[list, list]:
    english_words = re.findall(r'[a-zA-Z]+', text.lower())
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    chinese_words = []
    i = 0
    while i < len(chinese_chars):
        matched = False
        for length in range(4, 0, -1):
            if i + length <= len(chinese_chars):
                word = ''.join(chinese_chars[i:i+length])
                chinese_words.append(word)
        chinese_words.append(chinese_chars[i])
        i += 1
    
    return english_words, chinese_words


def analyze_sentiment(text: str) -> Dict:
    positive_words = load_lexicon('positive_words.txt')
    negative_words = load_lexicon('negative_words.txt')
    
    english_tokens, chinese_tokens = tokenize(text)
    all_tokens = english_tokens + chinese_tokens
    
    positive_count = 0
    negative_count = 0
    matched_positive = []
    matched_negative = []
    
    for token in all_tokens:
        if token in positive_words and token not in matched_positive:
            positive_count += 1
            matched_positive.append(token)
        elif token in negative_words and token not in matched_negative:
            negative_count += 1
            matched_negative.append(token)
    
    total_matched = positive_count + negative_count
    
    if total_matched == 0:
        sentiment_score = 0.0
        sentiment = 'neutral'
    else:
        sentiment_score = round((positive_count - negative_count) / total_matched * 100, 2)
        
        if sentiment_score > 10:
            sentiment = 'positive'
        elif sentiment_score < -10:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
    
    sentiment_label = {
        'positive': '正面',
        'negative': '负面',
        'neutral': '中性'
    }[sentiment]
    
    return {
        'sentiment': sentiment,
        'sentiment_label': sentiment_label,
        'sentiment_score': sentiment_score,
        'positive_words_count': positive_count,
        'negative_words_count': negative_count,
        'matched_positive_words': matched_positive[:10],
        'matched_negative_words': matched_negative[:10]
    }
