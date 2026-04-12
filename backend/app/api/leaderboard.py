from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models import User, Pixel, BattleParticipant, Battle
from datetime import datetime, timezone

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/top")
def get_leaderboard(
    period: str = Query("all", enum=["all", "battle"]),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
):
    """Get top players by pixels placed."""
    if period == "battle":
        # Current month battle
        now = datetime.now(timezone.utc)
        battle = db.query(Battle).filter(
            Battle.year == now.year, Battle.month == now.month
        ).first()
        if not battle:
            return {"players": [], "period": "battle"}

        rows = db.query(
            BattleParticipant.user_id,
            BattleParticipant.pixels_placed,
            User.username,
            User.is_subscriber,
        ).join(User, User.id == BattleParticipant.user_id).filter(
            BattleParticipant.battle_id == battle.id,
        ).order_by(desc(BattleParticipant.pixels_placed)).limit(limit).all()

        return {
            "players": [
                {"rank": i + 1, "user_id": r.user_id, "username": r.username,
                 "pixels": r.pixels_placed, "is_subscriber": r.is_subscriber}
                for i, r in enumerate(rows)
            ],
            "period": "battle",
        }
    else:
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
