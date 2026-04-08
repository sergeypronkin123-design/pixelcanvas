from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from app.core.config import get_settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models import *
from app.api import auth, blocks, pixels, purchase, marketplace, admin, ws
from app.services.canvas import initialize_canvas
from app.services.payment import cleanup_expired_reservations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


async def reservation_cleanup_task():
    """Background task to clean up expired reservations."""
    while True:
        try:
            db = SessionLocal()
            cleanup_expired_reservations(db)
            db.close()
        except Exception as e:
            logger.error(f"Cleanup task error: {e}")
        await asyncio.sleep(60)  # Run every minute


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting PixelCanvas API...")
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    if not existing_tables:
        Base.metadata.create_all(bind=engine)
        logger.info("Created all tables")
    else:
        # Tables already exist, create only missing ones
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                table.create(bind=engine)
                logger.info(f"Created missing table: {table.name}")
        logger.info("Tables already exist, skipped creation")

    # Initialize canvas blocks
    db = SessionLocal()
    try:
        initialize_canvas(db)

        # Create admin user if not exists
        from app.models.user import User
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin_user:
            admin_user = User(
                email=settings.ADMIN_EMAIL,
                username="admin",
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                is_admin=True,
            )
            db.add(admin_user)
            db.commit()
            logger.info("Admin user created")
    finally:
        db.close()

    # Start background cleanup task
    cleanup_task = asyncio.create_task(reservation_cleanup_task())

    yield

    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="PixelCanvas API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(blocks.router, prefix="/api")
app.include_router(pixels.router, prefix="/api")
app.include_router(purchase.router, prefix="/api")
app.include_router(marketplace.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(ws.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/config")
def get_public_config():
    return {
        "canvas_width": settings.CANVAS_WIDTH,
        "canvas_height": settings.CANVAS_HEIGHT,
        "block_size": settings.BLOCK_SIZE,
        "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
        "currency": settings.CURRENCY,
        "resale_fee_percent": settings.RESALE_FEE_PERCENT,
    }
