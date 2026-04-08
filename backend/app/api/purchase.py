from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import stripe
import json
import logging
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models import User, Order, OrderStatus, WebhookEvent
from app.schemas import PurchaseRequest, PurchaseResaleRequest, CheckoutResponse, OrderOut
from app.services.payment import create_primary_checkout, create_resale_checkout, handle_checkout_completed
from typing import List

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/purchase", tags=["purchase"])


@router.post("/checkout", response_model=CheckoutResponse)
def initiate_checkout(data: PurchaseRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = create_primary_checkout(db, user.id, data.block_id)
        return CheckoutResponse(**result)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Checkout error: {e}")
        raise HTTPException(500, "Failed to create checkout session")


@router.post("/checkout/resale", response_model=CheckoutResponse)
def initiate_resale_checkout(data: PurchaseResaleRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = create_resale_checkout(db, user.id, data.listing_id)
        return CheckoutResponse(**result)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Resale checkout error: {e}")
        raise HTTPException(500, "Failed to create checkout session")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")

    # Idempotency: check if we've already processed this event
    existing = db.query(WebhookEvent).filter(WebhookEvent.external_id == event["id"]).first()
    if existing and existing.processed:
        return {"status": "already_processed"}

    # Store webhook event
    webhook_event = WebhookEvent(
        provider="stripe",
        event_type=event["type"],
        external_id=event["id"],
        payload_json=json.dumps(event["data"]),
        processed=False,
    )
    db.add(webhook_event)
    db.flush()

    # Process event
    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]
        if session_data.get("payment_status") == "paid":
            handle_checkout_completed(db, session_data)

    elif event["type"] == "checkout.session.expired":
        session_data = event["data"]["object"]
        session_id = session_data.get("id")
        order = db.query(Order).filter(
            Order.provider_session_id == session_id,
            Order.status == OrderStatus.PENDING,
        ).first()
        if order:
            order.status = OrderStatus.EXPIRED
            # Release block reservation handled by cleanup

    webhook_event.processed = True
    db.commit()

    return {"status": "ok"}


@router.get("/orders", response_model=List[OrderOut])
def get_my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.user_id == user.id).order_by(Order.created_at.desc()).limit(50).all()
    return [OrderOut.model_validate(o) for o in orders]


@router.get("/order/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    return OrderOut.model_validate(order)
