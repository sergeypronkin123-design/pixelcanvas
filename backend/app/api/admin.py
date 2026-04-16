from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import require_admin
from app.models import User, Pixel, Battle, BattleParticipant, Subscription

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_stats(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return {
        "total_users": db.query(User).count(),
        "total_pixels": db.query(Pixel).count(),
        "total_subscribers": db.query(User).filter(User.is_subscriber == True).count(),
        "total_revenue_usd": db.query(func.coalesce(func.sum(Subscription.amount), 0)).filter(Subscription.status == "paid", Subscription.currency == "usd").scalar(),
        "total_revenue_rub": db.query(func.coalesce(func.sum(Subscription.amount), 0)).filter(Subscription.status == "paid", Subscription.currency == "RUB").scalar(),
        "active_battles": db.query(Battle).filter(Battle.is_active == True).count(),
    }


@router.get("/users")
def list_users(limit: int = Query(50, le=200), offset: int = 0, admin=Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return [{
        "id": u.id, "email": u.email, "username": u.username,
        "is_admin": u.is_admin, "is_subscriber": u.is_subscriber,
        "pixels_placed_total": u.pixels_placed_total or 0,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]


@router.get("/subscriptions")
def list_subscriptions(limit: int = Query(50, le=200), offset: int = 0, admin=Depends(require_admin), db: Session = Depends(get_db)):
    subs = db.query(Subscription).order_by(Subscription.created_at.desc()).offset(offset).limit(limit).all()
    return [{
        "id": s.id, "user_id": s.user_id, "provider": s.provider,
        "amount": s.amount, "currency": s.currency, "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    } for s in subs]


@router.get("/battles")
def list_battles(admin=Depends(require_admin), db: Session = Depends(get_db)):
    battles = db.query(Battle).order_by(Battle.id.desc()).limit(20).all()
    return [{
        "id": b.id, "year": b.year, "month": b.month,
        "is_active": b.is_active, "total_pixels": b.total_pixels_placed,
        "total_participants": b.total_participants,
    } for b in battles]


@router.post("/battles/{battle_id}/finalize")
def finalize_battle_manually(battle_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Принудительно завершить батл и раздать награды (для тестирования)"""
    from app.services import battle_awards
    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    if not battle:
        from fastapi import HTTPException
        raise HTTPException(404, "Battle not found")
    result = battle_awards.finalize_battle(db, battle)
    return result


@router.post("/redemptions/process")
def process_redemptions_manually(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Принудительно активировать все scheduled Pro подписки"""
    from app.services import battle_awards
    count = battle_awards.check_and_process_pending_redemptions(db)
    return {"activated": count}
