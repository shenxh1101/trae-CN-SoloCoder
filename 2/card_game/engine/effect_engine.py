from __future__ import annotations
import uuid
from typing import List, Dict, Optional, Callable, Any
from dataclasses import dataclass
from copy import deepcopy
import random

from ..core import GameState, CardInstance, Player, Zone
from ..core.enums import EffectType, TriggerType, Phase


@dataclass
class PendingEffect:
    effect_id: str
    effect_type: EffectType
    source_id: str
    trigger: TriggerType
    value: Any
    target_selector: Optional[str]
    priority: int
    play_order: int
    controller_id: str

    def __lt__(self, other: PendingEffect) -> bool:
        if self.priority != other.priority:
            return self.priority > other.priority
        return self.play_order < other.play_order


class EffectStack:
    def __init__(self):
        self.stack: List[PendingEffect] = []
        self.pending_triggers: List[PendingEffect] = []

    def push(self, effect: PendingEffect):
        self.stack.append(effect)

    def pop(self) -> Optional[PendingEffect]:
        if self.stack:
            return self.stack.pop()
        return None

    def is_empty(self) -> bool:
        return len(self.stack) == 0

    def add_trigger(self, effect: PendingEffect):
        self.pending_triggers.append(effect)

    def resolve_triggers(self):
        self.pending_triggers.sort()
        for effect in self.pending_triggers:
            self.stack.append(effect)
        self.pending_triggers = []


class EffectEngine:
    def __init__(self):
        self.effect_handlers: Dict[EffectType, Callable] = {
            EffectType.DRAW: self._handle_draw,
            EffectType.DISCARD: self._handle_discard,
            EffectType.DAMAGE: self._handle_damage,
            EffectType.HEAL: self._handle_heal,
            EffectType.BUFF: self._handle_buff,
            EffectType.DEBUFF: self._handle_debuff,
            EffectType.SUMMON: self._handle_summon,
            EffectType.DESTROY: self._handle_destroy,
            EffectType.COPY: self._handle_copy,
            EffectType.TRANSFORM: self._handle_transform,
            EffectType.SECRET: self._handle_secret,
            EffectType.MANA: self._handle_mana,
            EffectType.ATTACK: self._handle_attack_buff,
            EffectType.TAUNT: self._handle_taunt,
            EffectType.CHARGE: self._handle_charge,
            EffectType.DIVINE_SHIELD: self._handle_divine_shield,
            EffectType.FREEZE: self._handle_freeze,
            EffectType.STEALTH: self._handle_stealth,
            EffectType.RETURN: self._handle_return,
            EffectType.ARMOR: self._handle_armor,
            EffectType.TEMP_BUFF: self._handle_temp_buff,
            EffectType.COUNTER: self._handle_counter,
            EffectType.STEAL: self._handle_steal,
            EffectType.SILENCE: self._handle_silence,
            EffectType.MANA_COST_REDUCTION: self._handle_mana_cost_reduction,
            EffectType.SET_ATTACK_FROM_HEALTH: self._handle_set_attack_from_health,
            EffectType.ENRAGE: self._handle_enrage,
            EffectType.POISONOUS: self._handle_poisonous,
            EffectType.WINDFURY: self._handle_windfury,
            EffectType.REBORN: self._handle_reborn,
            EffectType.LIFESTEAL: self._handle_lifesteal,
            EffectType.RUSH: self._handle_rush,
            EffectType.ECHO: self._handle_echo,
            EffectType.DISCOVER: self._handle_discover,
            EffectType.OUTCAST: self._handle_outcast,
            EffectType.FRENZY: self._handle_frenzy,
            EffectType.CORRUPT: self._handle_corrupt,
            EffectType.TRADEABLE: self._handle_tradeable,
            EffectType.COLOSSAL: self._handle_colossal,
            EffectType.DREDGE: self._handle_dredge,
            EffectType.MANA_TITAN: self._handle_mana_titan,
            EffectType.AVENGE: self._handle_avenge,
        }
        self.effect_stack = EffectStack()
        self.triggered_effects: set = set()

    def process_trigger(
        self,
        game_state: GameState,
        trigger_type: TriggerType,
        source: Optional[CardInstance] = None,
        **kwargs,
    ) -> GameState:
        self._collect_triggers(game_state, trigger_type, source)
        self.effect_stack.resolve_triggers()

        while not self.effect_stack.is_empty():
            effect = self.effect_stack.pop()
            if effect and effect.effect_type in self.effect_handlers:
                game_state = self.effect_handlers[effect.effect_type](
                    game_state, effect, **kwargs
                )

        self._check_death(game_state)
        return game_state

    def _collect_triggers(
        self, game_state: GameState, trigger_type: TriggerType, source: Optional[CardInstance]
    ):
        for player in game_state.players.values():
            self._collect_from_zone(player.battlefield, trigger_type, game_state, source)
            self._collect_from_zone(player.hand, trigger_type, game_state, source)
            self._collect_from_zone(player.secrets, trigger_type, game_state, source)

    def _collect_from_zone(
        self,
        zone: List[CardInstance],
        trigger_type: TriggerType,
        game_state: GameState,
        source: Optional[CardInstance],
    ):
        for card in zone:
            for effect in card.effects:
                effect_id = f"{card.instance_id}_{effect.effect_id}_{trigger_type.name}"
                if effect.trigger == trigger_type and effect_id not in self.triggered_effects:
                    if effect.can_trigger(game_state, card):
                        pending = PendingEffect(
                            effect_id=effect.effect_id,
                            effect_type=effect.effect_type,
                            source_id=card.instance_id,
                            trigger=trigger_type,
                            value=effect.value,
                            target_selector=effect.target_selector,
                            priority=effect.priority,
                            play_order=card.play_order,
                            controller_id=card.controller_id,
                        )
                        self.effect_stack.add_trigger(pending)
                        self.triggered_effects.add(effect_id)

    def _handle_draw(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        player = game_state.players[effect.controller_id]
        draw_count = effect.value or 1

        for _ in range(draw_count):
            if player.deck and len(player.hand) < 10:
                card = player.deck.pop(0)
                card.zone = Zone.HAND
                player.hand.append(card)
                game_state = self.process_trigger(game_state, TriggerType.ON_DRAW, card)
            elif not player.deck:
                fatigue = game_state.turn - len(player.hand)
                player.health -= max(1, fatigue)

        return game_state

    def _handle_discard(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        player = game_state.players[effect.controller_id]
        discard_count = effect.value or 1

        for _ in range(min(discard_count, len(player.hand))):
            if player.hand:
                idx = random.randint(0, len(player.hand) - 1)
                card = player.hand.pop(idx)
                card.zone = Zone.GRAVEYARD
                player.graveyard.append(card)

        return game_state

    def _handle_damage(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        damage = effect.value or 1

        attacker = game_state.get_card_by_instance_id(effect.source_id)
        if attacker and isinstance(damage, int):
            player = game_state.players[attacker.controller_id]
            damage += player.spell_damage

        for target in targets:
            if isinstance(target, Player):
                if target.armor > 0:
                    if damage <= target.armor:
                        target.armor -= damage
                        damage = 0
                    else:
                        damage -= target.armor
                        target.armor = 0
                target.health -= damage
            elif isinstance(target, CardInstance):
                if target.divine_shield:
                    target.divine_shield = False
                else:
                    target.health -= damage
                    if target.health <= 0:
                        game_state = self.process_trigger(game_state, TriggerType.ON_DAMAGE, target)

        return game_state

    def _handle_heal(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        heal_amount = effect.value or 1

        for target in targets:
            if isinstance(target, Player):
                target.health = min(target.health + heal_amount, target.max_health)
                game_state = self.process_trigger(game_state, TriggerType.ON_HEAL, None)
            elif isinstance(target, CardInstance):
                target.health = min(target.health + heal_amount, target.max_health)

        return game_state

    def _handle_buff(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        buff_value = effect.value or {"attack": 0, "health": 0}

        for target in targets:
            if isinstance(target, CardInstance):
                target.attack += buff_value.get("attack", 0)
                target.health += buff_value.get("health", 0)
                target.max_health += buff_value.get("health", 0)

        return game_state

    def _handle_debuff(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        debuff_value = effect.value or {"attack": 0, "health": 0}

        for target in targets:
            if isinstance(target, CardInstance):
                target.attack = max(0, target.attack - debuff_value.get("attack", 0))
                target.health -= debuff_value.get("health", 0)

        return game_state

    def _handle_summon(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        player = game_state.players[effect.controller_id]
        summon_data = effect.value

        if isinstance(summon_data, dict) and "card_id" in summon_data:
            count = summon_data.get("count", 1)
            for _ in range(count):
                if len(player.battlefield) >= 7:
                    break

                from ..cards import CardDatabase

                card_def = CardDatabase.get_card(summon_data["card_id"])
                if card_def:
                    instance = CardInstance(
                        instance_id=str(uuid.uuid4()),
                        card=card_def,
                        zone=Zone.PLAY,
                        controller_id=player.player_id,
                        play_order=game_state.play_counter,
                    )
                    game_state.play_counter += 1
                    player.battlefield.append(instance)
                    game_state = self.process_trigger(game_state, TriggerType.ON_SUMMON, instance)
                    game_state = self.process_trigger(game_state, TriggerType.BATTLECRY, instance)

        return game_state

    def _handle_destroy(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                player = game_state.players[target.controller_id]
                if target in player.battlefield:
                    player.battlefield.remove(target)
                    target.zone = Zone.GRAVEYARD
                    player.graveyard.append(target)
                    game_state = self.process_trigger(game_state, TriggerType.DEATHRATTLE, target)
                    game_state = self.process_trigger(game_state, TriggerType.ON_DEATH, target)
                elif player.weapon and player.weapon.instance_id == target.instance_id:
                    player.weapon.zone = Zone.GRAVEYARD
                    player.graveyard.append(player.weapon)
                    player.weapon = None

        return game_state

    def _handle_copy(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        player = game_state.players[effect.controller_id]

        for target in targets:
            if isinstance(target, CardInstance) and len(player.hand) < 10:
                copy = target.copy()
                copy.instance_id = str(uuid.uuid4())
                copy.zone = Zone.HAND
                player.hand.append(copy)

        return game_state

    def _handle_transform(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                from ..cards import CardDatabase

                new_card_id = effect.value
                new_card_def = CardDatabase.get_card(new_card_id)
                if new_card_def:
                    target.card = new_card_def
                    target.attack = new_card_def.attack
                    target.health = new_card_def.health
                    target.max_health = new_card_def.max_health or new_card_def.health

        return game_state

    def _handle_secret(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        player = game_state.players[effect.controller_id]
        source = game_state.get_card_by_instance_id(effect.source_id)

        if source and len(player.secrets) < 5:
            source.zone = Zone.SECRET
            player.secrets.append(source)

        return game_state

    def _handle_mana(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        player = game_state.players[effect.controller_id]
        mana_change = effect.value or 0

        if mana_change > 0:
            player.max_mana = min(player.max_mana + mana_change, 10)
        else:
            player.mana = max(0, player.mana + mana_change)

        return game_state

    def _handle_attack_buff(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        attack_buff = effect.value or 0

        for target in targets:
            if isinstance(target, CardInstance):
                target.attack += attack_buff

        return game_state

    def _handle_taunt(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                target.taunt = True

        return game_state

    def _handle_charge(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                target.charge = True
                target.exhausted = False

        return game_state

    def _handle_divine_shield(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                target.divine_shield = True

        return game_state

    def _handle_freeze(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                target.frozen = True
            elif isinstance(target, Player):
                pass

        return game_state

    def _handle_stealth(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                target.stealth = True

        return game_state

    def _handle_return(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                player = game_state.players[target.controller_id]
                if target in player.battlefield and len(player.hand) < 10:
                    player.battlefield.remove(target)
                    target.zone = Zone.HAND
                    player.hand.append(target)

        return game_state

    def _handle_armor(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        armor_amount = effect.value or 0

        for target in targets:
            if isinstance(target, Player):
                target.armor += armor_amount

        return game_state

    def _handle_temp_buff(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        buff_value = effect.value or {"attack": 0}

        for target in targets:
            if isinstance(target, Player):
                target.temp_attack_buff += buff_value.get("attack", 0)

        return game_state

    def _handle_counter(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        return game_state

    def _handle_steal(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        new_controller = game_state.players[effect.controller_id]

        for target in targets:
            if isinstance(target, CardInstance):
                old_controller = game_state.players[target.controller_id]
                if target in old_controller.battlefield:
                    old_controller.battlefield.remove(target)
                    target.controller_id = new_controller.player_id
                    new_controller.battlefield.append(target)

        return game_state

    def _handle_silence(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                target.taunt = False
                target.charge = False
                target.divine_shield = False
                target.stealth = False
                target.frozen = False
                target.effects = []

        return game_state

    def _handle_mana_cost_reduction(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        return game_state

    def _handle_set_attack_from_health(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)

        for target in targets:
            if isinstance(target, CardInstance):
                target.attack = target.health

        return game_state

    def _handle_enrage(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        return game_state

    def _select_targets(self, game_state: GameState, effect: PendingEffect) -> List:
        selector = effect.target_selector
        targets = []

        if selector == "enemy_hero":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id:
                    targets.append(player)
                    break
        elif selector == "friendly_hero":
            targets.append(game_state.players[effect.controller_id])
        elif selector == "random_enemy_minion":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id:
                    if player.battlefield:
                        targets.append(random.choice(player.battlefield))
                    break
        elif selector == "damaged_enemy_minion":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id:
                    damaged = [m for m in player.battlefield if m.health < m.max_health]
                    if damaged:
                        targets.append(random.choice(damaged))
                    break
        elif selector == "undamaged_enemy_minion":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id:
                    undamaged = [m for m in player.battlefield if m.health >= m.max_health]
                    if undamaged:
                        targets.append(random.choice(undamaged))
                    break
        elif selector == "low_attack_enemy_minion":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id:
                    low_attack = [m for m in player.battlefield if m.attack <= 3]
                    if low_attack:
                        targets.append(random.choice(low_attack))
                    break
        elif selector == "enemy_minion":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id:
                    if player.battlefield:
                        targets.append(random.choice(player.battlefield))
                    break
        elif selector == "all_enemy_minions":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id:
                    targets.extend(player.battlefield)
                    break
        elif selector == "all_friendly_minions":
            targets.extend(game_state.players[effect.controller_id].battlefield)
        elif selector == "friendly_minion":
            if game_state.players[effect.controller_id].battlefield:
                targets.append(random.choice(game_state.players[effect.controller_id].battlefield))
        elif selector == "source":
            source = game_state.get_card_by_instance_id(effect.source_id)
            if source:
                targets.append(source)
        elif selector == "all_characters":
            for player in game_state.players.values():
                targets.append(player)
                targets.extend(player.battlefield)
        elif selector == "all_enemy_characters":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id:
                    targets.append(player)
                    targets.extend(player.battlefield)
                    break
        elif selector == "all_minions":
            for player in game_state.players.values():
                targets.extend(player.battlefield)
        elif selector == "damaged_friendly_character":
            player = game_state.players[effect.controller_id]
            candidates = []
            if player.health < player.max_health:
                candidates.append(player)
            for m in player.battlefield:
                if m.health < m.max_health:
                    candidates.append(m)
            if candidates:
                targets.append(random.choice(candidates))
        elif selector == "enemy_weapon":
            for pid, player in game_state.players.items():
                if pid != effect.controller_id and player.weapon:
                    targets.append(player.weapon)
                    break
        elif selector == "friendly_weapon":
            player = game_state.players[effect.controller_id]
            if player.weapon:
                targets.append(player.weapon)
        elif selector is None:
            pass

        return targets

    def _check_death(self, game_state: GameState):
        for player in game_state.players.values():
            dead_minions = [m for m in player.battlefield if m.health <= 0]
            for minion in dead_minions:
                player.battlefield.remove(minion)

                if minion.reborn and not minion.has_reborn_triggered:
                    minion.has_reborn_triggered = True
                    minion.health = 1
                    minion.max_health = 1
                    minion.reborn = False
                    player.battlefield.append(minion)
                else:
                    minion.zone = Zone.GRAVEYARD
                    player.graveyard.append(minion)
                    game_state = self.process_trigger(game_state, TriggerType.DEATHRATTLE, minion)
                    game_state = self.process_trigger(game_state, TriggerType.ON_DEATH, minion)

            if player.health <= 0:
                game_state.game_over = True
                opponent = None
                for pid, p in game_state.players.items():
                    if pid != player.player_id:
                        opponent = p
                        break
                if opponent and opponent.health > 0:
                    game_state.winner_id = opponent.player_id

    def end_turn_cleanup(self, game_state: GameState, player_id: str):
        player = game_state.players[player_id]
        player.temp_attack_buff = 0
        self.triggered_effects.clear()
        for minion in player.battlefield:
            minion.attacks_this_turn = 0

    def _handle_poisonous(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance) and target.card.card_type.name == "MINION":
                target.health = 0
        return game_state

    def _handle_windfury(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.windfury = True
        return game_state

    def _handle_reborn(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.reborn = True
        return game_state

    def _handle_lifesteal(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.lifesteal = True
        return game_state

    def _handle_rush(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.rush = True
                target.exhausted = False
        return game_state

    def _handle_echo(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.echo = True
        return game_state

    def _handle_discover(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        return game_state

    def _handle_outcast(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        return game_state

    def _handle_frenzy(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.frenzy = True
        return game_state

    def _handle_corrupt(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.corrupt = True
        return game_state

    def _handle_tradeable(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.tradeable = True
        return game_state

    def _handle_colossal(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        targets = self._select_targets(game_state, effect)
        for target in targets:
            if isinstance(target, CardInstance):
                target.colossal = True
        return game_state

    def _handle_dredge(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        return game_state

    def _handle_mana_titan(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        return game_state

    def _handle_avenge(self, game_state: GameState, effect: PendingEffect, **kwargs) -> GameState:
        return game_state
