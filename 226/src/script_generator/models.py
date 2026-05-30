"""
数据模型模块 - 定义对话剧本的数据结构
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
import json
from datetime import datetime


@dataclass
class Sentiment:
    joy: float = 0.0
    sadness: float = 0.0
    anger: float = 0.0
    fear: float = 0.0
    surprise: float = 0.0
    neutral: float = 0.0
    tension: float = 0.0
    affection: float = 0.0
    _extra: Dict[str, float] = field(default_factory=dict)

    def __init__(
        self,
        joy: float = 0.0,
        sadness: float = 0.0,
        anger: float = 0.0,
        fear: float = 0.0,
        surprise: float = 0.0,
        neutral: float = 0.0,
        tension: float = 0.0,
        affection: float = 0.0,
        **kwargs
    ):
        self.joy = joy
        self.sadness = sadness
        self.anger = anger
        self.fear = fear
        self.surprise = surprise
        self.neutral = neutral
        self.tension = tension
        self.affection = affection
        self._extra = {}
        for key, value in kwargs.items():
            if key not in ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral', 'tension', 'affection']:
                try:
                    self._extra[key] = float(value)
                except (ValueError, TypeError):
                    pass

    def to_dict(self) -> Dict[str, float]:
        result = {
            "joy": self.joy,
            "sadness": self.sadness,
            "anger": self.anger,
            "fear": self.fear,
            "surprise": self.surprise,
            "neutral": self.neutral,
            "tension": self.tension,
            "affection": self.affection
        }
        result.update(self._extra)
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> 'Sentiment':
        kwargs = {}
        for key, value in data.items():
            try:
                kwargs[key] = float(value)
            except (ValueError, TypeError):
                pass
        return cls(**kwargs)

    def dominant_emotion(self) -> str:
        emotions = self.to_dict()
        if not emotions:
            return "neutral"
        return max(emotions.items(), key=lambda x: x[1])[0]


@dataclass
class DialogueLine:
    speaker: str
    text: str
    emotion: str = ""
    sentiment: Sentiment = field(default_factory=Sentiment)
    line_index: int = 0

    def to_dict(self) -> Dict:
        return {
            "line_index": self.line_index,
            "speaker": self.speaker,
            "text": self.text,
            "emotion": self.emotion,
            "sentiment": self.sentiment.to_dict()
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'DialogueLine':
        return cls(
            line_index=data.get("line_index", 0),
            speaker=data.get("speaker", ""),
            text=data.get("text", ""),
            emotion=data.get("emotion", ""),
            sentiment=Sentiment.from_dict(data.get("sentiment", {}))
        )

    def format_with_emotion(self) -> str:
        if self.emotion:
            return f"{self.speaker}（{self.emotion}）：{self.text}"
        return f"{self.speaker}：{self.text}"

    def format_simple(self) -> str:
        return f"{self.speaker}：{self.text}"


@dataclass
class Character:
    name: str
    personality: str
    source: str = ""
    style: str = ""

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "personality": self.personality,
            "source": self.source,
            "style": self.style
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Character':
        return cls(
            name=data.get("name", ""),
            personality=data.get("personality", ""),
            source=data.get("source", ""),
            style=data.get("style", "")
        )


@dataclass
class Script:
    scene: str
    characters: List[Character]
    dialogue: List[DialogueLine]
    version: int = 1
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    overall_arc: str = ""

    def to_dict(self) -> Dict:
        return {
            "scene": self.scene,
            "characters": [c.to_dict() for c in self.characters],
            "dialogue": [d.to_dict() for d in self.dialogue],
            "version": self.version,
            "created_at": self.created_at,
            "overall_arc": self.overall_arc
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Script':
        return cls(
            scene=data.get("scene", ""),
            characters=[Character.from_dict(c) for c in data.get("characters", [])],
            dialogue=[DialogueLine.from_dict(d) for d in data.get("dialogue", [])],
            version=data.get("version", 1),
            created_at=data.get("created_at", datetime.now().isoformat()),
            overall_arc=data.get("overall_arc", "")
        )

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    @classmethod
    def from_json(cls, json_str: str) -> 'Script':
        data = json.loads(json_str)
        return cls.from_dict(data)

    def get_turn_count(self) -> int:
        return len(self.dialogue)

    def get_sentiment_arc(self) -> List[Dict[str, float]]:
        return [line.sentiment.to_dict() for line in self.dialogue]

    def print_console(self, show_emotion: bool = True):
        print(f"\n{'='*60}")
        print(f"场景：{self.scene}")
        print(f"版本：{self.version}")
        print(f"角色：{', '.join([c.name for c in self.characters])}")
        print(f"{'='*60}\n")

        for line in self.dialogue:
            if show_emotion:
                print(line.format_with_emotion())
            else:
                print(line.format_simple())

        print(f"\n{'='*60}")
        if self.overall_arc:
            print(f"情感弧线：{self.overall_arc}")
            print(f"{'='*60}\n")
