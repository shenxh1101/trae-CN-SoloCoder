from .core.models import Game, Player, Card, CardEffect, CardInstance, GameState
from .core.enums import CardType, CardClass, EffectType, TriggerType, Phase, Zone
from .engine.effect_engine import EffectEngine, EffectStack, PendingEffect
from .engine.action_executor import ActionExecutor
from .ai.mcts import MCTSPlayer, GreedyAI, AdvancedHeuristic
from .deck.database import CardDatabase
from .deck.validator import DeckValidator, DeckValidationResult
from .replay.replay_manager import ReplayManager, GameReplay, GameRestorer, BalanceSimulator
from .network.network_manager import NetworkManager, GameSession
from .ladder.ladder_system import LadderSystem, PlayerStats, Match, Rank
from .achievements.achievement_manager import (
    AchievementManager, Achievement, AchievementProgress, AchievementCategory
)
from .ui.cli_game import CLIGameUI

__version__ = "2.0.0"
__all__ = [
    "Game",
    "Player", 
    "Card",
    "CardEffect",
    "CardInstance",
    "GameState",
    "CardType",
    "CardClass",
    "EffectType",
    "TriggerType",
    "Phase",
    "Zone",
    "EffectEngine",
    "EffectStack",
    "PendingEffect",
    "ActionExecutor",
    "MCTSPlayer",
    "GreedyAI",
    "AdvancedHeuristic",
    "CardDatabase",
    "DeckValidator",
    "DeckValidationResult",
    "ReplayManager",
    "GameReplay",
    "GameRestorer",
    "BalanceSimulator",
    "NetworkManager",
    "GameSession",
    "LadderSystem",
    "PlayerStats",
    "Match",
    "Rank",
    "AchievementManager",
    "Achievement",
    "AchievementProgress",
    "AchievementCategory",
    "CLIGameUI",
]
