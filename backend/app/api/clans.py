from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timezone, timedelta
from typing import Optional
import re
import stripe
import httpx
import json
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models import User, Clan, ClanMember, ClanInvite, ClanDonation, Pixel, Battle

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY
router = APIRouter(prefix="/clans", tags=["clans"])

CLAN_CREATE_PIXELS_REQUIREMENT = 10000
CLAN_CREATE_DONATION_RUB = 10000  # 100₽ в копейках
CLAN_CREATE_DONATION_USD = 199  # $1.99 в центах
CLAN_SWITCH_DAYS = 7


class ClanCreate(BaseModel):
    name: str = Field(min_length=3, max_length=30)
    tag: str = Field(min_length=2, max_length=5)
    description: Optional[str] = Field(None, max_length=500)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$", default="#f97316")
    emoji: Optional[str] = Field(None, max_length=10)
    emblem_code: Optional[str] = Field("shield", max_length=30)
    is_open: bool = True
    max_members: int = Field(50, ge=2, le=500)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not re.match(r"^[a-zA-Zа-яА-ЯёЁ0-9 _\-]+$", v):
            raise ValueError("Недопустимые символы в названии")
        return v.strip()

    @field_validator("tag")
    @classmethod
    def validate_tag(cls, v):
        if not re.match(r"^[a-zA-Z0-9]+$", v):
            raise ValueError("Тег может содержать только латиницу и цифры")
        return v.upper()


class ClanUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    emoji: Optional[str] = Field(None, max_length=10)
    emblem_code: Optional[str] = Field(None, max_length=30)
    is_open: Optional[bool] = None
    max_members: Optional[int] = Field(None, ge=2, le=500)


class ClanOut(BaseModel):
    id: int
    name: str
    tag: str
    description: Optional[str]
    color: str
    emoji: Optional[str]
    emblem_code: Optional[str] = "shield"
    leader_id: int
    is_open: bool
    max_members: int
    members_count: int
    total_pixels_placed: int
    battles_won: int
    invite_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/can-create")
def can_create_clan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Проверка может ли пользователь создать клан"""
    # Уже в клане?
    if user.clan_id:
        return {
            "can_create": False,
            "reason": "Вы уже состоите в клане. Сначала покиньте его.",
            "has_pixels": False,
            "has_donation": False,
        }

    pixels = user.pixels_placed_total or 0
    has_pixels = pixels >= CLAN_CREATE_PIXELS_REQUIREMENT

    # Есть ли неиспользованный донат?
    donation = db.query(ClanDonation).filter(
        ClanDonation.user_id == user.id,
        ClanDonation.status == "paid",
        ClanDonation.used == False,
    ).first()
    has_donation = donation is not None

    return {
        "can_create": has_pixels or has_donation,
        "has_pixels": has_pixels,
        "has_donation": has_donation,
        "pixels_placed": pixels,
        "pixels_needed": CLAN_CREATE_PIXELS_REQUIREMENT,
        "donation_price_rub": CLAN_CREATE_DONATION_RUB,
        "donation_price_usd": CLAN_CREATE_DONATION_USD,
    }


@router.post("/create", response_model=ClanOut)
def create_clan(data: ClanCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Создать клан"""
    if user.clan_id:
        raise HTTPException(400, "Вы уже состоите в клане")

    # Проверка права на создание
    pixels = user.pixels_placed_total or 0
    has_pixels = pixels >= CLAN_CREATE_PIXELS_REQUIREMENT

    donation = db.query(ClanDonation).filter(
        ClanDonation.user_id == user.id,
        ClanDonation.status == "paid",
        ClanDonation.used == False,
    ).first()

    if not has_pixels and not donation:
        raise HTTPException(403, f"Нужно {CLAN_CREATE_PIXELS_REQUIREMENT} пикселей или донат 100₽")

    # Уникальность
    if db.query(Clan).filter(Clan.name == data.name).first():
        raise HTTPException(400, "Клан с таким названием уже существует")
    if db.query(Clan).filter(Clan.tag == data.tag).first():
        raise HTTPException(400, "Тег уже занят")

    # Создать клан
    clan = Clan(
        name=data.name,
        tag=data.tag,
        description=data.description,
        color=data.color,
        emoji=data.emoji,
        emblem_code=data.emblem_code or "shield",
        leader_id=user.id,
        is_open=data.is_open,
        max_members=data.max_members,
        members_count=1,
        invite_code=uuid.uuid4().hex[:12],  # уникальный код для инвайт-ссылки
    )
    db.add(clan)
    db.flush()

    # Добавить лидера в участники
    member = ClanMember(
        clan_id=clan.id,
        user_id=user.id,
        role="leader",
    )
    db.add(member)

    # Обновить user
    user.clan_id = clan.id
    user.clan_role = "leader"
    user.clan_join_available_at = datetime.now(timezone.utc) + timedelta(days=CLAN_SWITCH_DAYS)

    # Пометить донат как использованный
    if not has_pixels and donation:
        donation.used = True
        donation.clan_id = clan.id

    db.commit()
    db.refresh(clan)
    return ClanOut.model_validate(clan)


@router.get("/list")
def list_clans(
    limit: int = Query(50, le=100),
    offset: int = 0,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Список всех кланов"""
    q = db.query(Clan)
    if search:
        q = q.filter(Clan.name.ilike(f"%{search}%") | Clan.tag.ilike(f"%{search}%"))
    clans = q.order_by(desc(Clan.members_count), desc(Clan.total_pixels_placed)).offset(offset).limit(limit).all()
    return [ClanOut.model_validate(c) for c in clans]


@router.get("/my")
def get_my_clan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Получить инфу о моём клане"""
    if not user.clan_id:
        return {"clan": None}

    clan = db.query(Clan).filter(Clan.id == user.clan_id).first()
    if not clan:
        user.clan_id = None
        user.clan_role = None
        db.commit()
        return {"clan": None}

    members = db.query(ClanMember, User).join(User, User.id == ClanMember.user_id).filter(
        ClanMember.clan_id == clan.id
    ).order_by(desc(ClanMember.pixels_placed_in_clan)).all()

    # Текущая территория (пиксели клана на холсте)
    territory = db.query(Pixel).filter(Pixel.clan_id == clan.id).count()

    return {
        "clan": ClanOut.model_validate(clan).model_dump(),
        "my_role": user.clan_role,
        "can_change_clan_at": user.clan_join_available_at.isoformat() if user.clan_join_available_at else None,
        "territory_pixels": territory,
        "members": [
            {
                "user_id": m.ClanMember.user_id,
                "username": m.User.username,
                "role": m.ClanMember.role,
                "pixels_placed_in_clan": m.ClanMember.pixels_placed_in_clan,
                "is_subscriber": m.User.is_subscriber,
                "joined_at": m.ClanMember.joined_at.isoformat() if m.ClanMember.joined_at else None,
            }
            for m in members
        ],
    }


@router.get("/invite/{invite_code}")
def get_clan_by_invite(invite_code: str, db: Session = Depends(get_db)):
    """Публичная инфа о клане по инвайт-коду (для превью ссылки)"""
    clan = db.query(Clan).filter(Clan.invite_code == invite_code).first()
    if not clan:
        raise HTTPException(404, "Приглашение не найдено или устарело")

    territory = db.query(Pixel).filter(Pixel.clan_id == clan.id).count()
    leader = db.query(User).filter(User.id == clan.leader_id).first()

    return {
        "clan": ClanOut.model_validate(clan).model_dump(),
        "leader_username": leader.username if leader else None,
        "territory_pixels": territory,
    }


@router.post("/join-by-code/{invite_code}")
def join_by_invite_code(invite_code: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Вступить в клан по инвайт-коду (работает даже для закрытых кланов)"""
    clan = db.query(Clan).filter(Clan.invite_code == invite_code).first()
    if not clan:
        raise HTTPException(404, "Приглашение не найдено")

    # Проверка — прошло ли 7 дней
    now = datetime.now(timezone.utc)
    if user.clan_id == clan.id:
        raise HTTPException(400, "Вы уже в этом клане")

    if user.clan_id:
        if user.clan_join_available_at and user.clan_join_available_at > now:
            days_left = (user.clan_join_available_at - now).days + 1
            raise HTTPException(403, f"Сменить клан можно через {days_left} дней")

    if clan.members_count >= clan.max_members:
        raise HTTPException(400, "Клан переполнен")

    # Выйти из старого клана
    if user.clan_id:
        old_clan = db.query(Clan).filter(Clan.id == user.clan_id).first()
        if old_clan:
            old_clan.members_count = max(0, (old_clan.members_count or 1) - 1)
        db.query(ClanMember).filter(ClanMember.user_id == user.id).delete()

    # Вступить
    member = ClanMember(clan_id=clan.id, user_id=user.id, role="member")
    db.add(member)
    clan.members_count = (clan.members_count or 0) + 1
    user.clan_id = clan.id
    user.clan_role = "member"
    user.clan_join_available_at = now + timedelta(days=CLAN_SWITCH_DAYS)
    db.commit()
    return {"status": "ok", "clan_id": clan.id}


@router.post("/{clan_id}/regenerate-invite")
def regenerate_invite_code(clan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Сгенерировать новый инвайт-код (только лидер) — старая ссылка перестанет работать"""
    clan = db.query(Clan).filter(Clan.id == clan_id).first()
    if not clan:
        raise HTTPException(404, "Клан не найден")
    if clan.leader_id != user.id:
        raise HTTPException(403, "Только лидер может менять инвайт-ссылку")

    clan.invite_code = uuid.uuid4().hex[:12]
    db.commit()
    return {"invite_code": clan.invite_code}


@router.get("/{clan_id}")
def get_clan(clan_id: int, db: Session = Depends(get_db)):
    """Публичная инфа о клане"""
    clan = db.query(Clan).filter(Clan.id == clan_id).first()
    if not clan:
        raise HTTPException(404, "Клан не найден")

    territory = db.query(Pixel).filter(Pixel.clan_id == clan.id).count()
    leader = db.query(User).filter(User.id == clan.leader_id).first()

    return {
        "clan": ClanOut.model_validate(clan).model_dump(),
        "leader_username": leader.username if leader else None,
        "territory_pixels": territory,
    }


@router.post("/{clan_id}/join")
def join_clan(clan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Вступить в открытый клан"""
    if user.clan_id:
        # Проверка — прошло ли 7 дней с последней смены
        now = datetime.now(timezone.utc)
        if user.clan_join_available_at and user.clan_join_available_at > now:
            days_left = (user.clan_join_available_at - now).days + 1
            raise HTTPException(403, f"Сменить клан можно через {days_left} дней")

    clan = db.query(Clan).filter(Clan.id == clan_id).first()
    if not clan:
        raise HTTPException(404, "Клан не найден")

    if not clan.is_open:
        # Проверка приглашения
        invite = db.query(ClanInvite).filter(
            ClanInvite.clan_id == clan_id,
            ClanInvite.to_user_id == user.id,
            ClanInvite.status == "pending",
        ).first()
        if not invite:
            raise HTTPException(403, "Клан закрытый. Нужно приглашение")
        invite.status = "accepted"

    if clan.members_count >= clan.max_members:
        raise HTTPException(400, "Клан переполнен")

    # Выйти из старого клана
    if user.clan_id:
        old_clan = db.query(Clan).filter(Clan.id == user.clan_id).first()
        if old_clan:
            old_clan.members_count = max(0, (old_clan.members_count or 1) - 1)
        db.query(ClanMember).filter(ClanMember.user_id == user.id).delete()

    # Вступить в новый
    member = ClanMember(clan_id=clan_id, user_id=user.id, role="member")
    db.add(member)
    clan.members_count = (clan.members_count or 0) + 1
    user.clan_id = clan_id
    user.clan_role = "member"
    user.clan_join_available_at = datetime.now(timezone.utc) + timedelta(days=CLAN_SWITCH_DAYS)

    db.commit()
    return {"status": "ok"}


@router.post("/leave")
def leave_clan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Покинуть клан"""
    if not user.clan_id:
        raise HTTPException(400, "Вы не состоите в клане")

    clan = db.query(Clan).filter(Clan.id == user.clan_id).first()
    if not clan:
        user.clan_id = None
        user.clan_role = None
        db.commit()
        return {"status": "ok"}

    # Лидер не может просто выйти
    if clan.leader_id == user.id:
        other_members = db.query(ClanMember).filter(
            ClanMember.clan_id == clan.id,
            ClanMember.user_id != user.id,
        ).count()
        if other_members > 0:
            raise HTTPException(400, "Лидер не может покинуть клан. Передайте лидерство или распустите клан")
        # Распустить клан если один
        db.query(ClanMember).filter(ClanMember.clan_id == clan.id).delete()
        db.delete(clan)
    else:
        db.query(ClanMember).filter(ClanMember.user_id == user.id).delete()
        clan.members_count = max(0, (clan.members_count or 1) - 1)

    user.clan_id = None
    user.clan_role = None
    user.clan_join_available_at = datetime.now(timezone.utc) + timedelta(days=CLAN_SWITCH_DAYS)
    db.commit()
    return {"status": "ok"}


@router.patch("/{clan_id}")
def update_clan(clan_id: int, data: ClanUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Обновить настройки клана (только лидер)"""
    clan = db.query(Clan).filter(Clan.id == clan_id).first()
    if not clan:
        raise HTTPException(404, "Клан не найден")
    if clan.leader_id != user.id:
        raise HTTPException(403, "Только лидер может менять настройки")

    if data.description is not None:
        clan.description = data.description
    if data.color is not None:
        clan.color = data.color
    if data.emoji is not None:
        clan.emoji = data.emoji
    if data.emblem_code is not None:
        clan.emblem_code = data.emblem_code
    if data.is_open is not None:
        clan.is_open = data.is_open
    if data.max_members is not None:
        if data.max_members < clan.members_count:
            raise HTTPException(400, "Максимум не может быть меньше текущего числа участников")
        clan.max_members = data.max_members

    db.commit()
    db.refresh(clan)
    return ClanOut.model_validate(clan)


@router.post("/{clan_id}/invite")
def invite_user(clan_id: int, username: str = Query(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Пригласить пользователя в клан (любой член клана)"""
    if user.clan_id != clan_id:
        raise HTTPException(403, "Только члены клана могут приглашать")

    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(404, "Пользователь не найден")
    if target.clan_id == clan_id:
        raise HTTPException(400, "Уже в клане")

    clan = db.query(Clan).filter(Clan.id == clan_id).first()
    if clan.members_count >= clan.max_members:
        raise HTTPException(400, "Клан переполнен")

    existing = db.query(ClanInvite).filter(
        ClanInvite.clan_id == clan_id,
        ClanInvite.to_user_id == target.id,
        ClanInvite.status == "pending",
    ).first()
    if existing:
        raise HTTPException(400, "Приглашение уже отправлено")

    invite = ClanInvite(clan_id=clan_id, from_user_id=user.id, to_user_id=target.id)
    db.add(invite)
    db.commit()
    return {"status": "ok"}


@router.get("/invites/my")
def my_invites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Мои приглашения в кланы"""
    invites = db.query(ClanInvite, Clan, User).join(
        Clan, Clan.id == ClanInvite.clan_id
    ).join(
        User, User.id == ClanInvite.from_user_id
    ).filter(
        ClanInvite.to_user_id == user.id,
        ClanInvite.status == "pending",
    ).all()

    return [
        {
            "invite_id": i.ClanInvite.id,
            "clan_id": i.Clan.id,
            "clan_name": i.Clan.name,
            "clan_tag": i.Clan.tag,
            "clan_emoji": i.Clan.emoji,
            "clan_emblem_code": i.Clan.emblem_code or "shield",
            "clan_color": i.Clan.color,
            "from_username": i.User.username,
            "created_at": i.ClanInvite.created_at.isoformat() if i.ClanInvite.created_at else None,
        }
        for i in invites
    ]


@router.post("/invites/{invite_id}/accept")
def accept_invite(invite_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    invite = db.query(ClanInvite).filter(
        ClanInvite.id == invite_id,
        ClanInvite.to_user_id == user.id,
        ClanInvite.status == "pending",
    ).first()
    if not invite:
        raise HTTPException(404, "Приглашение не найдено")

    # Проверка 7 дней
    now = datetime.now(timezone.utc)
    if user.clan_id and user.clan_join_available_at and user.clan_join_available_at > now:
        days_left = (user.clan_join_available_at - now).days + 1
        raise HTTPException(403, f"Сменить клан можно через {days_left} дней")

    clan = db.query(Clan).filter(Clan.id == invite.clan_id).first()
    if not clan:
        raise HTTPException(404, "Клан не найден")
    if clan.members_count >= clan.max_members:
        raise HTTPException(400, "Клан переполнен")

    # Выйти из старого клана
    if user.clan_id:
        old_clan = db.query(Clan).filter(Clan.id == user.clan_id).first()
        if old_clan:
            old_clan.members_count = max(0, (old_clan.members_count or 1) - 1)
        db.query(ClanMember).filter(ClanMember.user_id == user.id).delete()

    member = ClanMember(clan_id=clan.id, user_id=user.id, role="member")
    db.add(member)
    clan.members_count = (clan.members_count or 0) + 1
    user.clan_id = clan.id
    user.clan_role = "member"
    user.clan_join_available_at = now + timedelta(days=CLAN_SWITCH_DAYS)
    invite.status = "accepted"

    db.commit()
    return {"status": "ok"}


@router.post("/invites/{invite_id}/reject")
def reject_invite(invite_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    invite = db.query(ClanInvite).filter(
        ClanInvite.id == invite_id,
        ClanInvite.to_user_id == user.id,
    ).first()
    if not invite:
        raise HTTPException(404)
    invite.status = "rejected"
    db.commit()
    return {"status": "ok"}


@router.post("/{clan_id}/kick")
def kick_member(clan_id: int, target_user_id: int = Query(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Выгнать из клана (только лидер)"""
    clan = db.query(Clan).filter(Clan.id == clan_id).first()
    if not clan or clan.leader_id != user.id:
        raise HTTPException(403, "Только лидер может исключать")
    if target_user_id == user.id:
        raise HTTPException(400, "Нельзя выгнать себя")

    target = db.query(User).filter(User.id == target_user_id).first()
    if not target or target.clan_id != clan_id:
        raise HTTPException(404)

    db.query(ClanMember).filter(ClanMember.user_id == target_user_id).delete()
    clan.members_count = max(0, (clan.members_count or 1) - 1)
    target.clan_id = None
    target.clan_role = None
    db.commit()
    return {"status": "ok"}


@router.get("/leaderboard/territory")
def clan_leaderboard(limit: int = Query(30, le=100), db: Session = Depends(get_db)):
    """Рейтинг кланов по текущей территории"""
    # Считаем текущие пиксели для каждого клана
    stats = db.query(
        Pixel.clan_id,
        func.count(Pixel.id).label("territory")
    ).filter(Pixel.clan_id.isnot(None)).group_by(Pixel.clan_id).order_by(desc("territory")).limit(limit).all()

    result = []
    for rank, (clan_id, territory) in enumerate(stats, 1):
        clan = db.query(Clan).filter(Clan.id == clan_id).first()
        if clan:
            result.append({
                "rank": rank,
                "clan_id": clan.id,
                "name": clan.name,
                "tag": clan.tag,
                "emoji": clan.emoji,
                "emblem_code": clan.emblem_code or "shield",
                "color": clan.color,
                "members_count": clan.members_count,
                "territory_pixels": territory,
            })
    return {"clans": result}


# ============ DONATIONS for clan creation ============

@router.post("/donate/checkout")
def donate_checkout(
    provider: str = Query("robokassa", enum=["stripe", "yukassa", "robokassa"]),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Донат для разблокировки создания клана"""
    if user.clan_id:
        raise HTTPException(400, "Вы уже в клане")

    if provider == "stripe":
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": CLAN_CREATE_DONATION_USD,
                    "product_data": {
                        "name": "PixelStake — разблокировка создания клана",
                        "description": "Разовый донат для создания клана без требования 10к пикселей",
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{settings.FRONTEND_URL}/clans/create?paid=1",
            cancel_url=f"{settings.FRONTEND_URL}/clans",
            metadata={"user_id": str(user.id), "type": "clan_donation"},
        )
        donation = ClanDonation(
            user_id=user.id,
            amount=CLAN_CREATE_DONATION_USD,
            currency="usd",
            provider="stripe",
            provider_session_id=session.id,
            status="pending",
        )
        db.add(donation)
        db.commit()
        return {"checkout_url": session.url}

    elif provider == "yukassa":
        amount_value = f"{CLAN_CREATE_DONATION_RUB / 100:.2f}"
        idempotency_key = str(uuid.uuid4())
        payment_data = {
            "amount": {"value": amount_value, "currency": "RUB"},
            "confirmation": {
                "type": "redirect",
                "return_url": f"{settings.FRONTEND_URL}/clans/create?paid=1"
            },
            "capture": True,
            "description": "PixelStake — разблокировка создания клана",
            "metadata": {"user_id": str(user.id), "type": "clan_donation"},
        }
        with httpx.Client() as client:
            resp = client.post(
                "https://api.yookassa.ru/v3/payments",
                json=payment_data,
                auth=(settings.YUKASSA_SHOP_ID, settings.YUKASSA_SECRET_KEY),
                headers={"Idempotence-Key": idempotency_key, "Content-Type": "application/json"},
            )
        if resp.status_code not in (200, 201):
            raise HTTPException(500, f"YooKassa error: {resp.text}")
        payment = resp.json()
        donation = ClanDonation(
            user_id=user.id,
            amount=CLAN_CREATE_DONATION_RUB,
            currency="RUB",
            provider="yukassa",
            provider_session_id=payment["id"],
            status="pending",
        )
        db.add(donation)
        db.commit()
        return {"checkout_url": payment["confirmation"]["confirmation_url"]}

    elif provider == "robokassa":
        donation = ClanDonation(
            user_id=user.id,
            amount=CLAN_CREATE_DONATION_RUB,
            currency="RUB",
            provider="robokassa",
            provider_session_id="",
            status="pending",
        )
        db.add(donation)
        db.flush()
        donation.provider_session_id = str(donation.id)
        db.commit()

        # URL на наш endpoint, который отдаст HTML-форму с POST
        checkout_url = f"{settings.BACKEND_URL}/api/subscribe/robokassa/form/clan_donation/{donation.id}"
        return {"checkout_url": checkout_url}
