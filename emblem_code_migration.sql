-- Добавить поле emblem_code в кланы
ALTER TABLE clans ADD COLUMN IF NOT EXISTS emblem_code VARCHAR(30) DEFAULT 'shield';

-- Заполнить существующие кланы shield если NULL
UPDATE clans SET emblem_code = 'shield' WHERE emblem_code IS NULL;

SELECT 'emblem_code добавлен' AS status;
