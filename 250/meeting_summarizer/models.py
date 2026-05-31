from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class MeetingType(str, Enum):
    STANDUP = "standup"
    REVIEW = "review"
    BRAINSTORM = "brainstorm"
    GENERAL = "general"


class ActionItem(BaseModel):
    id: str
    task: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    description: Optional[str] = None
    related_topics: List[str] = Field(default_factory=list)
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
    source_line: Optional[int] = None


class DiscussionPoint(BaseModel):
    topic: str
    summary: str
    participants: List[str] = Field(default_factory=list)


class ControversialIssue(BaseModel):
    topic: str
    opposing_views: List[str] = Field(default_factory=list)
    resolution: Optional[str] = None


class MeetingSummary(BaseModel):
    title: str
    meeting_type: MeetingType
    date: Optional[str] = None
    participants: List[str] = Field(default_factory=list)
    duration_minutes: Optional[int] = None
    main_topic: str
    key_discussion_points: List[DiscussionPoint] = Field(default_factory=list)
    controversial_issues: List[ControversialIssue] = Field(default_factory=list)
    decisions: List[str] = Field(default_factory=list)
    action_items: List[ActionItem] = Field(default_factory=list)
    raw_transcript: str


class BatchAnalysis(BaseModel):
    total_meetings: int
    total_action_items: int
    action_items_by_assignee: dict = Field(default_factory=dict)
    action_items_by_priority: dict = Field(default_factory=dict)
    common_topics: List[str] = Field(default_factory=list)
    meetings: List[MeetingSummary] = Field(default_factory=list)
