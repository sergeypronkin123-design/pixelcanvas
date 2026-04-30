"""
TOTP 2FA for admin accounts.

Flow:
1. Admin enables 2FA → backend generates secret + QR
2. Admin scans QR in Google Authenticator / 1Password
3. Admin confirms by entering 6-digit code
4. From now on, login requires email + password + TOTP

Library: `pip install pyotp qrcode[pil]`
"""
import base64
import io
import logging
import os
import secrets
from typing import Optional

logger = logging.getLogger(__name__)

ISSUER = os.getenv("TOTP_ISSUER", "PixelStake")


def generate_secret() -> str:
    """Generate a random base32 TOTP secret."""
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def get_provisioning_uri(secret: str, account_name: str) -> str:
    """Build otpauth:// URI for QR code."""
    try:
        import pyotp
        return pyotp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=ISSUER)
    except ImportError:
        # Fallback — manually construct URI
        return f"otpauth://totp/{ISSUER}:{account_name}?secret={secret}&issuer={ISSUER}"


def generate_qr_png_base64(uri: str) -> Optional[str]:
    """Render URI as QR code PNG (base64-encoded data URL). None on failure."""
    try:
        import qrcode
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"
    except ImportError:
        logger.warning("qrcode lib not installed — QR rendering skipped")
        return None
    except Exception as e:
        logger.error("QR generation failed: %s", e)
        return None


def verify_token(secret: str, token: str, window: int = 1) -> bool:
    """Verify a 6-digit TOTP token. window=1 allows ±30s clock drift."""
    try:
        import pyotp
        return pyotp.TOTP(secret).verify(token, valid_window=window)
    except ImportError:
        logger.warning("pyotp not installed — TOTP verification disabled")
        return False
