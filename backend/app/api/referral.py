from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.battle import Referral
import uuid

router = APIRouter(prefix="/referral", tags=["referral"])


@router.get("/my-code")
def get_my_referral_code(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get or create user's referral code."""
    if not user.referral_code:
        user.referral_code = uuid.uuid4().hex[:8]
        db.commit()
    
    invited_count = db.query(User).filter(User.referred_by == user.id).count()
    bonus_pixels = invited_count * 5  # 5 bonus pixels per referral

    return {
        "referral_code": user.referral_code,
        "referral_link": f"https://pixelstake.ru/register?ref={user.referral_code}",
        "invited_count": invited_count,
        "bonus_pixels_earned": bonus_pixels,
    }


@router.get("/stats")
def get_referral_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get detailed referral statistics."""
    invited = db.query(User).filter(User.referred_by == user.id).all()
    return {
        "total_invited": len(invited),
        "invited_users": [
            {"username": u.username, "pixels_placed": u.pixels_placed_total or 0,
             "joined_at": u.created_at.isoformat() if u.created_at else None}
            for u in invited
        ],
    }
