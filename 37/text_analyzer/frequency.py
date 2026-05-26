import re
from typing import Dict, List, Tuple
from collections import Counter


def get_english_word_frequency(text: str, top_n: int = 20) -> List[Tuple[str, int]]:
    words = re.findall(r'[a-zA-Z]+', text.lower())
    word_counts = Counter(words)
    return word_counts.most_common(top_n)


def get_chinese_char_frequency(text: str, top_n: int = 20) -> List[Tuple[str, int]]:
    chinese_pattern = re.compile(r'[\u4e00-\u9fff]')
    chinese_chars = chinese_pattern.findall(text)
    char_counts = Counter(chinese_chars)
    return char_counts.most_common(top_n)


def get_word_frequency_all(text: str) -> Counter:
    words = re.findall(r'[a-zA-Z]+', text.lower())
    return Counter(words)


def get_chinese_char_frequency_all(text: str) -> Counter:
    chinese_pattern = re.compile(r'[\u4e00-\u9fff]')
    chinese_chars = chinese_pattern.findall(text)
    return Counter(chinese_chars)
