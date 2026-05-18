from __future__ import annotations
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from collections import Counter

from ..core import Card
from ..core.enums import CardClass
from .database import CardDatabase


@dataclass
class DeckValidationResult:
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    mana_curve: Dict[int, int] = field(default_factory=dict)
    type_distribution: Dict[str, int] = field(default_factory=dict)
    class_distribution: Dict[str, int] = field(default_factory=dict)


class DeckValidator:
    MIN_DECK_SIZE = 30
    MAX_DECK_SIZE = 30
    MAX_COPIES_PER_CARD = 2
    MAX_LEGENDARY_COPIES = 1

    def __init__(self, deck_class: CardClass):
        self.deck_class = deck_class
        CardDatabase.initialize()

    def validate(self, card_ids: List[str]) -> DeckValidationResult:
        result = DeckValidationResult(valid=True)

        result.valid = self._validate_deck_size(card_ids, result)
        result.valid = self._validate_card_existence(card_ids, result) and result.valid
        result.valid = self._validate_card_limits(card_ids, result) and result.valid
        result.valid = self._validate_card_class(card_ids, result) and result.valid

        self._calculate_mana_curve(card_ids, result)
        self._calculate_type_distribution(card_ids, result)
        self._calculate_class_distribution(card_ids, result)

        self._analyze_mana_curve(result)

        return result

    def _validate_deck_size(self, card_ids: List[str], result: DeckValidationResult) -> bool:
        if len(card_ids) < self.MIN_DECK_SIZE:
            result.errors.append(
                f"Deck has only {len(card_ids)} cards. Minimum is {self.MIN_DECK_SIZE}."
            )
            return False
        elif len(card_ids) > self.MAX_DECK_SIZE:
            result.errors.append(
                f"Deck has {len(card_ids)} cards. Maximum is {self.MAX_DECK_SIZE}."
            )
            return False
        return True

    def _validate_card_existence(self, card_ids: List[str], result: DeckValidationResult) -> bool:
        all_valid = True
        for card_id in card_ids:
            if not CardDatabase.get_card(card_id):
                result.errors.append(f"Unknown card ID: {card_id}")
                all_valid = False
        return all_valid

    def _validate_card_limits(self, card_ids: List[str], result: DeckValidationResult) -> bool:
        all_valid = True
        card_counts = Counter(card_ids)

        for card_id, count in card_counts.items():
            card = CardDatabase.get_card(card_id)
            if not card:
                continue

            max_copies = self.MAX_LEGENDARY_COPIES if card.rarity == "legendary" else self.MAX_COPIES_PER_CARD

            if count > max_copies:
                result.errors.append(
                    f"Too many copies of '{card.name}' ({count}). Maximum is {max_copies}."
                )
                all_valid = False

        return all_valid

    def _validate_card_class(self, card_ids: List[str], result: DeckValidationResult) -> bool:
        all_valid = True
        for card_id in card_ids:
            card = CardDatabase.get_card(card_id)
            if not card:
                continue

            if card.card_class != CardClass.NEUTRAL and card.card_class != self.deck_class:
                result.errors.append(
                    f"'{card.name}' is a {card.card_class.name} card, cannot be used in {self.deck_class.name} deck."
                )
                all_valid = False

        return all_valid

    def _calculate_mana_curve(self, card_ids: List[str], result: DeckValidationResult):
        for cost in range(0, 11):
            result.mana_curve[cost] = 0

        for card_id in card_ids:
            card = CardDatabase.get_card(card_id)
            if card:
                cost = min(card.cost, 10)
                result.mana_curve[cost] = result.mana_curve.get(cost, 0) + 1

    def _calculate_type_distribution(self, card_ids: List[str], result: DeckValidationResult):
        for card_id in card_ids:
            card = CardDatabase.get_card(card_id)
            if card:
                type_name = card.card_type.name
                result.type_distribution[type_name] = result.type_distribution.get(type_name, 0) + 1

    def _calculate_class_distribution(self, card_ids: List[str], result: DeckValidationResult):
        for card_id in card_ids:
            card = CardDatabase.get_card(card_id)
            if card:
                class_name = card.card_class.name
                result.class_distribution[class_name] = result.class_distribution.get(class_name, 0) + 1

    def _analyze_mana_curve(self, result: DeckValidationResult):
        early_game = sum(result.mana_curve.get(c, 0) for c in range(0, 3))
        mid_game = sum(result.mana_curve.get(c, 0) for c in range(3, 6))
        late_game = sum(result.mana_curve.get(c, 0) for c in range(6, 11))

        if early_game < 8:
            result.warnings.append(
                f"Low early-game presence ({early_game} cards for 0-2 mana). Consider adding more 1 and 2 drops."
            )
        elif early_game > 15:
            result.warnings.append(
                f"High early-game presence ({early_game} cards). May run out of steam late game."
            )

        if mid_game < 8:
            result.warnings.append(
                f"Low mid-game presence ({mid_game} cards for 3-5 mana). Consider adding more mid-range cards."
            )

        if late_game > 10:
            result.warnings.append(
                f"High late-game presence ({late_game} cards for 6+ mana). May struggle with early pressure."
            )

        zero_cost = result.mana_curve.get(0, 0)
        if zero_cost > 4:
            result.warnings.append(
                f"Many 0-cost cards ({zero_cost}). Watch for potential mana waste in early turns."
            )

    def get_deck_stats(self, card_ids: List[str]) -> Dict:
        total_cost = 0
        total_attack = 0
        total_health = 0
        minion_count = 0
        draw_effects = 0
        removal_effects = 0

        for card_id in card_ids:
            card = CardDatabase.get_card(card_id)
            if not card:
                continue

            total_cost += card.cost

            if card.card_type.name == "MINION":
                minion_count += 1
                total_attack += card.attack or 0
                total_health += card.health or 0

            for effect in card.effects:
                if effect.effect_type.name == "DRAW":
                    draw_effects += 1
                elif effect.effect_type.name == "DAMAGE" or effect.effect_type.name == "DESTROY":
                    removal_effects += 1

        avg_cost = total_cost / len(card_ids) if card_ids else 0
        avg_minion_attack = total_attack / minion_count if minion_count else 0
        avg_minion_health = total_health / minion_count if minion_count else 0

        return {
            "average_cost": round(avg_cost, 2),
            "average_minion_attack": round(avg_minion_attack, 2),
            "average_minion_health": round(avg_minion_health, 2),
            "draw_effects": draw_effects,
            "removal_effects": removal_effects,
            "minion_count": minion_count,
            "spell_count": len(card_ids) - minion_count,
        }
