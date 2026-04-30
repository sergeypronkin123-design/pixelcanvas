# Patch instructions for backend/app/main.py

**Не копируй этот файл целиком в проект.** Это инструкция как **дополнить** твой существующий `main.py`.

Причина: в моём пакете нет роутеров `battles.py` и `vitals.py` — они либо уже у тебя есть, либо нет. Если я перезатру весь main.py, импорт сломается.

---

## Что добавить в свой `backend/app/main.py`

### 1. Импорты (в начало файла)

```python
from app.core.sentry import init_sentry
from app.core.startup_validation import validate_or_exit
from app.middleware.security import (
    SecurityHeadersMiddleware,
    IpAnonymizationMiddleware,
)
from app.api.admin import router as admin_router
from app.api.push import router as push_router
from app.core.redis_client import get_redis
```

### 2. В `create_app()` ДО `app = FastAPI(...)`

```python
# Validate production config — fails fast if SECRET_KEY weak
validate_or_exit()

# Init Sentry as early as possible
init_sentry()
```

### 3. После `app = FastAPI(...)` — добавить middleware

```python
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(IpAnonymizationMiddleware)
```

### 4. Подключить новые роутеры

Найди существующие `app.include_router(...)` и добавь рядом:

```python
app.include_router(admin_router, prefix="/api", tags=["admin"])
app.include_router(push_router, prefix="/api/push", tags=["push"])
```

### 5. В startup-обработчике (lifespan или @app.on_event("startup"))

Убедись что вызов `canvas_cache.load_from_db(db)` есть — это **критично**, без него Пикачу не появится.

```python
from app.services.canvas_cache import canvas_cache
from app.core.database import SessionLocal

db = SessionLocal()
try:
    canvas_cache.load_from_db(db)
finally:
    db.close()
```

И добавь pre-warm Redis (опционально, но рекомендую):

```python
await get_redis()
```

---

## Полная пошаговая проверка

После всех правок убедись что:

1. **`from app.services.canvas_cache import canvas_cache`** работает
2. **`load_from_db(db)`** вызывается в startup
3. **`SecurityHeadersMiddleware`** в списке middleware
4. **`admin_router`** и **`push_router`** в include_router

Запусти локально:
```bash
cd backend
python -c "from app.main import app; print('OK')"
```

Если ошибка — пришли мне её, починим.
