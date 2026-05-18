from __future__ import annotations
import json
import os
import random
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from enum import Enum, auto


class Rank(Enum):
    BRONZE = auto()
    SILVER = auto()
    GOLD = auto()
    PLATINUM = auto()
    DIAMOND = auto()
    MASTER = auto()
    LEGEND = auto()


@dataclass
class RankInfo:
    rank: Rank
    name: str
    min_mmr: int
    max_mmr: int
    icon: str
    color: str


RANK_INFO = {
    Rank.BRONZE: RankInfo(Rank.BRONZE, "青铜", 0, 999, "🥉", "#CD7F32"),
    Rank.SILVER: RankInfo(Rank.SILVER, "白银", 1000, 1999, "🥈", "#C0C0C0"),
    Rank.GOLD: RankInfo(Rank.GOLD, "黄金", 2000, 2999, "🥇", "#FFD700"),
    Rank.PLATINUM: RankInfo(Rank.PLATINUM, "铂金", 3000, 3999, "💎", "#E5E4E2"),
    Rank.DIAMOND: RankInfo(Rank.DIAMOND, "钻石", 4000, 4999, "💠", "#B9F2FF"),
    Rank.MASTER: RankInfo(Rank.MASTER, "大师", 5000, 9999, "👑", "#9966CC"),
    Rank.LEGEND: RankInfo(Rank.LEGEND, "传说", 10000, 99999, "🏆", "#FF6B6B"),
}


@dataclass
class PlayerStats:
    player_id: str
    player_name: str
    mmr: int = 1500
    wins: int = 0
    losses: int = 0
    current_streak: int = 0
    max_streak: int = 0
    total_games: int = 0
    rank: Rank = Rank.BRONZE
    last_updated: datetime = field(default_factory=datetime.now)

    @property
    def win_rate(self) -> float:
        if self.total_games == 0:
            return 0.0
        return self.wins / self.total_games

    def update_rank(self):
        self.last_updated = datetime.now()

        for rank, info in RANK_INFO.items():
            if info.min_mmr <= self.mmr <= info.max_mmr:
                self.rank = rank
                break

        if self.mmr >= 10000:
            self.rank = Rank.LEGEND

    def to_dict(self) -> Dict:
        return {
            "player_id": self.player_id,
            "player_name": self.player_name,
            "mmr": self.mmr,
            "wins": self.wins,
            "losses": self.losses,
            "current_streak": self.current_streak,
            "max_streak": self.max_streak,
            "total_games": self.total_games,
            "rank": self.rank.name,
            "last_updated": self.last_updated.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "PlayerStats":
        stats = cls(
            player_id=data["player_id"],
            player_name=data["player_name"],
            mmr=data.get("mmr", 1500),
            wins=data.get("wins", 0),
            losses=data.get("losses", 0),
            current_streak=data.get("current_streak", 0),
            max_streak=data.get("max_streak", 0),
            total_games=data.get("total_games", 0),
        )
        stats.rank = Rank[data.get("rank", "BRONZE")]
        stats.last_updated = datetime.fromisoformat(data.get("last_updated", datetime.now().isoformat()))
        return stats


@dataclass
class Match:
    match_id: str
    player1_id: str
    player2_id: str
    winner_id: Optional[str] = None
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    player1_mmr_change: int = 0
    player2_mmr_change: int = 0

    def to_dict(self) -> Dict:
        return {
            "match_id": self.match_id,
            "player1_id": self.player1_id,
            "player2_id": self.player2_id,
            "winner_id": self.winner_id,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "player1_mmr_change": self.player1_mmr_change,
            "player2_mmr_change": self.player2_mmr_change,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "Match":
        match = cls(
            match_id=data["match_id"],
            player1_id=data["player1_id"],
            player2_id=data["player2_id"],
            winner_id=data.get("winner_id"),
            player1_mmr_change=data.get("player1_mmr_change", 0),
            player2_mmr_change=data.get("player2_mmr_change", 0),
        )
        match.start_time = datetime.fromisoformat(data["start_time"])
        if data.get("end_time"):
            match.end_time = datetime.fromisoformat(data["end_time"])
        return match


class LadderSystem:
    def __init__(self, data_path: str = "ladder_data.json"):
        self.data_path = data_path
        self.player_stats: Dict[str, PlayerStats] = {}
        self.match_history: List[Match] = []
        self._load_data()

    def _load_data(self):
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for ps_data in data.get("player_stats", []):
                        stats = PlayerStats.from_dict(ps_data)
                        self.player_stats[stats.player_id] = stats
                    for match_data in data.get("match_history", []):
                        match = Match.from_dict(match_data)
                        self.match_history.append(match)
            except Exception as e:
                print(f"Error loading ladder data: {e}")

    def _save_data(self):
        try:
            data = {
                "player_stats": [ps.to_dict() for ps in self.player_stats.values()],
                "match_history": [m.to_dict() for m in self.match_history],
            }
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving ladder data: {e}")

    def get_or_create_player(self, player_id: str, player_name: str) -> PlayerStats:
        if player_id not in self.player_stats:
            self.player_stats[player_id] = PlayerStats(
                player_id=player_id,
                player_name=player_name,
            )
            self._save_data()
        return self.player_stats[player_id]

    def get_player_stats(self, player_id: str) -> Optional[PlayerStats]:
        return self.player_stats.get(player_id)

    def calculate_mmr_change(
        self,
        winner_mmr: int,
        loser_mmr: int,
        winner_streak: int = 0,
    ) -> Tuple[int, int]:
        k_factor = 32

        expected_winner = 1.0 / (1.0 + 10 ** ((loser_mmr - winner_mmr) / 400))
        expected_loser = 1.0 / (1.0 + 10 ** ((winner_mmr - loser_mmr) / 400))

        winner_gain = int(k_factor * (1.0 - expected_winner))
        loser_loss = int(k_factor * (0.0 - expected_loser))

        streak_bonus = min(winner_streak // 3, 5)
        winner_gain += streak_bonus

        winner_gain = max(winner_gain, 5)
        loser_loss = min(loser_loss, -5)

        return winner_gain, loser_loss

    def record_match(self, match: Match) -> Tuple[PlayerStats, PlayerStats]:
        if match.winner_id is None:
            raise ValueError("Match has no winner")

        loser_id = match.player1_id if match.winner_id == match.player2_id else match.player2_id

        winner_stats = self.get_or_create_player(match.winner_id, "Unknown")
        loser_stats = self.get_or_create_player(loser_id, "Unknown")

        winner_gain, loser_loss = self.calculate_mmr_change(
            winner_stats.mmr,
            loser_stats.mmr,
            winner_stats.current_streak,
        )

        match.player1_mmr_change = winner_gain if match.player1_id == match.winner_id else loser_loss
        match.player2_mmr_change = winner_gain if match.player2_id == match.winner_id else loser_loss

        winner_stats.mmr += winner_gain
        winner_stats.wins += 1
        winner_stats.total_games += 1
        winner_stats.current_streak += 1
        winner_stats.max_streak = max(winner_stats.max_streak, winner_stats.current_streak)
        winner_stats.update_rank()

        loser_stats.mmr += loser_loss
        loser_stats.losses += 1
        loser_stats.total_games += 1
        loser_stats.current_streak = 0
        loser_stats.update_rank()

        match.end_time = datetime.now()
        self.match_history.append(match)
        self._save_data()

        return winner_stats, loser_stats

    def find_match(
        self,
        player_id: str,
        max_mmr_diff: int = 200,
        timeout_seconds: int = 30,
    ) -> Optional[Tuple[PlayerStats, PlayerStats]]:
        player = self.get_player_stats(player_id)
        if player is None:
            return None

        available_players = [
            p for p in self.player_stats.values()
            if p.player_id != player_id
            and abs(p.mmr - player.mmr) <= max_mmr_diff
        ]

        if not available_players:
            available_players = [
                p for p in self.player_stats.values()
                if p.player_id != player_id
            ]

        if available_players:
            opponent = random.choice(available_players)
            return player, opponent

        return None

    def get_leaderboard(self, limit: int = 100) -> List[PlayerStats]:
        sorted_players = sorted(
            self.player_stats.values(),
            key=lambda p: (-p.mmr, -p.wins, p.total_games),
        )
        return sorted_players[:limit]

    def get_rank_info(self, rank: Rank) -> RankInfo:
        return RANK_INFO[rank]

    def get_player_rank_info(self, player_id: str) -> Optional[RankInfo]:
        stats = self.get_player_stats(player_id)
        if stats:
            return self.get_rank_info(stats.rank)
        return None

    def get_recent_matches(self, player_id: str, limit: int = 10) -> List[Match]:
        player_matches = [
            m for m in self.match_history
            if m.player1_id == player_id or m.player2_id == player_id
        ]
        return sorted(player_matches, key=lambda m: m.start_time, reverse=True)[:limit]

    def get_season_stats(self, player_id: str) -> Dict:
        stats = self.get_player_stats(player_id)
        if not stats:
            return {}

        rank_info = self.get_rank_info(stats.rank)
        return {
            "current_rank": rank_info.name,
            "current_rank_icon": rank_info.icon,
            "current_mmr": stats.mmr,
            "wins": stats.wins,
            "losses": stats.losses,
            "win_rate": f"{stats.win_rate * 100:.1f}%",
            "current_streak": stats.current_streak,
            "max_streak": stats.max_streak,
            "total_games": stats.total_games,
        }
