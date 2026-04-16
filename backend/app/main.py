from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import get_settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models import *
from app.api import auth, pixels, subscribe, admin, ws
from app.api import leaderboard as leaderboard_api
from app.api import referral as referral_api
from app.api import clans as clans_api
from app.api import economy as economy_api

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PixelStake API...")
    Base.metadata.create_all(bind=engine, checkfirst=True)
    logger.info("Database tables ready")

    db = SessionLocal()
    try:
        from app.models.user import User
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                username="admin",
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Admin user created")

        # Preload canvas cache
        from app.services.canvas_cache import canvas_cache
        canvas_cache.load_from_db(db)

        # Seed economy data
        from app.services import economy
        economy.seed_achievements(db)
        economy.seed_shop(db)
        logger.info("Economy seeded (achievements + shop items)")
    finally:
        db.close()

    # Запустить фоновый планировщик наград
    import asyncio
    from app.services.scheduler import scheduler_loop
    scheduler_task = asyncio.create_task(scheduler_loop())

    yield

    # Shutdown
    scheduler_task.cancel()


app = FastAPI(title="PixelStake API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(pixels.router, prefix="/api")
app.include_router(subscribe.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(leaderboard_api.router, prefix="/api")
app.include_router(referral_api.router, prefix="/api")
app.include_router(clans_api.router, prefix="/api")
app.include_router(economy_api.router, prefix="/api")
app.include_router(ws.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/api/config")
def get_config():
    from app.services.battle import is_battle_active, get_battle_end_time, get_next_battle_start
    active = is_battle_active()
    return {
        "canvas_width": settings.CANVAS_WIDTH,
        "canvas_height": settings.CANVAS_HEIGHT,
        "battle_active": active,
        "battle_end": get_battle_end_time().isoformat() if active else None,
        "next_battle_start": None if active else get_next_battle_start().isoformat(),
        "free_cooldown": settings.FREE_COOLDOWN_SECONDS,
        "sub_cooldown": settings.SUB_COOLDOWN_SECONDS,
        "sub_price_usd": settings.SUB_PRICE_USD,
        "sub_price_rub": settings.SUB_PRICE_RUB,
        "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
    }
