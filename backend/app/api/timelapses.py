"""
Public timelapse API.

Add to main.py:
    from app.api.timelapses import router as timelapses_router
    app.include_router(timelapses_router, prefix="/api/timelapses", tags=["timelapses"])
"""
import logging
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.canvas_snapshot import (
    CanvasSnapshot,
    get_timelapse_data,
    get_snapshot_pixels,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Lazy Battle model lookup
_Battle: Optional[Any] = None


def _get_battle_model():
    global _Battle
    if _Battle is not None:
        return _Battle
    try:
        from app.models import Battle as B
        _Battle = B
        return _Battle
    except ImportError:
        try:
            from app.models.battle import Battle as B
            _Battle = B
            return _Battle
        except ImportError:
            return None


@router.get("")
async def list_timelapses(db: Session = Depends(get_db)) -> list[dict]:
    """List all finished battles with their timelapse data available."""
    Battle = _get_battle_model()
    if Battle is None:
        return []

    finished_battles = (
        db.query(Battle)
        .filter(Battle.status == "finished")
        .order_by(Battle.finished_at.desc() if hasattr(Battle, "finished_at") else Battle.id.desc())
        .limit(50)
        .all()
    )

    result = []
    for battle in finished_battles:
        snapshot_count = (
            db.query(CanvasSnapshot)
            .filter(
                CanvasSnapshot.battle_year == battle.year,
                CanvasSnapshot.battle_month == battle.month,
            )
            .count()
        )
        if snapshot_count == 0:
            continue

        latest = (
            db.query(CanvasSnapshot)
            .filter(
                CanvasSnapshot.battle_year == battle.year,
                CanvasSnapshot.battle_month == battle.month,
            )
            .order_by(CanvasSnapshot.created_at.desc())
            .first()
        )

        result.append({
            "battle_id": battle.id,
            "year": battle.year,
            "month": battle.month,
            "type": getattr(battle, "type", "clan"),
            "title": getattr(battle, "title", "") or "",
            "start_at": battle.start_at.isoformat() if battle.start_at else None,
            "end_at": battle.end_at.isoformat() if battle.end_at else None,
            "snapshot_count": snapshot_count,
            "final_pixel_count": latest.pixel_count if latest else 0,
            "prize_pool": getattr(battle, "prize_pool", 0) or 0,
        })

    return result


@router.get("/{battle_id}/snapshots")
async def get_battle_snapshots(battle_id: int, db: Session = Depends(get_db)) -> list[dict]:
    Battle = _get_battle_model()
    if Battle is None:
        raise HTTPException(503, "Battle model not available")

    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    if not battle:
        raise HTTPException(404, "Battle not found")

    return get_timelapse_data(db, battle.year, battle.month)


@router.get("/snapshot/{snapshot_id}")
async def get_snapshot(snapshot_id: int, db: Session = Depends(get_db)) -> dict:
    pixels = get_snapshot_pixels(db, snapshot_id)
    if pixels is None:
        raise HTTPException(404, "Snapshot not found")
    return {"snapshot_id": snapshot_id, "pixels": pixels}
