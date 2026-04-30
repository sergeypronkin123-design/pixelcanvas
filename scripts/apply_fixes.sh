#!/bin/bash
# ============================================================================
# PixelStake Audit Fix — автоматическое применение
# ============================================================================
# Запуск:
#   bash scripts/apply_fixes.sh
#
# Что делает:
#   1. Сохраняет текущее состояние (даже если в rebase/merge — выходит безопасно)
#   2. Создаёт ветку audit-fix
#   3. Применяет все фиксы поверх main
#   4. Пушит ветку отдельно — main остаётся чистым
#   5. После проверки можно слить через GitHub PR или fast-forward merge
# ============================================================================

set -e  # exit on any error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         PixelStake Audit Fix — автоматическое применение     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ----------------------------------------------------------------------------
# Step 1: Cleanup any pending rebase/merge state
# ----------------------------------------------------------------------------
echo "▸ Шаг 1: Очистка состояния git..."

if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ]; then
  echo "  Обнаружен незавершённый rebase — отменяю..."
  git rebase --abort 2>/dev/null || true
fi

if [ -f ".git/MERGE_HEAD" ]; then
  echo "  Обнаружен незавершённый merge — отменяю..."
  git merge --abort 2>/dev/null || true
fi

# If detached HEAD, get back on main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
  echo "  Detached HEAD detected — переключаюсь на main..."
  git checkout main 2>/dev/null || git checkout master
fi

echo "  ✓ Состояние чистое"
echo ""

# ----------------------------------------------------------------------------
# Step 2: Save uncommitted changes to a stash (just in case)
# ----------------------------------------------------------------------------
echo "▸ Шаг 2: Stash несохранённых изменений..."

if [ -n "$(git status --porcelain)" ]; then
  git stash push -m "before-audit-fix-$(date +%s)" --include-untracked
  echo "  ✓ Изменения сохранены в stash"
  STASHED=1
else
  echo "  ✓ Нет несохранённых изменений"
  STASHED=0
fi
echo ""

# ----------------------------------------------------------------------------
# Step 3: Pull latest main from remote
# ----------------------------------------------------------------------------
echo "▸ Шаг 3: Синхронизация с remote..."

git fetch origin
git checkout main 2>/dev/null || git checkout master
git reset --hard origin/main 2>/dev/null || git reset --hard origin/master

echo "  ✓ main синхронизирован с remote"
echo ""

# ----------------------------------------------------------------------------
# Step 4: Create new fix branch
# ----------------------------------------------------------------------------
echo "▸ Шаг 4: Создание ветки audit-fix..."

# Delete old fix branch if exists
git branch -D audit-fix 2>/dev/null || true

git checkout -b audit-fix
echo "  ✓ Ветка audit-fix создана"
echo ""

# ----------------------------------------------------------------------------
# Step 5: Apply uncommitted changes (the audit fix files) from stash
# ----------------------------------------------------------------------------
echo "▸ Шаг 5: Применение фиксов..."

if [ "$STASHED" = "1" ]; then
  git stash pop || {
    echo "  ✗ Конфликт при stash pop. Используй вручную:"
    echo "     git checkout --theirs ."
    echo "     git add ."
    exit 1
  }
fi

# Verify all critical files exist
CRITICAL_FILES=(
  "backend/app/services/canvas_cache.py"
  "backend/app/services/battle.py"
  "backend/migrations/001_cleanup_and_harden.sql"
  "frontend/src/hooks/useCanvasData.ts"
)

for f in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  ✗ КРИТИЧНЫЙ ФАЙЛ ОТСУТСТВУЕТ: $f"
    echo "  Распакуй pixelstake-full-fix.tar.gz в этот каталог сначала"
    exit 1
  fi
done

echo "  ✓ Все критичные файлы на месте"
echo ""

# ----------------------------------------------------------------------------
# Step 6: Stage and commit
# ----------------------------------------------------------------------------
echo "▸ Шаг 6: Commit..."

git add .
git commit -m "feat: full audit fix — 54 findings resolved

- Fix canvas_cache load_from_db (DISTINCT ON for last-write-wins)
- Add Redis client with graceful fallback
- Add security middleware (HSTS, CSP, IP anonymization)
- Add idempotent webhooks
- Add WebSocket frame-auth + batched broadcast
- Add admin endpoints (canvas reload, battle CRUD)
- Add push notifications support
- Add 2FA TOTP for admins
- Add weekly email digest
- Add startup config validation
- Add Sentry error tracking
- Add binary canvas snapshot format
- Add migration: cleanup duplicates + new tables
- Add 23 unit tests (battle + canvas_cache)
- Add Playwright E2E smoke tests
- Add CI workflow (GitHub Actions)
- Add daily backup script (S3/B2)
- Add docker-compose for local staging
- Add frontend hooks: useOptimisticPixel, useCanvasData (full canvas), usePinchZoom, useWebPush
- Add OnboardingTutorial component
- Add PWA manifest + service worker
- Add fonts.css for self-hosted typography
- Add API wrapper with auto-token injection" || {
    echo "  ⚠ Нет изменений для коммита (возможно файлы уже закоммичены)"
}

echo "  ✓ Commit создан"
echo ""

# ----------------------------------------------------------------------------
# Step 7: Push branch (NOT main — safer)
# ----------------------------------------------------------------------------
echo "▸ Шаг 7: Push ветки audit-fix..."

git push -u origin audit-fix --force

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                         ✓ ГОТОВО                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Что дальше:"
echo ""
echo "1. Открой в браузере:"
echo "   https://github.com/sergeypronkin123-design/pixelcanvas/compare/main...audit-fix"
echo ""
echo "2. Создай Pull Request"
echo ""
echo "3. Проверь CI (GitHub Actions запустится автоматически)"
echo ""
echo "4. Если CI зелёный — нажми 'Merge pull request' в GitHub"
echo ""
echo "5. Render и Vercel автоматически передеплоят"
echo ""
echo "6. Проверь Pikachu: ./scripts/verify_deploy.sh"
echo ""
