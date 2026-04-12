from datetime import datetime, timezone
from app.core.config import get_settings

settings = get_settings()


def is_battle_active() -> bool:
    """Check if current date is within battle period (1st-7th of month)."""
    now = datetime.now(timezone.utc)
    return settings.BATTLE_DAY_START <= now.day <= settings.BATTLE_DAY_END


def get_battle_end_time() -> datetime:
    """Get the end datetime of the current/next battle."""
    now = datetime.now(timezone.utc)
    if now.day <= settings.BATTLE_DAY_END:
        # Battle ends this month on BATTLE_DAY_END at 23:59:59
        return now.replace(day=settings.BATTLE_DAY_END, hour=23, minute=59, second=59, microsecond=0)
    else:
        # Next battle ends next month
        month = now.month + 1
        year = now.year
        if month > 12:
            month = 1
            year += 1
        return datetime(year, month, settings.BATTLE_DAY_END, 23, 59, 59, tzinfo=timezone.utc)


def get_next_battle_start() -> datetime:
    """Get start of next battle."""
    now = datetime.now(timezone.utc)
    if now.day < settings.BATTLE_DAY_START:
        return now.replace(day=settings.BATTLE_DAY_START, hour=0, minute=0, second=0, microsecond=0)
    else:
        month = now.month + 1
        year = now.year
        if month > 12:
            month = 1
            year += 1
        return datetime(year, month, settings.BATTLE_DAY_START, 0, 0, 0, tzinfo=timezone.utc)


def get_cooldown_seconds(is_subscriber: bool) -> int:
    return settings.SUB_COOLDOWN_SECONDS if is_subscriber else settings.FREE_COOLDOWN_SECONDS
