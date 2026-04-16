"""
Canvas cache для оптимизации загрузки холста.

Стратегия:
1. In-memory кэш (bytes) обновляется раз в N секунд из БД
2. При изменениях пикселей применяем diff к кэшу сразу
3. GET /canvas/binary возвращает bytes (в 10 раз меньше JSON)
4. При наличии Redis — кэш в Redis (готовность к горизонтальному масштабированию)
"""
import asyncio
import struct
import time
from typing import Dict, Tuple, Optional
from sqlalchemy.orm import Session
import os
import logging

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "")

# Попытка подключения к Redis (не падает если его нет)
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
    """
    Хранит холст в сжатом бинарном виде.
    
    Формат: для каждого заполненного пикселя 8 байт:
    - x: uint16 (2 bytes)
    - y: uint16 (2 bytes)  
    - r, g, b: uint8 (3 bytes)
    - flags: uint8 (1 byte, зарезервировано)
    
    При ~100000 пикселей = 800 KB вместо 10 MB JSON
    """
    
    def __init__(self):
        # In-memory словарь (x, y) -> (color_hex, user_id, clan_id)
        self._pixels: Dict[Tuple[int, int], Tuple[str, int, Optional[int]]] = {}
        self._last_full_reload = 0.0
        self._dirty = False
        self._cached_binary: Optional[bytes] = None
        self._cached_binary_timestamp = 0.0
        self._lock = asyncio.Lock() if hasattr(asyncio, 'Lock') else None
    
    def load_from_db(self, db: Session):
        """Загружает все пиксели из БД в кэш (вызывается при старте)"""
        from app.models import Pixel
        pixels = db.query(Pixel).all()
        self._pixels = {
            (p.x, p.y): (p.color, p.user_id or 0, p.clan_id)
            for p in pixels
        }
        self._last_full_reload = time.time()
        self._dirty = True
        logger.info(f"Canvas loaded: {len(self._pixels)} pixels")
    
    def set_pixel(self, x: int, y: int, color: str, user_id: int, clan_id: Optional[int] = None):
        """Обновление кэша при размещении пикселя"""
        self._pixels[(x, y)] = (color, user_id, clan_id)
        self._dirty = True
        # Invalidate cached binary
        self._cached_binary = None
    
    def get_all_pixels_json(self) -> list:
        """JSON формат (для совместимости)"""
        return [
            {"x": x, "y": y, "color": color, "user_id": uid, "clan_id": cid}
            for (x, y), (color, uid, cid) in self._pixels.items()
        ]
    
    def get_binary(self) -> bytes:
        """
        Бинарный формат: каждый пиксель = 7 байт
        [x:u16][y:u16][r:u8][g:u8][b:u8]
        """
        # Кэшируем binary на 1 секунду
        now = time.time()
        if self._cached_binary is not None and (now - self._cached_binary_timestamp) < 1.0:
            return self._cached_binary
        
        # Количество пикселей (4 bytes)
        count = len(self._pixels)
        buf = bytearray(4 + count * 7)
        struct.pack_into('<I', buf, 0, count)
        
        offset = 4
        for (x, y), (color, _, _) in self._pixels.items():
            r = int(color[1:3], 16)
            g = int(color[3:5], 16)
            b = int(color[5:7], 16)
            struct.pack_into('<HHBBB', buf, offset, x, y, r, g, b)
            offset += 7
        
        self._cached_binary = bytes(buf)
        self._cached_binary_timestamp = now
        return self._cached_binary
    
    def size(self) -> int:
        return len(self._pixels)
    
    def clan_territory(self, clan_id: int) -> int:
        """Количество пикселей клана (для leaderboard без обращения к БД)"""
        return sum(1 for _, _, cid in self._pixels.values() if cid == clan_id)


# Глобальный инстанс
canvas_cache = CanvasCache()
