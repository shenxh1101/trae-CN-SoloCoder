from __future__ import annotations
import asyncio
import json
import uuid
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum


class MessageType(Enum):
    JOIN_LOBBY = "join_lobby"
    LOBBY_UPDATE = "lobby_update"
    CHALLENGE = "challenge"
    CHALLENGE_RESPONSE = "challenge_response"
    GAME_START = "game_start"
    GAME_ACTION = "game_action"
    GAME_STATE = "game_state"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"
    RECONNECT = "reconnect"


@dataclass
class PlayerConnection:
    player_id: str
    name: str
    websocket: any
    last_seen: str = field(default_factory=lambda: datetime.now().isoformat())
    current_game_id: Optional[str] = None


@dataclass
class GameSession:
    game_id: str
    player1_id: str
    player2_id: str
    state: Dict = field(default_factory=dict)
    action_history: List[Dict] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_active: bool = True

    def to_dict(self) -> Dict:
        return {
            "game_id": self.game_id,
            "player1_id": self.player1_id,
            "player2_id": self.player2_id,
            "state": self.state,
            "action_history": self.action_history,
            "created_at": self.created_at,
            "is_active": self.is_active,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'GameSession':
        return cls(
            game_id=data["game_id"],
            player1_id=data["player1_id"],
            player2_id=data["player2_id"],
            state=data.get("state", {}),
            action_history=data.get("action_history", []),
            created_at=data.get("created_at", datetime.now().isoformat()),
            is_active=data.get("is_active", True),
        )


class NetworkManager:
    def __init__(self):
        self.connected_players: Dict[str, PlayerConnection] = {}
        self.active_games: Dict[str, GameSession] = {}
        self.pending_challenges: Dict[str, str] = {}
        self._state_snapshots: Dict[str, Dict] = {}

    async def handle_message(self, player_id: str, message: Dict) -> Optional[Dict]:
        msg_type = message.get("type")

        handlers = {
            MessageType.JOIN_LOBBY.value: self._handle_join_lobby,
            MessageType.CHALLENGE.value: self._handle_challenge,
            MessageType.CHALLENGE_RESPONSE.value: self._handle_challenge_response,
            MessageType.GAME_ACTION.value: self._handle_game_action,
            MessageType.DISCONNECT.value: self._handle_disconnect,
            MessageType.PING.value: self._handle_ping,
            MessageType.RECONNECT.value: self._handle_reconnect,
        }

        handler = handlers.get(msg_type)
        if handler:
            return await handler(player_id, message)

        return None

    async def _handle_join_lobby(self, player_id: str, message: Dict) -> Dict:
        player_name = message.get("name", "Anonymous")

        if player_id not in self.connected_players:
            self.connected_players[player_id] = PlayerConnection(
                player_id=player_id,
                name=player_name,
                websocket=None,
            )

        lobby_players = [
            {"player_id": p.player_id, "name": p.name}
            for p in self.connected_players.values()
            if p.current_game_id is None
        ]

        return {
            "type": MessageType.LOBBY_UPDATE.value,
            "players": lobby_players,
            "your_id": player_id,
        }

    async def _handle_challenge(self, player_id: str, message: Dict) -> Optional[Dict]:
        target_id = message.get("target_id")

        if target_id in self.connected_players and target_id != player_id:
            challenge_id = str(uuid.uuid4())
            self.pending_challenges[challenge_id] = json.dumps(
                {"from": player_id, "to": target_id, "timestamp": datetime.now().isoformat()}
            )

            return {
                "type": MessageType.CHALLENGE.value,
                "challenge_id": challenge_id,
                "from_player": player_id,
                "from_name": self.connected_players[player_id].name,
            }

        return None

    async def _handle_challenge_response(self, player_id: str, message: Dict) -> Optional[Dict]:
        challenge_id = message.get("challenge_id")
        accepted = message.get("accepted", False)

        if challenge_id in self.pending_challenges:
            challenge_data = json.loads(self.pending_challenges[challenge_id])
            challenger_id = challenge_data["from"]

            if accepted:
                game_id = str(uuid.uuid4())
                session = GameSession(
                    game_id=game_id,
                    player1_id=challenger_id,
                    player2_id=player_id,
                )
                self.active_games[game_id] = session

                if challenger_id in self.connected_players:
                    self.connected_players[challenger_id].current_game_id = game_id
                if player_id in self.connected_players:
                    self.connected_players[player_id].current_game_id = game_id

                return {
                    "type": MessageType.GAME_START.value,
                    "game_id": game_id,
                    "opponent_id": challenger_id if player_id != challenger_id else player_id,
                    "opponent_name": self.connected_players.get(challenger_id, lambda: None).name if self.connected_players.get(challenger_id) else "Unknown",
                }

            del self.pending_challenges[challenge_id]

        return None

    async def _handle_game_action(self, player_id: str, message: Dict) -> Optional[Dict]:
        game_id = message.get("game_id")
        action = message.get("action")

        if game_id in self.active_games:
            session = self.active_games[game_id]

            action_with_timestamp = {
                **action,
                "player_id": player_id,
                "timestamp": datetime.now().isoformat(),
            }
            session.action_history.append(action_with_timestamp)

            self._save_snapshot(game_id, session)

            return {
                "type": MessageType.GAME_ACTION.value,
                "game_id": game_id,
                "player_id": player_id,
                "action": action,
            }

        return None

    async def _handle_disconnect(self, player_id: str, message: Dict) -> None:
        if player_id in self.connected_players:
            player = self.connected_players[player_id]

            if player.current_game_id and player.current_game_id in self.active_games:
                self._save_snapshot(player.current_game_id, self.active_games[player.current_game_id])

            del self.connected_players[player_id]

    async def _handle_ping(self, player_id: str, message: Dict) -> Dict:
        if player_id in self.connected_players:
            self.connected_players[player_id].last_seen = datetime.now().isoformat()

        return {"type": MessageType.PONG.value, "timestamp": datetime.now().isoformat()}

    async def _handle_reconnect(self, player_id: str, message: Dict) -> Optional[Dict]:
        game_id = message.get("game_id")

        if game_id in self._state_snapshots:
            snapshot = self._state_snapshots[game_id]

            if player_id in [snapshot.get("player1_id"), snapshot.get("player2_id")]:
                if player_id in self.connected_players:
                    self.connected_players[player_id].current_game_id = game_id

                return {
                    "type": MessageType.GAME_STATE.value,
                    "game_id": game_id,
                    "state": snapshot.get("state", {}),
                    "action_history": snapshot.get("action_history", []),
                    "resumed": True,
                }

        return None

    def _save_snapshot(self, game_id: str, session: GameSession):
        self._state_snapshots[game_id] = session.to_dict()

    def get_lobby_players(self) -> List[Dict]:
        return [
            {"player_id": p.player_id, "name": p.name}
            for p in self.connected_players.values()
            if p.current_game_id is None
        ]

    def get_active_game(self, game_id: str) -> Optional[GameSession]:
        return self.active_games.get(game_id)

    def get_stored_snapshot(self, game_id: str) -> Optional[Dict]:
        return self._state_snapshots.get(game_id)

    def end_game(self, game_id: str):
        if game_id in self.active_games:
            session = self.active_games[game_id]
            session.is_active = False

            for pid in [session.player1_id, session.player2_id]:
                if pid in self.connected_players:
                    self.connected_players[pid].current_game_id = None

            self._save_snapshot(game_id, session)
            del self.active_games[game_id]


class GameClient:
    def __init__(self, player_id: str, player_name: str):
        self.player_id = player_id
        self.player_name = player_name
        self.current_game_id: Optional[str] = None
        self.message_handlers: Dict[str, Callable] = {}
        self._pending_actions: List[Dict] = []

    def send_message(self, message_type: MessageType, **kwargs) -> Dict:
        return {
            "type": message_type.value,
            "player_id": self.player_id,
            **kwargs,
        }

    def join_lobby(self) -> Dict:
        return self.send_message(MessageType.JOIN_LOBBY, name=self.player_name)

    def challenge_player(self, target_id: str) -> Dict:
        return self.send_message(MessageType.CHALLENGE, target_id=target_id)

    def respond_to_challenge(self, challenge_id: str, accepted: bool) -> Dict:
        return self.send_message(
            MessageType.CHALLENGE_RESPONSE,
            challenge_id=challenge_id,
            accepted=accepted,
        )

    def send_game_action(self, action: Dict) -> Dict:
        return self.send_message(
            MessageType.GAME_ACTION,
            game_id=self.current_game_id,
            action=action,
        )

    def reconnect(self, game_id: str) -> Dict:
        return self.send_message(MessageType.RECONNECT, game_id=game_id)

    def disconnect(self) -> Dict:
        return self.send_message(MessageType.DISCONNECT)

    def ping(self) -> Dict:
        return self.send_message(MessageType.PING)

    def handle_server_message(self, message: Dict) -> bool:
        msg_type = message.get("type")

        if msg_type == MessageType.GAME_START.value:
            self.current_game_id = message.get("game_id")
            return True

        elif msg_type == MessageType.GAME_STATE.value:
            if message.get("resumed"):
                self.current_game_id = message.get("game_id")
                self._pending_actions = message.get("action_history", [])
            return True

        return False
