import re
from typing import Dict, Tuple

class SentimentAnalyzer:
    def __init__(self):
        self.confident_words = [
            '当然', '肯定', '确定', '我认为', '我相信', '毫无疑问', '显然',
            '确实', '一定', '绝对', '没错', '正确', '就是这样', '我很清楚',
            '我熟悉', '我擅长', '有经验', '做过', '实现过', '开发过',
            'confident', 'definitely', 'certainly', 'absolutely', 'sure',
            'definitely', 'I know', 'I think', 'I believe', 'of course'
        ]
        
        self.hesitant_words = [
            '可能', '也许', '大概', '应该是', '好像', '或许', '不太确定',
            '不太清楚', '有点忘了', '记得不太清', '让我想想', '嗯', '呃',
            '这个', '那个', '怎么说呢', '可能吧', '应该吧', '好像是',
            'maybe', 'perhaps', 'not sure', 'I think maybe', 'sort of',
            'kind of', 'probably', 'I guess', 'umm', 'uhh'
        ]
        
        self.negative_words = [
            '不会', '不知道', '不懂', '没学过', '没接触过', '不了解',
            '不清楚', '忘记了', '忘了', '不会做', '没有经验',
            "don't know", 'no idea', 'not sure', 'forgot'
        ]
        
        self.strong_modalities = ['必须', '应该', '需要', '应当', '要']
        self.first_person = ['我', '我的', '我认为', '我觉得', 'I', 'my']

    def analyze(self, text: str) -> Dict:
        if not text or not text.strip():
            return {
                'sentiment': 'neutral',
                'confidence_score': 0.0,
                'is_confident': False,
                'details': {
                    'confident_matches': [],
                    'hesitant_matches': [],
                    'negative_matches': [],
                    'avg_sentence_length': 0,
                    'exclamation_count': 0,
                    'question_count': 0
                }
            }

        text_lower = text.lower()
        sentences = re.split(r'[。！？.!?]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        confident_matches = self._find_matches(text_lower, self.confident_words)
        hesitant_matches = self._find_matches(text_lower, self.hesitant_words)
        negative_matches = self._find_matches(text_lower, self.negative_words)
        first_person_matches = self._find_matches(text_lower, self.first_person)
        
        exclamation_count = text.count('!') + text.count('！')
        question_count = text.count('?') + text.count('？')
        
        has_chinese = bool(re.search(r'[\u4e00-\u9fff]', text))
        if has_chinese:
            text_length = len(text.replace(' ', ''))
            total_words = text_length
            avg_sentence_length = text_length / max(len(sentences), 1)
        else:
            total_words = len(text.split())
            avg_sentence_length = total_words / max(len(sentences), 1)
            text_length = len(text)
        
        confident_score = len(confident_matches) * 2 + len(first_person_matches) * 0.5 + exclamation_count * 0.3
        hesitant_score = len(hesitant_matches) * 2 + question_count * 0.3
        negative_score = len(negative_matches) * 3
        
        if avg_sentence_length > 20:
            confident_score += 1.5
        elif avg_sentence_length > 10:
            confident_score += 0.5
        elif avg_sentence_length < 5:
            hesitant_score += 0.5
            
        if text_length > 100:
            confident_score += 1
        elif text_length > 50:
            confident_score += 0.5

        if not confident_matches and not hesitant_matches and not negative_matches:
            if text_length > 30:
                confident_score += 0.5
            confidence_score = 0.5
        else:
            total_possible = max(confident_score + hesitant_score + negative_score, 1)
            confidence_score = (confident_score - hesitant_score - negative_score) / total_possible
            confidence_score = max(0.0, min(1.0, (confidence_score + 1) / 2))

        if confidence_score >= 0.7:
            sentiment = 'confident'
            is_confident = True
        elif confidence_score >= 0.4:
            sentiment = 'neutral'
            is_confident = False
        else:
            sentiment = 'nervous'
            is_confident = False

        return {
            'sentiment': sentiment,
            'confidence_score': round(confidence_score, 2),
            'is_confident': is_confident,
            'details': {
                'confident_matches': confident_matches,
                'hesitant_matches': hesitant_matches,
                'negative_matches': negative_matches,
                'first_person_matches': first_person_matches,
                'avg_sentence_length': round(avg_sentence_length, 1),
                'text_length': text_length,
                'exclamation_count': exclamation_count,
                'question_count': question_count
            }
        }

    def _find_matches(self, text: str, words: list) -> list:
        matches = []
        for word in words:
            if word.lower() in text:
                matches.append(word)
        return matches

    def analyze_session(self, answers: list) -> Dict:
        all_text = ' '.join([a.get('user_answer', '') for a in answers if a.get('user_answer')])
        overall = self.analyze(all_text)
        
        per_question = []
        for answer in answers:
            if answer.get('user_answer'):
                result = self.analyze(answer['user_answer'])
                per_question.append({
                    'question_id': answer.get('question_id'),
                    'confidence_score': result['confidence_score'],
                    'sentiment': result['sentiment']
                })
        
        avg_confidence = sum([r['confidence_score'] for r in per_question]) / max(len(per_question), 1)
        
        confident_count = sum(1 for r in per_question if r['confidence_score'] >= 0.7)
        nervous_count = sum(1 for r in per_question if r['confidence_score'] < 0.4)
        
        if avg_confidence >= 0.7:
            overall_sentiment = '自信'
        elif avg_confidence >= 0.4:
            overall_sentiment = '一般'
        else:
            overall_sentiment = '紧张/不自信'

        return {
            'overall_confidence': round(avg_confidence, 2),
            'overall_sentiment': overall_sentiment,
            'confident_answers': confident_count,
            'nervous_answers': nervous_count,
            'per_question': per_question,
            'details': overall['details']
        }
