from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, func, BigInteger
from app.core.database import Base


class CoinBalance(Base):
    """Баланс PixelCoin у каждого пользователя"""
    __tablename__ = "coin_balances"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    balance = Column(BigInteger, default=0)
    total_earned = Column(BigInteger, default=0)  # всего заработано за всё время
    total_spent = Column(BigInteger, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CoinTransaction(Base):
    """История транзакций PixelCoin — для анти-эксплойта и прозрачности"""
    __tablename__ = "coin_transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # положительное = начисление, отрицательное = трата
    reason = Column(String(50), nullable=False, index=True)  # pixel_placed, referral_signup, achievement, shop_purchase, etc
    meta = Column(Text, nullable=True)  # JSON с доп. информацией
    balance_after = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class Achievement(Base):
    """Список всех достижений в игре"""
    __tablename__ = "achievements"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)  # first_pixel, 100_pixels, etc
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    emoji = Column(String(10), nullable=True)
    category = Column(String(30), nullable=False)  # progression, social, battle, time
    coin_reward = Column(Integer, default=0)
    # Условие выполнения
    requirement_type = Column(String(30), nullable=False)  # pixels_total, friends_count, battle_wins, etc
    requirement_value = Column(Integer, nullable=False)
    order_index = Column(Integer, default=0)


class UserAchievement(Base):
    """Какие достижения получил каждый пользователь"""
    __tablename__ = "user_achievements"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())


class ShopItem(Base):
    """Товары в магазине"""
    __tablename__ = "shop_items"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)  # palette_neon, clan_create, pro_30days, etc
    category = Column(String(30), nullable=False, index=True)  # palette, cosmetic, feature, premium
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price_coins = Column(Integer, nullable=False)
    data = Column(Text, nullable=True)  # JSON: цвета палитры, длительность Pro, и т.д.
    is_unique = Column(Boolean, default=True)  # можно купить только один раз
    is_active = Column(Boolean, default=True)
    emoji = Column(String(10), nullable=True)
    order_index = Column(Integer, default=0)


class UserPurchase(Base):
    """История покупок в магазине"""
    __tablename__ = "user_purchases"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("shop_items.id"), nullable=False)
    price_paid = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserPalette(Base):
    """Какие палитры разблокированы у пользователя"""
    __tablename__ = "user_palettes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    palette_code = Column(String(50), nullable=False)  # standard, neon, pastel, metallic, gradient, secret
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())


class ProRedemption(Base):
    """Обмен PixelCoin на Pro-подписку (для анти-абьюза)"""
    __tablename__ = "pro_redemptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    coins_spent = Column(Integer, nullable=False)
    activates_at = Column(DateTime(timezone=True), nullable=False)  # когда активируется (со следующего месяца)
    duration_days = Column(Integer, default=30)
    status = Column(String(20), default="scheduled")  # scheduled, activated, expired
    created_at = Column(DateTime(timezone=True), server_default=func.now())
