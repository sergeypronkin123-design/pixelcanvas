"""Web Push subscription management."""
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, JSON, String, ForeignKey, func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import Base, get_db
from app.models import User

logger = logging.getLogger(__name__)
router = APIRouter()


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    endpoint = Column(String(512), unique=True, nullable=False)
    keys = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SubscribeBody(BaseModel):
    endpoint: str
    keys: dict[str, str]


@router.post("/subscribe")
async def subscribe(
    body: SubscribeBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == body.endpoint
    ).first()
    if existing:
        existing.user_id = user.id
        existing.keys = body.keys
    else:
        sub = PushSubscription(user_id=user.id, endpoint=body.endpoint, keys=body.keys)
        db.add(sub)
    db.commit()
    return {"status": "subscribed"}


@router.post("/unsubscribe")
async def unsubscribe(
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    endpoint = body.get("endpoint")
    if not endpoint:
        raise HTTPException(400, "endpoint required")
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == user.id,
    ).delete()
    db.commit()
    return {"status": "unsubscribed"}
