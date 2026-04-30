-- Migration 001: data cleanup + security hardening
--
-- Run via Neon SQL Editor. Wraps everything in a transaction —
-- if anything fails, nothing changes.

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 1: Cleanup duplicate pixels
-- We have 138k rows but only ~22k unique (x,y). Keep latest per coordinate.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE pixels_to_keep AS
SELECT MAX(id) AS keeper_id
FROM pixels
GROUP BY x, y;

CREATE INDEX idx_temp_keepers ON pixels_to_keep(keeper_id);

-- Sanity check before destructive op
DO $$
DECLARE
  total_count BIGINT;
  keeper_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM pixels;
  SELECT COUNT(*) INTO keeper_count FROM pixels_to_keep;
  RAISE NOTICE 'Total pixels: %, unique (x,y): %', total_count, keeper_count;
  IF keeper_count > total_count THEN
    RAISE EXCEPTION 'Sanity check failed';
  END IF;
END $$;

-- Delete duplicates
DELETE FROM pixels
WHERE id NOT IN (SELECT keeper_id FROM pixels_to_keep);

-- ---------------------------------------------------------------------------
-- Step 2: Add useful indexes for queries the new code makes
-- ---------------------------------------------------------------------------

-- Already has ix_pixels_xy (UNIQUE on x,y) — good.
-- Already has ix_pixels_user_id, ix_pixels_clan_id, ix_pixels_id — good.

-- Add composite index for battle-zone scans
CREATE INDEX IF NOT EXISTS ix_pixels_user_placed
  ON pixels (user_id, placed_at DESC)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 3: VACUUM + ANALYZE to refresh planner statistics
-- ---------------------------------------------------------------------------
-- Postpone until COMMIT — VACUUM cannot run inside a transaction.

-- ---------------------------------------------------------------------------
-- Step 4: Add deleted_at to users for soft-delete
-- ---------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ix_users_deleted_at
  ON users (deleted_at)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Step 5: Add idempotency to webhook_events if missing
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS ix_webhook_provider_external
  ON webhook_events (provider, external_id);

CREATE INDEX IF NOT EXISTS ix_webhook_unprocessed
  ON webhook_events (processed, next_retry_at);

-- ---------------------------------------------------------------------------
-- Step 5b: Battles table (replaces env-only phase logic)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE battle_type_enum AS ENUM ('solo', 'clan', 'tournament');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE battle_status_enum AS ENUM ('scheduled', 'active', 'finished', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS battles (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  type battle_type_enum NOT NULL,
  status battle_status_enum NOT NULL DEFAULT 'scheduled',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  prize_pool INTEGER DEFAULT 0,
  title VARCHAR(120) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_battles_status_dates
  ON battles (status, start_at, end_at);

CREATE INDEX IF NOT EXISTS ix_battles_year_month
  ON battles (year, month);

-- ---------------------------------------------------------------------------
-- Step 5c: Push subscriptions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(512) UNIQUE NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_push_user_id ON push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Step 5d: Update canvas_snapshots schema for binary format
-- ---------------------------------------------------------------------------

-- Old schema had data_json TEXT. New has data_blob BYTEA + storage_url.
-- Add new columns; old data_json can stay during transition (deprecated).
ALTER TABLE canvas_snapshots
  ADD COLUMN IF NOT EXISTS data_blob BYTEA,
  ADD COLUMN IF NOT EXISTS storage_url VARCHAR(512);

-- ---------------------------------------------------------------------------
-- Step 6: 2FA secret column for admin accounts
-- ---------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;

-- ---------------------------------------------------------------------------
-- Run after COMMIT — outside transaction
-- ---------------------------------------------------------------------------

VACUUM ANALYZE pixels;
VACUUM ANALYZE users;

-- Verify cleanup
SELECT
  COUNT(*) AS total_pixels,
  COUNT(DISTINCT (x, y)) AS unique_positions
FROM pixels;
