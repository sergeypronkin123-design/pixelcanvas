from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import sys


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/pixelstake"
    SECRET_KEY: str = ""  # MUST be set via env in production
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
    # Battle phase boundaries — day-of-month
    BATTLE_SOLO_START: int = 1
    BATTLE_SOLO_END: int = 10
    BATTLE_CLAN_START: int = 11
    BATTLE_CLAN_END: int = 20
    FREE_COOLDOWN_SECONDS: int = 30
    SUB_COOLDOWN_SECONDS: int = 5
    SUB_PRICE_USD: int = 499  # cents
    SUB_PRICE_RUB: int = 49900  # kopecks

    ADMIN_EMAIL: str = "admin@pixelstake.ru"
    ADMIN_PASSWORD: str = ""  # MUST be set via env in production

    # Turnstile (Cloudflare captcha)
    TURNSTILE_SECRET_KEY: str = ""
    TURNSTILE_SITE_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


FORBIDDEN_SECRETS = {"change-me", "secret", "dev", "test", ""}
FORBIDDEN_PASSWORDS = {"Admin123!", "admin", "password", "123456", ""}


@lru_cache
def get_settings() -> Settings:
    s = Settings()

    # Production safety checks — refuse to start with weak secrets
    if s.ENVIRONMENT == "production":
        if s.SECRET_KEY in FORBIDDEN_SECRETS or len(s.SECRET_KEY) < 32:
            print(
                "FATAL: SECRET_KEY is empty, too short, or uses a known weak value.\n"
                "Generate a new one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"\n"
                "Then set it in the SECRET_KEY environment variable.",
                file=sys.stderr,
            )
            sys.exit(1)

        if s.ADMIN_PASSWORD in FORBIDDEN_PASSWORDS or len(s.ADMIN_PASSWORD) < 12:
            print(
                "FATAL: ADMIN_PASSWORD is empty, too short, or uses a default value.\n"
                "Set a strong password (12+ chars) in the ADMIN_PASSWORD environment variable.",
                file=sys.stderr,
            )
            sys.exit(1)

    return s
