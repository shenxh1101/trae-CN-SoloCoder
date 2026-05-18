from __future__ import annotations
import json
import uuid
from typing import List, Dict, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path

from ..core import Game, GameState, Player, CardInstance
from ..core.enums import CardClass


@dataclass
class GameReplay:
    replay_id: str
    game_id: str
    player1_name: str
    player2_name: str
    player1_class: str
    player2_class: str
    winner_name: Optional[str] = None
    start_time: str = field(default_factory=lambda: datetime.now().isoformat())
    end_time: Optional[str] = None
    turn_count: int = 0
    action_history: List[Dict] = field(default_factory=list)
    initial_states: Dict[str, Dict] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> GameReplay:
        return cls(**data)


class ReplayManager:
    def __init__(self, replay_dir: str = "./replays"):
        self.replay_dir = Path(replay_dir)
        self.replay_dir.mkdir(exist_ok=True)
        self.active_replays: Dict[str, GameReplay] = {}

    def start_replay(self, game: Game, player1: Player, player2: Player) -> str:
        replay_id = str(uuid.uuid4())

        replay = GameReplay(
            replay_id=replay_id,
            game_id=game.state.game_id,
            player1_name=player1.name,
            player2_name=player2.name,
            player1_class=player1.card_class.name,
            player2_class=player2.card_class.name,
        )

        replay.initial_states = {
            player1.player_id: self._get_player_state_snapshot(player1),
            player2.player_id: self._get_player_state_snapshot(player2),
        }

        self.active_replays[game.state.game_id] = replay

        return replay_id

    def record_action(self, game_id: str, action: Dict):
        if game_id in self.active_replays:
            self.active_replays[game_id].action_history.append(
                {
                    **action,
                    "timestamp": datetime.now().isoformat(),
                }
            )

    def end_replay(self, game_id: str, winner_name: Optional[str] = None):
        if game_id in self.active_replays:
            replay = self.active_replays[game_id]
            replay.end_time = datetime.now().isoformat()
            replay.winner_name = winner_name
            replay.turn_count = len([a for a in replay.action_history if a.get("action") == "end_turn"])

            self._save_replay(replay)
            del self.active_replays[game_id]

    def _save_replay(self, replay: GameReplay):
        filename = self.replay_dir / f"{replay.replay_id}.json"
        with open(filename, "w") as f:
            json.dump(replay.to_dict(), f, indent=2)

    def load_replay(self, replay_id: str) -> Optional[GameReplay]:
        filename = self.replay_dir / f"{replay_id}.json"
        if filename.exists():
            with open(filename, "r") as f:
                return GameReplay.from_dict(json.load(f))
        return None

    def list_replays(self) -> List[Dict]:
        replays = []
        for file in self.replay_dir.glob("*.json"):
            with open(file, "r") as f:
                data = json.load(f)
                replays.append(
                    {
                        "replay_id": data["replay_id"],
                        "game_id": data["game_id"],
                        "players": f"{data['player1_name']} vs {data['player2_name']}",
                        "winner": data.get("winner_name", "Unknown"),
                        "turns": data.get("turn_count", 0),
                        "date": data.get("start_time", "").split("T")[0],
                    }
                )
        return sorted(replays, key=lambda x: x["date"], reverse=True)

    def _get_player_state_snapshot(self, player: Player) -> Dict:
        return {
            "player_id": player.player_id,
            "name": player.name,
            "card_class": player.card_class.name,
            "health": player.health,
            "max_health": player.max_health,
            "deck_size": len(player.deck),
            "hand_size": len(player.hand),
        }


class GameRestorer:
    def __init__(self):
        from ..deck import CardDatabase
        CardDatabase.initialize()

    def restore_game_from_replay(self, replay: GameReplay, up_to_turn: Optional[int] = None) -> Game:
        from ..core import Game, Player
        from ..engine import ActionExecutor

        player1_id = "p1_" + str(uuid.uuid4())[:8]
        player2_id = "p2_" + str(uuid.uuid4())[:8]

        player1 = Player(
            player_id=player1_id,
            name=replay.player1_name,
            card_class=CardClass[replay.player1_class],
        )

        player2 = Player(
            player_id=player2_id,
            name=replay.player2_name,
            card_class=CardClass[replay.player2_class],
        )

        game = Game(
            game_id=replay.game_id,
            player1=player1,
            player2=player2,
        )

        self._restore_decks(player1, player2)

        executor = ActionExecutor(game)
        turn_count = 0

        for action in replay.action_history:
            if up_to_turn is not None and turn_count >= up_to_turn:
                break

            action_type = action.get("action")
            player_id = action.get("player_id")

            if action_type == "play_card":
                card_instance_id = action.get("card_instance_id")
                executor.play_card(player_id, card_instance_id)
            elif action_type == "attack":
                attacker_id = action.get("attacker_id")
                target_id = action.get("target_id")
                executor.attack(player_id, attacker_id, target_id)
            elif action_type == "hero_power":
                target_id = action.get("target_id")
                executor.use_hero_power(player_id, target_id)
            elif action_type == "end_turn":
                executor.end_turn(player_id)
                turn_count += 1

        return game

    def _restore_decks(self, player1: Player, player2: Player):
        import random
        import uuid
        from ..core import Card, CardType, CardClass

        # 创建测试卡牌而不是依赖数据库
        test_cards = []
        for i in range(15):
            card = Card(
                card_id=f"sim_card_{i}",
                name=f"Sim Card {i}",
                card_type=CardType.MINION,
                card_class=CardClass.NEUTRAL,
                cost=i % 5 + 1,
                attack=i % 3 + 1,
                health=i % 3 + 1,
            )
            test_cards.append(card)
        deck_cards = test_cards * 2

        from ..core.enums import Zone

        for i, card in enumerate(deck_cards[:30]):
            instance = CardInstance(
                instance_id=f"{player1.player_id}_card_{i}",
                card=card,
                zone=Zone.DECK,
                controller_id=player1.player_id,
            )
            player1.deck.append(instance)

        for i, card in enumerate(deck_cards[30:]):
            instance = CardInstance(
                instance_id=f"{player2.player_id}_card_{i}",
                card=card,
                zone=Zone.DECK,
                controller_id=player2.player_id,
            )
            player2.deck.append(instance)

        for _ in range(3):
            if player1.deck:
                player1.hand.append(player1.deck.pop(0))
            if player2.deck:
                player2.hand.append(player2.deck.pop(0))


class BalanceSimulator:
    def __init__(self):
        self.restorer = GameRestorer()

    def simulate_matchup(self, deck1_class: CardClass, deck2_class: CardClass, num_games: int = 100) -> Dict:
        from ..ai import MCTSPlayer, GreedyAI
        from ..engine import ActionExecutor
        from ..core import Game, Player

        results = {
            "deck1_wins": 0,
            "deck2_wins": 0,
            "avg_turns": 0,
            "deck1_health": [],
            "deck2_health": [],
        }

        for game_num in range(num_games):
            player1 = Player(
                player_id=f"p1_{game_num}",
                name="Deck1",
                card_class=deck1_class,
            )
            player2 = Player(
                player_id=f"p2_{game_num}",
                name="Deck2",
                card_class=deck2_class,
            )

            game = Game(
                game_id=f"sim_{game_num}",
                player1=player1,
                player2=player2,
            )

            self.restorer._restore_decks(player1, player2)

            ai1 = GreedyAI(player1.player_id)
            ai2 = GreedyAI(player2.player_id)
            executor = ActionExecutor(game)

            turn_count = 0
            max_turns = 5  # 简化测试

            while not game.state.game_over and turn_count < max_turns:
                current_player_id = game.state.current_player_id

                if current_player_id == player1.player_id:
                    action = ai1.choose_action(game.state)
                else:
                    action = ai2.choose_action(game.state)

                if action is None or action.get("type") == "end_turn":
                    executor.end_turn(current_player_id)
                    turn_count += 1
                    continue

                if action["type"] == "play_card":
                    executor.play_card(current_player_id, action["card_instance_id"])
                elif action["type"] == "attack":
                    executor.attack(current_player_id, action["attacker_id"], action["target_id"])
                elif action["type"] == "hero_power":
                    executor.use_hero_power(current_player_id, action.get("target_id"))

            if game.state.winner_id == player1.player_id:
                results["deck1_wins"] += 1
            elif game.state.winner_id == player2.player_id:
                results["deck2_wins"] += 1

            results["deck1_health"].append(player1.health)
            results["deck2_health"].append(player2.health)
            results["avg_turns"] += turn_count

        results["avg_turns"] /= num_games

        return {
            "deck1_win_rate": results["deck1_wins"] / num_games,
            "deck2_win_rate": results["deck2_wins"] / num_games,
            "avg_turns": results["avg_turns"],
            "deck1_avg_health": sum(results["deck1_health"]) / len(results["deck1_health"]) if results["deck1_health"] else 0,
            "deck2_avg_health": sum(results["deck2_health"]) / len(results["deck2_health"]) if results["deck2_health"] else 0,
        }
