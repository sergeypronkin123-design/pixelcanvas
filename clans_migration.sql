-- ============================================
-- МИГРАЦИЯ: добавление системы кланов
-- Безопасно для существующих данных
-- ============================================

-- 1. Добавляем поля кланов в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS clan_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clan_role VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS clan_join_available_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS ix_users_clan_id ON users(clan_id);

-- 2. Добавляем clan_id в pixels
ALTER TABLE pixels ADD COLUMN IF NOT EXISTS clan_id INTEGER;
CREATE INDEX IF NOT EXISTS ix_pixels_clan_id ON pixels(clan_id);

-- 3. Создаём таблицу кланов
CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL,
    tag VARCHAR(5) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#f97316',
    emoji VARCHAR(10),
    leader_id INTEGER NOT NULL,
    is_open BOOLEAN DEFAULT TRUE,
    max_members INTEGER DEFAULT 50,
    members_count INTEGER DEFAULT 1,
    total_pixels_placed INTEGER DEFAULT 0,
    battles_won INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_clans_name ON clans(name);
CREATE INDEX IF NOT EXISTS ix_clans_tag ON clans(tag);
CREATE INDEX IF NOT EXISTS ix_clans_leader_id ON clans(leader_id);

-- 4. Таблица участников клана
CREATE TABLE IF NOT EXISTS clan_members (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL REFERENCES clans(id),
    user_id INTEGER NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'member',
    pixels_placed_in_clan INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    can_change_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_clan_members_clan_id ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS ix_clan_members_user_id ON clan_members(user_id);

-- 5. Приглашения
CREATE TABLE IF NOT EXISTS clan_invites (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_clan_invites_clan_id ON clan_invites(clan_id);
CREATE INDEX IF NOT EXISTS ix_clan_invites_to_user_id ON clan_invites(to_user_id);

-- 6. Статистика кланов в батлах
CREATE TABLE IF NOT EXISTS clan_battles (
    id SERIAL PRIMARY KEY,
    battle_id INTEGER NOT NULL,
    clan_id INTEGER NOT NULL,
    territory_pixels INTEGER DEFAULT 0,
    total_pixels_placed INTEGER DEFAULT 0,
    members_count INTEGER DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_clan_battles_battle_id ON clan_battles(battle_id);
CREATE INDEX IF NOT EXISTS ix_clan_battles_clan_id ON clan_battles(clan_id);

-- 7. Донаты для создания клана
CREATE TABLE IF NOT EXISTS clan_donations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_session_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    used BOOLEAN DEFAULT FALSE,
    clan_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_clan_donations_user_id ON clan_donations(user_id);

-- Готово! Проверка
SELECT 'Миграция выполнена успешно' as status;
