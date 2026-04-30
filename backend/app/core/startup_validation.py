"""
Boot-time validation. Run before app starts accepting requests.

Fails fast if production config is unsafe — prevents shipping with default
secrets, weak passwords, or placeholder values.
"""
import logging
import os
import sys
from typing import Optional

logger = logging.getLogger(__name__)


FORBIDDEN_SECRETS = {
    "", "change-me", "secret", "test", "default", "your-secret-here",
    "supersecret", "password", "12345", "test-secret-key", "EHxjGEmQHwJTwF8",  # truncated example
}

FORBIDDEN_PASSWORDS = {
    "", "admin", "password", "123456", "qwerty", "letmein",
    "1234", "12345", "12345678", "test", "default", "admin123",
}


def validate_or_exit() -> None:
    """If running in production with weak config, log fatal and exit(1)."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env != "production":
        return

    failures: list[str] = []

    secret_key = os.getenv("SECRET_KEY", "")
    if len(secret_key) < 32:
        failures.append(f"SECRET_KEY too short: {len(secret_key)} chars (min 32)")
    if secret_key.lower() in FORBIDDEN_SECRETS:
        failures.append("SECRET_KEY is a placeholder/default value")

    admin_pwd = os.getenv("ADMIN_PASSWORD", "")
    if len(admin_pwd) < 12:
        failures.append(f"ADMIN_PASSWORD too short: {len(admin_pwd)} chars (min 12)")
    if admin_pwd.lower() in FORBIDDEN_PASSWORDS:
        failures.append("ADMIN_PASSWORD is a default/weak value")

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        failures.append("DATABASE_URL is empty")
    if "localhost" in db_url and env == "production":
        failures.append("DATABASE_URL points to localhost in production")

    sentry_dsn = os.getenv("SENTRY_DSN", "")
    if not sentry_dsn:
        logger.warning("SENTRY_DSN not set in production — errors won't be tracked")

    if failures:
        print("=" * 70, file=sys.stderr)
        print("FATAL: Production config validation failed:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        print("Refusing to start. Fix env vars and redeploy.", file=sys.stderr)
        sys.exit(1)

    logger.info("Production config validated successfully")
