import json
import re
from typing import Tuple, List, Dict, Optional
import os

class AnswerEvaluator:
    def __init__(self):
        self.use_llm = False
        try:
            if os.environ.get('OPENAI_API_KEY'):
                from openai import OpenAI
                self.client = OpenAI()
                self.use_llm = True
        except Exception:
            self.use_llm = False

    def evaluate(self, question: Dict, user_answer: str) -> Dict:
        keywords_str = question.get('keywords', '')
        keywords = json.loads(keywords_str) if isinstance(keywords_str, str) and keywords_str else (keywords_str or [])
        
        answer_points = question.get('answer_points', '')
        
        if not user_answer or not user_answer.strip():
            return {
                'score': 1,
                'feedback': '您没有提供答案，请尝试回答问题。',
                'keywords_matched': [],
                'keywords_missing': keywords,
                'matched_ratio': 0.0
            }

        matched_keywords = []
        missing_keywords = []
        user_answer_lower = user_answer.lower()

        for keyword in keywords:
            if re.search(re.escape(str(keyword).lower()), user_answer_lower):
                matched_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)

        total_keywords = len(keywords) if keywords else 1
        matched_ratio = len(matched_keywords) / total_keywords if keywords else 0.5

        answer_length = len(user_answer.split())
        length_score = min(1.0, answer_length / 30)
        
        base_score = 1
        if matched_ratio >= 0.8 and length_score >= 0.6:
            base_score = 5
        elif matched_ratio >= 0.6 and length_score >= 0.4:
            base_score = 4
        elif matched_ratio >= 0.4 and length_score >= 0.3:
            base_score = 3
        elif matched_ratio >= 0.2 or length_score >= 0.2:
            base_score = 2
        else:
            base_score = 1

        if self.use_llm:
            try:
                llm_feedback = self._get_llm_feedback(question, user_answer, base_score, matched_keywords, missing_keywords)
                return {**llm_feedback, 'keywords_matched': matched_keywords, 'keywords_missing': missing_keywords, 'matched_ratio': matched_ratio}
            except Exception:
                pass

        feedback = self._generate_feedback(base_score, matched_keywords, missing_keywords, answer_points)

        return {
            'score': base_score,
            'feedback': feedback,
            'keywords_matched': matched_keywords,
            'keywords_missing': missing_keywords,
            'matched_ratio': matched_ratio
        }

    def _generate_feedback(self, score: int, matched: List[str], missing: List[str], answer_points: str) -> str:
        star_rating = '⭐' * score + '☆' * (5 - score)
        feedback_parts = [f'评分: {star_rating} ({score}/5星)']
        
        if score >= 4:
            feedback_parts.append('很好！您的回答很全面，掌握了核心知识点。')
        elif score >= 3:
            feedback_parts.append('不错！您的回答基本正确，但还有一些可以改进的地方。')
        elif score >= 2:
            feedback_parts.append('继续努力！您的回答提到了一些关键点，但还不够完整。')
        else:
            feedback_parts.append('需要加强学习。建议您复习相关知识点后再尝试。')

        if matched:
            feedback_parts.append(f'\n✅ 已掌握的知识点: {", ".join(matched)}')
        if missing:
            feedback_parts.append(f'\n❌ 需要加强的知识点: {", ".join(missing)}')
        
        if answer_points and score < 4:
            feedback_parts.append(f'\n📚 标准答案要点:\n{answer_points}')

        return '\n'.join(feedback_parts)

    def _get_llm_feedback(self, question: Dict, user_answer: str, base_score: int, matched: List[str], missing: List[str]) -> Dict:
        prompt = f"""
        你是一个专业的AI面试官。请对用户的回答进行评估。

        问题: {question.get('question', '')}
        
        用户回答: {user_answer}
        
        标准答案要点: {question.get('answer_points', '')}
        
        关键词匹配:
        - 已匹配: {matched}
        - 缺失: {missing}
        - 基础评分: {base_score}/5

        请给出:
        1. 最终评分(1-5星)
        2. 详细的反馈建议，包括肯定的方面和改进建议
        3. 补充说明用户可能遗漏的重要知识点

        请用JSON格式返回:
        {{
            "score": 整数评分,
            "feedback": "详细反馈内容"
        }}
        """

        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        try:
            result = json.loads(content)
            if 'score' not in result:
                result['score'] = base_score
            if 'feedback' not in result:
                result['feedback'] = self._generate_feedback(base_score, matched, missing, question.get('answer_points', ''))
        except Exception:
            result = {
                'score': base_score,
                'feedback': self._generate_feedback(base_score, matched, missing, question.get('answer_points', ''))
            }
        
        return result

    def analyze_weaknesses(self, answers: List[Dict]) -> List[str]:
        all_missing = []
        for answer in answers:
            missing_str = answer.get('keywords_missing', '')
            if missing_str:
                try:
                    missing = json.loads(missing_str) if isinstance(missing_str, str) else missing_str
                    all_missing.extend(missing)
                except Exception:
                    pass
        
        weakness_count = {}
        for kw in all_missing:
            weakness_count[kw] = weakness_count.get(kw, 0) + 1
        
        sorted_weaknesses = sorted(weakness_count.items(), key=lambda x: x[1], reverse=True)
        return [kw for kw, count in sorted_weaknesses if count >= 1][:5]
