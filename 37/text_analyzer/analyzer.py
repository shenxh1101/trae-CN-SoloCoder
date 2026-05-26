from typing import Dict
from .stats import get_basic_stats
from .frequency import get_english_word_frequency, get_chinese_char_frequency
from .readability import get_readability_analysis
from .sentences import get_sentence_analysis
from .keywords import extract_keywords
from .sentiment import analyze_sentiment


def analyze_text(text: str, stopwords_language: str = 'english') -> Dict:
    result = {}
    
    result['basic_stats'] = get_basic_stats(text)
    result['word_frequency'] = get_english_word_frequency(text, top_n=20)
    result['chinese_char_frequency'] = get_chinese_char_frequency(text, top_n=20)
    result['readability'] = get_readability_analysis(text)
    result['sentence_analysis'] = get_sentence_analysis(text)
    result['keywords'] = extract_keywords(text, top_n=5, stopwords_language=stopwords_language)
    result['sentiment'] = analyze_sentiment(text)
    
    return result


def print_analysis_result(result: Dict):
    print('=' * 60)
    print('文本分析结果')
    print('=' * 60)
    print()
    
    stats = result['basic_stats']
    print('【基本统计信息】')
    print('-' * 40)
    print(f'总字符数(不含空格): {stats["chars_without_spaces"]}')
    print(f'总字符数(含空格): {stats["chars_with_spaces"]}')
    print(f'总汉字数: {stats["chinese_chars"]}')
    print(f'总字母数: {stats["letters"]}')
    print(f'总数字数: {stats["digits"]}')
    print(f'总标点符号数: {stats["punctuations"]}')
    print(f'总英文单词数: {stats["english_words"]}')
    print(f'总行数: {stats["lines"]}')
    print()
    
    print('【英文词频统计 Top 20】')
    print('-' * 40)
    for i, (word, count) in enumerate(result['word_frequency'], 1):
        print(f'{i:2d}. {word:<15} {count}次')
    print()
    
    print('【中文字频统计 Top 20】')
    print('-' * 40)
    for i, (char, count) in enumerate(result['chinese_char_frequency'], 1):
        print(f'{i:2d}. {char:<6} {count}次')
    print()
    
    read = result['readability']
    print('【可读性分析】')
    print('-' * 40)
    print(f'Flesch阅读难度指数: {read["flesch_reading_ease"]}')
    print(f'Flesch-Kincaid年级水平: {read["flesch_kincaid_grade"]}')
    print(f'Coleman-Liau指数: {read["coleman_liau_index"]}')
    print(f'SMOG指数: {read["smog_index"]}')
    print(f'阅读年龄建议: {read["reading_age_suggestion"]}')
    print()
    
    sent = result['sentence_analysis']
    print('【句子分析】')
    print('-' * 40)
    print(f'总句子数: {sent["total_sentences"]}')
    print(f'平均句长(词数): {sent["average_sentence_length"]}')
    print(f'平均词长(字符数): {sent["average_word_length"]}')
    print(f'最长句子({sent["longest_sentence"]["word_count"]}词): {sent["longest_sentence"]["text"][:50]}...')
    print(f'最短句子({sent["shortest_sentence"]["word_count"]}词): {sent["shortest_sentence"]["text"]}')
    print()
    
    print('【关键词提取 Top 5】')
    print('-' * 40)
    for i, (kw, score) in enumerate(result['keywords'], 1):
        print(f'{i:2d}. {kw:<15} TF-IDF: {score}')
    print()
    
    senti = result['sentiment']
    print('【情感分析】')
    print('-' * 40)
    print(f'情感倾向: {senti["sentiment_label"]}')
    print(f'情感得分: {senti["sentiment_score"]}')
    print(f'正面词汇数: {senti["positive_words_count"]}')
    print(f'负面词汇数: {senti["negative_words_count"]}')
    if senti['matched_positive_words']:
        print(f'匹配的正面词: {", ".join(senti["matched_positive_words"])}')
    if senti['matched_negative_words']:
        print(f'匹配的负面词: {", ".join(senti["matched_negative_words"])}')
    print()
    
    print('=' * 60)
