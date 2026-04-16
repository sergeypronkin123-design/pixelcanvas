"""
Оптимизированный WebSocket manager с батчингом сообщений.
"""
import json
import asyncio
import time
import os
from typing import Set, List, Dict, Any, Optional
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

BATCH_INTERVAL_MS = 100  # отправляем пачку раз в 100мс


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._pixel_buffer: List[Dict[str, Any]] = []
        self._buffer_lock = asyncio.Lock()
        self._flush_task: Optional[asyncio.Task] = None
        self._last_online_broadcast = 0.0

    @property
    def online_count(self) -> int:
        return len(self.active_connections)

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        try:
            await websocket.send_text(json.dumps({"type": "online_count", "count": self.online_count}))
        except Exception:
            pass
        await self._maybe_broadcast_online()

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        await self._maybe_broadcast_online()

    async def _maybe_broadcast_online(self):
        now = time.time()
        if now - self._last_online_broadcast < 1.0:
            return
        self._last_online_broadcast = now
        await self._broadcast_raw({"type": "online_count", "count": self.online_count})

    async def broadcast_pixel(self, x: int, y: int, color: str, user_id: int, clan_id: Optional[int] = None):
        """Добавить пиксель в батч"""
        async with self._buffer_lock:
            self._pixel_buffer.append({
                "x": x, "y": y, "color": color, "user_id": user_id, "clan_id": clan_id,
            })
            if self._flush_task is None or self._flush_task.done():
                self._flush_task = asyncio.create_task(self._flush_loop())

    async def _flush_loop(self):
        await asyncio.sleep(BATCH_INTERVAL_MS / 1000)
        async with self._buffer_lock:
            if not self._pixel_buffer:
                return
            batch = self._pixel_buffer
            self._pixel_buffer = []
        await self._broadcast_raw({"type": "pixels_batch", "pixels": batch})

    async def broadcast(self, message: dict):
        await self._broadcast_raw(message)

    async def _broadcast_raw(self, message: dict):
        data = json.dumps(message)
        async with self._lock:
            connections = list(self.active_connections)
        if not connections:
            return

        results = await asyncio.gather(
            *[self._safe_send(c, data) for c in connections],
            return_exceptions=True
        )
        dead = [c for c, ok in zip(connections, results) if ok is False or isinstance(ok, Exception)]
        if dead:
            async with self._lock:
                for c in dead:
                    self.active_connections.discard(c)

    async def _safe_send(self, ws: WebSocket, data: str) -> bool:
        try:
            await ws.send_text(data)
            return True
        except Exception:
            return False


manager = ConnectionManager()
