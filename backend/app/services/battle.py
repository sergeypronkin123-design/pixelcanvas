"""
Battle phase logic — DB-backed instead of env-only.

This module assumes the `Battle` model is defined elsewhere in your project
(likely in app/models.py or app/models/battle.py). We import it lazily so
this module can stay agnostic of where it lives.

If your project doesn't have a `Battle` model yet, the env-based fallback
still works for get_battle_phase().
"""
import os
from datetime import datetime, timezone
from typing import Optional, Any

from sqlalchemy.orm import Session

from app.core.config import get_settings

settings = get_settings()


# ---------------------------------------------------------------------------
# Lazy Battle import — works whether your model is in app.models or elsewhere
# ---------------------------------------------------------------------------

_Battle = None


def _get_battle_model():
    """Lazy lookup so this module doesn't crash if Battle isn't defined yet."""
    global _Battle
    if _Battle is not None:
        return _Battle

    # Try common locations
    try:
        from app.models import Battle as B
        _Battle = B
        return _Battle
    except ImportError:
        pass

    try:
        from app.models.battle import Battle as B
        _Battle = B
        return _Battle
    except ImportError:
        pass

    return None


# ---------------------------------------------------------------------------
# No-cooldown user list — env-driven (fast path)
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
# Phase logic — works WITH or WITHOUT a Battle model
# ---------------------------------------------------------------------------


def get_active_battle(db: Session, type_: Optional[str] = None) -> Optional[Any]:
    """Find the currently-running battle, optionally filtered by type."""
    Battle = _get_battle_model()
    if Battle is None:
        return None

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
    """When does the current battle end?"""
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
