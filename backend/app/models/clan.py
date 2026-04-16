from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, func
from app.core.database import Base


class Clan(Base):
    __tablename__ = "clans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(30), unique=True, nullable=False, index=True)
    tag = Column(String(5), unique=True, nullable=False, index=True)  # короткий тег, например [RED]
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=False, default="#f97316")  # цвет клана
    emoji = Column(String(10), nullable=True)

    leader_id = Column(Integer, nullable=False, index=True)
    is_open = Column(Boolean, default=True)  # открытый или закрытый (по приглашениям)
    max_members = Column(Integer, default=50)
    members_count = Column(Integer, default=1)

    # Инвайт-ссылка
    invite_code = Column(String(20), unique=True, nullable=True, index=True)

    # Статистика
    total_pixels_placed = Column(Integer, default=0)  # все пиксели за всё время
    battles_won = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ClanMember(Base):
    __tablename__ = "clan_members"
    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True, unique=True)  # пользователь может быть только в одном клане
    role = Column(String(20), default="member")  # leader, officer, member
    pixels_placed_in_clan = Column(Integer, default=0)  # пикселей поставлено в этом клане
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    can_change_at = Column(DateTime(timezone=True), nullable=True)  # когда можно сменить клан (через 7 дней)


class ClanInvite(Base):
    __tablename__ = "clan_invites"
    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, nullable=False, index=True)
    from_user_id = Column(Integer, nullable=False)
    to_user_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), default="pending")  # pending, accepted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ClanBattle(Base):
    """Результаты кланового батла за период"""
    __tablename__ = "clan_battles"
    id = Column(Integer, primary_key=True, index=True)
    battle_id = Column(Integer, nullable=False, index=True)  # связь с Battle
    clan_id = Column(Integer, nullable=False, index=True)
    territory_pixels = Column(Integer, default=0)  # пикселей клана в конце батла
    total_pixels_placed = Column(Integer, default=0)  # всего поставлено за батл
    members_count = Column(Integer, default=0)
    rank = Column(Integer, nullable=True)  # место в батле
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ClanDonation(Base):
    """Донаты для создания клана"""
    __tablename__ = "clan_donations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # в копейках/центах
    currency = Column(String(3), nullable=False)
    provider = Column(String(50), nullable=False)
    provider_session_id = Column(String(255), nullable=True)
    status = Column(String(20), default="pending")  # pending, paid
    used = Column(Boolean, default=False)  # использован для создания клана?
    clan_id = Column(Integer, nullable=True)  # какой клан создан
    created_at = Column(DateTime(timezone=True), server_default=func.now())
