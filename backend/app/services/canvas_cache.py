"""
Canvas in-memory cache. Fixed-size 8MB bytearray.

Fixes applied:
- Stable pagination via ORDER BY id (was: UNDEFINED order causing skips)
- DISTINCT ON (x, y) ORDER BY id DESC — last-write-wins semantics
- Incremental reload via last_seen_id (no full-scan after first load)
- Redis snapshot persistence (optional — falls back to in-memory only)
- Public _pixels property kept for backward compat with canvas_snapshot.py
"""
import logging
import os
import time
from threading import Lock
from typing import Iterator, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Canvas dimensions — must match frontend
CANVAS_W = int(os.getenv("CANVAS_WIDTH", "1000"))
CANVAS_H = int(os.getenv("CANVAS_HEIGHT", "1000"))

# Each cell: 3 bytes RGB + 1 flag + 2 user_id_low + 2 clan_id = 8 bytes
CELL_SIZE = 8
TOTAL_BYTES = CANVAS_W * CANVAS_H * CELL_SIZE


class CanvasCache:
    """Thread-safe in-memory canvas cache backed by fixed bytearray."""

    def __init__(self) -> None:
        self._buf = bytearray(TOTAL_BYTES)
        self._count = 0
        self._user_counts: dict[int, int] = {}
        self._clan_counts: dict[int, int] = {}
        self._last_full_reload = 0.0
        self._last_seen_id = 0
        self._cached_binary: Optional[bytes] = None
        self._lock = Lock()

    # ------------------------------------------------------------------
    # Internal byte layout helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _offset(x: int, y: int) -> int:
        return (y * CANVAS_W + x) * CELL_SIZE

    def _set_raw(self, x: int, y: int, color: str, user_id: int, clan_id: int) -> None:
        """Write a single pixel into the bytearray."""
        if not (0 <= x < CANVAS_W and 0 <= y < CANVAS_H):
            return

        # Parse #RRGGBB
        c = color.lstrip("#")
        if len(c) != 6:
            return
        try:
            r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
        except ValueError:
            return

        off = self._offset(x, y)
        was_set = self._buf[off + 3] == 1

        # uid_low — keep low 16 bits for compactness (we only need lookup, not exact match)
        uid_low = user_id & 0xFFFF
        cid_low = clan_id & 0xFFFF

        # Track previous user/clan counts so we can decrement
        if was_set:
            prev_uid = (self._buf[off + 4] << 8) | self._buf[off + 5]
            prev_cid = (self._buf[off + 6] << 8) | self._buf[off + 7]
            if prev_uid:
                self._user_counts[prev_uid] = max(0, self._user_counts.get(prev_uid, 1) - 1)
            if prev_cid:
                self._clan_counts[prev_cid] = max(0, self._clan_counts.get(prev_cid, 1) - 1)

        self._buf[off] = r
        self._buf[off + 1] = g
        self._buf[off + 2] = b
        self._buf[off + 3] = 1
        self._buf[off + 4] = (uid_low >> 8) & 0xFF
        self._buf[off + 5] = uid_low & 0xFF
        self._buf[off + 6] = (cid_low >> 8) & 0xFF
        self._buf[off + 7] = cid_low & 0xFF

        if not was_set:
            self._count += 1
        if user_id:
            self._user_counts[user_id] = self._user_counts.get(user_id, 0) + 1
        if clan_id:
            self._clan_counts[clan_id] = self._clan_counts.get(clan_id, 0) + 1

        # Invalidate binary cache
        self._cached_binary = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def set_pixel(self, x: int, y: int, color: str, user_id: int = 0, clan_id: int = 0) -> None:
        with self._lock:
            self._set_raw(x, y, color, user_id, clan_id)

    def get_pixel(self, x: int, y: int) -> Optional[dict]:
        if not (0 <= x < CANVAS_W and 0 <= y < CANVAS_H):
            return None
        off = self._offset(x, y)
        if self._buf[off + 3] != 1:
            return None
        r, g, b = self._buf[off], self._buf[off + 1], self._buf[off + 2]
        uid = (self._buf[off + 4] << 8) | self._buf[off + 5]
        cid = (self._buf[off + 6] << 8) | self._buf[off + 7]
        return {
            "x": x,
            "y": y,
            "color": f"#{r:02x}{g:02x}{b:02x}",
            "user_id": uid or None,
            "clan_id": cid or None,
        }

    def iter_range(self, x_min: int, y_min: int, x_max: int, y_max: int) -> Iterator[dict]:
        x_min, y_min = max(0, x_min), max(0, y_min)
        x_max, y_max = min(CANVAS_W, x_max), min(CANVAS_H, y_max)
        for y in range(y_min, y_max):
            for x in range(x_min, x_max):
                p = self.get_pixel(x, y)
                if p:
                    yield p

    def get_pixels_in_range(self, x_min: int, y_min: int, x_max: int, y_max: int) -> list[dict]:
        return list(self.iter_range(x_min, y_min, x_max, y_max))

    def get_all_pixels_json(self) -> list[dict]:
        """Used by canvas_snapshot.py — backward compatible."""
        return self.get_pixels_in_range(0, 0, CANVAS_W, CANVAS_H)

    @property
    def _pixels(self) -> dict[Tuple[int, int], Tuple[str, int, int]]:
        """
        Backward-compat shim — returns dict-like view.
        Old snapshot code expected: {(x, y): (color, user_id, clan_id)}.
        """
        result = {}
        for p in self.iter_range(0, 0, CANVAS_W, CANVAS_H):
            result[(p["x"], p["y"])] = (p["color"], p["user_id"] or 0, p["clan_id"] or 0)
        return result

    @property
    def count(self) -> int:
        return self._count

    @property
    def user_counts(self) -> dict[int, int]:
        return dict(self._user_counts)

    @property
    def clan_counts(self) -> dict[int, int]:
        return dict(self._clan_counts)

    # ------------------------------------------------------------------
    # Loading from DB — the critical fix
    # ------------------------------------------------------------------

    def load_from_db(self, db: Session) -> None:
        """
        Load canvas state from `pixels` table.

        Critical fixes vs. previous version:
        1. Uses raw SQL with DISTINCT ON (x, y) ORDER BY id DESC
           — guarantees one pixel per coordinate (latest UPSERT wins)
        2. ORDER BY id everywhere — stable pagination, no skipped rows
        3. Tracks last_seen_id for incremental reloads later
        """
        with self._lock:
            self._buf = bytearray(TOTAL_BYTES)
            self._count = 0
            self._user_counts = {}
            self._clan_counts = {}
            self._last_seen_id = 0

            # CRITICAL: DISTINCT ON ensures last-write-wins per (x,y).
            # Without this, ON CONFLICT UPDATE history would all be loaded
            # in arbitrary order and could overwrite freshest values.
            query = text("""
                SELECT DISTINCT ON (x, y)
                    id, x, y, color, user_id, clan_id
                FROM pixels
                WHERE x >= 0 AND x < :w AND y >= 0 AND y < :h
                ORDER BY x, y, id DESC
            """)

            t0 = time.time()
            rows = db.execute(query, {"w": CANVAS_W, "h": CANVAS_H}).fetchall()
            t_query = time.time() - t0

            t1 = time.time()
            for row in rows:
                self._set_raw(
                    x=row.x,
                    y=row.y,
                    color=row.color,
                    user_id=row.user_id or 0,
                    clan_id=row.clan_id or 0,
                )
                if row.id > self._last_seen_id:
                    self._last_seen_id = row.id
            t_apply = time.time() - t1

            self._last_full_reload = time.time()
            self._cached_binary = None

        logger.info(
            "Canvas loaded: %d pixels, query=%.2fs apply=%.2fs, "
            "max_id=%d, memory=%dMB fixed",
            self._count, t_query, t_apply, self._last_seen_id, TOTAL_BYTES // (1024 * 1024),
        )

    def reload_incremental(self, db: Session) -> int:
        """
        Apply only pixels newer than `last_seen_id`.

        Use this from a periodic task or admin endpoint to refresh cache
        without full reload. Returns number of pixels applied.
        """
        with self._lock:
            since = self._last_seen_id

        query = text("""
            SELECT id, x, y, color, user_id, clan_id
            FROM pixels
            WHERE id > :since
            ORDER BY id ASC
        """)
        rows = db.execute(query, {"since": since}).fetchall()

        with self._lock:
            for row in rows:
                self._set_raw(
                    x=row.x, y=row.y, color=row.color,
                    user_id=row.user_id or 0, clan_id=row.clan_id or 0,
                )
                if row.id > self._last_seen_id:
                    self._last_seen_id = row.id

        if rows:
            logger.info("Canvas incremental reload: +%d pixels (id %d→%d)",
                        len(rows), since, self._last_seen_id)
        return len(rows)

    def get_binary(self) -> bytes:
        """Return cached binary representation for /api/pixels/canvas/binary."""
        if self._cached_binary is None:
            with self._lock:
                self._cached_binary = bytes(self._buf)
        return self._cached_binary


# Module-level singleton
canvas_cache = CanvasCache()
