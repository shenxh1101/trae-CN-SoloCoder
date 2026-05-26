import json
import os
from datetime import datetime
from typing import Dict


def export_to_json(data: Dict, output_path: str) -> str:
    if not output_path.endswith('.json'):
        output_path += '.json'
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    export_data = {
        'export_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'analysis_result': data
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)
    
    return os.path.abspath(output_path)


def export_to_txt(data: Dict, output_path: str) -> str:
    if not output_path.endswith('.txt'):
        output_path += '.txt'
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    lines = []
    lines.append('=' * 60)
    lines.append('文本分析报告')
    lines.append(f'生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    lines.append('=' * 60)
    lines.append('')
    
    if 'basic_stats' in data:
        stats = data['basic_stats']
        lines.append('【基本统计信息】')
        lines.append('-' * 40)
        lines.append(f'总字符数(不含空格): {stats.get("chars_without_spaces", 0)}')
        lines.append(f'总字符数(含空格): {stats.get("chars_with_spaces", 0)}')
        lines.append(f'总汉字数: {stats.get("chinese_chars", 0)}')
        lines.append(f'总字母数: {stats.get("letters", 0)}')
        lines.append(f'总数字数: {stats.get("digits", 0)}')
        lines.append(f'总标点符号数: {stats.get("punctuations", 0)}')
        lines.append(f'总英文单词数: {stats.get("english_words", 0)}')
        lines.append(f'总行数: {stats.get("lines", 0)}')
        lines.append('')
    
    if 'word_frequency' in data:
        lines.append('【英文词频统计 Top 20】')
        lines.append('-' * 40)
        for i, (word, count) in enumerate(data['word_frequency'], 1):
            lines.append(f'{i:2d}. {word:<15} {count}次')
        lines.append('')
    
    if 'chinese_char_frequency' in data:
        lines.append('【中文字频统计 Top 20】')
        lines.append('-' * 40)
        for i, (char, count) in enumerate(data['chinese_char_frequency'], 1):
            lines.append(f'{i:2d}. {char:<6} {count}次')
        lines.append('')
    
    if 'readability' in data:
        read = data['readability']
        lines.append('【可读性分析】')
        lines.append('-' * 40)
        lines.append(f'Flesch阅读难度指数: {read.get("flesch_reading_ease", 0)}')
        lines.append(f'Flesch-Kincaid年级水平: {read.get("flesch_kincaid_grade", 0)}')
        lines.append(f'Coleman-Liau指数: {read.get("coleman_liau_index", 0)}')
        lines.append(f'SMOG指数: {read.get("smog_index", 0)}')
        lines.append(f'阅读年龄建议: {read.get("reading_age_suggestion", "")}')
        lines.append('')
    
    if 'sentence_analysis' in data:
        sent = data['sentence_analysis']
        lines.append('【句子分析】')
        lines.append('-' * 40)
        lines.append(f'总句子数: {sent.get("total_sentences", 0)}')
        lines.append(f'平均句长(词数): {sent.get("average_sentence_length", 0)}')
        lines.append(f'平均词长(字符数): {sent.get("average_word_length", 0)}')
        longest = sent.get('longest_sentence', {})
        lines.append(f'最长句子({longest.get("word_count", 0)}词): {longest.get("text", "")[:50]}...')
        shortest = sent.get('shortest_sentence', {})
        lines.append(f'最短句子({shortest.get("word_count", 0)}词): {shortest.get("text", "")}')
        lines.append('')
    
    if 'keywords' in data:
        lines.append('【关键词提取 Top 5】')
        lines.append('-' * 40)
        for i, (kw, score) in enumerate(data['keywords'], 1):
            lines.append(f'{i:2d}. {kw:<15} TF-IDF: {score}')
        lines.append('')
    
    if 'sentiment' in data:
        senti = data['sentiment']
        lines.append('【情感分析】')
        lines.append('-' * 40)
        lines.append(f'情感倾向: {senti.get("sentiment_label", "")}')
        lines.append(f'情感得分: {senti.get("sentiment_score", 0)}')
        lines.append(f'正面词汇数: {senti.get("positive_words_count", 0)}')
        lines.append(f'负面词汇数: {senti.get("negative_words_count", 0)}')
        if senti.get('matched_positive_words'):
            lines.append(f'匹配的正面词: {", ".join(senti["matched_positive_words"])}')
        if senti.get('matched_negative_words'):
            lines.append(f'匹配的负面词: {", ".join(senti["matched_negative_words"])}')
        lines.append('')
    
    if 'similarity' in data:
        sim = data['similarity']
        lines.append('【文本相似度分析】')
        lines.append('-' * 40)
        lines.append(f'算法: {sim.get("method", "")}')
        lines.append(f'相似度: {sim.get("similarity_percentage", 0)}%')
        lines.append(f'说明: {sim.get("interpretation", "")}')
        lines.append('')
    
    lines.append('=' * 60)
    lines.append('报告结束')
    lines.append('=' * 60)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    return os.path.abspath(output_path)


def export_report(data: Dict, output_path: str, format_type: str = 'txt') -> str:
    if format_type.lower() == 'json':
        return export_to_json(data, output_path)
    elif format_type.lower() == 'txt':
        return export_to_txt(data, output_path)
    else:
        raise ValueError(f"不支持的导出格式: {format_type}。请使用 'json' 或 'txt'。")
