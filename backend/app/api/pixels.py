from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models import User, Pixel, BattleParticipant, Battle
from app.services.battle import is_battle_active, get_battle_end_time, get_next_battle_start, get_cooldown_seconds
from app.services.websocket import manager
import asyncio
import logging

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/pixels", tags=["pixels"])


class PlacePixelRequest(BaseModel):
    x: int = Field(ge=0, lt=1000)
    y: int = Field(ge=0, lt=1000)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class PixelOut(BaseModel):
    x: int
    y: int
    color: str
    user_id: int | None


class BattleStatus(BaseModel):
    is_active: bool
    battle_end: str | None
    next_battle_start: str | None
    online_count: int
    canvas_width: int
    canvas_height: int
    free_cooldown: int
    sub_cooldown: int


@router.get("/status", response_model=BattleStatus)
def get_status():
    active = is_battle_active()
    return BattleStatus(
        is_active=active,
        battle_end=get_battle_end_time().isoformat() if active else None,
        next_battle_start=None if active else get_next_battle_start().isoformat(),
        online_count=manager.online_count,
        canvas_width=settings.CANVAS_WIDTH,
        canvas_height=settings.CANVAS_HEIGHT,
        free_cooldown=settings.FREE_COOLDOWN_SECONDS,
        sub_cooldown=settings.SUB_COOLDOWN_SECONDS,
    )


@router.get("/canvas")
def get_canvas(
    x_min: int = Query(0, ge=0),
    y_min: int = Query(0, ge=0),
    x_max: int = Query(1000),
    y_max: int = Query(1000),
    db: Session = Depends(get_db),
):
    """Get all pixels in viewport."""
    pixels = db.query(Pixel).filter(
        Pixel.x >= x_min, Pixel.y >= y_min,
        Pixel.x < x_max, Pixel.y < y_max,
    ).all()
    return {
        "pixels": [{"x": p.x, "y": p.y, "color": p.color, "user_id": p.user_id} for p in pixels],
    }


@router.post("/place")
def place_pixel(data: PlacePixelRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check battle is active
    if not is_battle_active():
        raise HTTPException(400, "Battle is not active. Come back on the 1st!")

    # Check subscription validity
    is_sub = user.is_subscriber and user.subscription_until and user.subscription_until > datetime.now(timezone.utc)

    # Check cooldown
    cooldown = get_cooldown_seconds(is_sub)
    now = datetime.now(timezone.utc)

    if user.last_pixel_at:
        elapsed = (now - user.last_pixel_at).total_seconds()
        if elapsed < cooldown:
            remaining = cooldown - elapsed
            raise HTTPException(429, f"Wait {remaining:.1f}s before placing another pixel")

    # Validate coordinates
    if data.x < 0 or data.x >= settings.CANVAS_WIDTH or data.y < 0 or data.y >= settings.CANVAS_HEIGHT:
        raise HTTPException(400, "Coordinates out of bounds")

    # Place pixel (upsert)
    existing = db.query(Pixel).filter(Pixel.x == data.x, Pixel.y == data.y).first()
    if existing:
        existing.color = data.color
        existing.user_id = user.id
        existing.placed_at = now
    else:
        pixel = Pixel(x=data.x, y=data.y, color=data.color, user_id=user.id, placed_at=now)
        db.add(pixel)

    # Update user
    user.last_pixel_at = now
    user.pixels_placed_total = (user.pixels_placed_total or 0) + 1

    # Track participation in current battle
    current_month = now.month
    current_year = now.year
    battle = db.query(Battle).filter(Battle.year == current_year, Battle.month == current_month, Battle.is_active == True).first()
    if not battle:
        battle = Battle(year=current_year, month=current_month, is_active=True, total_pixels_placed=0, total_participants=0)
        db.add(battle)
        db.flush()

    participant = db.query(BattleParticipant).filter(
        BattleParticipant.battle_id == battle.id,
        BattleParticipant.user_id == user.id,
    ).first()
    if not participant:
        participant = BattleParticipant(battle_id=battle.id, user_id=user.id, pixels_placed=0)
        db.add(participant)
        battle.total_participants = (battle.total_participants or 0) + 1

    participant.pixels_placed = (participant.pixels_placed or 0) + 1
    battle.total_pixels_placed = (battle.total_pixels_placed or 0) + 1

    db.commit()

    # Broadcast
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(manager.broadcast({
                "type": "pixel",
                "x": data.x, "y": data.y,
                "color": data.color,
                "user_id": user.id,
                "username": user.username,
            }))
    except Exception as e:
        logger.error(f"Broadcast error: {e}")

    return {
        "status": "ok",
        "cooldown": cooldown,
        "next_pixel_at": (now.timestamp() + cooldown),
    }


@router.get("/cooldown")
def get_cooldown(user: User = Depends(get_current_user)):
    is_sub = user.is_subscriber and user.subscription_until and user.subscription_until > datetime.now(timezone.utc)
    cooldown = get_cooldown_seconds(is_sub)
    now = datetime.now(timezone.utc)
    remaining = 0
    if user.last_pixel_at:
        elapsed = (now - user.last_pixel_at).total_seconds()
        remaining = max(0, cooldown - elapsed)
    return {"cooldown": cooldown, "remaining": remaining, "is_subscriber": is_sub}
