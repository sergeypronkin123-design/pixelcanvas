import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"Client connected. Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"Client disconnected. Total: {len(self.active_connections)}")

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
