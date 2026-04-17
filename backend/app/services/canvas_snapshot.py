"""
Сервис снимков холста для таймлапса.

Сохраняет состояние холста каждые N минут как сжатый JSON.
В конце батла — генерирует финальный снимок как PNG.
"""
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, Integer, DateTime, Text, func
from sqlalchemy.orm import Session
from app.core.database import Base

logger = logging.getLogger(__name__)


class CanvasSnapshot(Base):
    """Снимки холста для таймлапса"""
    __tablename__ = "canvas_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    battle_year = Column(Integer, nullable=False)
    battle_month = Column(Integer, nullable=False)
    pixel_count = Column(Integer, default=0)
    # Сжатый формат: JSON array of [x, y, r, g, b]
    data_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def take_snapshot(db: Session) -> Optional[int]:
    """
    Делает снимок текущего холста из canvas_cache.
    Возвращает ID снимка или None.
    """
    try:
        from app.services.canvas_cache import canvas_cache
        now = datetime.now(timezone.utc)

        pixels = canvas_cache._pixels
        if not pixels:
            return None

        # Компактный формат: [[x,y,r,g,b], ...]
        compact = []
        for (x, y), (color, uid, cid) in pixels.items():
            r = int(color[1:3], 16)
            g = int(color[3:5], 16)
            b = int(color[5:7], 16)
            compact.append([x, y, r, g, b])

        snapshot = CanvasSnapshot(
            battle_year=now.year,
            battle_month=now.month,
            pixel_count=len(compact),
            data_json=json.dumps(compact, separators=(",", ":")),
        )
        db.add(snapshot)
        db.commit()
        logger.info(f"Canvas snapshot taken: {len(compact)} pixels")
        return snapshot.id
    except Exception as e:
        logger.error(f"Snapshot error: {e}")
        return None


def get_timelapse_data(db: Session, year: int, month: int) -> list:
    """
    Возвращает все снимки для конкретного батла.
    Фронтенд анимирует их кадр за кадром.
    """
    snapshots = db.query(CanvasSnapshot).filter(
        CanvasSnapshot.battle_year == year,
        CanvasSnapshot.battle_month == month,
    ).order_by(CanvasSnapshot.created_at).all()

    return [
        {
            "id": s.id,
            "pixel_count": s.pixel_count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            # data_json слишком большой — отдаём отдельным endpoint'ом
        }
        for s in snapshots
    ]
