"""
Сервис наград по окончании батла.

Вызывается автоматически раз в сутки (проверяет не нужно ли наградить).
Награждает:
- Топ-3 игроков по пикселям
- Топ-3 кланов по территории
- Ставит медали, начисляет PixelCoin, продлевает Pro
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models import (
    User, Pixel, Battle, BattleParticipant, Clan, ClanMember, ClanBattle,
    CoinBalance, UserAchievement, Achievement, ProRedemption
)
from app.services import economy

logger = logging.getLogger(__name__)

# Настройки наград
PLAYER_REWARDS = {
    1: {"pro_days": 30, "bonus_pixels": 500, "coins": 2000},
    2: {"pro_days": 14, "bonus_pixels": 250, "coins": 1000},
    3: {"pro_days": 7, "bonus_pixels": 100, "coins": 500},
}

CLAN_REWARDS = {
    1: {"pro_days": 7, "coins_per_member": 500},
    2: {"pro_days": 3, "coins_per_member": 250},
    3: {"pro_days": 1, "coins_per_member": 100},
}

# Минимальные требования для получения клановой награды (анти-чит)
CLAN_REWARD_MIN_PIXELS = 100  # член клана должен поставить ≥100 пикселей
CLAN_REWARD_MIN_DAYS_IN_CLAN = 3  # состоять в клане ≥3 дней


def finalize_battle(db: Session, battle: Battle) -> Dict[str, Any]:
    """
    Завершает батл и выдаёт награды.
    Вызывается один раз, когда battle.is_active=True и мы перешли в период неактивности.
    """
    logger.info(f"Finalizing battle {battle.year}/{battle.month}...")

    result = {
        "battle_id": battle.id,
        "player_winners": [],
        "clan_winners": [],
    }

    # ============ ТОП-3 ИГРОКОВ ============
    player_top = db.query(BattleParticipant, User).join(
        User, User.id == BattleParticipant.user_id
    ).filter(
        BattleParticipant.battle_id == battle.id
    ).order_by(desc(BattleParticipant.pixels_placed)).limit(3).all()

    now = datetime.now(timezone.utc)
    # Pro начинается со следующего батла (чтобы не ломать баланс текущего)
    if now.month == 12:
        pro_activates = datetime(now.year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    else:
        pro_activates = datetime(now.year, now.month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    for rank, (participant, user) in enumerate(player_top, 1):
        reward = PLAYER_REWARDS[rank]

        # Начислить монеты
        economy.add_coins(db, user.id, reward["coins"], "battle_top_player",
                          {"rank": rank, "battle_id": battle.id, "month": battle.month, "year": battle.year})

        # Бонусные пиксели на следующий батл
        user.bonus_pixels = (user.bonus_pixels or 0) + reward["bonus_pixels"]

        # Отложенная Pro активация
        redemption = ProRedemption(
            user_id=user.id,
            coins_spent=0,  # бесплатно — награда
            activates_at=pro_activates,
            duration_days=reward["pro_days"],
            status="scheduled",
        )
        db.add(redemption)

        # Достижения по рангу
        _award_battle_rank_achievement(db, user.id, rank)

        result["player_winners"].append({
            "rank": rank,
            "user_id": user.id,
            "username": user.username,
            "pixels_placed": participant.pixels_placed,
            "pro_days": reward["pro_days"],
            "coins": reward["coins"],
            "bonus_pixels": reward["bonus_pixels"],
        })

    # ============ ТОП-3 КЛАНОВ ============
    clan_territory = db.query(
        Pixel.clan_id,
        func.count(Pixel.id).label("territory")
    ).filter(Pixel.clan_id.isnot(None)).group_by(Pixel.clan_id).order_by(desc("territory")).limit(3).all()

    for rank, (clan_id, territory) in enumerate(clan_territory, 1):
        clan = db.query(Clan).filter(Clan.id == clan_id).first()
        if not clan:
            continue

        reward = CLAN_REWARDS[rank]

        # Обновить счётчик побед клана
        if rank == 1:
            clan.battles_won = (clan.battles_won or 0) + 1

        # Записать результат в ClanBattle
        cb = ClanBattle(
            battle_id=battle.id,
            clan_id=clan.id,
            territory_pixels=territory,
            total_pixels_placed=clan.total_pixels_placed or 0,
            members_count=clan.members_count or 0,
            rank=rank,
        )
        db.add(cb)

        # Награды каждому активному члену клана
        min_joined_at = now - timedelta(days=CLAN_REWARD_MIN_DAYS_IN_CLAN)
        eligible_members = db.query(ClanMember).filter(
            ClanMember.clan_id == clan.id,
            ClanMember.pixels_placed_in_clan >= CLAN_REWARD_MIN_PIXELS,
            ClanMember.joined_at <= min_joined_at,
        ).all()

        rewarded_members = []
        for m in eligible_members:
            # PixelCoin
            economy.add_coins(db, m.user_id, reward["coins_per_member"], "battle_top_clan",
                              {"rank": rank, "clan_id": clan.id, "battle_id": battle.id})

            # Pro подписка (отложенная)
            clan_redemption = ProRedemption(
                user_id=m.user_id,
                coins_spent=0,
                activates_at=pro_activates,
                duration_days=reward["pro_days"],
                status="scheduled",
            )
            db.add(clan_redemption)
            rewarded_members.append(m.user_id)

        # Достижение клана
        if rank == 1:
            for m in eligible_members:
                _award_clan_battle_achievement(db, m.user_id)

        result["clan_winners"].append({
            "rank": rank,
            "clan_id": clan.id,
            "clan_name": clan.name,
            "clan_tag": clan.tag,
            "territory_pixels": territory,
            "rewarded_members_count": len(rewarded_members),
            "pro_days": reward["pro_days"],
            "coins_per_member": reward["coins_per_member"],
        })

    # Деактивируем батл
    battle.is_active = False
    db.commit()

    logger.info(f"Battle finalized: {len(result['player_winners'])} player winners, {len(result['clan_winners'])} clan winners")
    return result


def _award_battle_rank_achievement(db: Session, user_id: int, rank: int):
    """Выдаёт достижение за попадание в топ батла"""
    codes = []
    if rank == 1:
        codes.append("battle_top1")
    if rank <= 10:
        codes.append("battle_top10")
    if rank <= 100:
        codes.append("battle_top100")

    for code in codes:
        ach = db.query(Achievement).filter(Achievement.code == code).first()
        if not ach:
            continue
        existing = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == ach.id
        ).first()
        if existing:
            continue
        db.add(UserAchievement(user_id=user_id, achievement_id=ach.id))
        if ach.coin_reward > 0:
            economy.add_coins(db, user_id, ach.coin_reward, "achievement",
                              {"achievement_code": code})


def _award_clan_battle_achievement(db: Session, user_id: int):
    """Достижение за победу клана"""
    # first_battle_win
    ach = db.query(Achievement).filter(Achievement.code == "first_battle_win").first()
    if ach:
        existing = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == ach.id
        ).first()
        if not existing:
            db.add(UserAchievement(user_id=user_id, achievement_id=ach.id))
            if ach.coin_reward > 0:
                economy.add_coins(db, user_id, ach.coin_reward, "achievement",
                                  {"achievement_code": "first_battle_win"})

    # 3_battle_wins
    user_wins = db.query(func.count(ClanBattle.id)).filter(
        ClanBattle.rank == 1,
        ClanBattle.clan_id.in_(
            db.query(ClanMember.clan_id).filter(ClanMember.user_id == user_id)
        )
    ).scalar() or 0

    if user_wins >= 3:
        ach3 = db.query(Achievement).filter(Achievement.code == "3_battle_wins").first()
        if ach3:
            existing = db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == ach3.id
            ).first()
            if not existing:
                db.add(UserAchievement(user_id=user_id, achievement_id=ach3.id))
                if ach3.coin_reward > 0:
                    economy.add_coins(db, user_id, ach3.coin_reward, "achievement",
                                      {"achievement_code": "3_battle_wins"})


def check_and_process_pending_redemptions(db: Session):
    """
    Активирует Pro-подписки по обменам которые должны начаться.
    Вызывается периодически (раз в сутки).
    """
    now = datetime.now(timezone.utc)

    pending = db.query(ProRedemption).filter(
        ProRedemption.status == "scheduled",
        ProRedemption.activates_at <= now,
    ).all()

    for redemption in pending:
        user = db.query(User).filter(User.id == redemption.user_id).first()
        if not user:
            redemption.status = "expired"
            continue

        # Продлить подписку
        current_until = user.subscription_until or now
        if current_until < now:
            current_until = now

        user.is_subscriber = True
        user.subscription_until = current_until + timedelta(days=redemption.duration_days)
        redemption.status = "activated"
        logger.info(f"Pro activated for user {user.id} for {redemption.duration_days} days")

    db.commit()
    return len(pending)


def should_finalize_current_battle(db: Session) -> Battle | None:
    """
    Определяет есть ли активный батл который пора завершить.
    Возвращает Battle если нужно завершить, иначе None.
    """
    from app.core.config import get_settings
    settings = get_settings()
    now = datetime.now(timezone.utc)

    # Текущий период батла?
    if settings.BATTLE_DAY_START <= now.day <= settings.BATTLE_DAY_END:
        return None  # идёт активный батл — не завершаем

    # Найти активный батл (is_active=True) предыдущего месяца
    active_battle = db.query(Battle).filter(Battle.is_active == True).first()
    return active_battle
