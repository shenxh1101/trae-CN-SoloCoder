from __future__ import annotations
import json
import os
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Callable, Any
from datetime import datetime
from enum import Enum, auto


class AchievementCategory(Enum):
    GENERAL = auto()
    COLLECTION = auto()
    RANKED = auto()
    GAMEPLAY = auto()
    DAILY = auto()
    SPECIAL = auto()


@dataclass
class Achievement:
    achievement_id: str
    name: str
    description: str
    category: AchievementCategory
    target_value: int = 1
    icon: str = "🏅"
    points: int = 10
    is_daily: bool = False
    is_hidden: bool = False

    def to_dict(self) -> Dict:
        return {
            "achievement_id": self.achievement_id,
            "name": self.name,
            "description": self.description,
            "category": self.category.name,
            "target_value": self.target_value,
            "icon": self.icon,
            "points": self.points,
            "is_daily": self.is_daily,
            "is_hidden": self.is_hidden,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "Achievement":
        return cls(
            achievement_id=data["achievement_id"],
            name=data["name"],
            description=data["description"],
            category=AchievementCategory[data["category"]],
            target_value=data.get("target_value", 1),
            icon=data.get("icon", "🏅"),
            points=data.get("points", 10),
            is_daily=data.get("is_daily", False),
            is_hidden=data.get("is_hidden", False),
        )


@dataclass
class AchievementProgress:
    achievement_id: str
    current_value: int = 0
    unlocked: bool = False
    unlocked_at: Optional[datetime] = None

    def to_dict(self) -> Dict:
        return {
            "achievement_id": self.achievement_id,
            "current_value": self.current_value,
            "unlocked": self.unlocked,
            "unlocked_at": self.unlocked_at.isoformat() if self.unlocked_at else None,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "AchievementProgress":
        progress = cls(
            achievement_id=data["achievement_id"],
            current_value=data.get("current_value", 0),
            unlocked=data.get("unlocked", False),
        )
        if data.get("unlocked_at"):
            progress.unlocked_at = datetime.fromisoformat(data["unlocked_at"])
        return progress


class AchievementDefinition:
    @staticmethod
    def get_all_achievements() -> List[Achievement]:
        return [
            Achievement(
                achievement_id="first_game",
                name="初出茅庐",
                description="完成第一场对战",
                category=AchievementCategory.GENERAL,
                target_value=1,
                icon="🎮",
                points=10,
            ),
            Achievement(
                achievement_id="first_win",
                name="首胜",
                description="赢得第一场对战",
                category=AchievementCategory.GENERAL,
                target_value=1,
                icon="🏆",
                points=20,
            ),
            Achievement(
                achievement_id="play_10_games",
                name="卡牌新手",
                description="累计完成 10 场对战",
                category=AchievementCategory.GENERAL,
                target_value=10,
                icon="🎯",
                points=30,
            ),
            Achievement(
                achievement_id="play_50_games",
                name="卡牌老手",
                description="累计完成 50 场对战",
                category=AchievementCategory.GENERAL,
                target_value=50,
                icon="🎖️",
                points=50,
            ),
            Achievement(
                achievement_id="win_10_games",
                name="小试牛刀",
                description="累计赢得 10 场对战",
                category=AchievementCategory.GENERAL,
                target_value=10,
                icon="⭐",
                points=40,
            ),
            Achievement(
                achievement_id="win_50_games",
                name="常胜将军",
                description="累计赢得 50 场对战",
                category=AchievementCategory.GENERAL,
                target_value=50,
                icon="🌟",
                points=100,
            ),
            Achievement(
                achievement_id="win_streak_3",
                name="三连胜",
                description="获得 3 连胜",
                category=AchievementCategory.GAMEPLAY,
                target_value=3,
                icon="🔥",
                points=30,
            ),
            Achievement(
                achievement_id="win_streak_5",
                name="五连胜",
                description="获得 5 连胜",
                category=AchievementCategory.GAMEPLAY,
                target_value=5,
                icon="🔥",
                points=50,
            ),
            Achievement(
                achievement_id="win_streak_10",
                name="十连胜",
                description="获得 10 连胜",
                category=AchievementCategory.GAMEPLAY,
                target_value=10,
                icon="💥",
                points=100,
            ),
            Achievement(
                achievement_id="deal_100_damage",
                name="伤害制造者",
                description="累计造成 100 点伤害",
                category=AchievementCategory.GAMEPLAY,
                target_value=100,
                icon="⚔️",
                points=30,
            ),
            Achievement(
                achievement_id="deal_1000_damage",
                name="伤害之王",
                description="累计造成 1000 点伤害",
                category=AchievementCategory.GAMEPLAY,
                target_value=1000,
                icon="💀",
                points=100,
            ),
            Achievement(
                achievement_id="heal_100_health",
                name="治疗师",
                description="累计恢复 100 点生命值",
                category=AchievementCategory.GAMEPLAY,
                target_value=100,
                icon="💚",
                points=30,
            ),
            Achievement(
                achievement_id="otk_30",
                name="OTK",
                description="单回合造成 30 点伤害",
                category=AchievementCategory.GAMEPLAY,
                target_value=1,
                icon="💥",
                points=50,
            ),
            Achievement(
                achievement_id="summon_5_taunt",
                name="嘲讽大师",
                description="单局召唤 5 个嘲讽随从",
                category=AchievementCategory.GAMEPLAY,
                target_value=5,
                icon="🛡️",
                points=40,
            ),
            Achievement(
                achievement_id="survive_10_turns",
                name="坚韧不拔",
                description="在生命值低于 5 时坚持 10 回合",
                category=AchievementCategory.GAMEPLAY,
                target_value=1,
                icon="🏋️",
                points=50,
            ),
            Achievement(
                achievement_id="reach_silver",
                name="天梯新星",
                description="达到白银段位",
                category=AchievementCategory.RANKED,
                target_value=1,
                icon="🥈",
                points=50,
            ),
            Achievement(
                achievement_id="reach_gold",
                name="传说之路",
                description="达到黄金段位",
                category=AchievementCategory.RANKED,
                target_value=1,
                icon="🥇",
                points=100,
            ),
            Achievement(
                achievement_id="reach_platinum",
                name="铂金之路",
                description="达到铂金段位",
                category=AchievementCategory.RANKED,
                target_value=1,
                icon="💎",
                points=150,
            ),
            Achievement(
                achievement_id="reach_diamond",
                name="钻石之路",
                description="达到钻石段位",
                category=AchievementCategory.RANKED,
                target_value=1,
                icon="💠",
                points=200,
            ),
            Achievement(
                achievement_id="reach_master",
                name="大师之路",
                description="达到大师段位",
                category=AchievementCategory.RANKED,
                target_value=1,
                icon="👑",
                points=300,
            ),
            Achievement(
                achievement_id="reach_legend",
                name="传说之路",
                description="达到传说段位",
                category=AchievementCategory.RANKED,
                target_value=1,
                icon="🏆",
                points=500,
            ),
            Achievement(
                achievement_id="collect_50_cards",
                name="卡牌收藏家",
                description="收集 50 张不同的卡牌",
                category=AchievementCategory.COLLECTION,
                target_value=50,
                icon="📚",
                points=50,
            ),
            Achievement(
                achievement_id="collect_all_neutral",
                name="中立专家",
                description="收集所有中立卡牌",
                category=AchievementCategory.COLLECTION,
                target_value=1,
                icon="🌍",
                points=200,
            ),
            Achievement(
                achievement_id="build_first_deck",
                name="卡组大师",
                description="构建一个完整的卡组",
                category=AchievementCategory.COLLECTION,
                target_value=1,
                icon="🃏",
                points=20,
            ),
            Achievement(
                achievement_id="collect_10_legendary",
                name="传说收藏家",
                description="收集 10 张传说卡牌",
                category=AchievementCategory.COLLECTION,
                target_value=10,
                icon="✨",
                points=150,
            ),
            Achievement(
                achievement_id="daily_win",
                name="每日胜利",
                description="每日赢得一场对战",
                category=AchievementCategory.DAILY,
                target_value=1,
                icon="📅",
                points=25,
                is_daily=True,
            ),
            Achievement(
                achievement_id="daily_3_games",
                name="每日对战",
                description="每日完成 3 场对战",
                category=AchievementCategory.DAILY,
                target_value=3,
                icon="🎯",
                points=30,
                is_daily=True,
            ),
            Achievement(
                achievement_id="win_with_all_classes",
                name="全职业大师",
                description="使用所有职业各赢得一场对战",
                category=AchievementCategory.SPECIAL,
                target_value=5,
                icon="🎖️",
                points=200,
            ),
            Achievement(
                achievement_id="win_without_loss",
                name="完美赛季",
                description="在一个赛季中保持 80% 以上胜率",
                category=AchievementCategory.SPECIAL,
                target_value=1,
                icon="💯",
                points=300,
                is_hidden=True,
            ),
            Achievement(
                achievement_id="played_one_year",
                name="忠实玩家",
                description="持续游玩一整年",
                category=AchievementCategory.SPECIAL,
                target_value=365,
                icon="🎂",
                points=500,
                is_hidden=True,
            ),
        ]


class AchievementManager:
    def __init__(self, data_path: str = "achievements.json"):
        self.data_path = data_path
        self.achievements: Dict[str, Achievement] = {}
        self.player_progress: Dict[str, Dict[str, AchievementProgress]] = {}
        self.player_stats: Dict[str, Dict[str, Any]] = {}
        self.achievement_unlock_callbacks: List[Callable[[str, Achievement], None]] = []

        self._load_achievements()
        self._load_data()

    def _load_achievements(self):
        for achievement in AchievementDefinition.get_all_achievements():
            self.achievements[achievement.achievement_id] = achievement

    def _load_data(self):
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for player_id, progress_data in data.get("player_progress", {}).items():
                        self.player_progress[player_id] = {
                            aid: AchievementProgress.from_dict(pd)
                            for aid, pd in progress_data.items()
                        }
                    self.player_stats = data.get("player_stats", {})
                    for player_id, stats in self.player_stats.items():
                        if "cards_collected" in stats and isinstance(stats["cards_collected"], list):
                            stats["cards_collected"] = set(stats["cards_collected"])
                        if "classes_won" in stats and isinstance(stats["classes_won"], list):
                            stats["classes_won"] = set(stats["classes_won"])
            except Exception as e:
                print(f"Error loading achievement data: {e}")

    def _save_data(self):
        try:
            serializable_stats = {}
            for pid, stats in self.player_stats.items():
                serializable_stats[pid] = {}
                for k, v in stats.items():
                    if isinstance(v, set):
                        serializable_stats[pid][k] = list(v)
                    else:
                        serializable_stats[pid][k] = v

            data = {
                "player_progress": {
                    pid: {aid: p.to_dict() for aid, p in progress.items()}
                    for pid, progress in self.player_progress.items()
                },
                "player_stats": serializable_stats,
            }
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving achievement data: {e}")

    def _get_or_create_progress(
        self, player_id: str, achievement_id: str
    ) -> AchievementProgress:
        if player_id not in self.player_progress:
            self.player_progress[player_id] = {}

        if achievement_id not in self.player_progress[player_id]:
            self.player_progress[player_id][achievement_id] = AchievementProgress(
                achievement_id=achievement_id
            )

        return self.player_progress[player_id][achievement_id]

    def _get_player_stats(self, player_id: str) -> Dict[str, Any]:
        if player_id not in self.player_stats:
            self.player_stats[player_id] = {
                "total_games": 0,
                "total_wins": 0,
                "total_damage_dealt": 0,
                "total_healing_done": 0,
                "current_streak": 0,
                "max_streak": 0,
                "cards_collected": set(),
                "classes_won": set(),
            }
        return self.player_stats[player_id]

    def track_event(self, player_id: str, event_type: str, **kwargs):
        stats = self._get_player_stats(player_id)

        if event_type == "game_played":
            stats["total_games"] += 1
            self._check_and_unlock(player_id, "first_game", stats["total_games"])
            self._check_and_unlock(player_id, "play_10_games", stats["total_games"])
            self._check_and_unlock(player_id, "play_50_games", stats["total_games"])
            self._check_and_unlock(player_id, "daily_3_games", stats.get("daily_games", 0))

        elif event_type == "game_won":
            stats["total_wins"] += 1
            stats["current_streak"] += 1
            stats["max_streak"] = max(stats["max_streak"], stats["current_streak"])
            self._check_and_unlock(player_id, "first_win", stats["total_wins"])
            self._check_and_unlock(player_id, "win_10_games", stats["total_wins"])
            self._check_and_unlock(player_id, "win_50_games", stats["total_wins"])
            self._check_and_unlock(player_id, "win_streak_3", stats["current_streak"])
            self._check_and_unlock(player_id, "win_streak_5", stats["current_streak"])
            self._check_and_unlock(player_id, "win_streak_10", stats["current_streak"])
            self._check_and_unlock(player_id, "daily_win", stats.get("daily_wins", 0))

            player_class = kwargs.get("player_class")
            if player_class:
                stats.setdefault("classes_won", set()).add(player_class)
                self._check_and_unlock(
                    player_id, "win_with_all_classes", len(stats["classes_won"])
                )

        elif event_type == "game_lost":
            stats["current_streak"] = 0

        elif event_type == "damage_dealt":
            amount = kwargs.get("amount", 0)
            stats["total_damage_dealt"] += amount
            self._check_and_unlock(
                player_id, "deal_100_damage", stats["total_damage_dealt"]
            )
            self._check_and_unlock(
                player_id, "deal_1000_damage", stats["total_damage_dealt"]
            )

            if kwargs.get("is_otk", False):
                self._check_and_unlock(player_id, "otk_30", 1)

        elif event_type == "healing_done":
            amount = kwargs.get("amount", 0)
            stats["total_healing_done"] += amount
            self._check_and_unlock(
                player_id, "heal_100_health", stats["total_healing_done"]
            )

        elif event_type == "taunt_summoned":
            count = kwargs.get("count", 0)
            self._check_and_unlock(player_id, "summon_5_taunt", count)

        elif event_type == "card_collected":
            card_id = kwargs.get("card_id")
            if card_id:
                stats.setdefault("cards_collected", set()).add(card_id)
                self._check_and_unlock(
                    player_id, "collect_50_cards", len(stats["cards_collected"])
                )

        elif event_type == "deck_built":
            self._check_and_unlock(player_id, "build_first_deck", 1)

        elif event_type == "rank_reached":
            rank_name = kwargs.get("rank_name", "")
            rank_mapping = {
                "SILVER": "reach_silver",
                "GOLD": "reach_gold",
                "PLATINUM": "reach_platinum",
                "DIAMOND": "reach_diamond",
                "MASTER": "reach_master",
                "LEGEND": "reach_legend",
            }
            if rank_name in rank_mapping:
                self._check_and_unlock(player_id, rank_mapping[rank_name], 1)

        self._save_data()

    def _check_and_unlock(self, player_id: str, achievement_id: str, current_value: int):
        if achievement_id not in self.achievements:
            return

        achievement = self.achievements[achievement_id]
        progress = self._get_or_create_progress(player_id, achievement_id)

        if progress.unlocked:
            return

        progress.current_value = max(progress.current_value, current_value)

        if progress.current_value >= achievement.target_value:
            progress.unlocked = True
            progress.unlocked_at = datetime.now()
            self._notify_unlock(player_id, achievement)

    def _notify_unlock(self, player_id: str, achievement: Achievement):
        for callback in self.achievement_unlock_callbacks:
            try:
                callback(player_id, achievement)
            except Exception as e:
                print(f"Error in achievement unlock callback: {e}")

    def add_unlock_callback(self, callback: Callable[[str, Achievement], None]):
        self.achievement_unlock_callbacks.append(callback)

    def get_player_achievements(self, player_id: str) -> List[Dict]:
        result = []
        for achievement_id, achievement in self.achievements.items():
            if achievement.is_hidden:
                continue

            progress = self._get_or_create_progress(player_id, achievement_id)
            result.append({
                "achievement": achievement,
                "progress": progress,
                "is_unlocked": progress.unlocked,
                "progress_percent": min(
                    100, (progress.current_value / achievement.target_value) * 100
                ) if achievement.target_value > 0 else 100,
            })
        return result

    def get_unlocked_achievements(self, player_id: str) -> List[Achievement]:
        unlocked = []
        for achievement_id, achievement in self.achievements.items():
            progress = self._get_or_create_progress(player_id, achievement_id)
            if progress.unlocked:
                unlocked.append(achievement)
        return unlocked

    def get_total_points(self, player_id: str) -> int:
        return sum(
            a.points for a in self.get_unlocked_achievements(player_id)
        )

    def get_daily_achievements(self, player_id: str) -> List[Dict]:
        result = []
        for achievement_id, achievement in self.achievements.items():
            if not achievement.is_daily:
                continue

            progress = self._get_or_create_progress(player_id, achievement_id)
            result.append({
                "achievement": achievement,
                "progress": progress,
                "is_unlocked": progress.unlocked,
            })
        return result

    def reset_daily_achievements(self, player_id: str):
        for achievement_id, achievement in self.achievements.items():
            if achievement.is_daily:
                if player_id in self.player_progress:
                    self.player_progress[player_id].pop(achievement_id, None)
        self._save_data()

    def get_category_achievements(
        self, player_id: str, category: AchievementCategory
    ) -> List[Dict]:
        all_achievements = self.get_player_achievements(player_id)
        return [
            a for a in all_achievements
            if a["achievement"].category == category
        ]

    def get_achievement_by_id(self, achievement_id: str) -> Optional[Achievement]:
        return self.achievements.get(achievement_id)
