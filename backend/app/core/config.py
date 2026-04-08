from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/pixelcanvas"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # YooKassa
    YUKASSA_SHOP_ID: str = ""
    YUKASSA_SECRET_KEY: str = ""
    YUKASSA_WEBHOOK_SECRET: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"

    # Canvas
    CANVAS_WIDTH: int = 1000
    CANVAS_HEIGHT: int = 1000
    BLOCK_SIZE: int = 10
    BASE_BLOCK_PRICE: int = 100  # in cents/kopecks
    CURRENCY: str = "usd"
    RESALE_FEE_PERCENT: float = 5.0
    RESERVATION_TIMEOUT_SECONDS: int = 600

    # Admin
    ADMIN_EMAIL: str = "admin@pixelcanvas.io"
    ADMIN_PASSWORD: str = "changeme123"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
