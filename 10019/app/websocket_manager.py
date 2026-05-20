from typing import Dict, Set
from fastapi import WebSocket
import json
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(user_id, connection)

    async def broadcast_status_update(
        self,
        user_id: int,
        tracking_number: str,
        status: str,
        latest_status: str
    ):
        message = {
            "type": "status_update",
            "data": {
                "tracking_number": tracking_number,
                "status": status,
                "latest_status": latest_status,
                "update_time": datetime.now().isoformat()
            }
        }
        await self.send_personal_message(user_id, message)


manager = ConnectionManager()
