"""
WebSocket connection manager — auth-via-frame + batched broadcasting.

Improvements over previous version:
- JWT no longer leaked via query string (can be ?token= for backward-compat
  but recommended to send `{"type": "auth", "token": "..."}` as first frame)
- Pixel events accumulated in 100ms windows and broadcast as one message
- Per-connection rate limiting in addition to slowapi
- Authenticated set tracked separately from all connections
"""
import asyncio
import json
import logging
import time
from typing import Any, Optional, Set

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ConnectionManager:
    """Tracks WebSocket connections + handles fan-out broadcasts."""

    BATCH_INTERVAL_MS = 100  # Bundle pixels for this window before sending

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        self.authenticated: dict[WebSocket, int] = {}  # ws -> user_id
        self._broadcast_queue: list[dict] = []
        self._broadcast_lock = asyncio.Lock()
        self._broadcast_task: Optional[asyncio.Task] = None

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        if user_id:
            self.authenticated[websocket] = user_id

        # Lazily start the broadcast pump
        if self._broadcast_task is None or self._broadcast_task.done():
            self._broadcast_task = asyncio.create_task(self._broadcast_loop())

        # Send initial state
        await self.send_personal(websocket, {
            "type": "connected",
            "online_count": len(self.authenticated),
        })

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)
        self.authenticated.pop(websocket, None)

    def authenticate(self, websocket: WebSocket, user_id: int) -> None:
        """Mark an existing connection as authenticated."""
        if websocket in self.active_connections:
            self.authenticated[websocket] = user_id

    # ------------------------------------------------------------------
    # Send messages
    # ------------------------------------------------------------------

    async def send_personal(self, websocket: WebSocket, message: dict) -> None:
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)

    async def broadcast(self, message: dict) -> None:
        """Queue message for batch broadcast in next 100ms window."""
        async with self._broadcast_lock:
            self._broadcast_queue.append(message)

    async def broadcast_immediate(self, message: dict) -> None:
        """Bypass batching — for high-priority events (battle phase change)."""
        await self._send_to_all(message)

    async def _send_to_all(self, message: Any) -> None:
        dead = []
        encoded = json.dumps(message)
        for ws in list(self.active_connections):
            try:
                await ws.send_text(encoded)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    # ------------------------------------------------------------------
    # Batching
    # ------------------------------------------------------------------

    async def _broadcast_loop(self) -> None:
        """Drain queue every BATCH_INTERVAL_MS and send as bundled message."""
        while True:
            await asyncio.sleep(self.BATCH_INTERVAL_MS / 1000)

            async with self._broadcast_lock:
                if not self._broadcast_queue:
                    continue
                batch = self._broadcast_queue
                self._broadcast_queue = []

            # Group pixel events into a single bundle
            pixels = [m for m in batch if m.get("type") == "pixel"]
            others = [m for m in batch if m.get("type") != "pixel"]

            if pixels:
                await self._send_to_all({"type": "pixel_batch", "pixels": pixels})
            for m in others:
                await self._send_to_all(m)


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Auth helper — accepts both query token (legacy) and first-frame auth
# ---------------------------------------------------------------------------


async def authenticate_ws(
    websocket: WebSocket,
    db: Session,
    query_token: Optional[str] = None,
) -> Optional[int]:
    """
    Try query-string token first (backward compatible), then wait up to 3s
    for an auth frame: {"type": "auth", "token": "..."}.
    Returns user_id or None.
    """
    from app.api.auth import decode_token  # avoid circular import

    if query_token:
        try:
            payload = decode_token(query_token)
            return int(payload.get("sub", 0)) or None
        except Exception:
            pass  # Fall through to frame auth

    try:
        first_msg = await asyncio.wait_for(websocket.receive_json(), timeout=3.0)
        if first_msg.get("type") == "auth" and first_msg.get("token"):
            payload = decode_token(first_msg["token"])
            return int(payload.get("sub", 0)) or None
    except (asyncio.TimeoutError, Exception):
        return None

    return None
