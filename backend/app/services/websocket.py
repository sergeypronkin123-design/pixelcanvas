import json
import asyncio
from typing import Set
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    @property
    def online_count(self) -> int:
        return len(self.active_connections)

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        # Broadcast new online count
        await self.broadcast({"type": "online_count", "count": self.online_count})

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        await self.broadcast({"type": "online_count", "count": self.online_count})

    async def broadcast(self, message: dict):
        data = json.dumps(message)
        dead = set()
        async with self._lock:
            connections = list(self.active_connections)
        for conn in connections:
            try:
                await conn.send_text(data)
            except Exception:
                dead.add(conn)
        if dead:
            async with self._lock:
                self.active_connections -= dead


manager = ConnectionManager()
