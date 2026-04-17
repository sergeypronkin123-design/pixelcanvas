-- Миграция: daily rewards + onboarding + snapshots
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS canvas_snapshots (
    id SERIAL PRIMARY KEY,
    battle_year INTEGER NOT NULL,
    battle_month INTEGER NOT NULL,
    pixel_count INTEGER DEFAULT 0,
    data_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT 'mega update migration done' AS status;
