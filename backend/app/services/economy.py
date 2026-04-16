"""
Сервис экономики PixelCoin:
- Начисление/списание монет
- Проверка и выдача достижений
- Магазин
"""
import json
import logging
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    User, CoinBalance, CoinTransaction, Achievement, UserAchievement,
    ShopItem, UserPurchase, UserPalette, ProRedemption, Referral, Battle
)

logger = logging.getLogger(__name__)


# ============ КОНСТАНТЫ НАГРАД ============
COIN_PER_PIXEL = 1
COIN_REFERRAL_SIGNUP = 50
COIN_REFERRAL_FIRST_PAYMENT = 100
COIN_BATTLE_TOP_1 = 2000
COIN_BATTLE_TOP_2 = 1000
COIN_BATTLE_TOP_3 = 500
COIN_CLAN_TOP_1 = 500
COIN_CLAN_TOP_2 = 250
COIN_CLAN_TOP_3 = 100

# Pro за PC
PRO_PRICE_COINS = 10000
PRO_REDEEM_COOLDOWN_DAYS = 30
PRO_MIN_ACCOUNT_AGE_DAYS = 7


def get_balance(db: Session, user_id: int) -> int:
    """Получить текущий баланс PixelCoin"""
    bal = db.query(CoinBalance).filter(CoinBalance.user_id == user_id).first()
    return bal.balance if bal else 0


def add_coins(db: Session, user_id: int, amount: int, reason: str, meta: Optional[dict] = None) -> int:
    """Начислить PixelCoin пользователю. Возвращает новый баланс."""
    if amount == 0:
        return get_balance(db, user_id)

    bal = db.query(CoinBalance).filter(CoinBalance.user_id == user_id).first()
    if not bal:
        bal = CoinBalance(user_id=user_id, balance=0, total_earned=0, total_spent=0)
        db.add(bal)
        db.flush()

    bal.balance = (bal.balance or 0) + amount
    if amount > 0:
        bal.total_earned = (bal.total_earned or 0) + amount
    else:
        bal.total_spent = (bal.total_spent or 0) + abs(amount)

    # Транзакция
    tx = CoinTransaction(
        user_id=user_id,
        amount=amount,
        reason=reason,
        meta=json.dumps(meta) if meta else None,
        balance_after=bal.balance,
    )
    db.add(tx)
    return bal.balance


def spend_coins(db: Session, user_id: int, amount: int, reason: str, meta: Optional[dict] = None) -> bool:
    """Списать монеты. Возвращает True если успешно, False если недостаточно."""
    if amount <= 0:
        return False
    bal = db.query(CoinBalance).filter(CoinBalance.user_id == user_id).first()
    if not bal or bal.balance < amount:
        return False
    add_coins(db, user_id, -amount, reason, meta)
    return True


# ============ ДОСТИЖЕНИЯ ============

ACHIEVEMENTS_DATA = [
    # Прогрессия (пиксели)
    {"code": "first_pixel", "name": "Первый пиксель", "description": "Поставить первый пиксель на холст", "emoji": "🎯", "category": "progression", "coin_reward": 10, "requirement_type": "pixels_total", "requirement_value": 1, "order_index": 1},
    {"code": "100_pixels", "name": "Сотня", "description": "Поставить 100 пикселей", "emoji": "💯", "category": "progression", "coin_reward": 50, "requirement_type": "pixels_total", "requirement_value": 100, "order_index": 2},
    {"code": "1000_pixels", "name": "Художник", "description": "Поставить 1 000 пикселей", "emoji": "🎨", "category": "progression", "coin_reward": 500, "requirement_type": "pixels_total", "requirement_value": 1000, "order_index": 3},
    {"code": "10000_pixels", "name": "Мастер холста", "description": "Поставить 10 000 пикселей", "emoji": "🔥", "category": "progression", "coin_reward": 2500, "requirement_type": "pixels_total", "requirement_value": 10000, "order_index": 4},
    {"code": "100000_pixels", "name": "Легенда", "description": "Поставить 100 000 пикселей", "emoji": "🌟", "category": "progression", "coin_reward": 10000, "requirement_type": "pixels_total", "requirement_value": 100000, "order_index": 5},

    # Социальные
    {"code": "first_friend", "name": "Первый друг", "description": "Пригласить 1 друга по реферальной ссылке", "emoji": "👥", "category": "social", "coin_reward": 50, "requirement_type": "referrals_count", "requirement_value": 1, "order_index": 10},
    {"code": "5_friends", "name": "Тусовщик", "description": "Пригласить 5 друзей", "emoji": "🤝", "category": "social", "coin_reward": 200, "requirement_type": "referrals_count", "requirement_value": 5, "order_index": 11},
    {"code": "25_friends", "name": "Влиятельный", "description": "Пригласить 25 друзей", "emoji": "📢", "category": "social", "coin_reward": 1000, "requirement_type": "referrals_count", "requirement_value": 25, "order_index": 12},

    # Клановые
    {"code": "clan_member", "name": "В команде", "description": "Вступить в клан", "emoji": "🛡️", "category": "clan", "coin_reward": 50, "requirement_type": "clan_member", "requirement_value": 1, "order_index": 20},
    {"code": "first_battle_win", "name": "Первая победа", "description": "Клан выиграл батл", "emoji": "⚔️", "category": "clan", "coin_reward": 300, "requirement_type": "clan_battles_won", "requirement_value": 1, "order_index": 21},
    {"code": "3_battle_wins", "name": "Чемпион", "description": "Клан выиграл 3 батла", "emoji": "🏆", "category": "clan", "coin_reward": 1500, "requirement_type": "clan_battles_won", "requirement_value": 3, "order_index": 22},

    # Боевые (индивидуальные)
    {"code": "battle_top100", "name": "В топ-100", "description": "Попасть в топ-100 игроков батла", "emoji": "⭐", "category": "battle", "coin_reward": 300, "requirement_type": "battle_rank", "requirement_value": 100, "order_index": 30},
    {"code": "battle_top10", "name": "В топ-10", "description": "Попасть в топ-10 игроков батла", "emoji": "🥇", "category": "battle", "coin_reward": 1500, "requirement_type": "battle_rank", "requirement_value": 10, "order_index": 31},
    {"code": "battle_top1", "name": "MVP", "description": "Стать лучшим игроком батла", "emoji": "👑", "category": "battle", "coin_reward": 5000, "requirement_type": "battle_rank", "requirement_value": 1, "order_index": 32},
]


def seed_achievements(db: Session):
    """Загрузить список достижений в БД (при запуске)"""
    for a in ACHIEVEMENTS_DATA:
        existing = db.query(Achievement).filter(Achievement.code == a["code"]).first()
        if not existing:
            db.add(Achievement(**a))
    db.commit()


def check_achievements_for_user(db: Session, user_id: int):
    """
    Проверяет все достижения пользователя и выдаёт новые.
    Вызывается после значимых событий: place_pixel, referral_register, clan_join, battle_end.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return []

    already_earned = set(
        ua.achievement_id for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
    )

    all_achievements = db.query(Achievement).all()
    newly_earned = []

    for ach in all_achievements:
        if ach.id in already_earned:
            continue

        earned = False
        if ach.requirement_type == "pixels_total":
            earned = (user.pixels_placed_total or 0) >= ach.requirement_value
        elif ach.requirement_type == "referrals_count":
            count = db.query(Referral).filter(Referral.referrer_id == user_id).count()
            earned = count >= ach.requirement_value
        elif ach.requirement_type == "clan_member":
            earned = user.clan_id is not None

        if earned:
            ua = UserAchievement(user_id=user_id, achievement_id=ach.id)
            db.add(ua)
            if ach.coin_reward > 0:
                add_coins(db, user_id, ach.coin_reward, "achievement",
                          {"achievement_code": ach.code, "achievement_name": ach.name})
            newly_earned.append(ach)

    if newly_earned:
        db.commit()

    return newly_earned


# ============ МАГАЗИН ============

SHOP_ITEMS_DATA = [
    # Палитры
    {"code": "palette_neon", "category": "palette", "name": "Неоновая палитра",
     "description": "8 ярких неоновых цветов для ваших пикселей",
     "price_coins": 500, "emoji": "💫", "is_unique": True, "order_index": 10,
     "data": json.dumps({"colors": ["#ff0080", "#00ffff", "#39ff14", "#ff6600", "#ff00ff", "#ffff00", "#00ff66", "#ff0066"]})},

    {"code": "palette_pastel", "category": "palette", "name": "Пастельная палитра",
     "description": "8 мягких пастельных тонов",
     "price_coins": 800, "emoji": "🌸", "is_unique": True, "order_index": 11,
     "data": json.dumps({"colors": ["#ffd1dc", "#d4f1f4", "#e8d3ff", "#fdfd96", "#c5e3bf", "#ffccc9", "#d6a4ff", "#a8e6cf"]})},

    {"code": "palette_metallic", "category": "palette", "name": "Металлик",
     "description": "Золото, серебро, бронза, платина и другие металлические оттенки",
     "price_coins": 1500, "emoji": "✨", "is_unique": True, "order_index": 12,
     "data": json.dumps({"colors": ["#d4af37", "#c0c0c0", "#cd7f32", "#e5e4e2", "#b87333", "#b5a642", "#aaa9ad", "#b76e79"]})},

    {"code": "palette_gradient", "category": "palette", "name": "Градиенты",
     "description": "Уникальные градиентные цвета — переливаются на холсте",
     "price_coins": 3000, "emoji": "🌈", "is_unique": True, "order_index": 13,
     "data": json.dumps({"colors": ["#ff6b6b", "#4ecdc4", "#c06c84", "#6c5ce7", "#fd79a8", "#a29bfe", "#fdcb6e", "#00b894"]})},

    {"code": "palette_secret", "category": "palette", "name": "Секретные цвета",
     "description": "Ультра-редкие оттенки с особой аурой на холсте",
     "price_coins": 5000, "emoji": "🔮", "is_unique": True, "order_index": 14,
     "data": json.dumps({"colors": ["#0a0e27", "#f2545b", "#19647e", "#28afb0", "#ffc857", "#e9724c", "#ff0844", "#6a0572"]})},

    # Фичи
    {"code": "clan_create_free", "category": "feature", "name": "Создание клана",
     "description": "Создайте клан без требования 10 000 пикселей или доната",
     "price_coins": 2500, "emoji": "🛡️", "is_unique": False, "order_index": 20,
     "data": json.dumps({"action": "clan_create_unlock"})},

    # Косметика
    {"code": "rename_username", "category": "cosmetic", "name": "Смена имени",
     "description": "Сменить юзернейм в профиле (один раз)",
     "price_coins": 500, "emoji": "📝", "is_unique": False, "order_index": 30,
     "data": json.dumps({"action": "rename"})},

    # Премиум — обмен на Pro
    {"code": "pro_30days", "category": "premium", "name": "Pro на 30 дней",
     "description": "Активируется со следующего месяца. Доступно раз в месяц, минимум 7 дней с регистрации.",
     "price_coins": PRO_PRICE_COINS, "emoji": "👑", "is_unique": False, "order_index": 100,
     "data": json.dumps({"action": "redeem_pro", "duration_days": 30})},
]


def seed_shop(db: Session):
    """Заполнить магазин товарами"""
    for item in SHOP_ITEMS_DATA:
        existing = db.query(ShopItem).filter(ShopItem.code == item["code"]).first()
        if not existing:
            db.add(ShopItem(**item))
    db.commit()
