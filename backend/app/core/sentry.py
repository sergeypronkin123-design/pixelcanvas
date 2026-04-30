"""
Sentry initialization for FastAPI backend.

Call init_sentry() once at app startup before any request handlers.
Requires env var SENTRY_DSN. No-op if not set.
"""
import logging
import os

logger = logging.getLogger(__name__)


def init_sentry() -> None:
    """Configure sentry-sdk if SENTRY_DSN is present."""
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        logger.info("SENTRY_DSN not set — error tracking disabled")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.asyncio import AsyncioIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        env = os.getenv("ENVIRONMENT", "development")

        sentry_sdk.init(
            dsn=dsn,
            environment=env,
            traces_sample_rate=0.1 if env == "production" else 1.0,
            profiles_sample_rate=0.1,
            send_default_pii=False,  # Strict — don't auto-send IPs/cookies
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                AsyncioIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            before_send=_strip_sensitive,
        )
        logger.info("Sentry initialized for environment: %s", env)
    except ImportError:
        logger.warning("sentry-sdk not installed — `pip install sentry-sdk[fastapi]`")
    except Exception as e:
        logger.error("Sentry init failed: %s", e)


def _strip_sensitive(event: dict, hint: dict) -> dict:
    """Hook to redact sensitive payload fields before sending to Sentry."""
    SENSITIVE_KEYS = {"password", "token", "secret", "api_key", "authorization"}

    def redact(obj):
        if isinstance(obj, dict):
            return {
                k: ("***" if k.lower() in SENSITIVE_KEYS else redact(v))
                for k, v in obj.items()
            }
        if isinstance(obj, list):
            return [redact(x) for x in obj]
        return obj

    if "request" in event:
        event["request"] = redact(event["request"])
    if "extra" in event:
        event["extra"] = redact(event["extra"])
    return event
