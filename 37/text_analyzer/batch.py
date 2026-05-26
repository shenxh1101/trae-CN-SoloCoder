import os
from typing import Dict, List
from .analyzer import analyze_text


def find_txt_files(folder_path: str) -> List[str]:
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"文件夹不存在: {folder_path}")
    
    if not os.path.isdir(folder_path):
        raise NotADirectoryError(f"路径不是文件夹: {folder_path}")
    
    txt_files = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith('.txt'):
                txt_files.append(os.path.join(root, file))
    
    return sorted(txt_files)


def batch_analyze(folder_path: str, stopwords_language: str = 'english') -> Dict:
    txt_files = find_txt_files(folder_path)
    
    if not txt_files:
        return {
            'folder_path': folder_path,
            'total_files': 0,
            'files': [],
            'summary': None
        }
    
    results = []
    for file_path in txt_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            analysis = analyze_text(text, stopwords_language=stopwords_language)
            results.append({
                'file_name': os.path.basename(file_path),
                'file_path': file_path,
                'file_size': os.path.getsize(file_path),
                'analysis': analysis
            })
        except Exception as e:
            results.append({
                'file_name': os.path.basename(file_path),
                'file_path': file_path,
                'error': str(e)
            })
    
    summary = generate_summary(results)
    
    return {
        'folder_path': folder_path,
        'total_files': len(txt_files),
        'files': results,
        'summary': summary
    }


def generate_summary(results: List[Dict]) -> Dict:
    valid_results = [r for r in results if 'analysis' in r and 'error' not in r]
    
    if not valid_results:
        return None
    
    total_chars_no_space = sum(r['analysis']['basic_stats']['chars_without_spaces'] for r in valid_results)
    total_chars_with_space = sum(r['analysis']['basic_stats']['chars_with_spaces'] for r in valid_results)
    total_chinese = sum(r['analysis']['basic_stats']['chinese_chars'] for r in valid_results)
    total_letters = sum(r['analysis']['basic_stats']['letters'] for r in valid_results)
    total_digits = sum(r['analysis']['basic_stats']['digits'] for r in valid_results)
    total_punctuations = sum(r['analysis']['basic_stats']['punctuations'] for r in valid_results)
    total_words = sum(r['analysis']['basic_stats']['english_words'] for r in valid_results)
    total_lines = sum(r['analysis']['basic_stats']['lines'] for r in valid_results)
    total_sentences = sum(r['analysis']['sentence_analysis']['total_sentences'] for r in valid_results)
    
    avg_flesch = sum(r['analysis']['readability']['flesch_reading_ease'] for r in valid_results) / len(valid_results)
    avg_sentiment = sum(r['analysis']['sentiment']['sentiment_score'] for r in valid_results) / len(valid_results)
    
    comparison_table = []
    for r in valid_results:
        comparison_table.append({
            'file_name': r['file_name'],
            'chars': r['analysis']['basic_stats']['chars_without_spaces'],
            'words': r['analysis']['basic_stats']['english_words'],
            'chinese': r['analysis']['basic_stats']['chinese_chars'],
            'lines': r['analysis']['basic_stats']['lines'],
            'sentences': r['analysis']['sentence_analysis']['total_sentences'],
            'flesch_score': r['analysis']['readability']['flesch_reading_ease'],
            'sentiment': r['analysis']['sentiment']['sentiment_label'],
            'sentiment_score': r['analysis']['sentiment']['sentiment_score']
        })
    
    return {
        'total_valid_files': len(valid_results),
        'total_chars_no_space': total_chars_no_space,
        'total_chars_with_space': total_chars_with_space,
        'total_chinese_chars': total_chinese,
        'total_letters': total_letters,
        'total_digits': total_digits,
        'total_punctuations': total_punctuations,
        'total_english_words': total_words,
        'total_lines': total_lines,
        'total_sentences': total_sentences,
        'avg_flesch_score': round(avg_flesch, 2),
        'avg_sentiment_score': round(avg_sentiment, 2),
        'comparison_table': comparison_table
    }


def export_batch_summary_to_txt(batch_result: Dict, output_path: str) -> str:
    if not output_path.endswith('.txt'):
        output_path += '.txt'
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    lines = []
    lines.append('=' * 80)
    lines.append('批量文本分析汇总报告')
    lines.append('=' * 80)
    lines.append(f'分析文件夹: {batch_result["folder_path"]}')
    lines.append(f'总文件数: {batch_result["total_files"]}')
    lines.append('')
    
    summary = batch_result.get('summary')
    if summary:
        lines.append('【汇总统计】')
        lines.append('-' * 60)
        lines.append(f'有效分析文件数: {summary["total_valid_files"]}')
        lines.append(f'总字符数(不含空格): {summary["total_chars_no_space"]}')
        lines.append(f'总字符数(含空格): {summary["total_chars_with_space"]}')
        lines.append(f'总汉字数: {summary["total_chinese_chars"]}')
        lines.append(f'总字母数: {summary["total_letters"]}')
        lines.append(f'总数字数: {summary["total_digits"]}')
        lines.append(f'总标点数: {summary["total_punctuations"]}')
        lines.append(f'总英文单词数: {summary["total_english_words"]}')
        lines.append(f'总行数: {summary["total_lines"]}')
        lines.append(f'总句子数: {summary["total_sentences"]}')
        lines.append(f'平均Flesch阅读难度: {summary["avg_flesch_score"]}')
        lines.append(f'平均情感得分: {summary["avg_sentiment_score"]}')
        lines.append('')
        
        lines.append('【文件对比表格】')
        lines.append('-' * 80)
        header = f'{"文件名":<25} {"字符":>8} {"单词":>6} {"汉字":>6} {"行":>5} {"句子":>6} {"Flesch":>8} {"情感":>8}'
        lines.append(header)
        lines.append('-' * 80)
        for row in summary['comparison_table']:
            line = f'{row["file_name"][:22]:<25} {row["chars"]:>8} {row["words"]:>6} {row["chinese"]:>6} {row["lines"]:>5} {row["sentences"]:>6} {row["flesch_score"]:>8} {row["sentiment"]:>8}'
            lines.append(line)
        lines.append('')
    
    lines.append('=' * 80)
    lines.append('报告结束')
    lines.append('=' * 80)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    return os.path.abspath(output_path)
