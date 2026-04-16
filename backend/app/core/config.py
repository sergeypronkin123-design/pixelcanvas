from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/pixelstake"
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    YUKASSA_SHOP_ID: str = ""
    YUKASSA_SECRET_KEY: str = ""

    # Robokassa
    ROBOKASSA_MERCHANT_LOGIN: str = ""
    ROBOKASSA_PASSWORD_1: str = ""
    ROBOKASSA_PASSWORD_2: str = ""
    ROBOKASSA_TEST_MODE: bool = False

    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"

    CANVAS_WIDTH: int = 1000
    CANVAS_HEIGHT: int = 1000
    BATTLE_DAY_START: int = 1
    BATTLE_DAY_END: int = 7
    FREE_COOLDOWN_SECONDS: int = 30
    SUB_COOLDOWN_SECONDS: int = 5
    SUB_PRICE_USD: int = 499  # cents
    SUB_PRICE_RUB: int = 49900  # kopecks

    ADMIN_EMAIL: str = "admin@pixelstake.ru"
    ADMIN_PASSWORD: str = "Admin123!"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
