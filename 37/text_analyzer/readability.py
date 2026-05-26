import re
import math
from typing import Dict, Tuple


def _count_syllables(word: str) -> int:
    word = word.lower()
    count = 0
    vowels = "aeiouy"
    prev_char_was_vowel = False
    for char in word:
        is_vowel = char in vowels
        if is_vowel and not prev_char_was_vowel:
            count += 1
        prev_char_was_vowel = is_vowel
    if word.endswith('e'):
        count -= 1
    if word.endswith('le') and len(word) > 2 and word[-3] not in vowels:
        count += 1
    if count == 0:
        count = 1
    return count


def _count_polysyllables(text: str) -> int:
    words = re.findall(r'[a-zA-Z]+', text.lower())
    count = 0
    for word in words:
        if _count_syllables(word) >= 3:
            count += 1
    return count


def _count_total_syllables(text: str) -> int:
    words = re.findall(r'[a-zA-Z]+', text.lower())
    total = 0
    for word in words:
        total += _count_syllables(word)
    return total


def _count_sentences(text: str) -> int:
    sentences = re.split(r'[.!?。！？]+', text)
    return len([s for s in sentences if s.strip()])


def _count_words(text: str) -> int:
    words = re.findall(r'[a-zA-Z]+', text.lower())
    return len(words)


def _count_characters(text: str) -> int:
    chars = re.findall(r'[a-zA-Z]', text)
    return len(chars)


def flesch_reading_ease(text: str) -> float:
    words = _count_words(text)
    sentences = _count_sentences(text)
    syllables = _count_total_syllables(text)
    
    if words == 0 or sentences == 0:
        return 0.0
    
    score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
    return round(max(0, min(100, score)), 2)


def flesch_kincaid_grade(text: str) -> float:
    words = _count_words(text)
    sentences = _count_sentences(text)
    syllables = _count_total_syllables(text)
    
    if words == 0 or sentences == 0:
        return 0.0
    
    score = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
    return round(score, 2)


def coleman_liau_index(text: str) -> float:
    words = _count_words(text)
    sentences = _count_sentences(text)
    characters = _count_characters(text)
    
    if words == 0 or sentences == 0:
        return 0.0
    
    L = (characters / words) * 100
    S = (sentences / words) * 100
    
    score = 0.0588 * L - 0.296 * S - 15.8
    return round(score, 2)


def smog_index(text: str) -> float:
    sentences = _count_sentences(text)
    polysyllables = _count_polysyllables(text)
    
    if sentences < 30:
        sentences = max(sentences, 1)
    
    score = 1.0430 * math.sqrt(polysyllables * (30 / sentences)) + 3.1291
    return round(score, 2)


def get_reading_age_suggestion(flesch_score: float) -> str:
    if flesch_score >= 90:
        return "适合10-11岁（小学5年级）阅读"
    elif flesch_score >= 80:
        return "适合11-12岁（小学6年级）阅读"
    elif flesch_score >= 70:
        return "适合12-13岁（初中1年级）阅读"
    elif flesch_score >= 60:
        return "适合13-15岁（初中）阅读"
    elif flesch_score >= 50:
        return "适合15-17岁（高中）阅读"
    elif flesch_score >= 30:
        return "适合17-22岁（大学）阅读"
    else:
        return "适合22岁以上（大学毕业生）阅读"


def get_readability_analysis(text: str) -> Dict:
    flesch = flesch_reading_ease(text)
    return {
        'flesch_reading_ease': flesch,
        'flesch_kincaid_grade': flesch_kincaid_grade(text),
        'coleman_liau_index': coleman_liau_index(text),
        'smog_index': smog_index(text),
        'reading_age_suggestion': get_reading_age_suggestion(flesch)
    }
