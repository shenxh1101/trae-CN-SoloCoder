from __future__ import annotations
import math
import random
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from copy import deepcopy
from enum import Enum


from ..core import Game, GameState, Player
from ..engine import ActionExecutor


class PlayStyle(Enum):
    AGGRESSIVE = "aggressive"
    DEFENSIVE = "defensive"
    CONTROL = "control"
    TEMPO = "tempo"


@dataclass
class MCTSNode:
    game_state: GameState
    player_id: str
    action: Optional[Dict] = None
    parent: Optional[MCTSNode] = None
    children: List[MCTSNode] = field(default_factory=list)
    visits: int = 0
    value: float = 0.0

    def uct_value(self, exploration_constant: float = 1.414) -> float:
        if self.visits == 0:
            return float("inf")
        return (self.value / self.visits) + exploration_constant * math.sqrt(
            math.log(self.parent.visits) / self.visits
        )

    def select_best_child(self, exploration_constant: float = 1.414) -> Optional[MCTSNode]:
        if not self.children:
            return None
        return max(self.children, key=lambda c: c.uct_value(exploration_constant))

    def is_fully_expanded(self) -> bool:
        if self.game_state.game_over:
            return True
        executor = _create_fake_executor(self.game_state)
        valid_actions = executor.get_valid_actions(self.player_id)
        return len(self.children) >= len(valid_actions)


class AdvancedHeuristic:
    def __init__(self, style: PlayStyle = PlayStyle.TEMPO):
        self.style = style

    def evaluate(self, game_state: GameState, player_id: str) -> float:
        player = game_state.players[player_id]
        opponent = game_state.get_opponent(player_id)

        if game_state.game_over:
            if game_state.winner_id == player_id:
                return 1000.0
            else:
                return -1000.0

        score = 0.0

        score += self._evaluate_health(player, opponent)
        score += self._evaluate_board_state(player, opponent)
        score += self._evaluate_hand_resources(player, opponent)
        score += self._evaluate_mana_curve(player, opponent)
        score += self._evaluate_special_effects(player, opponent)

        return score

    def _evaluate_health(self, player: Player, opponent: Player) -> float:
        score = 0.0
        health_diff = player.health - opponent.health
        armor_diff = getattr(player, 'armor', 0) - getattr(opponent, 'armor', 0)

        if self.style == PlayStyle.DEFENSIVE:
            score += health_diff * 3.0 + armor_diff * 2.0
        elif self.style == PlayStyle.AGGRESSIVE:
            score += health_diff * 1.5 - opponent.health * 0.5
        else:
            score += health_diff * 2.0 + armor_diff * 1.5

        if player.health <= 10:
            score -= 20.0
        if opponent.health <= 10:
            score += 15.0

        return score

    def _evaluate_board_state(self, player: Player, opponent: Player) -> float:
        score = 0.0
        player_minions_value = 0.0
        opponent_minions_value = 0.0

        for minion in player.battlefield:
            base_value = minion.attack * 1.5 + minion.health * 1.0
            if minion.taunt:
                base_value += 3.0 if self.style == PlayStyle.DEFENSIVE else 2.0
            if minion.divine_shield:
                base_value += 3.0
            if minion.charge:
                base_value += 2.5 if self.style == PlayStyle.AGGRESSIVE else 2.0
            if minion.windfury:
                base_value += 2.0
            if minion.poisonous:
                base_value += 4.0
            if minion.lifesteal:
                base_value += 2.5
            if minion.reborn:
                base_value += 3.0
            if minion.rush:
                base_value += 1.5
            if not minion.exhausted:
                base_value += 1.0
            player_minions_value += base_value

        for minion in opponent.battlefield:
            base_value = minion.attack * 1.5 + minion.health * 1.0
            if minion.taunt:
                base_value += 2.5
            if minion.divine_shield:
                base_value += 2.5
            if minion.charge or minion.rush:
                base_value += 2.0
            if minion.windfury:
                base_value += 2.0
            if minion.poisonous:
                base_value += 3.5
            if not minion.exhausted:
                base_value += 1.5
            opponent_minions_value += base_value

        score += player_minions_value - opponent_minions_value

        if self.style == PlayStyle.CONTROL:
            board_control_diff = len(player.battlefield) - len(opponent.battlefield)
            score += board_control_diff * 6.0
        else:
            board_control_diff = len(player.battlefield) - len(opponent.battlefield)
            score += board_control_diff * 4.0

        return score

    def _evaluate_hand_resources(self, player: Player, opponent: Player) -> float:
        score = 0.0
        hand_size_diff = len(player.hand) - len(opponent.hand)
        score += hand_size_diff * 3.0

        playable_cards = sum(1 for c in player.hand if c.card.cost <= player.mana)
        score += playable_cards * 1.5

        deck_size_diff = len(player.deck) - len(opponent.deck)
        if self.style == PlayStyle.CONTROL:
            score += deck_size_diff * 0.5
        else:
            score += deck_size_diff * 0.25

        return score

    def _evaluate_mana_curve(self, player: Player, opponent: Player) -> float:
        score = 0.0
        mana_diff = player.mana - opponent.mana

        if self.style == PlayStyle.TEMPO:
            score += mana_diff * 2.5
        else:
            score += mana_diff * 1.5

        mana_efficiency = player.mana / max(player.max_mana, 1)
        score += mana_efficiency * 3.0

        return score

    def _evaluate_special_effects(self, player: Player, opponent: Player) -> float:
        score = 0.0

        if player.weapon:
            weapon_value = player.weapon.attack * 2.0 + player.weapon.durability * 1.0
            if self.style == PlayStyle.AGGRESSIVE:
                weapon_value *= 1.3
            score += weapon_value

        if opponent.weapon:
            score -= opponent.weapon.attack * 2.0 + opponent.weapon.durability * 1.0

        player_secrets = len(getattr(player, 'secrets', []))
        opponent_secrets = len(getattr(opponent, 'secrets', []))
        score += player_secrets * 4.0
        score -= opponent_secrets * 4.0

        return score


def _create_fake_executor(game_state: GameState) -> ActionExecutor:
    fake_game = Game.__new__(Game)
    fake_game.state = game_state
    fake_game.action_history = []
    return ActionExecutor(fake_game)


def _apply_action(game_state: GameState, player_id: str, action: Dict) -> GameState:
    new_state = game_state.copy()
    fake_game = Game.__new__(Game)
    fake_game.state = new_state
    fake_game.action_history = []
    executor = ActionExecutor(fake_game)

    if action["type"] == "play_card":
        executor.play_card(player_id, action["card_instance_id"])
    elif action["type"] == "attack":
        executor.attack(player_id, action["attacker_id"], action["target_id"])
    elif action["type"] == "hero_power":
        executor.use_hero_power(player_id, action.get("target_id"))
    elif action["type"] == "end_turn":
        executor.end_turn(player_id)

    return fake_game.state


class MCTSPlayer:
    def __init__(
        self,
        player_id: str,
        iterations: int = 300,
        max_depth: int = 12,
        exploration_constant: float = 1.414,
        style: PlayStyle = PlayStyle.TEMPO,
    ):
        self.player_id = player_id
        self.iterations = iterations
        self.max_depth = max_depth
        self.exploration_constant = exploration_constant
        self.heuristic = AdvancedHeuristic(style)

    def choose_action(self, game_state: GameState) -> Optional[Dict]:
        if game_state.game_over:
            return None

        executor = _create_fake_executor(game_state)
        valid_actions = executor.get_valid_actions(self.player_id)

        if not valid_actions:
            return None

        if len(valid_actions) == 1:
            return valid_actions[0]

        pruned_actions = self._prune_actions(game_state, valid_actions)
        if len(pruned_actions) == 1:
            return pruned_actions[0]

        root = MCTSNode(game_state=game_state, player_id=self.player_id)

        for _ in range(self.iterations):
            node = self._select(root)
            if not node.game_state.game_over:
                node = self._expand(node)
            result = self._simulate(node)
            self._backpropagate(node, result)

        if not root.children:
            return random.choice(valid_actions)

        best_child = max(root.children, key=lambda c: c.visits)
        return best_child.action

    def _prune_actions(self, game_state: GameState, actions: List[Dict]) -> List[Dict]:
        if len(actions) <= 5:
            return actions

        scored = []
        for action in actions:
            new_state = _apply_action(game_state, self.player_id, action)
            score = self.heuristic.evaluate(new_state, self.player_id)
            scored.append((score, action))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [a for _, a in scored[:min(8, len(scored))]]

    def _select(self, node: MCTSNode) -> MCTSNode:
        depth = 0
        while node.is_fully_expanded() and not node.game_state.game_over and depth < self.max_depth:
            next_child = node.select_best_child(self.exploration_constant)
            if next_child is None:
                break
            node = next_child
            depth += 1
        return node

    def _expand(self, node: MCTSNode) -> MCTSNode:
        executor = _create_fake_executor(node.game_state)
        valid_actions = executor.get_valid_actions(node.player_id)

        used_actions = set()
        for child in node.children:
            action_tuple = tuple(sorted((k, v) for k, v in child.action.items() if k != "name"))
            used_actions.add(action_tuple)

        available_actions = []
        for action in valid_actions:
            action_tuple = tuple(sorted((k, v) for k, v in action.items() if k != "name"))
            if action_tuple not in used_actions:
                available_actions.append(action)

        if not available_actions:
            return node

        if len(available_actions) > 3:
            scored = []
            for action in available_actions:
                new_state = _apply_action(node.game_state, node.player_id, action)
                score = self.heuristic.evaluate(new_state, self.player_id)
                scored.append((score, action))
            scored.sort(key=lambda x: x[0], reverse=True)
            action = scored[0][1]
        else:
            action = random.choice(available_actions)

        new_state = _apply_action(node.game_state, node.player_id, action)

        next_player_id = (
            list(new_state.players.keys())[0]
            if list(new_state.players.keys())[1] == node.player_id
            else list(new_state.players.keys())[1]
        )

        child = MCTSNode(
            game_state=new_state,
            player_id=next_player_id,
            action=action,
            parent=node,
        )
        node.children.append(child)

        return child

    def _simulate(self, node: MCTSNode) -> float:
        current_state = node.game_state.copy()
        current_player = node.player_id
        depth = 0

        while not current_state.game_over and depth < self.max_depth:
            executor = _create_fake_executor(current_state)
            valid_actions = executor.get_valid_actions(current_player)

            if not valid_actions:
                break

            if len(valid_actions) > 3:
                scored = []
                for action in valid_actions:
                    new_state = _apply_action(current_state, current_player, action)
                    score = self.heuristic.evaluate(new_state, self.player_id)
                    scored.append((score, action))
                scored.sort(key=lambda x: x[0], reverse=True)
                action = random.choice(scored[:3])[1]
            else:
                action = random.choice(valid_actions)

            current_state = _apply_action(current_state, current_player, action)

            current_player = (
                list(current_state.players.keys())[0]
                if list(current_state.players.keys())[1] == current_player
                else list(current_state.players.keys())[1]
            )
            depth += 1

        return self.heuristic.evaluate(current_state, self.player_id)

    def _backpropagate(self, node: MCTSNode, result: float):
        while node is not None:
            node.visits += 1
            node.value += result
            node = node.parent


class GreedyAI:
    def __init__(self, player_id: str, style: PlayStyle = PlayStyle.TEMPO):
        self.player_id = player_id
        self.heuristic = AdvancedHeuristic(style)

    def choose_action(self, game_state: GameState) -> Optional[Dict]:
        if game_state.game_over:
            return None

        executor = _create_fake_executor(game_state)
        valid_actions = executor.get_valid_actions(self.player_id)

        if not valid_actions:
            return None

        if len(valid_actions) == 1:
            return valid_actions[0]

        best_action = None
        best_score = float("-inf")

        for action in valid_actions:
            new_state = _apply_action(game_state, self.player_id, action)
            score = self.heuristic.evaluate(new_state, self.player_id)

            if score > best_score:
                best_score = score
                best_action = action

        return best_action


class HybridAI:
    def __init__(self, player_id: str, style: PlayStyle = PlayStyle.TEMPO):
        self.player_id = player_id
        self.mcts = MCTSPlayer(player_id, iterations=150, max_depth=8, style=style)
        self.greedy = GreedyAI(player_id, style=style)
        self.style = style

    def choose_action(self, game_state: GameState) -> Optional[Dict]:
        if game_state.game_over:
            return None

        executor = _create_fake_executor(game_state)
        valid_actions = executor.get_valid_actions(self.player_id)

        if not valid_actions:
            return None

        if len(valid_actions) <= 3:
            return self.greedy.choose_action(game_state)

        return self.mcts.choose_action(game_state)
