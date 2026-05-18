from __future__ import annotations
from typing import Dict, List, Optional
from dataclasses import dataclass
from collections import defaultdict

from ..core import Card, CardEffect
from ..core.enums import CardType, CardClass, EffectType, TriggerType
from .card_data import get_all_card_definitions


@dataclass
class CardDatabase:
    _cards: Dict[str, Card] = None
    _cards_by_class: Dict[CardClass, List[Card]] = None
    _cards_by_type: Dict[CardType, List[Card]] = None

    @classmethod
    def initialize(cls):
        if cls._cards is None:
            cls._cards = {}
            cls._cards_by_class = defaultdict(list)
            cls._cards_by_type = defaultdict(list)

            all_cards = get_all_card_definitions()

            for card in all_cards:
                cls._cards[card.card_id] = card
                cls._cards_by_class[card.card_class].append(card)
                cls._cards_by_type[card.card_type].append(card)

    @classmethod
    def get_card(cls, card_id: str) -> Optional[Card]:
        cls.initialize()
        return cls._cards.get(card_id)

    @classmethod
    def get_all_cards(cls) -> List[Card]:
        cls.initialize()
        return list(cls._cards.values())

    @classmethod
    def get_cards_by_class(cls, card_class: CardClass) -> List[Card]:
        cls.initialize()
        result = []
        result.extend(cls._cards_by_class.get(CardClass.NEUTRAL, []))
        result.extend(cls._cards_by_class.get(card_class, []))
        return result

    @classmethod
    def get_cards_by_type(cls, card_type: CardType) -> List[Card]:
        cls.initialize()
        return cls._cards_by_type.get(card_type, [])

    @classmethod
    def get_cards_by_cost(cls, cost: int) -> List[Card]:
        cls.initialize()
        return [c for c in cls._cards.values() if c.cost == cost]

    @classmethod
    def get_cards_by_rarity(cls, rarity: str) -> List[Card]:
        cls.initialize()
        return [c for c in cls._cards.values() if c.rarity == rarity]

    @classmethod
    def get_cards_with_effect(cls, effect_type: EffectType) -> List[Card]:
        cls.initialize()
        result = []
        for card in cls._cards.values():
            for effect in card.effects:
                if effect.effect_type == effect_type:
                    result.append(card)
                    break
        return result

    @classmethod
    def get_class_stats(cls, card_class: CardClass) -> Dict:
        cards = cls.get_cards_by_class(card_class)

        minions = [c for c in cards if c.card_type == CardType.MINION]
        spells = [c for c in cards if c.card_type == CardType.SPELL]
        weapons = [c for c in cards if c.card_type == CardType.WEAPON]

        avg_minion_stats = {}
        if minions:
            avg_attack = sum(m.attack or 0 for m in minions) / len(minions)
            avg_health = sum(m.health or 0 for m in minions) / len(minions)
            avg_cost = sum(m.cost for m in minions) / len(minions)
            avg_minion_stats = {
                "avg_attack": avg_attack,
                "avg_health": avg_health,
                "avg_cost": avg_cost,
            }

        mana_curve = defaultdict(int)
        for card in cards:
            mana_curve[card.cost] += 1

        return {
            "total_cards": len(cards),
            "minions": len(minions),
            "spells": len(spells),
            "weapons": len(weapons),
            "avg_minion_stats": avg_minion_stats,
            "mana_curve": dict(mana_curve),
        }
