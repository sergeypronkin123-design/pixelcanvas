#!/bin/bash
# PixelStake — Pre-deploy check pipeline
# Запускать ПЕРЕД каждым git push
# Exit code 0 = можно пушить, 1+ = нельзя

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

echo ""
echo "================================================"
echo "  PixelStake pre-deploy check"
echo "================================================"
echo ""

# --- 1. Frontend TypeScript ---
echo -e "${YELLOW}[1/5] Frontend TypeScript check...${NC}"
if [ -d "frontend" ]; then
  cd frontend
  if [ ! -d "node_modules" ]; then
    echo "  installing deps..."
    npm install --silent 2>&1 | tail -5
  fi
  if npx tsc --noEmit 2>&1; then
    echo -e "${GREEN}  ✓ TypeScript OK${NC}"
  else
    echo -e "${RED}  ✗ TypeScript errors — fix them before push${NC}"
    ERRORS=$((ERRORS + 1))
  fi
  cd ..
else
  echo "  (no frontend/ dir, skip)"
fi

# --- 2. Frontend Vite build (catches JSX errors tsc misses) ---
echo ""
echo -e "${YELLOW}[2/5] Frontend Vite build...${NC}"
if [ -d "frontend" ]; then
  cd frontend
  if npm run build --silent > /tmp/vite-build.log 2>&1; then
    echo -e "${GREEN}  ✓ Vite build OK${NC}"
  else
    echo -e "${RED}  ✗ Vite build failed:${NC}"
    tail -30 /tmp/vite-build.log
    ERRORS=$((ERRORS + 1))
  fi
  cd ..
fi

# --- 3. Backend Python import ---
echo ""
echo -e "${YELLOW}[3/5] Backend Python import check...${NC}"
if [ -d "backend" ]; then
  cd backend
  if [ -f "venv/Scripts/python.exe" ]; then
    PYTHON="venv/Scripts/python.exe"
  elif [ -f "venv/bin/python" ]; then
    PYTHON="venv/bin/python"
  else
    PYTHON="python3"
  fi
  if "$PYTHON" -c "import sys; sys.path.insert(0, '.'); from app.main import app; print('app imported OK')" 2>&1; then
    echo -e "${GREEN}  ✓ Backend imports OK${NC}"
  else
    echo -e "${RED}  ✗ Backend import failed — ImportError will crash Render${NC}"
    ERRORS=$((ERRORS + 1))
  fi
  cd ..
else
  echo "  (no backend/ dir, skip)"
fi

# --- 4. Backend syntax (all .py files) ---
echo ""
echo -e "${YELLOW}[4/5] Backend syntax check (all .py files)...${NC}"
if [ -d "backend" ]; then
  SYNTAX_ERR=0
  if [ -f "backend/venv/Scripts/python.exe" ]; then
    PYTHON3="backend/venv/Scripts/python.exe"
  elif [ -f "backend/venv/bin/python" ]; then
    PYTHON3="backend/venv/bin/python"
  else
    PYTHON3="python3"
  fi
  while IFS= read -r pyfile; do
    if ! "$PYTHON3" -m py_compile "$pyfile" 2>&1; then
      echo -e "${RED}  ✗ Syntax error in $pyfile${NC}"
      SYNTAX_ERR=$((SYNTAX_ERR + 1))
    fi
  done < <(find backend -name "*.py" -not -path "*/node_modules/*" -not -path "*/__pycache__/*" -not -path "*/.venv/*")

  if [ "$SYNTAX_ERR" -eq 0 ]; then
    echo -e "${GREEN}  ✓ All .py files parse OK${NC}"
  else
    ERRORS=$((ERRORS + SYNTAX_ERR))
  fi
fi

# --- 5. Taboo check ---
echo ""
echo -e "${YELLOW}[5/5] Taboo check (h-screen, console.log, TODO-blockers)...${NC}"
TABOO_ERRORS=0

# Check for h-screen (should be min-h-[100dvh])
if grep -r "className=\"[^\"]*h-screen" frontend/src 2>/dev/null | grep -v "min-h-screen" > /tmp/taboo-hscreen.log; then
  if [ -s /tmp/taboo-hscreen.log ]; then
    echo -e "${RED}  ✗ Found h-screen (use min-h-[100dvh]):${NC}"
    head -5 /tmp/taboo-hscreen.log
    TABOO_ERRORS=$((TABOO_ERRORS + 1))
  fi
fi

# Check for console.log in committed code
if grep -rn "console\.log(" frontend/src 2>/dev/null | grep -v "// OK" > /tmp/taboo-console.log; then
  if [ -s /tmp/taboo-console.log ]; then
    echo -e "${YELLOW}  ⚠ Found console.log (remove before push or mark with // OK):${NC}"
    head -5 /tmp/taboo-console.log
  fi
fi

# Check for TODO-blocker comments
if grep -rn "TODO-BLOCKER\|FIXME-BLOCKER" frontend/src backend/app 2>/dev/null > /tmp/taboo-todo.log; then
  if [ -s /tmp/taboo-todo.log ]; then
    echo -e "${RED}  ✗ Found blocker TODOs:${NC}"
    cat /tmp/taboo-todo.log
    TABOO_ERRORS=$((TABOO_ERRORS + 1))
  fi
fi

if [ "$TABOO_ERRORS" -eq 0 ]; then
  echo -e "${GREEN}  ✓ No taboos${NC}"
else
  ERRORS=$((ERRORS + TABOO_ERRORS))
fi

# --- Final verdict ---
echo ""
echo "================================================"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}  ✓ ALL CHECKS PASSED — safe to push${NC}"
  echo "================================================"
  exit 0
else
  echo -e "${RED}  ✗ $ERRORS CHECK(S) FAILED — DO NOT PUSH${NC}"
  echo "================================================"
  exit 1
fi
