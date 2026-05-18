from __future__ import annotations
from typing import List, Dict, Optional, Tuple
import random

from ..core import Game, GameState, CardInstance, Player, Zone
from ..core.enums import TriggerType, Phase
from .effect_engine import EffectEngine


class ActionExecutor:
    def __init__(self, game: Game):
        self.game = game
        self.effect_engine = EffectEngine()

    def play_card(self, player_id: str, card_instance_id: str) -> bool:
        player = self.game.state.players[player_id]
        card = None
        for c in player.hand:
            if c.instance_id == card_instance_id:
                card = c
                break

        if not card:
            return False

        if player.mana < card.card.cost:
            return False

        player.mana -= card.card.cost
        player.hand.remove(card)

        if card.card.card_type.name == "MINION":
            if len(player.battlefield) >= 7:
                player.hand.append(card)
                player.mana += card.card.cost
                return False

            card.zone = Zone.PLAY
            card.play_order = self.game.state.play_counter
            self.game.state.play_counter += 1
            card.exhausted = not card.charge
            player.battlefield.append(card)

            self.game.state = self.effect_engine.process_trigger(
                self.game.state, TriggerType.ON_SUMMON, card
            )
            self.game.state = self.effect_engine.process_trigger(
                self.game.state, TriggerType.BATTLECRY, card
            )

        elif card.card.card_type.name == "SPELL":
            card.zone = Zone.GRAVEYARD
            player.graveyard.append(card)

            self.game.state = self.effect_engine.process_trigger(
                self.game.state, TriggerType.ON_SPELL_CAST, card
            )

            for effect in card.card.effects:
                if effect.trigger.name == "ON_PLAY":
                    from .effect_engine import PendingEffect

                    pending = PendingEffect(
                        effect_id=effect.effect_id,
                        effect_type=effect.effect_type,
                        source_id=card.instance_id,
                        trigger=TriggerType.ON_PLAY,
                        value=effect.value,
                        target_selector=effect.target_selector,
                        priority=effect.priority,
                        play_order=card.play_order,
                        controller_id=player_id,
                    )
                    self.effect_engine.effect_stack.push(pending)

            while not self.effect_engine.effect_stack.is_empty():
                effect = self.effect_engine.effect_stack.pop()
                if effect and effect.effect_type in self.effect_engine.effect_handlers:
                    self.game.state = self.effect_engine.effect_handlers[effect.effect_type](
                        self.game.state, effect
                    )

        elif card.card.card_type.name == "WEAPON":
            card.zone = Zone.PLAY
            card.play_order = self.game.state.play_counter
            self.game.state.play_counter += 1

            if player.weapon:
                player.weapon.zone = Zone.GRAVEYARD
                player.graveyard.append(player.weapon)
            player.weapon = card

        self.game.action_history.append(
            {
                "action": "play_card",
                "player_id": player_id,
                "card_id": card.card.card_id,
                "instance_id": card.instance_id,
                "turn": self.game.state.turn,
            }
        )

        return True

    def attack(self, player_id: str, attacker_id: str, target_id: str) -> bool:
        player = self.game.state.players[player_id]
        opponent = self.game.state.get_opponent(player_id)

        attacker = None
        for m in player.battlefield:
            if m.instance_id == attacker_id:
                attacker = m
                break

        if not attacker:
            if player.weapon and player.weapon.instance_id == attacker_id:
                attacker = player.weapon

        if not attacker or attacker.exhausted or attacker.frozen:
            return False

        if attacker.frozen:
            attacker.frozen = False
            return False

        has_taunt = any(m.taunt for m in opponent.battlefield)

        target = None
        if target_id == opponent.player_id:
            if has_taunt:
                return False
            target = opponent
        else:
            for m in opponent.battlefield:
                if m.instance_id == target_id:
                    target = m
                    break

        if not target:
            return False

        if has_taunt and isinstance(target, CardInstance) and not target.taunt:
            return False

        if isinstance(attacker, CardInstance) and attacker.card.card_type.name == "WEAPON":
            if isinstance(target, Player):
                target.health -= attacker.attack
                player.weapon.durability -= 1
                if player.weapon.durability <= 0:
                    player.weapon.zone = Zone.GRAVEYARD
                    player.graveyard.append(player.weapon)
                    player.weapon = None
            else:
                target.health -= attacker.attack
                attacker.health -= target.attack
                player.weapon.durability -= 1
                if player.weapon.durability <= 0:
                    player.weapon.zone = Zone.GRAVEYARD
                    player.graveyard.append(player.weapon)
                    player.weapon = None
        else:
            attacker.attacks_this_turn += 1
            if attacker.windfury and attacker.attacks_this_turn >= 2:
                attacker.exhausted = True
            elif not attacker.windfury:
                attacker.exhausted = True

            damage = attacker.attack
            if isinstance(target, Player):
                target.health -= damage
                if attacker.lifesteal:
                    player.health = min(player.health + damage, player.max_health)
            else:
                if target.divine_shield:
                    target.divine_shield = False
                else:
                    target.health -= damage
                    if attacker.poisonous:
                        target.health = 0
                    if attacker.lifesteal:
                        player.health = min(player.health + damage, player.max_health)

                if attacker.divine_shield:
                    attacker.divine_shield = False
                else:
                    attacker.health -= target.attack
                    if hasattr(target, 'poisonous') and target.poisonous:
                        attacker.health = 0

        self.game.state = self.effect_engine.process_trigger(
            self.game.state, TriggerType.ON_ATTACK, attacker
        )

        self.game.action_history.append(
            {
                "action": "attack",
                "player_id": player_id,
                "attacker_id": attacker_id,
                "target_id": target_id,
                "turn": self.game.state.turn,
            }
        )

        return True

    def use_hero_power(self, player_id: str, target_id: Optional[str] = None) -> bool:
        player = self.game.state.players[player_id]

        if player.hero_power_used or player.mana < 2:
            return False

        player.mana -= 2
        player.hero_power_used = True

        opponent = self.game.state.get_opponent(player_id)
        if player.card_class.name == "MAGE":
            if target_id == opponent.player_id:
                opponent.health -= 1
            else:
                target = None
                for m in opponent.battlefield:
                    if m.instance_id == target_id:
                        target = m
                        break
                if target:
                    target.health -= 1

        elif player.card_class.name == "PRIEST":
            if target_id == player.player_id:
                player.health = min(player.health + 2, player.max_health)
            else:
                target = self.game.state.get_card_by_instance_id(target_id)
                if target:
                    target.health = min(target.health + 2, target.max_health)

        elif player.card_class.name == "WARRIOR":
            player.armor = getattr(player, "armor", 0) + 2

        elif player.card_class.name == "WARLOCK":
            player.health -= 2
            if len(player.hand) < 10 and player.deck:
                card = player.deck.pop(0)
                card.zone = Zone.HAND
                player.hand.append(card)

        self.game.action_history.append(
            {
                "action": "hero_power",
                "player_id": player_id,
                "target_id": target_id,
                "turn": self.game.state.turn,
            }
        )

        return True

    def end_turn(self, player_id: str) -> bool:
        if self.game.state.current_player_id != player_id:
            return False

        next_player_id = (
            list(self.game.state.players.keys())[0]
            if list(self.game.state.players.keys())[1] == player_id
            else list(self.game.state.players.keys())[1]
        )

        self.game.state.current_player_id = next_player_id
        self.game.state.turn += 1

        next_player = self.game.state.players[next_player_id]
        next_player.max_mana = min(next_player.max_mana + 1, 10)
        next_player.mana = next_player.max_mana - next_player.overload
        next_player.overload = 0
        next_player.hero_power_used = False

        for minion in next_player.battlefield:
            minion.exhausted = False
            minion.frozen = False

        if len(next_player.hand) < 10 and next_player.deck:
            card = next_player.deck.pop(0)
            card.zone = Zone.HAND
            next_player.hand.append(card)
            self.game.state = self.effect_engine.process_trigger(
                self.game.state, TriggerType.ON_DRAW, card
            )

        self.game.state = self.effect_engine.process_trigger(
            self.game.state, TriggerType.ON_TURN_START, None
        )

        self.game.state.phase = Phase.MAIN_PHASE

        self.game.action_history.append(
            {
                "action": "end_turn",
                "player_id": player_id,
                "turn": self.game.state.turn,
            }
        )

        return True

    def get_valid_actions(self, player_id: str) -> List[Dict]:
        actions = []
        player = self.game.state.players[player_id]

        for card in player.hand:
            if player.mana >= card.card.cost:
                actions.append(
                    {
                        "type": "play_card",
                        "card_instance_id": card.instance_id,
                        "card_id": card.card.card_id,
                        "name": card.card.name,
                        "cost": card.card.cost,
                    }
                )

        for minion in player.battlefield:
            if not minion.exhausted and not minion.frozen:
                opponent = self.game.state.get_opponent(player_id)
                has_taunt = any(m.taunt for m in opponent.battlefield)

                if has_taunt:
                    for target in opponent.battlefield:
                        if target.taunt:
                            actions.append(
                                {
                                    "type": "attack",
                                    "attacker_id": minion.instance_id,
                                    "target_id": target.instance_id,
                                    "attacker_name": minion.card.name,
                                    "target_name": target.card.name,
                                }
                            )
                else:
                    actions.append(
                        {
                            "type": "attack",
                            "attacker_id": minion.instance_id,
                            "target_id": opponent.player_id,
                            "attacker_name": minion.card.name,
                            "target_name": "Hero",
                        }
                    )
                    for target in opponent.battlefield:
                        actions.append(
                            {
                                "type": "attack",
                                "attacker_id": minion.instance_id,
                                "target_id": target.instance_id,
                                "attacker_name": minion.card.name,
                                "target_name": target.card.name,
                            }
                        )

        if player.weapon and not player.weapon.exhausted:
            opponent = self.game.state.get_opponent(player_id)
            has_taunt = any(m.taunt for m in opponent.battlefield)

            if has_taunt:
                for target in opponent.battlefield:
                    if target.taunt:
                        actions.append(
                            {
                                "type": "attack",
                                "attacker_id": player.weapon.instance_id,
                                "target_id": target.instance_id,
                                "attacker_name": "Weapon",
                                "target_name": target.card.name,
                            }
                        )
            else:
                actions.append(
                    {
                        "type": "attack",
                        "attacker_id": player.weapon.instance_id,
                        "target_id": opponent.player_id,
                        "attacker_name": "Weapon",
                        "target_name": "Hero",
                    }
                )

        if player.mana >= 2 and not player.hero_power_used:
            actions.append(
                {"type": "hero_power", "description": f"{player.card_class.name} Hero Power"}
            )

        if self.game.state.current_player_id == player_id:
            actions.append({"type": "end_turn", "description": "End Turn"})

        return actions
