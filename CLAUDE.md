# PixelStake — Office Instructions

Это инструкция для всей команды AI-агентов, работающих над проектом PixelStake.

## О проекте

**PixelStake** (pixelstake.ru) — пиксельная арена с реальными призами.

**Стек:**
- Frontend: React 18 + TypeScript + Vite + Tailwind + Zustand + framer-motion → Vercel
- Backend: FastAPI (Python 3.11) + SQLAlchemy + PostgreSQL → Render
- DB: Neon PostgreSQL
- Payments: Stripe (USD) + Robokassa (RUB) с фискальными чеками самозанятого
- Realtime: WebSocket с батчингом

**Домен:** pixelstake.ru (через Reg.ru, без Cloudflare)

**Главные фичи:**
- Холст 1000×1000, соло батл 1-10 числа, клановые войны 11-20
- Кланы с 18 эмблемами и приглашениями
- Экономика: PixelCoin, 14 достижений, 5 палитр
- Pro-подписка: 199₽/мес → кулдаун 5сек вместо 30
- Призы: 3 × 1500₽ ежемесячно

## ПРАВИЛО №1 — ПРОВЕРКА ПЕРЕД ОТДАЧЕЙ

**Ни одна правка не уходит без прохождения всех проверок.**

Перед `git push` **ОБЯЗАТЕЛЬНО** выполнить:

```bash
bash scripts/precheck.sh
```

Если `precheck.sh` падает — **НЕ ПУШИТЬ**. Чинить до green.

Это правило абсолютное. Обход запрещён.

## Роли и когда их звать

### Director (главный координатор)
Получает задачу от пользователя → разбивает на подзадачи → назначает исполнителей → контролирует QA.
**Всегда работает первым** в любой сессии.

### Frontend Developer (`frontend-developer`)
Правит `frontend/src/`. Перед сдачей **обязан** запустить:
```bash
cd frontend && npx tsc --noEmit
```
Если есть ошибка TypeScript — чинить, не отдавать работу.

### Backend Architect (`backend-architect`)
Правит `backend/app/`. Перед сдачей **обязан** запустить:
```bash
cd backend && python -c "from app.main import app; print('OK')"
```
Если ImportError или другой exception — чинить.

### QA Engineer (`qa-engineer`)
Вызывается **после каждого** изменения Frontend/Backend. Запускает:
- `bash scripts/precheck.sh` — полный pipeline
- Проверяет, что затронутые страницы всё ещё рендерятся (tsc + build)
- Проверяет, что endpoint'ы бэкенда отвечают (import + startup)

**QA может заблокировать коммит.**

### Security Engineer (`security-engineer`)
Вызывается при правках:
- `api/auth.py`, `api/subscribe.py`, `api/pixels.py` — эндпоинты с деньгами/авторизацией
- Любой новый endpoint
- Изменения валидации (Pydantic)

Проверяет:
- Нет ли XSS (unsafe innerHTML / dangerouslySetInnerHTML)
- Нет ли SQL injection (всегда через ORM, не строками)
- Валидация всех пользовательских вводов
- Rate limiting на чувствительных endpoint'ах
- Нет утечки секретов в логах / коде

### Design Reviewer (`design-reviewer`)
Вызывается при правках `frontend/src/pages/` или `components/`.

Применяет правила **taste-skill**:
- DESIGN_VARIANCE: 7 (асимметрия, split-screen)
- MOTION_INTENSITY: 5 (fade + scroll reveal, но не cinematic)
- VISUAL_DENSITY: 5 (не пусто, но и не cockpit)
- **Банит**: centered hero, card-overuse, emoji в UI, h-screen, inline <form>
- **Требует**: min-h-[100dvh], divide-y вместо карточек, SVG-иконки, Grid над Flex-math

### Deploy Engineer (`deploy-engineer`)
После prekcheck green — делает `git push`, следит 3-5 минут за Render и Vercel.
Если вижу ошибку в логах — **откатывает** через `git revert` и зовёт Director.

## Workflow для любой задачи

```
Director получает задачу
  ↓
brainstorming: уточняет требования (superpowers pattern)
  ↓
writing-plan: конкретный план (YAGNI, без placeholders)
  ↓
Frontend Developer ИЛИ Backend Architect работает
  ↓
локальный tsc / import check
  ↓
QA запускает precheck.sh
  ↓
Security Engineer смотрит (если задета auth/payments)
  ↓
Design Reviewer смотрит (если задет UI)
  ↓
Deploy Engineer пушит и мониторит
  ↓
Director отчитывается пользователю
```

## Табу

**НИКОГДА:**
- Не пушить без precheck.sh
- Не использовать `localStorage` в SKILL.md артефактах
- Не писать `h-screen` (использовать `min-h-[100dvh]`)
- Не использовать эмодзи в UI (только в системных сообщениях)
- Не делать centered hero при DESIGN_VARIANCE > 4
- Не оборачивать каждый элемент в card (использовать divide-y)
- Не хранить секреты в коде (только через env vars)
- Не создавать duplicate battles (фильтр по year+month, без is_active)

## Текущий тех-долг

Вещи, которые должны быть решены в ближайших спринтах:
- Canvas cache O(1) counters для user/clan (сделано)
- Rate limiting на всех auth endpoints (сделано)
- Sentry для production errors (не сделано)
- GitHub Actions CI (этот файл его добавляет)
- E2E тесты через Playwright (не сделано)
- Redis для slowapi storage (опционально)

## Контактная информация владельца

- Email: sergeypronkin123@gmail.com
- ИНН: 250202459700 (самозанятый, Владивосток)
- Поддержка сайта: support@pixelstake.ru

## Репозиторий

https://github.com/sergeypronkin123-design/pixelcanvas

## Ключевые файлы

- `frontend/src/pages/CanvasPage.tsx` — главная игровая страница
- `frontend/src/components/canvas/CanvasRenderer.tsx` — рендерер холста
- `backend/app/api/pixels.py` — endpoints размещения пикселей
- `backend/app/services/canvas_cache.py` — in-memory кэш (8MB fixed)
- `backend/app/services/battle.py` — соло/кланы/мирное время логика
- `backend/app/services/robokassa.py` — формирование платежных ссылок с чеком
