from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PodcastTopic(BaseModel):
    id: str = Field(default="")
    title: str = Field(description="选题标题")
    outline: List[str] = Field(description="讨论大纲要点列表")
    guest_type: str = Field(description="建议邀请的嘉宾类型")
    duration: str = Field(description="预估时长")
    broadcast_window: str = Field(default="", description="推荐播出时间窗口")
    tasks: List[str] = Field(default_factory=list, description="待办任务清单")
    feedback: str = Field(default="none", description="用户反馈: like/dislike/none")
    style_tags: List[str] = Field(default_factory=list, description="风格标签")


class GenerationRequest(BaseModel):
    position: str = Field(description="播客定位")
    audience: str = Field(description="目标听众")
    keywords: str = Field(description="热点关键词")
    count: int = Field(default=10, description="生成数量")
    style_reference: Optional[str] = Field(default=None, description="风格参考文件路径")


class BatchGenerationRequest(BaseModel):
    requests: List[GenerationRequest]
    compare: bool = Field(default=True)


class TopicComparison(BaseModel):
    position: str
    keyword_match_score: float
    audience_fit_score: float
    overall_score: float
    topics: List[PodcastTopic]


class StylePreference(BaseModel):
    title_length: str = "medium"
    tone: str = "professional"
    structure: str = "structured"
    preferred_tags: List[str] = Field(default_factory=list)
    learned_from_history: bool = False


class FeedbackHistory(BaseModel):
    liked_topics: List[Dict[str, Any]] = Field(default_factory=list)
    disliked_topics: List[Dict[str, Any]] = Field(default_factory=list)
    style_preference: StylePreference = Field(default_factory=StylePreference)
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
