"""
中文关键词提取Web服务
基于TF-IDF算法的智能关键词提取系统
"""

import os
import json
import jieba
import math
import re
import csv
import io
import uuid
import time
import logging
from collections import Counter
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, Response
from wordcloud import WordCloud
import matplotlib
matplotlib.use('Agg')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'keyword_extraction_secret_key_2024'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'uploads'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('static/wordclouds', exist_ok=True)


def load_json(filepath):
    """
    加载JSON文件
    
    Args:
        filepath: 文件路径
        
    Returns:
        解析后的JSON数据
        
    Raises:
        FileNotFoundError: 文件不存在
        json.JSONDecodeError: JSON解析错误
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"文件不存在: {filepath}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析错误 {filepath}: {e}")
        raise


def load_stopwords(filepath):
    """
    加载停用词表
    
    Args:
        filepath: 停用词文件路径，每行一个词
        
    Returns:
        set: 停用词集合
    """
    stopwords = set()
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                word = line.strip()
                if word:
                    stopwords.add(word)
        logger.info(f"成功加载 {len(stopwords)} 个停用词")
        return stopwords
    except FileNotFoundError:
        logger.error(f"停用词文件不存在: {filepath}")
        return set()


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    IDF_DICT = load_json(os.path.join(BASE_DIR, 'data/idf_dict.json'))
    SENTIMENT_DICT = load_json(os.path.join(BASE_DIR, 'data/sentiment_dict.json'))
    DEFAULT_STOPWORDS = load_stopwords(os.path.join(BASE_DIR, 'data/stopwords.txt'))
    logger.info("所有数据文件加载成功")
except Exception as e:
    logger.error(f"数据文件加载失败: {e}")
    IDF_DICT = {}
    SENTIMENT_DICT = {'positive': [], 'negative': []}
    DEFAULT_STOPWORDS = set()

if 'history' not in app.config:
    app.config['history'] = []

if 'custom_stopwords' not in app.config:
    app.config['custom_stopwords'] = set()


def get_stopwords():
    """
    获取当前生效的停用词集合（默认停用词 + 自定义停用词）
    
    Returns:
        set: 停用词集合
    """
    return DEFAULT_STOPWORDS.union(app.config['custom_stopwords'])


def extract_keywords(text, top_n=5, custom_stopwords=None):
    """
    使用TF-IDF算法提取关键词
    
    Args:
        text: 输入文本
        top_n: 返回的关键词数量，默认5个
        custom_stopwords: 额外的自定义停用词集合
        
    Returns:
        list: 关键词列表，每个元素为(词, 权重)元组，权重已归一化到[0,1]
    """
    try:
        stopwords = get_stopwords()
        if custom_stopwords:
            stopwords = stopwords.union(custom_stopwords)

        words = jieba.lcut(text)
        filtered_words = [
            word for word in words 
            if len(word) > 1 
            and word not in stopwords 
            and not re.match(r'^\d+$', word)
        ]

        if not filtered_words:
            logger.warning("没有提取到有效关键词")
            return []

        word_count = Counter(filtered_words)
        total_words = len(filtered_words)

        tfidf_scores = {}
        for word, count in word_count.items():
            tf = count / total_words
            idf = IDF_DICT.get(word, 1.0)
            tfidf_scores[word] = tf * idf

        sorted_keywords = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)
        top_keywords = sorted_keywords[:top_n]

        max_score = max((score for _, score in top_keywords), default=1)
        normalized = [(word, round(score / max_score, 4)) for word, score in top_keywords]

        logger.info(f"成功提取 {len(normalized)} 个关键词")
        return normalized

    except Exception as e:
        logger.error(f"关键词提取失败: {e}")
        return []


def generate_wordcloud(keywords):
    """
    根据关键词生成词云图片
    
    Args:
        keywords: 关键词列表，格式为[(词, 权重), ...]
        
    Returns:
        str: 生成的词云图片文件名，失败返回None
    """
    if not keywords:
        logger.warning("关键词为空，无法生成词云")
        return None

    try:
        word_freq = {word: score for word, score in keywords}

        font_path = '/System/Library/Fonts/PingFang.ttc'
        if not os.path.exists(font_path):
            font_path = None
            logger.warning("未找到中文字体，词云可能无法正确显示中文")

        wc = WordCloud(
            font_path=font_path,
            width=800,
            height=600,
            background_color='white',
            max_words=50,
            colormap='viridis',
            prefer_horizontal=0.7
        )

        wc.generate_from_frequencies(word_freq)

        filename = f"wordcloud_{uuid.uuid4().hex}.png"
        filepath = os.path.join('static/wordclouds', filename)
        wc.to_file(filepath)

        logger.info(f"词云图片生成成功: {filename}")
        return filename

    except Exception as e:
        logger.error(f"词云生成失败: {e}")
        return None


def analyze_sentiment(text):
    """
    基于情感词典分析文本情感极性
    
    Args:
        text: 输入文本
        
    Returns:
        dict: 情感分析结果，包含polarity(正面/负面/中性)、positive_count、negative_count
    """
    try:
        words = jieba.lcut(text)
        stopwords = get_stopwords()
        filtered_words = [word for word in words if word not in stopwords]

        positive_words = SENTIMENT_DICT.get('positive', [])
        negative_words = SENTIMENT_DICT.get('negative', [])

        positive_count = sum(1 for word in filtered_words if word in positive_words)
        negative_count = sum(1 for word in filtered_words if word in negative_words)

        if positive_count > negative_count:
            polarity = '正面'
        elif negative_count > positive_count:
            polarity = '负面'
        else:
            polarity = '中性'

        return {
            'polarity': polarity,
            'positive': positive_count,
            'negative': negative_count
        }

    except Exception as e:
        logger.error(f"情感分析失败: {e}")
        return {'polarity': '中性', 'positive': 0, 'negative': 0}


def get_text_stats(text):
    """
    计算文本的基本统计信息
    
    Args:
        text: 输入文本
        
    Returns:
        dict: 统计信息，包含字数、句数、词汇数、唯一词汇数、词汇丰富度
    """
    try:
        char_count = len(text)

        sentences = re.split(r'[。！？.!?]', text)
        sentences = [s for s in sentences if s.strip()]
        sentence_count = len(sentences)

        words = jieba.lcut(text)
        stopwords = get_stopwords()
        filtered_words = [
            word for word in words 
            if len(word) > 1 
            and word not in stopwords
        ]

        unique_words = set(filtered_words)
        lexical_diversity = len(unique_words) / len(filtered_words) if filtered_words else 0

        return {
            'char_count': char_count,
            'sentence_count': sentence_count,
            'word_count': len(filtered_words),
            'unique_word_count': len(unique_words),
            'lexical_diversity': round(lexical_diversity, 4)
        }

    except Exception as e:
        logger.error(f"文本统计失败: {e}")
        return {
            'char_count': 0,
            'sentence_count': 0,
            'word_count': 0,
            'unique_word_count': 0,
            'lexical_diversity': 0
        }


def add_to_history(text, keywords, stats, sentiment, top_n):
    """
    添加分析结果到历史记录（最多保留10条）
    
    Args:
        text: 原始文本
        keywords: 提取的关键词列表
        stats: 文本统计信息
        sentiment: 情感分析结果
        top_n: 提取的关键词数量
    """
    try:
        history_id = int(time.time())
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        history_item = {
            'id': history_id,
            'text': text[:100] + '...' if len(text) > 100 else text,
            'full_text': text,
            'keywords': keywords,
            'stats': stats,
            'sentiment': sentiment,
            'top_n': top_n,
            'timestamp': timestamp
        }

        app.config['history'].insert(0, history_item)

        if len(app.config['history']) > 10:
            app.config['history'] = app.config['history'][:10]

        logger.info(f"历史记录已添加，当前记录数: {len(app.config['history'])}")

    except Exception as e:
        logger.error(f"添加历史记录失败: {e}")


@app.route('/')
def index():
    """首页路由，渲染主页面"""
    return render_template('index.html', history=app.config['history'])


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    文本分析接口
    接收表单提交的文本，返回关键词、统计信息、情感分析和词云
    """
    try:
        text = request.form.get('text', '').strip()
        top_n = int(request.form.get('top_n', 5))

        if not text:
            return jsonify({'error': '请输入要分析的文本'}), 400

        if top_n < 1 or top_n > 20:
            return jsonify({'error': '关键词数量必须在1-20之间'}), 400

        keywords = extract_keywords(text, top_n)
        stats = get_text_stats(text)
        sentiment = analyze_sentiment(text)
        wordcloud_file = generate_wordcloud(keywords)

        add_to_history(text, keywords, stats, sentiment, top_n)

        return jsonify({
            'keywords': keywords,
            'stats': stats,
            'sentiment': sentiment,
            'wordcloud': wordcloud_file,
            'history_id': app.config['history'][0]['id'] if app.config['history'] else 0
        })

    except ValueError as e:
        logger.error(f"参数解析错误: {e}")
        return jsonify({'error': '参数格式错误'}), 400
    except Exception as e:
        logger.error(f"分析失败: {e}")
        return jsonify({'error': '服务器内部错误'}), 500


@app.route('/upload_txt', methods=['POST'])
def upload_txt():
    """
    TXT文件上传接口
    上传TXT文件并分析其中的文本内容
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        if not file.filename.lower().endswith('.txt'):
            return jsonify({'error': '请上传TXT文件'}), 400

        file_content = file.read()
        text = None

        for encoding in ['utf-8', 'gbk', 'gb2312', 'utf-16']:
            try:
                text = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if text is None:
            return jsonify({'error': '文件编码格式不支持，请使用UTF-8或GBK编码'}), 400

        top_n = int(request.form.get('top_n', 5))
        if top_n < 1 or top_n > 20:
            return jsonify({'error': '关键词数量必须在1-20之间'}), 400

        keywords = extract_keywords(text, top_n)
        stats = get_text_stats(text)
        sentiment = analyze_sentiment(text)
        wordcloud_file = generate_wordcloud(keywords)

        add_to_history(text, keywords, stats, sentiment, top_n)

        return jsonify({
            'keywords': keywords,
            'stats': stats,
            'sentiment': sentiment,
            'wordcloud': wordcloud_file,
            'text': text
        })

    except Exception as e:
        logger.error(f"TXT文件处理失败: {e}")
        return jsonify({'error': f'文件处理失败: {str(e)}'}), 500


@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    """
    CSV文件批量处理接口
    上传CSV文件，每行一段文本，批量提取关键词并返回可下载的CSV结果
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        if not file.filename.lower().endswith('.csv'):
            return jsonify({'error': '请上传CSV文件'}), 400

        top_n = int(request.form.get('top_n', 5))
        if top_n < 1 or top_n > 20:
            return jsonify({'error': '关键词数量必须在1-20之间'}), 400

        file_content = file.read()
        content = None

        for encoding in ['utf-8', 'gbk', 'gb2312', 'utf-16']:
            try:
                content = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if content is None:
            return jsonify({'error': '文件编码格式不支持，请使用UTF-8或GBK编码'}), 400

        lines = content.strip().split('\n')
        results = []
        success_count = 0
        fail_count = 0

        for i, line in enumerate(lines):
            line = line.strip().strip('"').strip("'")
            if not line:
                continue

            try:
                keywords = extract_keywords(line, top_n)
                keyword_str = '; '.join([f"{word}({score})" for word, score in keywords])
                results.append({
                    'row': i + 1,
                    'text': line,
                    'keywords': keywords,
                    'keyword_str': keyword_str
                })
                success_count += 1
            except Exception as e:
                logger.warning(f"第 {i+1} 行处理失败: {e}")
                fail_count += 1
                results.append({
                    'row': i + 1,
                    'text': line,
                    'keywords': [],
                    'keyword_str': '处理失败'
                })

        logger.info(f"CSV批量处理完成: 成功{success_count}条, 失败{fail_count}条")

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['序号', '原文', '关键词(权重)'])
        for r in results:
            writer.writerow([r['row'], r['text'], r['keyword_str']])

        output.seek(0)
        csv_data = output.getvalue()

        return Response(
            csv_data,
            mimetype='text/csv; charset=utf-8',
            headers={
                'Content-Disposition': 'attachment; filename=keywords_result.csv',
                'X-Success-Count': str(success_count),
                'X-Fail-Count': str(fail_count)
            }
        )

    except Exception as e:
        logger.error(f"CSV文件处理失败: {e}")
        return jsonify({'error': f'文件处理失败: {str(e)}'}), 500


@app.route('/history/<int:history_id>')
def get_history(history_id):
    """
    获取指定ID的历史记录
    
    Args:
        history_id: 历史记录ID
    """
    try:
        for item in app.config['history']:
            if item['id'] == history_id:
                return jsonify(item)
        return jsonify({'error': '历史记录不存在'}), 404
    except Exception as e:
        logger.error(f"获取历史记录失败: {e}")
        return jsonify({'error': '获取历史记录失败'}), 500


@app.route('/clear_history', methods=['POST'])
def clear_history():
    """清空所有历史记录"""
    try:
        app.config['history'] = []
        logger.info("历史记录已清空")
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"清空历史记录失败: {e}")
        return jsonify({'error': '清空历史记录失败'}), 500


@app.route('/wordcloud/download/<filename>')
def download_wordcloud(filename):
    """
    下载词云图片
    
    Args:
        filename: 词云图片文件名
    """
    try:
        if not re.match(r'^wordcloud_[a-f0-9]+\.png$', filename):
            return jsonify({'error': '无效的文件名'}), 400

        filepath = os.path.join('static/wordclouds', filename)
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True, download_name=filename)
        return jsonify({'error': '文件不存在'}), 404
    except Exception as e:
        logger.error(f"下载词云失败: {e}")
        return jsonify({'error': '下载失败'}), 500


@app.route('/upload_stopwords', methods=['POST'])
def upload_stopwords():
    """
    上传自定义停用词表
    支持TXT或CSV文件，每行一个停用词
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        allowed_extensions = ('.txt', '.csv')
        if not file.filename.lower().endswith(allowed_extensions):
            return jsonify({'error': '请上传TXT或CSV文件'}), 400

        file_content = file.read()
        content = None

        for encoding in ['utf-8', 'gbk', 'gb2312', 'utf-16']:
            try:
                content = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if content is None:
            return jsonify({'error': '文件编码格式不支持'}), 400

        stopwords = set()
        for line in content.split('\n'):
            word = line.strip().strip('"').strip("'")
            if word and len(word) > 0:
                stopwords.add(word)

        app.config['custom_stopwords'] = stopwords
        logger.info(f"自定义停用词已加载，共 {len(stopwords)} 个词")

        return jsonify({
            'success': True,
            'count': len(stopwords),
            'words': list(stopwords)[:20]
        })

    except Exception as e:
        logger.error(f"上传停用词失败: {e}")
        return jsonify({'error': f'上传失败: {str(e)}'}), 500


@app.route('/clear_stopwords', methods=['POST'])
def clear_stopwords():
    """清除所有自定义停用词"""
    try:
        app.config['custom_stopwords'] = set()
        logger.info("自定义停用词已清除")
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"清除停用词失败: {e}")
        return jsonify({'error': '清除失败'}), 500


@app.route('/api/extract', methods=['POST'])
def api_extract():
    """
    REST API: 单条文本关键词提取
    
    Request JSON:
        {
            "text": "要分析的文本",
            "top_n": 5
        }
    
    Response JSON:
        {
            "code": 200,
            "message": "success",
            "data": {
                "keywords": [{"word": "关键词", "score": 1.0}],
                "stats": {...},
                "sentiment": {...}
            }
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'code': 400,
                'message': '请求数据格式错误，请使用JSON格式'
            }), 400

        text = data.get('text', '').strip()
        top_n = int(data.get('top_n', 5))

        if not text:
            return jsonify({
                'code': 400,
                'message': 'text字段不能为空'
            }), 400

        if top_n < 1 or top_n > 20:
            return jsonify({
                'code': 400,
                'message': 'top_n必须在1-20之间'
            }), 400

        keywords = extract_keywords(text, top_n)
        stats = get_text_stats(text)
        sentiment = analyze_sentiment(text)

        return jsonify({
            'code': 200,
            'message': 'success',
            'data': {
                'keywords': [{'word': w, 'score': s} for w, s in keywords],
                'stats': stats,
                'sentiment': sentiment
            }
        })

    except ValueError as e:
        logger.error(f"API参数错误: {e}")
        return jsonify({
            'code': 400,
            'message': '参数格式错误'
        }), 400
    except Exception as e:
        logger.error(f"API处理失败: {e}")
        return jsonify({
            'code': 500,
            'message': '服务器内部错误'
        }), 500


@app.route('/api/batch_extract', methods=['POST'])
def api_batch_extract():
    """
    REST API: 批量文本关键词提取
    
    Request JSON:
        {
            "texts": ["文本1", "文本2"],
            "top_n": 5
        }
    
    Response JSON:
        {
            "code": 200,
            "message": "success",
            "data": [
                {
                    "text": "文本1",
                    "keywords": [{"word": "关键词", "score": 1.0}]
                }
            ]
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'code': 400,
                'message': '请求数据格式错误，请使用JSON格式'
            }), 400

        texts = data.get('texts', [])
        top_n = int(data.get('top_n', 5))

        if not texts or not isinstance(texts, list):
            return jsonify({
                'code': 400,
                'message': 'texts必须是非空数组'
            }), 400

        if top_n < 1 or top_n > 20:
            return jsonify({
                'code': 400,
                'message': 'top_n必须在1-20之间'
            }), 400

        results = []
        for text in texts:
            if isinstance(text, str) and text.strip():
                keywords = extract_keywords(text.strip(), top_n)
                results.append({
                    'text': text,
                    'keywords': [{'word': w, 'score': s} for w, s in keywords]
                })
            else:
                results.append({
                    'text': text,
                    'keywords': [],
                    'error': '无效的文本内容'
                })

        return jsonify({
            'code': 200,
            'message': 'success',
            'data': results
        })

    except ValueError as e:
        logger.error(f"批量API参数错误: {e}")
        return jsonify({
            'code': 400,
            'message': '参数格式错误'
        }), 400
    except Exception as e:
        logger.error(f"批量API处理失败: {e}")
        return jsonify({
            'code': 500,
            'message': '服务器内部错误'
        }), 500


@app.errorhandler(404)
def not_found(error):
    """404错误处理"""
    return jsonify({'error': '接口不存在', 'code': 404}), 404


@app.errorhandler(413)
def too_large(error):
    """请求体过大错误处理"""
    return jsonify({'error': '上传文件过大，最大支持16MB', 'code': 413}), 413


@app.errorhandler(500)
def internal_error(error):
    """500错误处理"""
    logger.error(f"服务器内部错误: {error}")
    return jsonify({'error': '服务器内部错误', 'code': 500}), 500


if __name__ == '__main__':
    logger.info("关键词提取服务启动中...")
    app.run(debug=True, host='0.0.0.0', port=5001)
