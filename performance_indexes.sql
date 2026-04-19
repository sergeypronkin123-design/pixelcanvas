-- Performance indexes (Week 1)
-- Эти индексы ускоряют горячие запросы в 10-100 раз

-- Лидерборд кланов: GROUP BY clan_id
CREATE INDEX IF NOT EXISTS ix_pixels_clan_id ON pixels(clan_id) WHERE clan_id IS NOT NULL;

-- Лидерборд пользователей: GROUP BY user_id
CREATE INDEX IF NOT EXISTS ix_pixels_user_id ON pixels(user_id);

-- Поиск батла по месяцу (композитный)
CREATE INDEX IF NOT EXISTS ix_battles_year_month ON battles(year, month);

-- Поиск участников батла
CREATE INDEX IF NOT EXISTS ix_battle_participants_battle_user ON battle_participants(battle_id, user_id);

-- Поиск BattleParticipant по user для leaderboard
CREATE INDEX IF NOT EXISTS ix_battle_participants_user ON battle_participants(user_id);

-- Pixels по позиции (для upsert)
CREATE INDEX IF NOT EXISTS ix_pixels_xy ON pixels(x, y);

-- Лидерборд all-time: ORDER BY pixels_placed_total DESC
CREATE INDEX IF NOT EXISTS ix_users_pixels_total ON users(pixels_placed_total DESC) WHERE pixels_placed_total > 0;

-- Рефералы: поиск приглашённых
CREATE INDEX IF NOT EXISTS ix_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- Clan members
CREATE INDEX IF NOT EXISTS ix_users_clan_id ON users(clan_id) WHERE clan_id IS NOT NULL;

-- Subscriptions lookup
CREATE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS ix_subscriptions_status ON subscriptions(status);

-- Achievements lookup
CREATE INDEX IF NOT EXISTS ix_user_achievements_user ON user_achievements(user_id);

-- Coin transactions (для аудита)
CREATE INDEX IF NOT EXISTS ix_coin_transactions_user ON coin_transactions(user_id, created_at DESC);

-- Canvas snapshots lookup по месяцу
CREATE INDEX IF NOT EXISTS ix_canvas_snapshots_ym ON canvas_snapshots(battle_year, battle_month, created_at);

SELECT 'Performance indexes created' AS status;
