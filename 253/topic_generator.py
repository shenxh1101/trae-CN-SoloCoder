import json
import os
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from models import (
    PodcastTopic,
    GenerationRequest,
    BatchGenerationRequest,
    TopicComparison,
    FeedbackHistory,
    StylePreference
)
from llm_client import LLMClient
from mock_data import generate_mock_style_preference
from config import config


class TopicGenerator:
    def __init__(self):
        self.llm_client = LLMClient()
        self.feedback_history = self._load_feedback()
        self.topics: List[PodcastTopic] = []

    @property
    def is_mock_mode(self) -> bool:
        return self.llm_client.is_mock

    def _load_feedback(self) -> FeedbackHistory:
        if os.path.exists(config.feedback_file):
            try:
                with open(config.feedback_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return FeedbackHistory(**data)
            except:
                pass
        return FeedbackHistory()

    def _save_feedback(self):
        self.feedback_history.updated_at = datetime.now().isoformat()
        with open(config.feedback_file, 'w', encoding='utf-8') as f:
            json.dump(self.feedback_history.model_dump(), f, ensure_ascii=False, indent=2)

    def load_style_from_history(self, history_file: str) -> StylePreference:
        if not os.path.exists(history_file):
            raise FileNotFoundError(f"历史文件不存在: {history_file}")

        with open(history_file, 'r', encoding='utf-8') as f:
            history_topics = json.load(f)

        if not isinstance(history_topics, list):
            raise ValueError("历史文件格式错误，需要是JSON数组")

        style_pref = self.llm_client.analyze_style_preference(history_topics)
        self.feedback_history.style_preference = style_pref
        self._save_feedback()
        return style_pref

    def generate(
        self,
        request: GenerationRequest,
        use_feedback: bool = True
    ) -> List[PodcastTopic]:
        style_pref = None
        if use_feedback and self.feedback_history.style_preference.learned_from_history:
            style_pref = self.feedback_history.style_preference
        elif request.style_reference:
            style_pref = self.load_style_from_history(request.style_reference)

        raw_topics = self.llm_client.generate_topics(
            position=request.position,
            audience=request.audience,
            keywords=request.keywords,
            count=request.count,
            style_pref=style_pref
        )

        topics = []
        for i, raw in enumerate(raw_topics):
            topic = PodcastTopic(
                id=str(uuid.uuid4())[:8],
                title=raw.get('title', ''),
                outline=raw.get('outline', []),
                guest_type=raw.get('guest_type', ''),
                duration=raw.get('duration', '30-45分钟')
            )
            topics.append(topic)

        self.topics = topics
        return topics

    def batch_generate(
        self,
        batch_request: BatchGenerationRequest
    ) -> Tuple[List[List[PodcastTopic]], Optional[List[TopicComparison]]]:
        all_topics = []
        batch_results = []

        for req in batch_request.requests:
            topics = self.generate(req, use_feedback=False)
            all_topics.append(topics)
            batch_results.append({
                "position": req.position,
                "audience": req.audience,
                "keywords": req.keywords,
                "topics_count": len(topics),
                "sample_titles": [t.title for t in topics[:3]]
            })

        comparisons = None
        if batch_request.compare:
            comp_results = self.llm_client.compare_topics(batch_results)
            comparisons = []
            for i, comp in enumerate(comp_results):
                comparisons.append(TopicComparison(
                    position=comp.get('position', batch_results[i]['position']),
                    keyword_match_score=comp.get('keyword_match_score', 0),
                    audience_fit_score=comp.get('audience_fit_score', 0),
                    overall_score=comp.get('overall_score', 0),
                    topics=all_topics[i]
                ))

        return all_topics, comparisons

    def add_broadcast_windows(self, keywords: str) -> List[PodcastTopic]:
        for topic in self.topics:
            topic.broadcast_window = self.llm_client.generate_broadcast_window(
                keywords, topic.title
            )
        return self.topics

    def add_tasks(self) -> List[PodcastTopic]:
        for topic in self.topics:
            topic.tasks = self.llm_client.generate_tasks(topic)
        return self.topics

    def set_feedback(self, topic_id: str, feedback: str):
        for topic in self.topics:
            if topic.id == topic_id:
                topic.feedback = feedback
                topic_dict = topic.model_dump()
                if feedback == 'like':
                    self.feedback_history.liked_topics.append(topic_dict)
                elif feedback == 'dislike':
                    self.feedback_history.disliked_topics.append(topic_dict)
                break
        self._save_feedback()
        self._update_style_from_feedback()

    def _update_style_from_feedback(self):
        liked_count = len(self.feedback_history.liked_topics)
        if liked_count >= 3:
            recent_liked = self.feedback_history.liked_topics[-10:]
            style_pref = self.llm_client.analyze_style_preference(recent_liked)
            self.feedback_history.style_preference = style_pref
            self._save_feedback()

    def get_feedback_stats(self) -> Dict[str, Any]:
        return {
            'liked': len(self.feedback_history.liked_topics),
            'disliked': len(self.feedback_history.disliked_topics),
            'style_learned': self.feedback_history.style_preference.learned_from_history,
            'mock_mode': self.is_mock_mode
        }
