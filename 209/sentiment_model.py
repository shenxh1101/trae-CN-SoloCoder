import re
import jieba
import numpy as np
from langdetect import detect
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import pickle
import os


class SentimentModel:
    def __init__(self):
        self.cn_model = None
        self.en_model = None
        self._init_chinese_words()
        self._init_english_words()
        self._train_models()

    def _init_chinese_words(self):
        self.cn_positive_words = [
            '好', '棒', '优秀', '喜欢', '开心', '快乐', '满意', '惊喜', '赞', '厉害',
            '完美', '不错', '给力', '精彩', '感谢', '爱', '幸福', '爽', '棒极了', '超赞',
            '优秀', '出色', '卓越', '成功', '胜利', '美好', '温馨', '浪漫', '感动', '激动'
        ]
        self.cn_negative_words = [
            '差', '烂', '糟糕', '讨厌', '难过', '失望', '垃圾', '恶心', '差', '垃圾',
            '失败', '痛苦', '愤怒', '郁闷', '悲伤', '焦虑', '害怕', '担心', '生气', '烦',
            '糟糕透顶', '无语', '无奈', '遗憾', '不满', '抗议', '拒绝', '批评', '指责', '诈骗'
        ]

    def _init_english_words(self):
        self.en_positive_words = [
            'good', 'great', 'excellent', 'love', 'happy', 'satisfied', 'amazing', 'awesome',
            'wonderful', 'fantastic', 'nice', 'perfect', 'brilliant', 'thank', 'joy', 'delight',
            'pleased', 'glad', 'beautiful', 'superb', 'outstanding', 'remarkable', 'splendid'
        ]
        self.en_negative_words = [
            'bad', 'terrible', 'awful', 'hate', 'sad', 'disappointed', 'worst', 'poor',
            'horrible', 'disgusting', 'angry', 'upset', 'frustrated', 'annoyed', 'depressed',
            'miserable', 'sucks', 'rubbish', 'waste', 'failed', 'failure', 'pathetic'
        ]

    def _train_models(self):
        cn_texts = []
        cn_labels = []
        for word in self.cn_positive_words:
            cn_texts.append(word)
            cn_labels.append('positive')
        for word in self.cn_negative_words:
            cn_texts.append(word)
            cn_labels.append('negative')

        en_texts = []
        en_labels = []
        for word in self.en_positive_words:
            en_texts.append(word)
            en_labels.append('positive')
        for word in self.en_negative_words:
            en_texts.append(word)
            en_labels.append('negative')

        def chinese_tokenizer(text):
            return list(jieba.cut(text))

        self.cn_model = Pipeline([
            ('vectorizer', CountVectorizer(tokenizer=chinese_tokenizer, token_pattern=None)),
            ('classifier', MultinomialNB())
        ])
        self.cn_model.fit(cn_texts, cn_labels)

        self.en_model = Pipeline([
            ('vectorizer', CountVectorizer()),
            ('classifier', MultinomialNB())
        ])
        self.en_model.fit(en_texts, en_labels)

    def detect_language(self, text):
        try:
            lang = detect(text)
            if lang == 'zh-cn' or lang == 'zh-tw':
                return 'chinese'
            elif lang == 'en':
                return 'english'
            else:
                return 'english'
        except:
            return 'english'

    def analyze(self, text, positive_threshold=0.6, negative_threshold=0.6):
        lang = self.detect_language(text)
        
        if lang == 'chinese':
            model = self.cn_model
            pos_words = self.cn_positive_words
            neg_words = self.cn_negative_words
        else:
            model = self.en_model
            text = text.lower()
            pos_words = self.en_positive_words
            neg_words = self.en_negative_words

        prediction = model.predict([text])[0]
        proba = model.predict_proba([text])[0]
        class_idx = list(model.classes_).index(prediction)
        confidence = float(proba[class_idx])

        pos_count = sum(1 for word in pos_words if word in text)
        neg_count = sum(1 for word in neg_words if word in text)

        if lang == 'chinese':
            words = list(jieba.cut(text))
            total_words = [w for w in words if w.strip()]
        else:
            words = text.split()
            total_words = [w for w in words if w.strip()]
        
        if len(total_words) > 0:
            pos_ratio = pos_count / len(total_words)
            neg_ratio = neg_count / len(total_words)
            if pos_ratio > neg_ratio:
                prediction = 'positive'
                confidence = min(1.0, 0.5 + pos_ratio * 2)
            elif neg_ratio > pos_ratio:
                prediction = 'negative'
                confidence = min(1.0, 0.5 + neg_ratio * 2)
            else:
                prediction = 'neutral'
                confidence = 0.5

        if prediction == 'positive' and confidence < positive_threshold:
            prediction = 'neutral'
        elif prediction == 'negative' and confidence < negative_threshold:
            prediction = 'neutral'

        return {
            'sentiment': prediction,
            'confidence': round(confidence, 4),
            'language': lang
        }
