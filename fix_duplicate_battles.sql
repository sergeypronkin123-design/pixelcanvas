-- Исправление дубликатов батлов
-- Объединяем участников из дублей в один батл на месяц

-- 1. Найти дубли (оставить батл с минимальным id)
WITH keep AS (
    SELECT MIN(id) AS keep_id, year, month
    FROM battles
    GROUP BY year, month
),
duplicates AS (
    SELECT b.id AS dup_id, k.keep_id
    FROM battles b
    JOIN keep k ON b.year = k.year AND b.month = k.month AND b.id != k.keep_id
)
-- 2. Перенести участников из дублей в основной батл
UPDATE battle_participants bp
SET battle_id = d.keep_id
FROM duplicates d
WHERE bp.battle_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM battle_participants bp2
    WHERE bp2.battle_id = d.keep_id AND bp2.user_id = bp.user_id
  );

-- 3. Удалить осиротевших участников дублей (если user уже был в основном)
WITH keep AS (
    SELECT MIN(id) AS keep_id, year, month FROM battles GROUP BY year, month
),
duplicates AS (
    SELECT b.id AS dup_id FROM battles b
    JOIN keep k ON b.year = k.year AND b.month = k.month AND b.id != k.keep_id
)
DELETE FROM battle_participants WHERE battle_id IN (SELECT dup_id FROM duplicates);

-- 4. Удалить дубликаты батлов
WITH keep AS (
    SELECT MIN(id) AS keep_id, year, month FROM battles GROUP BY year, month
)
DELETE FROM battles WHERE id NOT IN (SELECT keep_id FROM keep);

SELECT 'Duplicate battles cleaned' AS status;
