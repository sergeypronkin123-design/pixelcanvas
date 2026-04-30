"""
Battle phase logic — DB-backed instead of env-only.

Architecture:
- battles table is source of truth — admin creates battles via UI
- env vars (BATTLE_*_START/END) act as fallback defaults if no row exists
- Multiple battles can run simultaneously (e.g. weekly tournament + monthly)
"""
import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import Base

settings = get_settings()


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------


class Battle(Base):
    """A scheduled or running battle. Created by admin or auto-scheduler."""

    __tablename__ = "battles"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    type = Column(Enum("solo", "clan", "tournament", name="battle_type_enum"), nullable=False)
    status = Column(
        Enum("scheduled", "active", "finished", "cancelled", name="battle_status_enum"),
        default="scheduled",
        nullable=False,
    )

    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    prize_pool = Column(Integer, default=0)  # in kopecks
    title = Column(String(120), default="")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# No-cooldown user list — env-driven (fast path), DB override possible
# ---------------------------------------------------------------------------

_raw_users = os.getenv("NO_COOLDOWN_USERS", "")
try:
    NO_COOLDOWN_USERS = {int(x.strip()) for x in _raw_users.split(",") if x.strip()}
except ValueError:
    NO_COOLDOWN_USERS = set()


def get_cooldown_seconds(is_subscriber: bool, user_id: Optional[int] = None) -> int:
    """0 for bypass list, SUB_COOLDOWN for Pro, FREE_COOLDOWN otherwise."""
    if user_id is not None and user_id in NO_COOLDOWN_USERS:
        return 0
    return settings.SUB_COOLDOWN_SECONDS if is_subscriber else settings.FREE_COOLDOWN_SECONDS


# ---------------------------------------------------------------------------
# Phase logic
# ---------------------------------------------------------------------------


def get_active_battle(db: Session, type_: Optional[str] = None) -> Optional[Battle]:
    """Find the currently-running battle, optionally filtered by type."""
    now = datetime.now(timezone.utc)
    q = db.query(Battle).filter(
        Battle.status == "active",
        Battle.start_at <= now,
        Battle.end_at >= now,
    )
    if type_:
        q = q.filter(Battle.type == type_)
    return q.order_by(Battle.start_at.desc()).first()


def get_battle_phase(db: Optional[Session] = None) -> str:
    """Return current phase name: solo / clan / tournament / peace."""
    if db is not None:
        battle = get_active_battle(db)
        if battle:
            return battle.type

    # Fallback: env-defined boundaries
    day = datetime.now(timezone.utc).day
    if settings.BATTLE_SOLO_START <= day <= settings.BATTLE_SOLO_END:
        return "solo"
    if settings.BATTLE_CLAN_START <= day <= settings.BATTLE_CLAN_END:
        return "clan"
    return "peace"


def is_battle_active(db: Optional[Session] = None) -> bool:
    return get_battle_phase(db) in ("solo", "clan", "tournament")


def is_solo_battle(db: Optional[Session] = None) -> bool:
    return get_battle_phase(db) == "solo"


def is_clan_battle(db: Optional[Session] = None) -> bool:
    return get_battle_phase(db) == "clan"


def get_battle_end_time(db: Optional[Session] = None) -> datetime:
    """When does the current battle end? Falls back to env-derived."""
    if db is not None:
        battle = get_active_battle(db)
        if battle:
            return battle.end_at

    now = datetime.now(timezone.utc)
    phase = get_battle_phase()
    if phase == "solo":
        return now.replace(
            day=settings.BATTLE_SOLO_END,
            hour=23, minute=59, second=59, microsecond=0,
        )
    if phase == "clan":
        return now.replace(
            day=settings.BATTLE_CLAN_END,
            hour=23, minute=59, second=59, microsecond=0,
        )
    return get_next_battle_start()


def get_next_battle_start() -> datetime:
    """Approximate fallback for 'when does the next battle begin?'"""
    now = datetime.now(timezone.utc)
    day = now.day

    if day < settings.BATTLE_SOLO_START:
        return now.replace(
            day=settings.BATTLE_SOLO_START,
            hour=0, minute=0, second=0, microsecond=0,
        )
    if settings.BATTLE_SOLO_END < day < settings.BATTLE_CLAN_START:
        return now.replace(
            day=settings.BATTLE_CLAN_START,
            hour=0, minute=0, second=0, microsecond=0,
        )

    # Roll over to next month
    month = now.month + 1
    year = now.year
    if month > 12:
        month = 1
        year += 1
    return datetime(
        year, month, settings.BATTLE_SOLO_START,
        0, 0, 0, tzinfo=timezone.utc,
    )
