from datetime import datetime, timezone
from app.core.config import get_settings

settings = get_settings()

# Периоды батлов
SOLO_START = 1
SOLO_END = 10
CLAN_START = 11
CLAN_END = 20


def get_battle_phase() -> str:
    """
    Возвращает текущую фазу:
    - "solo" — соло батл (1-10 числа)
    - "clan" — клановые войны (11-20 числа)
    - "peace" — перерыв (21-31 числа)
    """
    day = datetime.now(timezone.utc).day
    if SOLO_START <= day <= SOLO_END:
        return "solo"
    elif CLAN_START <= day <= CLAN_END:
        return "clan"
    return "peace"


def is_battle_active() -> bool:
    """Идёт ли какой-либо батл (соло или клановый)"""
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
        return now.replace(day=SOLO_END, hour=23, minute=59, second=59, microsecond=0)
    elif phase == "clan":
        return now.replace(day=CLAN_END, hour=23, minute=59, second=59, microsecond=0)
    else:
        # Мирное время — показать когда начнётся следующий соло
        return get_next_battle_start()


def get_next_battle_start() -> datetime:
    """Когда начнётся следующий батл"""
    now = datetime.now(timezone.utc)
    day = now.day

    if day < SOLO_START:
        return now.replace(day=SOLO_START, hour=0, minute=0, second=0, microsecond=0)
    elif SOLO_END < day < CLAN_START:
        return now.replace(day=CLAN_START, hour=0, minute=0, second=0, microsecond=0)
    elif day > CLAN_END:
        # Следующий месяц — соло
        month = now.month + 1
        year = now.year
        if month > 12:
            month = 1
            year += 1
        return datetime(year, month, SOLO_START, 0, 0, 0, tzinfo=timezone.utc)
    else:
        # Сейчас идёт батл — следующий после текущего
        if day <= SOLO_END:
            return now.replace(day=CLAN_START, hour=0, minute=0, second=0, microsecond=0)
        else:
            month = now.month + 1
            year = now.year
            if month > 12:
                month = 1
                year += 1
            return datetime(year, month, SOLO_START, 0, 0, 0, tzinfo=timezone.utc)


def get_cooldown_seconds(is_subscriber: bool) -> int:
    return settings.SUB_COOLDOWN_SECONDS if is_subscriber else settings.FREE_COOLDOWN_SECONDS
