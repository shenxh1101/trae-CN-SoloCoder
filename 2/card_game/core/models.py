from __future__ import annotations
import uuid
from typing import List, Dict, Optional, Callable, Any
from dataclasses import dataclass, field
from copy import deepcopy
from .enums import CardType, CardClass, EffectType, TriggerType, Phase, Zone


@dataclass
class CardEffect:
    effect_type: EffectType
    trigger: TriggerType
    value: Any = None
    target_selector: Optional[str] = None
    condition: Optional[Callable] = None
    priority: int = 0
    effect_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def can_trigger(self, game_state: GameState, source: CardInstance) -> bool:
        if self.condition is None:
            return True
        return self.condition(game_state, source)

    def to_dict(self) -> Dict:
        return {
            "effect_type": self.effect_type.name,
            "trigger": self.trigger.name,
            "value": self.value,
            "target_selector": self.target_selector,
            "priority": self.priority,
            "effect_id": self.effect_id,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> CardEffect:
        return cls(
            effect_type=EffectType[data["effect_type"]],
            trigger=TriggerType[data["trigger"]],
            value=data["value"],
            target_selector=data["target_selector"],
            priority=data["priority"],
            effect_id=data["effect_id"],
        )


@dataclass
class Card:
    card_id: str
    name: str
    card_type: CardType
    card_class: CardClass
    cost: int
    attack: Optional[int] = None
    health: Optional[int] = None
    max_health: Optional[int] = None
    durability: Optional[int] = None
    effects: List[CardEffect] = field(default_factory=list)
    description: str = ""
    rarity: str = "common"
    collectible: bool = True

    def to_dict(self) -> Dict:
        return {
            "card_id": self.card_id,
            "name": self.name,
            "card_type": self.card_type.name,
            "card_class": self.card_class.name,
            "cost": self.cost,
            "attack": self.attack,
            "health": self.health,
            "max_health": self.max_health,
            "durability": self.durability,
            "effects": [e.to_dict() for e in self.effects],
            "description": self.description,
            "rarity": self.rarity,
            "collectible": self.collectible,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> Card:
        return cls(
            card_id=data["card_id"],
            name=data["name"],
            card_type=CardType[data["card_type"]],
            card_class=CardClass[data["card_class"]],
            cost=data["cost"],
            attack=data.get("attack"),
            health=data.get("health"),
            max_health=data.get("max_health"),
            durability=data.get("durability"),
            effects=[CardEffect.from_dict(e) for e in data.get("effects", [])],
            description=data.get("description", ""),
            rarity=data.get("rarity", "common"),
            collectible=data.get("collectible", True),
        )


@dataclass
class CardInstance:
    instance_id: str
    card: Card
    zone: Zone
    controller_id: str
    attack: Optional[int] = None
    health: Optional[int] = None
    max_health: Optional[int] = None
    durability: Optional[int] = None
    buffs: List[Dict] = field(default_factory=list)
    exhausted: bool = False
    divine_shield: bool = False
    taunt: bool = False
    charge: bool = False
    stealth: bool = False
    frozen: bool = False
    poisonous: bool = False
    windfury: bool = False
    attacks_this_turn: int = 0
    reborn: bool = False
    has_reborn_triggered: bool = False
    lifesteal: bool = False
    rush: bool = False
    echo: bool = False
    outcast: bool = False
    frenzy: bool = False
    has_frenzy_triggered: bool = False
    corrupt: bool = False
    is_corrupted: bool = False
    tradeable: bool = False
    colossal: bool = False
    play_order: int = 0

    def __post_init__(self):
        if self.attack is None:
            self.attack = self.card.attack
        if self.health is None:
            self.health = self.card.health
        if self.max_health is None:
            self.max_health = self.card.max_health or self.card.health
        if self.durability is None:
            self.durability = self.card.durability

    @property
    def effects(self):
        return self.card.effects

    def to_dict(self) -> Dict:
        return {
            "instance_id": self.instance_id,
            "card": self.card.to_dict(),
            "zone": self.zone.name,
            "controller_id": self.controller_id,
            "attack": self.attack,
            "health": self.health,
            "max_health": self.max_health,
            "durability": self.durability,
            "buffs": self.buffs,
            "exhausted": self.exhausted,
            "divine_shield": self.divine_shield,
            "taunt": self.taunt,
            "charge": self.charge,
            "stealth": self.stealth,
            "frozen": self.frozen,
            "poisonous": self.poisonous,
            "windfury": self.windfury,
            "attacks_this_turn": self.attacks_this_turn,
            "reborn": self.reborn,
            "has_reborn_triggered": self.has_reborn_triggered,
            "lifesteal": self.lifesteal,
            "rush": self.rush,
            "echo": self.echo,
            "outcast": self.outcast,
            "frenzy": self.frenzy,
            "has_frenzy_triggered": self.has_frenzy_triggered,
            "corrupt": self.corrupt,
            "is_corrupted": self.is_corrupted,
            "tradeable": self.tradeable,
            "colossal": self.colossal,
            "play_order": self.play_order,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> CardInstance:
        return cls(
            instance_id=data["instance_id"],
            card=Card.from_dict(data["card"]),
            zone=Zone[data["zone"]],
            controller_id=data["controller_id"],
            attack=data["attack"],
            health=data["health"],
            max_health=data["max_health"],
            durability=data["durability"],
            buffs=data.get("buffs", []),
            exhausted=data.get("exhausted", False),
            divine_shield=data.get("divine_shield", False),
            taunt=data.get("taunt", False),
            charge=data.get("charge", False),
            stealth=data.get("stealth", False),
            frozen=data.get("frozen", False),
            poisonous=data.get("poisonous", False),
            windfury=data.get("windfury", False),
            attacks_this_turn=data.get("attacks_this_turn", 0),
            reborn=data.get("reborn", False),
            has_reborn_triggered=data.get("has_reborn_triggered", False),
            lifesteal=data.get("lifesteal", False),
            rush=data.get("rush", False),
            echo=data.get("echo", False),
            outcast=data.get("outcast", False),
            frenzy=data.get("frenzy", False),
            has_frenzy_triggered=data.get("has_frenzy_triggered", False),
            corrupt=data.get("corrupt", False),
            is_corrupted=data.get("is_corrupted", False),
            tradeable=data.get("tradeable", False),
            colossal=data.get("colossal", False),
            play_order=data.get("play_order", 0),
        )

    def copy(self) -> CardInstance:
        return CardInstance(
            instance_id=str(uuid.uuid4()),
            card=self.card,
            zone=self.zone,
            controller_id=self.controller_id,
            attack=self.attack,
            health=self.health,
            max_health=self.max_health,
            durability=self.durability,
            buffs=deepcopy(self.buffs),
            exhausted=self.exhausted,
            divine_shield=self.divine_shield,
            taunt=self.taunt,
            charge=self.charge,
            stealth=self.stealth,
            frozen=self.frozen,
            poisonous=self.poisonous,
            windfury=self.windfury,
            attacks_this_turn=self.attacks_this_turn,
            reborn=self.reborn,
            has_reborn_triggered=self.has_reborn_triggered,
            lifesteal=self.lifesteal,
            rush=self.rush,
            echo=self.echo,
            outcast=self.outcast,
            frenzy=self.frenzy,
            has_frenzy_triggered=self.has_frenzy_triggered,
            corrupt=self.corrupt,
            is_corrupted=self.is_corrupted,
            tradeable=self.tradeable,
            colossal=self.colossal,
            play_order=self.play_order,
        )


@dataclass
class Player:
    player_id: str
    name: str
    card_class: CardClass
    health: int = 30
    max_health: int = 30
    armor: int = 0
    mana: int = 0
    max_mana: int = 0
    overload: int = 0
    spell_damage: int = 0
    temp_attack_buff: int = 0
    deck: List[CardInstance] = field(default_factory=list)
    hand: List[CardInstance] = field(default_factory=list)
    battlefield: List[CardInstance] = field(default_factory=list)
    graveyard: List[CardInstance] = field(default_factory=list)
    secrets: List[CardInstance] = field(default_factory=list)
    weapon: Optional[CardInstance] = None
    hero_power: Optional[CardInstance] = None
    hero_power_used: bool = False
    cards_played_this_turn: int = 0

    def to_dict(self) -> Dict:
        return {
            "player_id": self.player_id,
            "name": self.name,
            "card_class": self.card_class.name,
            "health": self.health,
            "max_health": self.max_health,
            "mana": self.mana,
            "max_mana": self.max_mana,
            "overload": self.overload,
            "spell_damage": self.spell_damage,
            "deck": [c.to_dict() for c in self.deck],
            "hand": [c.to_dict() for c in self.hand],
            "battlefield": [c.to_dict() for c in self.battlefield],
            "graveyard": [c.to_dict() for c in self.graveyard],
            "secrets": [c.to_dict() for c in self.secrets],
            "weapon": self.weapon.to_dict() if self.weapon else None,
            "hero_power": self.hero_power.to_dict() if self.hero_power else None,
            "hero_power_used": self.hero_power_used,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> Player:
        player = cls(
            player_id=data["player_id"],
            name=data["name"],
            card_class=CardClass[data["card_class"]],
            health=data["health"],
            max_health=data["max_health"],
            mana=data["mana"],
            max_mana=data["max_mana"],
            overload=data["overload"],
            spell_damage=data["spell_damage"],
            hero_power_used=data.get("hero_power_used", False),
        )
        player.deck = [CardInstance.from_dict(c) for c in data["deck"]]
        player.hand = [CardInstance.from_dict(c) for c in data["hand"]]
        player.battlefield = [CardInstance.from_dict(c) for c in data["battlefield"]]
        player.graveyard = [CardInstance.from_dict(c) for c in data["graveyard"]]
        player.secrets = [CardInstance.from_dict(c) for c in data["secrets"]]
        if data.get("weapon"):
            player.weapon = CardInstance.from_dict(data["weapon"])
        if data.get("hero_power"):
            player.hero_power = CardInstance.from_dict(data["hero_power"])
        return player

    def get_card_by_instance_id(self, instance_id: str) -> Optional[CardInstance]:
        for zone in [self.deck, self.hand, self.battlefield, self.graveyard, self.secrets]:
            for card in zone:
                if card.instance_id == instance_id:
                    return card
        if self.weapon and self.weapon.instance_id == instance_id:
            return self.weapon
        return None


@dataclass
class GameState:
    game_id: str
    players: Dict[str, Player]
    current_player_id: str
    turn: int = 1
    phase: Phase = Phase.BEGIN_MULLIGAN
    play_counter: int = 0
    game_over: bool = False
    winner_id: Optional[str] = None
    active_effects: List[Dict] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "game_id": self.game_id,
            "players": {pid: p.to_dict() for pid, p in self.players.items()},
            "current_player_id": self.current_player_id,
            "turn": self.turn,
            "phase": self.phase.name,
            "play_counter": self.play_counter,
            "game_over": self.game_over,
            "winner_id": self.winner_id,
            "active_effects": self.active_effects,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> GameState:
        return cls(
            game_id=data["game_id"],
            players={pid: Player.from_dict(p) for pid, p in data["players"].items()},
            current_player_id=data["current_player_id"],
            turn=data["turn"],
            phase=Phase[data["phase"]],
            play_counter=data["play_counter"],
            game_over=data["game_over"],
            winner_id=data.get("winner_id"),
            active_effects=data.get("active_effects", []),
        )

    def copy(self) -> GameState:
        return GameState.from_dict(self.to_dict())

    def get_current_player(self) -> Player:
        return self.players[self.current_player_id]

    def get_opponent(self, player_id: str) -> Player:
        for pid, player in self.players.items():
            if pid != player_id:
                return player
        raise ValueError("Opponent not found")

    def get_all_cards(self) -> List[CardInstance]:
        cards = []
        for player in self.players.values():
            cards.extend(player.deck)
            cards.extend(player.hand)
            cards.extend(player.battlefield)
            cards.extend(player.graveyard)
            cards.extend(player.secrets)
            if player.weapon:
                cards.append(player.weapon)
        return cards

    def get_card_by_instance_id(self, instance_id: str) -> Optional[CardInstance]:
        for player in self.players.values():
            card = player.get_card_by_instance_id(instance_id)
            if card:
                return card
        return None


class Game:
    def __init__(self, game_id: str, player1: Player, player2: Player):
        self.state = GameState(
            game_id=game_id,
            players={player1.player_id: player1, player2.player_id: player2},
            current_player_id=player1.player_id,
        )
        self.action_history: List[Dict] = []

    def to_dict(self) -> Dict:
        return {
            "state": self.state.to_dict(),
            "action_history": self.action_history,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> Game:
        state = GameState.from_dict(data["state"])
        game = cls.__new__(cls)
        game.state = state
        game.action_history = data.get("action_history", [])
        return game
