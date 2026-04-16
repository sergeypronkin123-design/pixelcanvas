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
    """JSON формат (для обратной совместимости)"""
    from app.services.canvas_cache import canvas_cache
    # Если кэш пустой — загрузить из БД
    if canvas_cache.size() == 0:
        canvas_cache.load_from_db(db)

    # Отфильтровать по viewport
    all_pixels = canvas_cache.get_all_pixels_json()
    if x_min > 0 or y_min > 0 or x_max < 1000 or y_max < 1000:
        all_pixels = [p for p in all_pixels if x_min <= p["x"] < x_max and y_min <= p["y"] < y_max]
    return {"pixels": all_pixels}


@router.get("/canvas/binary")
def get_canvas_binary(db: Session = Depends(get_db)):
    """Бинарный формат — в 10 раз меньше JSON, быстрее загружается"""
    from app.services.canvas_cache import canvas_cache
    from fastapi.responses import Response
    if canvas_cache.size() == 0:
        canvas_cache.load_from_db(db)
    binary = canvas_cache.get_binary()
    return Response(
        content=binary,
        media_type="application/octet-stream",
        headers={"Cache-Control": "public, max-age=1"}  # CDN кэш 1 секунда
    )


@router.post("/place")
def place_pixel(data: PlacePixelRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_battle_active():
        raise HTTPException(400, "Батл не активен. Приходи 1 числа!")

    is_sub = user.is_subscriber and user.subscription_until and user.subscription_until > datetime.now(timezone.utc)
    now = datetime.now(timezone.utc)

    # Check if user has bonus pixels (skip cooldown if yes)
    using_bonus = False
    if (user.bonus_pixels or 0) > 0:
        # Has bonus pixels — skip cooldown, use one bonus
        using_bonus = True
    else:
        # Normal cooldown check
        cooldown = get_cooldown_seconds(is_sub)
        if user.last_pixel_at:
            elapsed = (now - user.last_pixel_at).total_seconds()
            if elapsed < cooldown:
                remaining = cooldown - elapsed
                raise HTTPException(429, f"Подожди {remaining:.1f}с")

    if data.x < 0 or data.x >= settings.CANVAS_WIDTH or data.y < 0 or data.y >= settings.CANVAS_HEIGHT:
        raise HTTPException(400, "Координаты за пределами холста")

    # Place pixel
    existing = db.query(Pixel).filter(Pixel.x == data.x, Pixel.y == data.y).first()
    if existing:
        existing.color = data.color
        existing.user_id = user.id
        existing.clan_id = user.clan_id  # пиксель переходит к клану нового владельца
        existing.placed_at = now
    else:
        pixel = Pixel(x=data.x, y=data.y, color=data.color, user_id=user.id, clan_id=user.clan_id, placed_at=now)
        db.add(pixel)

    # Update user
    user.last_pixel_at = now
    user.pixels_placed_total = (user.pixels_placed_total or 0) + 1

    # Spend bonus pixel if used
    if using_bonus:
        user.bonus_pixels = (user.bonus_pixels or 0) - 1

    # Update clan stats
    if user.clan_id:
        from app.models.clan import Clan, ClanMember
        clan = db.query(Clan).filter(Clan.id == user.clan_id).first()
        if clan:
            clan.total_pixels_placed = (clan.total_pixels_placed or 0) + 1
        cm = db.query(ClanMember).filter(ClanMember.user_id == user.id, ClanMember.clan_id == user.clan_id).first()
        if cm:
            cm.pixels_placed_in_clan = (cm.pixels_placed_in_clan or 0) + 1

    # Track battle participation
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

    # Award PixelCoin + check achievements
    try:
        from app.services import economy
        economy.add_coins(db, user.id, economy.COIN_PER_PIXEL, "pixel_placed",
                          {"x": data.x, "y": data.y})
        db.commit()
        # Achievements check (every 10 pixels to reduce load)
        if (user.pixels_placed_total or 0) % 10 == 0 or (user.pixels_placed_total or 0) < 10:
            economy.check_achievements_for_user(db, user.id)
    except Exception as e:
        logger.error(f"Economy update error: {e}")

    # Update canvas cache
    try:
        from app.services.canvas_cache import canvas_cache
        canvas_cache.set_pixel(data.x, data.y, data.color, user.id, user.clan_id)
    except Exception as e:
        logger.error(f"Canvas cache update error: {e}")

    # Broadcast (batched)
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(manager.broadcast_pixel(
                data.x, data.y, data.color, user.id, user.clan_id
            ))
    except Exception as e:
        logger.error(f"Broadcast error: {e}")

    cooldown = 0 if (user.bonus_pixels or 0) > 0 else get_cooldown_seconds(is_sub)

    return {
        "status": "ok",
        "cooldown": cooldown,
        "next_pixel_at": now.timestamp() + cooldown,
        "bonus_pixels_remaining": user.bonus_pixels or 0,
        "used_bonus": using_bonus,
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

    # If has bonus pixels, no cooldown
    bonus = user.bonus_pixels or 0
    if bonus > 0:
        remaining = 0

    return {
        "cooldown": cooldown,
        "remaining": remaining,
        "is_subscriber": is_sub,
        "bonus_pixels": bonus,
    }
