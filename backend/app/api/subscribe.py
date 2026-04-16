from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models import User, Subscription, WebhookEvent
import stripe
import httpx
import json
import uuid
import logging

logger = logging.getLogger(__name__)
settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY
router = APIRouter(prefix="/subscribe", tags=["subscription"])


@router.post("/checkout")
def create_subscription_checkout(
    provider: str = Query("stripe", enum=["stripe", "yukassa"]),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if already subscribed
    if user.is_subscriber and user.subscription_until and user.subscription_until > datetime.now(timezone.utc):
        raise HTTPException(400, "Already subscribed")

    if provider == "stripe":
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": settings.SUB_PRICE_USD,
                    "product_data": {
                        "name": "PixelStake Pro Subscription",
                        "description": "Place pixels every 5 seconds instead of 30. Valid for 30 days.",
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{settings.FRONTEND_URL}/subscribe/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/subscribe/cancel",
            metadata={"user_id": str(user.id), "type": "subscription"},
            expires_at=int((datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp()),
        )

        sub = Subscription(user_id=user.id, provider="stripe", provider_session_id=session.id,
                           amount=settings.SUB_PRICE_USD, currency="usd", status="pending")
        db.add(sub)
        db.commit()
        return {"checkout_url": session.url, "session_id": session.id}

    elif provider == "yukassa":
        amount_value = f"{settings.SUB_PRICE_RUB / 100:.2f}"
        idempotency_key = str(uuid.uuid4())

        payment_data = {
            "amount": {"value": amount_value, "currency": "RUB"},
            "confirmation": {
                "type": "redirect",
                "return_url": f"{settings.FRONTEND_URL}/subscribe/success?provider=yukassa"
            },
            "capture": True,
            "description": "PixelStake Pro — ускоренная установка пикселей (30 дней)",
            "metadata": {"user_id": str(user.id), "type": "subscription"},
        }

        with httpx.Client() as client:
            resp = client.post(
                "https://api.yookassa.ru/v3/payments",
                json=payment_data,
                auth=(settings.YUKASSA_SHOP_ID, settings.YUKASSA_SECRET_KEY),
                headers={"Idempotence-Key": idempotency_key, "Content-Type": "application/json"},
            )

        if resp.status_code not in (200, 201):
            raise HTTPException(500, f"YooKassa error: {resp.text}")

        payment = resp.json()
        sub = Subscription(user_id=user.id, provider="yukassa", provider_session_id=payment["id"],
                           amount=settings.SUB_PRICE_RUB, currency="RUB", status="pending")
        db.add(sub)
        db.commit()
        return {"checkout_url": payment["confirmation"]["confirmation_url"], "session_id": payment["id"]}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(400, str(e))

    event_id = event.get("id") if isinstance(event, dict) else getattr(event, "id", None)
    event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)
    event_data = event.get("data") if isinstance(event, dict) else getattr(event, "data", None)

    existing = db.query(WebhookEvent).filter(WebhookEvent.external_id == str(event_id)).first()
    if existing and existing.processed:
        return {"status": "already_processed"}

    we = WebhookEvent(provider="stripe", event_type=str(event_type), external_id=str(event_id),
                      payload_json=json.dumps(event_data, default=str), processed=False)
    db.add(we)
    db.flush()

    if event_type == "checkout.session.completed":
        session_data = event_data.get("object") if isinstance(event_data, dict) else getattr(event_data, "object", None)
        if session_data:
            metadata = session_data.get("metadata", {}) if isinstance(session_data, dict) else getattr(session_data, "metadata", {})
            session_id = session_data.get("id") if isinstance(session_data, dict) else getattr(session_data, "id", None)

            if metadata.get("type") == "subscription":
                user_id = int(metadata.get("user_id", 0))
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.is_subscriber = True
                    user.subscription_until = datetime.now(timezone.utc) + timedelta(days=30)
                    sub = db.query(Subscription).filter(Subscription.provider_session_id == str(session_id)).first()
                    if sub:
                        sub.status = "paid"

            elif metadata.get("type") == "clan_donation":
                from app.models.clan import ClanDonation
                donation = db.query(ClanDonation).filter(ClanDonation.provider_session_id == str(session_id)).first()
                if donation:
                    donation.status = "paid"

    we.processed = True
    db.commit()
    return {"status": "ok"}


@router.post("/webhook/yukassa")
async def yukassa_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    data = json.loads(payload)
    event_type = data.get("event")
    payment_obj = data.get("object", {})
    payment_id = payment_obj.get("id", "")
    event_id = f"yk_{payment_id}_{event_type}"

    existing = db.query(WebhookEvent).filter(WebhookEvent.external_id == event_id).first()
    if existing and existing.processed:
        return {"status": "already_processed"}

    we = WebhookEvent(provider="yukassa", event_type=event_type or "", external_id=event_id,
                      payload_json=json.dumps(data, default=str), processed=False)
    db.add(we)
    db.flush()

    if event_type == "payment.succeeded":
        metadata = payment_obj.get("metadata", {})
        if metadata.get("type") == "subscription":
            user_id = int(metadata.get("user_id", 0))
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_subscriber = True
                user.subscription_until = datetime.now(timezone.utc) + timedelta(days=30)
                sub = db.query(Subscription).filter(Subscription.provider_session_id == payment_id).first()
                if sub:
                    sub.status = "paid"
        elif metadata.get("type") == "clan_donation":
            from app.models.clan import ClanDonation
            donation = db.query(ClanDonation).filter(ClanDonation.provider_session_id == payment_id).first()
            if donation:
                donation.status = "paid"

    we.processed = True
    db.commit()
    return {"status": "ok"}


@router.get("/status")
def subscription_status(user: User = Depends(get_current_user)):
    is_active = user.is_subscriber and user.subscription_until and user.subscription_until > datetime.now(timezone.utc)
    return {
        "is_subscriber": is_active,
        "subscription_until": user.subscription_until.isoformat() if user.subscription_until else None,
        "price_usd": settings.SUB_PRICE_USD,
        "price_rub": settings.SUB_PRICE_RUB,
    }
