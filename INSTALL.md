# Установка офиса PixelStake

Это пакет агентов для Claude Code. После установки у вас появится команда из 6 специалистов, которые вместе делают так, чтобы в продакшен шёл только рабочий код.

---

## Что будет работать

**Director** — принимает задачу, планирует, делегирует
**Frontend Developer** — React/TypeScript
**Backend Architect** — FastAPI/Python
**QA Engineer** — запускает проверки, имеет право вето
**Security Engineer** — смотрит auth/payments на дыры
**Design Reviewer** — следит за стилем
**Deploy Engineer** — пушит и мониторит деплой

---

## Что нужно от вас

### 1. Node.js 18 или выше

Проверить версию:
```
node --version
```

Если версия ниже 18 или Node.js не установлен — скачать с https://nodejs.org (LTS).

### 2. Claude Code

```
npm install -g @anthropic-ai/claude-code
```

Проверить:
```
claude --version
```

### 3. API-ключ Anthropic

1. Зайти на https://console.anthropic.com
2. Войти (это отдельная учётка от claude.ai)
3. Пополнить баланс — минимум $10 хватит на неделю работы офиса
4. Создать API-ключ: Settings → API Keys → Create Key
5. Скопировать (начинается с `sk-ant-`)

При первом запуске `claude` попросит этот ключ. Вставить.

Ориентировочный расход: $5-20 в день активной работы. Это много задач через Director.

---

## Установка офиса в проект

### 4. Скопировать файлы

Из архива `pixelstake-office.tar.gz` в корень репозитория `pixelcanvas`:

```
pixelcanvas/
├── frontend/
├── backend/
├── CLAUDE.md              ← из архива
├── scripts/
│   └── precheck.sh        ← из архива (chmod +x scripts/precheck.sh)
├── .github/
│   └── workflows/
│       └── ci.yml         ← из архива
└── .claude/
    └── agents/
        ├── director.md
        ├── frontend-developer.md
        ├── backend-architect.md
        ├── qa-engineer.md
        ├── security-engineer.md
        ├── design-reviewer.md
        └── deploy-engineer.md
```

### 5. Дать права на исполнение

В Git Bash (Windows) или Terminal:
```
chmod +x scripts/precheck.sh
```

### 6. Проверить что всё собирается локально

```
cd pixelcanvas
bash scripts/precheck.sh
```

Должно пройти все 5 проверок. Если что-то падает — эти же ошибки найдёт QA Engineer. Нужно починить **до** первого запуска офиса.

### 7. Закоммитить

```
git add CLAUDE.md .github/ .claude/ scripts/
git commit -m "add AI office: agents, CI, precheck"
git push
```

С этого момента:
- GitHub Actions запускается на каждый push и блокирует broken builds
- Локально `bash scripts/precheck.sh` повторяет те же проверки

---

## Как работать с офисом

### Запустить в проекте

```
cd pixelcanvas
claude
```

Откроется интерактивный REPL.

### Дать задачу

Писать нормально, как мне здесь. Пример:

> Добавь на страницу профиля график активности пользователя за последние 30 дней.

Claude Code сам определит, что это UI + backend endpoint, вызовет Director, Director разобьёт на подзадачи и запустит Frontend + Backend агентов параллельно через Task tool.

### Команды

В REPL:
- `/help` — список команд
- `/agents` — список доступных агентов
- `/exit` — выход

Агенты вызываются автоматически. Вы можете явно попросить: **«Позови frontend-developer и почини типы»** — Claude Code вызовет того, кого вы назвали.

---

## Что делать если офис завис

Если агент зациклился или Claude Code упал:
1. Ctrl+C — остановить текущую задачу
2. `/exit` → `claude` снова
3. Если стабильно падает на одной задаче — разбить её на более мелкие

---

## GitHub Actions

После push `.github/workflows/ci.yml` начнёт работать автоматически. Каждый pull request и каждый push в main запустит:
- TypeScript check
- Vite build
- Python syntax + import
- Taboo check (h-screen и т.п.)

Если что-то красное — merge заблокирован в настройках репо:
1. GitHub → Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Require status checks to pass before merging ✓
4. Выбрать: Frontend, Backend, Taboos

---

## Что делать если ничего не заработает

Пишите мне в чат claude.ai как сейчас. Я остаюсь Director и помогу разобраться.

Если Claude Code на вашем компе капризничает — работаем через claude.ai как раньше, но с новым пайплайном:
- Я даю вам архив → вы распаковываете → запускаете `bash scripts/precheck.sh`
- Если зелёный — `git push`. Если красный — присылаете вывод, я чиню.

Это **лучше**, чем было: раньше я отдавал код и мы узнавали об ошибках на Render. Теперь ошибки ловятся **до** пуша.

---

## Стоимость

- Claude Code: бесплатно сам по себе, платишь за API usage ($5-20/день)
- GitHub Actions: 2000 минут/месяц бесплатно (хватает с запасом)
- Ничего другого не нужно

---

## Следующие шаги

1. Поставить Node.js + Claude Code
2. Получить API-ключ
3. Распаковать архив в корень репо
4. `chmod +x scripts/precheck.sh`
5. `bash scripts/precheck.sh` — убедиться, что ваш текущий код проходит (если нет — написать мне)
6. `git add . && git commit -m "add office" && git push`
7. `claude` в папке проекта → дать первую задачу

Готово.
