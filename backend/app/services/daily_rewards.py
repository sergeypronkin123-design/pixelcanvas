"""
Daily rewards (ежедневные награды за вход).
Streak-механика: чем больше дней подряд, тем больше бонус.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import User
from app.services import economy
import logging

logger = logging.getLogger(__name__)

# Награды по дням streak'а
STREAK_REWARDS = {
    1: 10,    # 1 день = 10 PC
    2: 15,
    3: 25,    # 3 дня = 25 PC
    4: 30,
    5: 40,
    6: 50,
    7: 100,   # неделя = 100 PC
    14: 200,  # 2 недели
    30: 500,  # месяц
}


def get_reward_for_day(streak_day: int) -> int:
    """Определить награду для текущего дня streak'а"""
    reward = 10  # базово 10 PC
    for day, amount in sorted(STREAK_REWARDS.items()):
        if streak_day >= day:
            reward = amount
    return reward


def claim_daily_reward(db: Session, user: User) -> dict:
    """
    Попытаться получить ежедневную награду.
    Возвращает: {"claimed": bool, "reward": int, "streak": int, "next_claim_at": str}
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    last_claim = getattr(user, 'last_daily_claim', None)

    # Уже получал сегодня?
    if last_claim and last_claim.date() == today:
        # Следующая доступна завтра
        tomorrow = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
        return {
            "claimed": False,
            "reward": 0,
            "streak": user.daily_streak or 0,
            "next_claim_at": tomorrow.isoformat(),
            "message": "Уже получено сегодня",
        }

    # Считаем streak
    yesterday = today - timedelta(days=1)
    if last_claim and last_claim.date() == yesterday:
        # Продолжение streak'а
        new_streak = (user.daily_streak or 0) + 1
    elif last_claim and last_claim.date() >= today - timedelta(days=2):
        # Пропустил один день — сохраняем streak
        new_streak = (user.daily_streak or 0) + 1
    else:
        # Streak сброшен
        new_streak = 1

    reward = get_reward_for_day(new_streak)

    # Начислить
    economy.add_coins(db, user.id, reward, "daily_reward",
                      {"streak": new_streak, "day": str(today)})

    user.last_daily_claim = now
    user.daily_streak = new_streak
    db.commit()

    tomorrow = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)

    return {
        "claimed": True,
        "reward": reward,
        "streak": new_streak,
        "next_claim_at": tomorrow.isoformat(),
        "message": f"+{reward} PixelCoin! Streak: {new_streak} дней",
    }
