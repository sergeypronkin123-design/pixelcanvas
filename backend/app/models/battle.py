from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, func
from app.core.database import Base


class Battle(Base):
    __tablename__ = "battles"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    snapshot_url = Column(Text, nullable=True)
    total_pixels_placed = Column(Integer, default=0)
    total_participants = Column(Integer, default=0)


class BattleParticipant(Base):
    __tablename__ = "battle_participants"
    id = Column(Integer, primary_key=True, index=True)
    battle_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    pixels_placed = Column(Integer, default=0)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    provider_session_id = Column(String(255), nullable=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), nullable=False)
    event_type = Column(String(100), nullable=False)
    external_id = Column(String(255), unique=True, nullable=False, index=True)
    processed = Column(Boolean, default=False)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Referral(Base):
    __tablename__ = "referrals"
    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, nullable=False, index=True)
    referred_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
