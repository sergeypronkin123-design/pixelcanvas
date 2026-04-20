"""
Cloudflare Turnstile captcha verification.

Site key (public) is used on frontend. Secret key (private) verifies token server-side.
Get keys at https://dash.cloudflare.com → Turnstile → Add site.

Free tier: 1M verifications/month. Works in Russia. No cookies (GDPR/152-FZ friendly).
"""
import httpx
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile(token: str, client_ip: str | None = None) -> bool:
    """
    Verify a Turnstile token from frontend.
    Returns True if valid, False otherwise.

    If TURNSTILE_SECRET_KEY is not set (dev mode), returns True (skip verification).
    """
    if not settings.TURNSTILE_SECRET_KEY:
        # Dev mode — no captcha configured, allow
        return True

    if not token:
        return False

    data = {
        "secret": settings.TURNSTILE_SECRET_KEY,
        "response": token,
    }
    if client_ip:
        data["remoteip"] = client_ip

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(TURNSTILE_VERIFY_URL, data=data)
            result = resp.json()
            if not result.get("success"):
                logger.warning(f"Turnstile verification failed: {result.get('error-codes')}")
                return False
            return True
    except Exception as e:
        logger.error(f"Turnstile verify error: {e}")
        # Fail closed — if Cloudflare is unreachable, reject
        return False
