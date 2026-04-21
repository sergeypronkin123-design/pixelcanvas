from datetime import datetime, timezone
from app.core.config import get_settings

settings = get_settings()


def _solo_start() -> int:
    return settings.BATTLE_SOLO_START


def _solo_end() -> int:
    return settings.BATTLE_SOLO_END


def _clan_start() -> int:
    return settings.BATTLE_CLAN_START


def _clan_end() -> int:
    return settings.BATTLE_CLAN_END


def get_battle_phase() -> str:
    """
    Возвращает текущую фазу:
    - "solo" — соло батл
    - "clan" — клановые войны
    - "peace" — перерыв
    """
    day = datetime.now(timezone.utc).day
    if _solo_start() <= day <= _solo_end():
        return "solo"
    elif _clan_start() <= day <= _clan_end():
        return "clan"
    return "peace"


def is_battle_active() -> bool:
    return get_battle_phase() in ("solo", "clan")


def is_solo_battle() -> bool:
    return get_battle_phase() == "solo"


def is_clan_battle() -> bool:
    return get_battle_phase() == "clan"


def get_battle_end_time() -> datetime:
    """Когда заканчивается текущий/ближайший батл"""
    now = datetime.now(timezone.utc)
    phase = get_battle_phase()

    if phase == "solo":
        return now.replace(day=_solo_end(), hour=23, minute=59, second=59, microsecond=0)
    elif phase == "clan":
        return now.replace(day=_clan_end(), hour=23, minute=59, second=59, microsecond=0)
    else:
        return get_next_battle_start()


def get_next_battle_start() -> datetime:
    """Когда начнётся следующий батл"""
    now = datetime.now(timezone.utc)
    day = now.day

    solo_s, solo_e = _solo_start(), _solo_end()
    clan_s, clan_e = _clan_start(), _clan_end()

    if day < solo_s:
        return now.replace(day=solo_s, hour=0, minute=0, second=0, microsecond=0)
    elif solo_e < day < clan_s:
        return now.replace(day=clan_s, hour=0, minute=0, second=0, microsecond=0)
    elif day > clan_e:
        # Следующий месяц — соло
        month = now.month + 1
        year = now.year
        if month > 12:
            month = 1
            year += 1
        return datetime(year, month, solo_s, 0, 0, 0, tzinfo=timezone.utc)
    else:
        # Сейчас идёт батл — следующий после текущего
        if day <= solo_e:
            return now.replace(day=clan_s, hour=0, minute=0, second=0, microsecond=0)
        else:
            month = now.month + 1
            year = now.year
            if month > 12:
                month = 1
                year += 1
            return datetime(year, month, solo_s, 0, 0, 0, tzinfo=timezone.utc)


def get_cooldown_seconds(is_subscriber: bool) -> int:
    return settings.SUB_COOLDOWN_SECONDS if is_subscriber else settings.FREE_COOLDOWN_SECONDS
