"""
Canvas cache — оптимизированная версия с фиксированным расходом памяти.

Старая версия: Dict[(x,y) → tuple] ест ~200 байт/пиксель = 200MB при 1M → Render Free (512MB) падает.
Новая версия: packed bytearray, 7 байт × 1M ячеек = 7MB фиксированно.

Формат ячейки (7 байт):
  [r:u8][g:u8][b:u8][flag:u8][user_id_low:u16][clan_id:u16]
  flag=0 → пусто, flag=1 → занято
"""
import asyncio
import struct
import time
import os
import logging
from typing import Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

CANVAS_W = 1000
CANVAS_H = 1000
CELL_SIZE = 7
TOTAL_BYTES = CANVAS_W * CANVAS_H * CELL_SIZE  # 7MB

REDIS_URL = os.environ.get("REDIS_URL", "")
_redis = None
if REDIS_URL:
    try:
        import redis
        _redis = redis.from_url(REDIS_URL, decode_responses=False, socket_connect_timeout=2)
        _redis.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
        _redis = None


class CanvasCache:
    def __init__(self):
        self._buf = bytearray(TOTAL_BYTES)
        self._count = 0
        self._last_full_reload = 0.0
        self._cached_binary: Optional[bytes] = None
        self._cached_binary_timestamp = 0.0
        # Inline counters — обновляются при set_pixel, избегают O(1M) scan
        self._user_counts: dict = {}   # user_id_low → count
        self._clan_counts: dict = {}   # clan_id_low → count

    def _idx(self, x: int, y: int) -> int:
        return (y * CANVAS_W + x) * CELL_SIZE

    def load_from_db(self, db: Session):
        from app.models import Pixel
        self._buf = bytearray(TOTAL_BYTES)
        self._count = 0
        self._user_counts = {}
        self._clan_counts = {}
        batch_size = 10000
        offset = 0
        while True:
            batch = db.query(Pixel).offset(offset).limit(batch_size).all()
            if not batch:
                break
            for p in batch:
                if 0 <= p.x < CANVAS_W and 0 <= p.y < CANVAS_H:
                    self._set_raw(p.x, p.y, p.color, p.user_id or 0, p.clan_id or 0)
            offset += batch_size
            db.expunge_all()

        self._last_full_reload = time.time()
        self._cached_binary = None
        logger.info(f"Canvas loaded: {self._count} pixels, memory=7MB fixed")

    def _set_raw(self, x: int, y: int, color: str, user_id: int, clan_id: int):
        i = self._idx(x, y)
        # Если клетка была занята — декрементим старых owners
        if self._buf[i + 3] == 1:
            old_uid, old_cid = struct.unpack_from('<HH', self._buf, i + 4)
            if old_uid in self._user_counts:
                self._user_counts[old_uid] -= 1
                if self._user_counts[old_uid] <= 0:
                    del self._user_counts[old_uid]
            if old_cid > 0 and old_cid in self._clan_counts:
                self._clan_counts[old_cid] -= 1
                if self._clan_counts[old_cid] <= 0:
                    del self._clan_counts[old_cid]
        else:
            self._count += 1

        r = int(color[1:3], 16)
        g = int(color[3:5], 16)
        b = int(color[5:7], 16)
        self._buf[i] = r
        self._buf[i + 1] = g
        self._buf[i + 2] = b
        self._buf[i + 3] = 1
        uid_low = user_id & 0xFFFF
        cid_low = clan_id & 0xFFFF
        struct.pack_into('<HH', self._buf, i + 4, uid_low, cid_low)
        # Инкрементим новых owners
        self._user_counts[uid_low] = self._user_counts.get(uid_low, 0) + 1
        if cid_low > 0:
            self._clan_counts[cid_low] = self._clan_counts.get(cid_low, 0) + 1

    def set_pixel(self, x: int, y: int, color: str, user_id: int, clan_id: Optional[int] = None):
        if not (0 <= x < CANVAS_W and 0 <= y < CANVAS_H):
            return
        self._set_raw(x, y, color, user_id, clan_id or 0)
        self._cached_binary = None

    def get_pixel(self, x: int, y: int) -> Optional[dict]:
        if not (0 <= x < CANVAS_W and 0 <= y < CANVAS_H):
            return None
        i = self._idx(x, y)
        if self._buf[i + 3] == 0:
            return None
        r, g, b = self._buf[i], self._buf[i + 1], self._buf[i + 2]
        uid_low, cid = struct.unpack_from('<HH', self._buf, i + 4)
        return {
            "x": x, "y": y,
            "color": f"#{r:02x}{g:02x}{b:02x}",
            "user_id": uid_low,
            "clan_id": cid if cid > 0 else None,
        }

    def get_binary(self) -> bytes:
        now = time.time()
        if self._cached_binary is not None and (now - self._cached_binary_timestamp) < 1.0:
            return self._cached_binary

        out = bytearray(4 + self._count * 7)
        struct.pack_into('<I', out, 0, self._count)
        out_off = 4

        for idx in range(CANVAS_W * CANVAS_H):
            buf_off = idx * CELL_SIZE
            if self._buf[buf_off + 3] == 0:
                continue
            x = idx % CANVAS_W
            y = idx // CANVAS_W
            r = self._buf[buf_off]
            g = self._buf[buf_off + 1]
            b = self._buf[buf_off + 2]
            struct.pack_into('<HHBBB', out, out_off, x, y, r, g, b)
            out_off += 7

        self._cached_binary = bytes(out)
        self._cached_binary_timestamp = now
        return self._cached_binary

    def size(self) -> int:
        return self._count

    def count_user_pixels(self, user_id: int) -> int:
        """O(1) lookup через inline counter"""
        return self._user_counts.get(user_id & 0xFFFF, 0)

    def clan_territory(self, clan_id: int) -> int:
        """O(1) lookup через inline counter"""
        return self._clan_counts.get(clan_id & 0xFFFF, 0)

    @property
    def _pixels(self):
        """Compat iterator для старого кода"""
        result = {}
        for idx in range(CANVAS_W * CANVAS_H):
            off = idx * CELL_SIZE
            if self._buf[off + 3] == 0:
                continue
            x = idx % CANVAS_W
            y = idx // CANVAS_W
            r = self._buf[off]
            g = self._buf[off + 1]
            b = self._buf[off + 2]
            uid_low, cid = struct.unpack_from('<HH', self._buf, off + 4)
            result[(x, y)] = (f"#{r:02x}{g:02x}{b:02x}", uid_low, cid if cid > 0 else None)
        return result


canvas_cache = CanvasCache()
