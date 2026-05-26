import re
from typing import Dict, List, Tuple


def split_sentences(text: str) -> List[str]:
    sentence_endings = r'[.!?。！？]+'
    sentences = re.split(sentence_endings, text)
    return [s.strip() for s in sentences if s.strip()]


def count_sentences(text: str) -> int:
    return len(split_sentences(text))


def get_words_from_sentence(sentence: str) -> List[str]:
    english_words = re.findall(r'[a-zA-Z]+', sentence.lower())
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', sentence)
    return english_words + chinese_chars


def average_sentence_length(text: str) -> float:
    sentences = split_sentences(text)
    if not sentences:
        return 0.0
    total_words = 0
    for sentence in sentences:
        total_words += len(get_words_from_sentence(sentence))
    return round(total_words / len(sentences), 2)


def average_word_length(text: str) -> float:
    words = re.findall(r'[a-zA-Z]+', text.lower())
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    all_words = words + chinese_chars
    
    if not all_words:
        return 0.0
    
    total_length = 0
    for word in words:
        total_length += len(word)
    for char in chinese_chars:
        total_length += 1
    
    return round(total_length / len(all_words), 2)


def get_longest_sentence(text: str) -> Tuple[str, int]:
    sentences = split_sentences(text)
    if not sentences:
        return ("", 0)
    
    longest = max(sentences, key=lambda s: len(get_words_from_sentence(s)))
    return (longest, len(get_words_from_sentence(longest)))


def get_shortest_sentence(text: str) -> Tuple[str, int]:
    sentences = split_sentences(text)
    if not sentences:
        return ("", 0)
    
    shortest = min(sentences, key=lambda s: len(get_words_from_sentence(s)))
    return (shortest, len(get_words_from_sentence(shortest)))


def get_sentence_analysis(text: str) -> Dict:
    longest_sent, longest_len = get_longest_sentence(text)
    shortest_sent, shortest_len = get_shortest_sentence(text)
    
    return {
        'total_sentences': count_sentences(text),
        'average_sentence_length': average_sentence_length(text),
        'average_word_length': average_word_length(text),
        'longest_sentence': {
            'text': longest_sent,
            'word_count': longest_len
        },
        'shortest_sentence': {
            'text': shortest_sent,
            'word_count': shortest_len
        }
    }
