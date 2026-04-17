from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models import User, Pixel, BattleParticipant, Battle
from app.models.clan import Clan
from datetime import datetime, timezone

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/top")
def get_leaderboard(
    period: str = Query("all", enum=["all", "battle", "clan"]),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
):
    """Get top players/clans by pixels placed (deduplicated)."""
    if period == "clan":
        # Клановый рейтинг — территория (уникальные пиксели на холсте)
        rows = db.query(
            Pixel.clan_id,
            func.count(Pixel.id).label("territory"),
        ).filter(
            Pixel.clan_id.isnot(None)
        ).group_by(Pixel.clan_id).order_by(desc("territory")).limit(limit).all()

        result = []
        for i, (clan_id, territory) in enumerate(rows):
            clan = db.query(Clan).filter(Clan.id == clan_id).first()
            if clan:
                result.append({
                    "rank": i + 1,
                    "clan_id": clan.id,
                    "username": f"[{clan.tag}] {clan.name}",
                    "pixels": territory,
                    "is_subscriber": False,
                    "user_id": 0,
                    "is_clan": True,
                    "clan_tag": clan.tag,
                    "clan_name": clan.name,
                    "clan_color": clan.color,
                    "emblem_code": clan.emblem_code or "shield",
                    "members_count": clan.members_count,
                })
        return {"players": result, "period": "clan"}

    elif period == "battle":
        now = datetime.now(timezone.utc)
        # Все батлы текущего месяца (на случай дубликатов)
        battle_ids = [
            b.id for b in db.query(Battle).filter(
                Battle.year == now.year, Battle.month == now.month
            ).all()
        ]
        if not battle_ids:
            return {"players": [], "period": "battle"}

        # GROUP BY user_id — один пользователь = одна строка
        rows = db.query(
            BattleParticipant.user_id,
            func.sum(BattleParticipant.pixels_placed).label("total_pixels"),
            User.username,
            User.is_subscriber,
        ).join(User, User.id == BattleParticipant.user_id).filter(
            BattleParticipant.battle_id.in_(battle_ids),
        ).group_by(
            BattleParticipant.user_id, User.username, User.is_subscriber
        ).order_by(desc("total_pixels")).limit(limit).all()

        return {
            "players": [
                {"rank": i + 1, "user_id": r.user_id, "username": r.username,
                 "pixels": int(r.total_pixels or 0), "is_subscriber": r.is_subscriber}
                for i, r in enumerate(rows)
            ],
            "period": "battle",
        }
    else:
        # All-time — уже уникально по User.id
        rows = db.query(
            User.id, User.username, User.pixels_placed_total, User.is_subscriber
        ).filter(
            User.pixels_placed_total > 0
        ).order_by(desc(User.pixels_placed_total)).limit(limit).all()

        return {
            "players": [
                {"rank": i + 1, "user_id": r.id, "username": r.username,
                 "pixels": r.pixels_placed_total or 0, "is_subscriber": r.is_subscriber}
                for i, r in enumerate(rows)
            ],
            "period": "all",
        }


@router.get("/my-rank")
def get_my_rank(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's rank position."""
    total = user.pixels_placed_total or 0
    rank = db.query(User).filter(User.pixels_placed_total > total).count() + 1
    total_players = db.query(User).filter(User.pixels_placed_total > 0).count()

    # Current battle rank
    now = datetime.now(timezone.utc)
    battle = db.query(Battle).filter(Battle.year == now.year, Battle.month == now.month).first()
    battle_rank = None
    battle_pixels = 0
    if battle:
        participant = db.query(BattleParticipant).filter(
            BattleParticipant.battle_id == battle.id,
            BattleParticipant.user_id == user.id,
        ).first()
        if participant:
            battle_pixels = participant.pixels_placed or 0
            battle_rank = db.query(BattleParticipant).filter(
                BattleParticipant.battle_id == battle.id,
                BattleParticipant.pixels_placed > battle_pixels,
            ).count() + 1

    return {
        "all_time_rank": rank,
        "all_time_pixels": total,
        "total_players": total_players,
        "battle_rank": battle_rank,
        "battle_pixels": battle_pixels,
    }
