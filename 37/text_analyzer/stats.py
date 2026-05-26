import re
import string
from typing import Dict, List, Tuple


def count_chars_without_spaces(text: str) -> int:
    return len(text.replace(' ', '').replace('\n', '').replace('\t', '').replace('\r', ''))


def count_chars_with_spaces(text: str) -> int:
    return len(text.replace('\n', '').replace('\t', '').replace('\r', ''))


def count_chinese_chars(text: str) -> int:
    chinese_pattern = re.compile(r'[\u4e00-\u9fff]')
    return len(chinese_pattern.findall(text))


def count_letters(text: str) -> int:
    english_pattern = re.compile(r'[a-zA-Z]')
    return len(english_pattern.findall(text))


def count_digits(text: str) -> int:
    digit_pattern = re.compile(r'[0-9]')
    return len(digit_pattern.findall(text))


def count_punctuations(text: str) -> int:
    chinese_punctuation = '，。！？、；：""''（）【】《》〈〉『』「」﹃﹄〔〕…—～￥·'
    all_punctuation = string.punctuation + chinese_punctuation
    count = 0
    for char in text:
        if char in all_punctuation:
            count += 1
    return count


def count_words_english(text: str) -> int:
    words = re.findall(r'[a-zA-Z]+', text.lower())
    return len(words)


def count_lines(text: str) -> int:
    if not text:
        return 0
    lines = text.split('\n')
    return len([line for line in lines if line.strip()])


def get_basic_stats(text: str) -> Dict:
    return {
        'chars_without_spaces': count_chars_without_spaces(text),
        'chars_with_spaces': count_chars_with_spaces(text),
        'chinese_chars': count_chinese_chars(text),
        'letters': count_letters(text),
        'digits': count_digits(text),
        'punctuations': count_punctuations(text),
        'english_words': count_words_english(text),
        'lines': count_lines(text)
    }
