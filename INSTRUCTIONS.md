# PixelStake Audit Fix — простая инструкция

**Проблема предыдущей попытки:** ты застрял в git rebase из-за конфликта в `canvas_cache.py`.

**Новый подход:** делаем всё **через отдельную ветку** + GitHub Web UI. Никаких vim, rebase, conflicts.

---

## ШАГ 1 — выйти из vim (если ты ещё там)

Нажимай по очереди:

1. **`Esc`**
2. Напечатай **`:q!`** (двоеточие, q, восклицательный знак — без пробелов)
3. **`Enter`**

Это выйдет из vim **без сохранения**.

---

## ШАГ 2 — отменить незавершённый rebase

```bash
git rebase --abort
```

Не выдаст ничего — это нормально. Просто очистит состояние.

Проверка что всё чисто:

```bash
git status
```

Должно показать `On branch main` или подобное.

---

## ШАГ 3 — синхронизироваться с GitHub

```bash
git fetch origin
git checkout main
git reset --hard origin/main
```

⚠️ **`git reset --hard`** удалит все твои незакоммиченные изменения. Но они уже в распакованном архиве — повторно распакуем после.

---

## ШАГ 4 — повторно распаковать фикс

В папке `~/Downloads/` или где архив лежит:

```bash
cd ~/Downloads/pixelcanvas
tar xzf ~/Downloads/pixelstake-full-fix.tar.gz
```

(подставь свой путь к архиву если он не в Downloads)

Проверь:

```bash
ls backend/app/services/canvas_cache.py
```

Должен показать что файл существует.

---

## ШАГ 5 — создать НОВУЮ ветку и закоммитить туда

**Не пушим в main.** Делаем отдельную ветку:

```bash
git checkout -b audit-fix
git add .
git commit -m "feat: full audit fix"
git push -u origin audit-fix
```

Это создаст ветку `audit-fix` на GitHub. **main останется чистым** — ничего не сломается.

---

## ШАГ 6 — слить через GitHub Web UI

Это самая простая часть.

1. Открой в браузере:
   ```
   https://github.com/sergeypronkin123-design/pixelcanvas/compare/main...audit-fix
   ```

2. Нажми зелёную кнопку **"Create pull request"**

3. На странице PR — нажми **"Merge pull request"** (или "Squash and merge")

4. Подтверди — **"Confirm merge"**

GitHub сам сольёт без конфликтов (или покажет какие файлы конфликтуют — намного нагляднее чем в терминале).

---

## ШАГ 7 — деплой

После merge на main:

- **Render** автоматически передеплоит backend (~2 минуты)
- **Vercel** автоматически передеплоит frontend (~1 минута)

Подожди 3 минуты, потом:

```bash
git checkout main
git pull
chmod +x scripts/verify_deploy.sh
./scripts/verify_deploy.sh
```

---

## ШАГ 8 — запустить миграцию в Neon

Это **отдельно от git**.

1. Открой Neon Console → SQL Editor
2. Скопируй **весь файл** `backend/migrations/001_cleanup_and_harden.sql`
3. Вставь в SQL Editor → нажми Run

После выполнения проверь:
```sql
SELECT COUNT(*) FROM pixels;
-- Должно стать ~22 000 (было 138 880)

SELECT COUNT(*) FROM battles, webhook_events, push_subscriptions;
-- Все 3 таблицы должны существовать (без ошибок)
```

Если в конце будет ошибка `VACUUM cannot run inside transaction` — выполни отдельно:
```sql
VACUUM ANALYZE pixels;
VACUUM ANALYZE users;
```

---

## ШАГ 9 — проверить Pikachu

В Console браузера:

```js
fetch('https://pixelcanvas-api.onrender.com/api/pixels/canvas?x_min=0&y_min=800&x_max=210&y_max=999')
  .then(r => r.json())
  .then(d => {
    const mine = (d.pixels||d).filter(p => p.user_id === 1).length;
    console.log('Pikachu visible:', mine);
  });
```

Должно показать **~16273**.

---

## ⚠️ ВАЖНО — патч main.py

В архиве **нет файла `backend/app/main.py`** — специально, чтобы не сломать твой существующий.

Открой `backend/app/MAIN_PY_PATCH.md` — там 6 коротких блоков что добавить в твой main.py.

**Минимум для работы Pikachu:**

В функции startup (или lifespan) backend должен вызывать:

```python
from app.services.canvas_cache import canvas_cache
from app.core.database import SessionLocal

db = SessionLocal()
try:
    canvas_cache.load_from_db(db)
finally:
    db.close()
```

Скорее всего у тебя это уже есть — просто проверь.

---

## ❌ Если что-то сломалось

### "fatal: refusing to merge unrelated histories"

```bash
git pull origin main --allow-unrelated-histories
```

### "Permission denied (publickey)"

GitHub credentials не настроены. Через браузер всё равно сработает (см. ШАГ 6).

### "Cannot find module 'app.api.auth'"

Проверь что у тебя есть файл `backend/app/api/auth.py` (он должен быть, мы его не трогаем). Если функция называется не `get_current_user`, а как-то иначе — пришли мне строку из этого файла и я подскажу что заменить.

### Pikachu всё равно не появляется после деплоя

```bash
./scripts/verify_deploy.sh
```

Если пиксели в БД есть (>16000) но через API не возвращаются — проверь Render Logs:

```
Render Dashboard → pixelcanvas-api → Logs
```

Должна быть строка:
```
INFO:app.services.canvas_cache:Canvas loaded: N pixels
```

- Если N >= 22000 — frontend проблема
- Если N меньше или нет такой строки — `load_from_db` не вызывается, проверь main.py startup

Пришли мне эту строчку из логов — разберусь.

---

## Внешние сервисы (на неделе, ~2 часа)

После того как код в проде, настрой:

| Сервис | Зачем | Время | Цена |
|---|---|---|---|
| Sentry | Error tracking | 15 мин | Free |
| Upstash Redis | Rate limit + cache | 10 мин | Free |
| UptimeRobot | Alerts + Render не засыпает | 5 мин | Free |
| SendGrid | Email digest | 20 мин | Free 100/день |
| Backblaze B2 | DB backups | 30 мин | ~$1/год |

Для каждого: создаёшь аккаунт → копируешь API key → добавляешь в Render Environment Variables.

Если хочешь конкретные шаги по одному из сервисов — скажи какой, дам пошагово.

---

## Краткая последовательность команд (копируй сразу)

```bash
# 1. Выход из vim (если в нём)
# Нажми Esc, потом :q! и Enter

# 2. Отмена rebase + reset
git rebase --abort
git fetch origin
git checkout main
git reset --hard origin/main

# 3. Распаковка архива (твой путь к архиву)
tar xzf ~/Downloads/pixelstake-full-fix.tar.gz

# 4. Создание ветки и push
git checkout -b audit-fix
git add .
git commit -m "feat: full audit fix"
git push -u origin audit-fix
```

После этого открой в браузере:
```
https://github.com/sergeypronkin123-design/pixelcanvas/compare/main...audit-fix
```

И сделай "Create PR" → "Merge".

---

**Если что-то непонятно — спрашивай. Чем точнее ошибка которую видишь, тем быстрее починим.**
