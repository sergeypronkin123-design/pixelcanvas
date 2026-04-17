from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import (
    User, CoinBalance, CoinTransaction, Achievement, UserAchievement,
    ShopItem, UserPurchase, UserPalette, ProRedemption, Clan, ClanDonation
)
from app.services import economy

router = APIRouter(prefix="/economy", tags=["economy"])


# ============ БАЛАНС ============

@router.get("/balance")
def get_balance(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bal = db.query(CoinBalance).filter(CoinBalance.user_id == user.id).first()
    return {
        "balance": bal.balance if bal else 0,
        "total_earned": bal.total_earned if bal else 0,
        "total_spent": bal.total_spent if bal else 0,
    }


@router.get("/history")
def get_history(
    limit: int = Query(50, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txs = db.query(CoinTransaction).filter(
        CoinTransaction.user_id == user.id
    ).order_by(desc(CoinTransaction.created_at)).limit(limit).all()

    return [
        {
            "id": t.id,
            "amount": t.amount,
            "reason": t.reason,
            "balance_after": t.balance_after,
            "meta": json.loads(t.meta) if t.meta else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in txs
    ]


# ============ ДОСТИЖЕНИЯ ============

@router.get("/achievements")
def list_all_achievements(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Все достижения + отметка какие уже получены"""
    all_achievements = db.query(Achievement).order_by(Achievement.order_index).all()
    earned_ids = set(
        ua.achievement_id for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user.id).all()
    )
    earned_dates = {
        ua.achievement_id: ua.earned_at.isoformat() if ua.earned_at else None
        for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user.id).all()
    }

    return [
        {
            "id": a.id,
            "code": a.code,
            "name": a.name,
            "description": a.description,
            "emoji": a.emoji,
            "category": a.category,
            "coin_reward": a.coin_reward,
            "requirement_type": a.requirement_type,
            "requirement_value": a.requirement_value,
            "is_earned": a.id in earned_ids,
            "earned_at": earned_dates.get(a.id),
        }
        for a in all_achievements
    ]


@router.post("/achievements/check")
def trigger_achievement_check(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ручная проверка достижений"""
    newly_earned = economy.check_achievements_for_user(db, user.id)
    return {
        "newly_earned": [
            {"code": a.code, "name": a.name, "emoji": a.emoji, "coin_reward": a.coin_reward}
            for a in newly_earned
        ]
    }


# ============ МАГАЗИН ============

@router.get("/shop")
def list_shop_items(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Все товары в магазине"""
    items = db.query(ShopItem).filter(ShopItem.is_active == True).order_by(ShopItem.order_index).all()

    # Какие палитры уже куплены
    owned_palettes = set(
        p.palette_code for p in db.query(UserPalette).filter(UserPalette.user_id == user.id).all()
    )
    # Все покупки
    purchased_unique_items = set()
    for p in db.query(UserPurchase, ShopItem).join(ShopItem).filter(
        UserPurchase.user_id == user.id, ShopItem.is_unique == True
    ).all():
        purchased_unique_items.add(p.ShopItem.code)

    balance = economy.get_balance(db, user.id)

    result = []
    for item in items:
        data = json.loads(item.data) if item.data else {}

        # Проверка: палитра куплена?
        is_owned = False
        if item.category == "palette":
            palette_code = item.code.replace("palette_", "")
            is_owned = palette_code in owned_palettes

        if item.is_unique and item.code in purchased_unique_items:
            is_owned = True

        can_afford = balance >= item.price_coins

        result.append({
            "id": item.id,
            "code": item.code,
            "category": item.category,
            "name": item.name,
            "description": item.description,
            "emoji": item.emoji,
            "price_coins": item.price_coins,
            "data": data,
            "is_unique": item.is_unique,
            "is_owned": is_owned,
            "can_afford": can_afford,
        })

    return {"items": result, "balance": balance}


class PurchaseRequest(BaseModel):
    item_code: str


@router.post("/shop/buy")
def buy_item(data: PurchaseRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Купить товар за PixelCoin"""
    item = db.query(ShopItem).filter(ShopItem.code == data.item_code, ShopItem.is_active == True).first()
    if not item:
        raise HTTPException(404, "Товар не найден")

    # Проверка баланса
    balance = economy.get_balance(db, user.id)
    if balance < item.price_coins:
        raise HTTPException(400, f"Недостаточно PixelCoin. Нужно: {item.price_coins}, есть: {balance}")

    # Проверка уникальности
    if item.is_unique:
        already = db.query(UserPurchase).filter(
            UserPurchase.user_id == user.id,
            UserPurchase.item_id == item.id
        ).first()
        if already:
            raise HTTPException(400, "Вы уже владеете этим товаром")

    # Обработка покупки по типу
    item_data = json.loads(item.data) if item.data else {}

    if item.category == "palette":
        palette_code = item.code.replace("palette_", "")
        existing = db.query(UserPalette).filter(
            UserPalette.user_id == user.id,
            UserPalette.palette_code == palette_code,
        ).first()
        if existing:
            raise HTTPException(400, "Палитра уже разблокирована")

        # Списываем монеты
        if not economy.spend_coins(db, user.id, item.price_coins, "shop_purchase",
                                   {"item_code": item.code, "category": "palette"}):
            raise HTTPException(500, "Ошибка списания монет")

        db.add(UserPalette(user_id=user.id, palette_code=palette_code))
        db.add(UserPurchase(user_id=user.id, item_id=item.id, price_paid=item.price_coins))
        db.commit()
        return {"status": "ok", "message": f"Палитра «{item.name}» разблокирована!"}

    elif item.code == "clan_create_free":
        # Активный донат уже есть?
        existing = db.query(ClanDonation).filter(
            ClanDonation.user_id == user.id,
            ClanDonation.status == "paid",
            ClanDonation.used == False,
        ).first()
        if existing:
            raise HTTPException(400, "У вас уже есть разблокировка создания клана")

        if not economy.spend_coins(db, user.id, item.price_coins, "shop_purchase",
                                   {"item_code": item.code}):
            raise HTTPException(500, "Ошибка списания монет")

        # Создаём "фейковый" donation запись как "paid"+"unused"
        donation = ClanDonation(
            user_id=user.id,
            amount=0,
            currency="PC",
            provider="pixelcoin",
            status="paid",
            used=False,
        )
        db.add(donation)
        db.add(UserPurchase(user_id=user.id, item_id=item.id, price_paid=item.price_coins))
        db.commit()
        return {"status": "ok", "message": "Создание клана разблокировано! Идите в /clans/create"}

    elif item.code == "pro_30days":
        # Проверка условий
        now = datetime.now(timezone.utc)

        # Минимальный возраст аккаунта
        if user.created_at:
            account_age_days = (now - user.created_at.replace(tzinfo=timezone.utc)).days if user.created_at.tzinfo is None else (now - user.created_at).days
            if account_age_days < economy.PRO_MIN_ACCOUNT_AGE_DAYS:
                raise HTTPException(403, f"Обмен на Pro доступен после {economy.PRO_MIN_ACCOUNT_AGE_DAYS} дней с регистрации")

        # Кулдаун между обменами
        last_redemption = db.query(ProRedemption).filter(
            ProRedemption.user_id == user.id
        ).order_by(desc(ProRedemption.created_at)).first()
        if last_redemption:
            days_since = (now - last_redemption.created_at.replace(tzinfo=timezone.utc)).days if last_redemption.created_at.tzinfo is None else (now - last_redemption.created_at).days
            if days_since < economy.PRO_REDEEM_COOLDOWN_DAYS:
                days_left = economy.PRO_REDEEM_COOLDOWN_DAYS - days_since
                raise HTTPException(403, f"Следующий обмен доступен через {days_left} дней")

        if not economy.spend_coins(db, user.id, item.price_coins, "shop_purchase",
                                   {"item_code": item.code, "category": "pro_redemption"}):
            raise HTTPException(500, "Ошибка списания монет")

        # Активация со следующего батла (1 числа след. месяца)
        if now.month == 12:
            activates = now.replace(year=now.year+1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            activates = now.replace(month=now.month+1, day=1, hour=0, minute=0, second=0, microsecond=0)

        redemption = ProRedemption(
            user_id=user.id,
            coins_spent=item.price_coins,
            activates_at=activates,
            duration_days=30,
            status="scheduled",
        )
        db.add(redemption)
        db.add(UserPurchase(user_id=user.id, item_id=item.id, price_paid=item.price_coins))
        db.commit()
        return {
            "status": "ok",
            "message": f"Pro на 30 дней активируется {activates.strftime('%d.%m.%Y')}",
            "activates_at": activates.isoformat(),
        }

    else:
        # Стандартная покупка (косметика)
        if not economy.spend_coins(db, user.id, item.price_coins, "shop_purchase",
                                   {"item_code": item.code}):
            raise HTTPException(500, "Ошибка списания монет")
        db.add(UserPurchase(user_id=user.id, item_id=item.id, price_paid=item.price_coins))
        db.commit()
        return {"status": "ok", "message": f"«{item.name}» куплено!"}


@router.get("/palettes")
def get_my_palettes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Какие палитры доступны пользователю"""
    owned = db.query(UserPalette).filter(UserPalette.user_id == user.id).all()
    owned_codes = [p.palette_code for p in owned]

    # Стандартная палитра всегда доступна
    if "standard" not in owned_codes:
        owned_codes.append("standard")

    # Собираем данные о цветах из магазина
    result = []
    # Стандартные цвета (всегда)
    result.append({
        "code": "standard",
        "name": "Стандартная палитра",
        "colors": ["#000000", "#ffffff", "#e5e5e5", "#888888", "#333333", "#ef4444", "#f97316",
                   "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
                   "#f43f5e", "#84cc16"],
    })

    for code in owned_codes:
        if code == "standard":
            continue
        item = db.query(ShopItem).filter(ShopItem.code == f"palette_{code}").first()
        if item:
            data = json.loads(item.data) if item.data else {}
            result.append({
                "code": code,
                "name": item.name,
                "colors": data.get("colors", []),
            })

    return {"palettes": result}


@router.post("/daily-reward")
def claim_daily_reward_endpoint(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Получить ежедневную награду"""
    from app.services.daily_rewards import claim_daily_reward
    return claim_daily_reward(db, user)


@router.get("/daily-status")
def daily_reward_status(user: User = Depends(get_current_user)):
    """Проверить статус ежедневной награды"""
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    today = now.date()
    last_claim = user.last_daily_claim
    can_claim = not last_claim or last_claim.date() < today
    tomorrow = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
    return {
        "can_claim": can_claim,
        "streak": user.daily_streak or 0,
        "next_claim_at": None if can_claim else tomorrow.isoformat(),
    }


@router.post("/complete-onboarding")
def complete_onboarding(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Пометить onboarding как завершённый"""
    user.onboarding_completed = True
    db.commit()
    return {"status": "ok"}
