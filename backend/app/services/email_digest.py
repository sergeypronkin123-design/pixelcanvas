"""
Weekly email digest service.

Sends per-user email summarizing:
- Pixels placed this week
- Battle position
- Achievements unlocked
- Days remaining in current battle
- Total earnings (PixelCoin)

Uses SendGrid free tier (100 emails/day) or any SMTP backend.
Configured via env: EMAIL_PROVIDER, SENDGRID_API_KEY, SMTP_*.
"""
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class DigestData:
    user_id: int
    email: str
    username: str
    pixels_this_week: int
    battle_rank: Optional[int]
    achievements_new: int
    days_until_battle_ends: int
    coin_balance: int
    coin_earned_this_week: int


def build_digest_data(db: Session, user_id: int) -> Optional[DigestData]:
    """Aggregate data needed for one user's digest. Returns None if user opted out."""
    from app.models import User
    from app.services.battle import get_battle_end_time

    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.deleted_at or not user.email:
        return None

    # Pixels this week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    pixels_count = db.execute(
        text("SELECT COUNT(*) FROM pixels WHERE user_id = :uid AND placed_at > :since"),
        {"uid": user_id, "since": week_ago},
    ).scalar() or 0

    # Coin balance — table may not exist on all installs
    try:
        balance = db.execute(
            text("SELECT balance FROM coin_balances WHERE user_id = :uid"),
            {"uid": user_id},
        ).scalar() or 0
    except Exception:
        balance = 0

    try:
        coin_earned = db.execute(
            text("""SELECT COALESCE(SUM(amount), 0) FROM coin_transactions
                   WHERE user_id = :uid AND amount > 0 AND created_at > :since"""),
            {"uid": user_id, "since": week_ago},
        ).scalar() or 0
    except Exception:
        coin_earned = 0

    # Days until battle
    battle_end = get_battle_end_time()
    days_left = max(0, (battle_end - datetime.now(timezone.utc)).days)

    return DigestData(
        user_id=user.id,
        email=user.email,
        username=user.username or user.email.split("@")[0],
        pixels_this_week=pixels_count,
        battle_rank=None,  # TODO: compute from battle_scores
        achievements_new=0,  # TODO: compute newly-unlocked
        days_until_battle_ends=days_left,
        coin_balance=balance,
        coin_earned_this_week=coin_earned,
    )


def render_digest_html(data: DigestData) -> str:
    """Produce the HTML body. Inline styles for email client compat."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#08080c;color:#e8e8f0">
<div style="max-width:600px;margin:0 auto;padding:32px 24px">
  <div style="text-align:center;margin-bottom:32px">
    <div style="font-size:32px;font-weight:800;color:#f97316;letter-spacing:-0.025em">PixelStake</div>
    <div style="color:#8a8aa0;font-size:14px;margin-top:4px">Твоя неделя в цифрах</div>
  </div>

  <div style="background:#15151f;border:1px solid #1a1a2a;border-radius:16px;padding:24px;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <div>
        <div style="color:#8a8aa0;font-size:13px">Поставлено пикселей</div>
        <div style="font-size:36px;font-weight:800;color:#fff;margin-top:4px">{data.pixels_this_week:,}</div>
      </div>
      <div style="text-align:right">
        <div style="color:#8a8aa0;font-size:13px">PixelCoin заработано</div>
        <div style="font-size:24px;font-weight:700;color:#f97316;margin-top:4px">+{data.coin_earned_this_week:,}</div>
      </div>
    </div>
  </div>

  <div style="background:#15151f;border:1px solid #1a1a2a;border-radius:16px;padding:24px;margin-bottom:32px">
    <div style="color:#8a8aa0;font-size:13px;margin-bottom:8px">До конца текущего батла</div>
    <div style="font-size:24px;font-weight:700;color:#fff">{data.days_until_battle_ends} {'день' if data.days_until_battle_ends == 1 else 'дня' if data.days_until_battle_ends < 5 else 'дней'}</div>
    <div style="color:#8a8aa0;font-size:14px;margin-top:12px">Топ-3 получают по 1500 ₽. Не пропусти.</div>
  </div>

  <div style="text-align:center">
    <a href="https://pixelstake.ru/canvas" style="display:inline-block;padding:14px 32px;background:#f97316;color:#fff;text-decoration:none;border-radius:12px;font-weight:600">Продолжить рисовать</a>
  </div>

  <div style="text-align:center;color:#8a8aa0;font-size:12px;margin-top:48px;padding-top:24px;border-top:1px solid #1a1a2a">
    Не хочешь получать такие письма?
    <a href="https://pixelstake.ru/profile/email-prefs" style="color:#f97316">Настройки уведомлений</a>
  </div>
</div>
</body>
</html>"""


def send_email(to: str, subject: str, html: str) -> bool:
    """Send email via configured provider. Returns success."""
    provider = os.getenv("EMAIL_PROVIDER", "sendgrid").lower()

    if provider == "sendgrid":
        return _send_sendgrid(to, subject, html)
    if provider == "smtp":
        return _send_smtp(to, subject, html)

    logger.warning("Unknown EMAIL_PROVIDER: %s", provider)
    return False


def _send_sendgrid(to: str, subject: str, html: str) -> bool:
    api_key = os.getenv("SENDGRID_API_KEY", "")
    from_email = os.getenv("EMAIL_FROM", "no-reply@pixelstake.ru")
    if not api_key:
        logger.warning("SENDGRID_API_KEY not configured")
        return False

    try:
        import requests  # noqa
        r = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to}]}],
                "from": {"email": from_email, "name": "PixelStake"},
                "subject": subject,
                "content": [{"type": "text/html", "value": html}],
            },
            timeout=10,
        )
        return r.status_code in (200, 202)
    except Exception as e:
        logger.error("SendGrid send failed: %s", e)
        return False


def _send_smtp(to: str, subject: str, html: str) -> bool:
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("EMAIL_FROM", user)

    if not all([host, user, password]):
        logger.warning("SMTP credentials not configured")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"PixelStake <{from_email}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(host, port) as srv:
            srv.starttls()
            srv.login(user, password)
            srv.send_message(msg)
        return True
    except Exception as e:
        logger.error("SMTP send failed: %s", e)
        return False
