-- ============================================
-- МИГРАЦИЯ: добавление invite_code в кланы
-- Безопасно для существующих данных
-- ============================================

-- 1. Добавить колонку если её нет
ALTER TABLE clans ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20);

-- 2. Заполнить существующие кланы уникальными кодами (случайные 12 hex символов)
UPDATE clans 
SET invite_code = SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT), 1, 12)
WHERE invite_code IS NULL;

-- 3. Добавить уникальность и индекс
DO $$
BEGIN
    -- Уникальный индекс (если ещё нет)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'clans' AND indexname = 'ix_clans_invite_code'
    ) THEN
        CREATE UNIQUE INDEX ix_clans_invite_code ON clans(invite_code);
    END IF;
END $$;

SELECT 'Миграция invite_code выполнена' AS status;
