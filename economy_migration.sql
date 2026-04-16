-- ============================================
-- МИГРАЦИЯ: добавление экономики (PixelCoin, достижения, магазин)
-- Безопасно для существующих данных
-- ============================================

-- 1. Балансы PixelCoin
CREATE TABLE IF NOT EXISTS coin_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    balance BIGINT DEFAULT 0,
    total_earned BIGINT DEFAULT 0,
    total_spent BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_coin_balances_user_id ON coin_balances(user_id);

-- 2. История транзакций
CREATE TABLE IF NOT EXISTS coin_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL,
    meta TEXT,
    balance_after BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_coin_tx_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS ix_coin_tx_reason ON coin_transactions(reason);
CREATE INDEX IF NOT EXISTS ix_coin_tx_created_at ON coin_transactions(created_at);

-- 3. Достижения
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    emoji VARCHAR(10),
    category VARCHAR(30) NOT NULL,
    coin_reward INTEGER DEFAULT 0,
    requirement_type VARCHAR(30) NOT NULL,
    requirement_value INTEGER NOT NULL,
    order_index INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_achievements_code ON achievements(code);

-- 4. Полученные пользователями достижения
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_user_ach_user_id ON user_achievements(user_id);

-- 5. Товары магазина
CREATE TABLE IF NOT EXISTS shop_items (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_coins INTEGER NOT NULL,
    data TEXT,
    is_unique BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    emoji VARCHAR(10),
    order_index INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_shop_items_code ON shop_items(code);
CREATE INDEX IF NOT EXISTS ix_shop_items_category ON shop_items(category);

-- 6. Покупки пользователей
CREATE TABLE IF NOT EXISTS user_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES shop_items(id),
    price_paid INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_user_purchases_user_id ON user_purchases(user_id);

-- 7. Разблокированные палитры
CREATE TABLE IF NOT EXISTS user_palettes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    palette_code VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_user_palettes_user_id ON user_palettes(user_id);

-- 8. Обмены PixelCoin на Pro (анти-абьюз)
CREATE TABLE IF NOT EXISTS pro_redemptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    coins_spent INTEGER NOT NULL,
    activates_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_days INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_pro_redemptions_user_id ON pro_redemptions(user_id);

-- Готово
SELECT 'Экономика развёрнута успешно' AS status;
