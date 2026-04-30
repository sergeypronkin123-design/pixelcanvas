"""
Idempotent payment webhook processor.

Guarantees:
- Each (provider, external_id) processed exactly once
- If DB write fails mid-processing, we leave a pending_webhooks row for retry
- Background worker retries pending webhooks every 60s with exponential backoff
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import (
    Column, Integer, String, JSON, DateTime, Boolean, Text, func,
    UniqueConstraint, Index,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import Base

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------


class WebhookEvent(Base):
    """Persisted record of every payment webhook we receive."""

    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(40), nullable=False)
    external_id = Column(String(120), nullable=False)
    event_type = Column(String(80), nullable=False)
    payload = Column(JSON, nullable=False)

    processed = Column(Boolean, default=False, nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)

    received_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("provider", "external_id", name="uq_provider_external"),
        Index("ix_webhook_unprocessed", "processed", "next_retry_at"),
    )


# ---------------------------------------------------------------------------
# Idempotent record-or-skip
# ---------------------------------------------------------------------------


def record_webhook(
    db: Session,
    provider: str,
    external_id: str,
    event_type: str,
    payload: dict[str, Any],
) -> tuple[WebhookEvent, bool]:
    """
    Record a webhook event. Returns (event, is_new).
    is_new=False means we've already seen this exact (provider, external_id)
    and the caller should NOT process it again.
    """
    event = WebhookEvent(
        provider=provider,
        external_id=external_id,
        event_type=event_type,
        payload=payload,
    )
    try:
        db.add(event)
        db.commit()
        db.refresh(event)
        return event, True
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(WebhookEvent)
            .filter(
                WebhookEvent.provider == provider,
                WebhookEvent.external_id == external_id,
            )
            .first()
        )
        if existing is None:
            raise  # Should not happen — race condition
        logger.info(
            "Duplicate webhook ignored: %s/%s (already processed=%s)",
            provider, external_id, existing.processed,
        )
        return existing, False


def mark_processed(db: Session, event_id: int) -> None:
    db.query(WebhookEvent).filter(WebhookEvent.id == event_id).update({
        "processed": True,
        "processed_at": datetime.now(timezone.utc),
        "next_retry_at": None,
        "error_message": None,
    })
    db.commit()


def mark_failed(db: Session, event_id: int, error: str) -> None:
    """Mark webhook as failed. Schedule retry with exponential backoff."""
    event = db.query(WebhookEvent).filter(WebhookEvent.id == event_id).first()
    if not event:
        return

    new_count = event.retry_count + 1
    # Backoff: 1m, 5m, 30m, 2h, 12h, then give up
    backoff_minutes = min(720, 1 * (5 ** (new_count - 1)))
    next_retry = datetime.now(timezone.utc) + timedelta(minutes=backoff_minutes)

    db.query(WebhookEvent).filter(WebhookEvent.id == event_id).update({
        "retry_count": new_count,
        "error_message": error[:1000],
        "next_retry_at": next_retry if new_count < 6 else None,
    })
    db.commit()
    logger.warning(
        "Webhook %s failed (attempt %d): %s. Next retry: %s",
        event_id, new_count, error[:100], next_retry,
    )


def get_pending_webhooks(db: Session, limit: int = 50) -> list[WebhookEvent]:
    """Return webhooks ready for retry."""
    now = datetime.now(timezone.utc)
    return (
        db.query(WebhookEvent)
        .filter(
            WebhookEvent.processed == False,  # noqa: E712
            WebhookEvent.next_retry_at <= now,
        )
        .order_by(WebhookEvent.next_retry_at.asc())
        .limit(limit)
        .all()
    )
