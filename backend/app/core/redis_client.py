"""
Redis client wrapper with graceful in-memory fallback.

Used for:
- Rate limit counters (slowapi backend)
- Leaderboard cache (60s TTL)
- WebSocket pub/sub between replicas (when scaling beyond 1 dyno)
- Distributed locks for cron jobs

If REDIS_URL is missing or invalid, falls back to in-memory dict.
Logs a warning at startup but does not crash.
"""
import asyncio
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "").strip()


# ---------------------------------------------------------------------------
# In-memory fallback — used only when Redis is unavailable
# ---------------------------------------------------------------------------


class InMemoryStore:
    """Thread-unsafe in-memory KV with TTL. Fine for single-process dev."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, Optional[float]]] = {}

    def _is_alive(self, expiry: Optional[float]) -> bool:
        return expiry is None or expiry > time.time()

    async def get(self, key: str) -> Optional[bytes]:
        item = self._store.get(key)
        if item is None:
            return None
        value, expiry = item
        if not self._is_alive(expiry):
            self._store.pop(key, None)
            return None
        return value if isinstance(value, bytes) else str(value).encode()

    async def set(self, key: str, value: Any, ex: Optional[int] = None) -> None:
        expiry = time.time() + ex if ex else None
        self._store[key] = (value, expiry)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def incr(self, key: str) -> int:
        item = self._store.get(key)
        if item is None or not self._is_alive(item[1]):
            self._store[key] = (1, item[1] if item else None)
            return 1
        self._store[key] = (item[0] + 1, item[1])
        return self._store[key][0]

    async def expire(self, key: str, seconds: int) -> None:
        item = self._store.get(key)
        if item:
            self._store[key] = (item[0], time.time() + seconds)

    async def ping(self) -> bool:
        return True


# ---------------------------------------------------------------------------
# Real Redis client (lazy init)
# ---------------------------------------------------------------------------

_redis_client: Optional[Any] = None
_fallback_store = InMemoryStore()


async def get_redis() -> Any:
    """Return Redis client or fallback store. Singleton."""
    global _redis_client

    if _redis_client is not None:
        return _redis_client

    if not REDIS_URL or not REDIS_URL.startswith(("redis://", "rediss://")):
        logger.warning(
            "REDIS_URL not configured (got: %r) — using in-memory fallback. "
            "Rate limits won't persist across restarts; multi-replica deploys won't sync.",
            REDIS_URL[:30] if REDIS_URL else "<empty>",
        )
        _redis_client = _fallback_store
        return _redis_client

    try:
        import redis.asyncio as aioredis  # type: ignore
        client = aioredis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=False,
            max_connections=20,
            socket_keepalive=True,
            health_check_interval=30,
        )
        await asyncio.wait_for(client.ping(), timeout=3)
        _redis_client = client
        logger.info("Redis connected: %s", REDIS_URL.split("@")[-1][:40])
        return _redis_client
    except Exception as e:
        logger.error("Redis init failed (%s) — falling back to in-memory", e)
        _redis_client = _fallback_store
        return _redis_client


async def cache_get(key: str) -> Optional[bytes]:
    client = await get_redis()
    try:
        return await client.get(key)
    except Exception as e:
        logger.warning("Redis GET %s failed: %s", key, e)
        return None


async def cache_set(key: str, value: Any, ttl: Optional[int] = None) -> None:
    client = await get_redis()
    try:
        if ttl:
            await client.set(key, value, ex=ttl)
        else:
            await client.set(key, value)
    except Exception as e:
        logger.warning("Redis SET %s failed: %s", key, e)


async def cache_invalidate(*keys: str) -> None:
    client = await get_redis()
    try:
        for k in keys:
            await client.delete(k)
    except Exception as e:
        logger.warning("Redis DEL failed: %s", e)
