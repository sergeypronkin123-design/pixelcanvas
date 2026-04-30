"""
Admin-only API endpoints.

All routes here require an authenticated user with is_admin=True.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models import User
from app.services.battle import Battle
from app.services.canvas_cache import canvas_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    return user


# ---------------------------------------------------------------------------
# Canvas management
# ---------------------------------------------------------------------------


@router.post("/canvas/reload")
async def reload_canvas(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Force full reload of canvas_cache from DB. Use after manual SQL changes."""
    canvas_cache.load_from_db(db)
    return {
        "status": "ok",
        "pixels": canvas_cache.count,
        "max_id_loaded": canvas_cache._last_seen_id,
    }


@router.post("/canvas/incremental")
async def incremental_reload(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Apply only newly-inserted pixels (id > last_seen_id) to cache."""
    applied = canvas_cache.reload_incremental(db)
    return {"status": "ok", "applied": applied, "total": canvas_cache.count}


# ---------------------------------------------------------------------------
# Battle management
# ---------------------------------------------------------------------------


class BattleCreate(BaseModel):
    type: str = Field(..., pattern="^(solo|clan|tournament)$")
    start_at: datetime
    end_at: datetime
    title: str = ""
    prize_pool: int = 0  # kopecks


@router.post("/battles")
async def create_battle(
    body: BattleCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Create a new battle. Replaces env-driven phase logic."""
    if body.end_at <= body.start_at:
        raise HTTPException(400, "end_at must be after start_at")

    battle = Battle(
        type=body.type,
        start_at=body.start_at,
        end_at=body.end_at,
        title=body.title,
        prize_pool=body.prize_pool,
        year=body.start_at.year,
        month=body.start_at.month,
        status="active" if body.start_at <= datetime.now(timezone.utc) else "scheduled",
    )
    db.add(battle)
    db.commit()
    db.refresh(battle)
    return {"id": battle.id, "status": battle.status}


@router.get("/battles")
async def list_battles(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 50,
) -> list[dict]:
    rows = (
        db.query(Battle).order_by(Battle.start_at.desc()).limit(limit).all()
    )
    return [
        {
            "id": b.id, "type": b.type, "status": b.status,
            "start_at": b.start_at.isoformat(),
            "end_at": b.end_at.isoformat(),
            "title": b.title,
            "prize_pool": b.prize_pool,
        }
        for b in rows
    ]


@router.post("/battles/{battle_id}/finish")
async def finish_battle(
    battle_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    if not battle:
        raise HTTPException(404, "Battle not found")
    battle.status = "finished"
    battle.finished_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": battle.id, "status": battle.status}


# ---------------------------------------------------------------------------
# User management — soft delete
# ---------------------------------------------------------------------------


@router.delete("/users/{user_id}")
async def soft_delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.is_admin:
        raise HTTPException(400, "Cannot delete admin")
    user.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "soft-deleted", "user_id": user_id}
