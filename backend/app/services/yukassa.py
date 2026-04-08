import uuid
import json
import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models import Block, BlockStatus, Order, OrderStatus, Transaction, TransactionType, Listing, ListingStatus, WebhookEvent
from app.services.websocket import manager
import asyncio
import httpx

logger = logging.getLogger(__name__)
settings = get_settings()

YUKASSA_API_URL = "https://api.yookassa.ru/v3"


def _get_auth():
    return (settings.YUKASSA_SHOP_ID, settings.YUKASSA_SECRET_KEY)


def create_yukassa_primary_checkout(db: Session, user_id: int, block_id: int) -> dict:
    """Create YooKassa payment for primary block purchase."""
    block = db.query(Block).with_for_update().filter(Block.id == block_id).first()
    if not block:
        raise ValueError("Block not found")
    if block.status != BlockStatus.FREE:
        raise ValueError("Block is not available for purchase")

    # Reserve block
    block.status = BlockStatus.RESERVED
    block.reserved_by = user_id
    block.reserved_until = datetime.now(timezone.utc) + timedelta(seconds=settings.RESERVATION_TIMEOUT_SECONDS)

    # Price in rubles (kopecks -> rubles)
    price_rub = block.current_price  # current_price is in kopecks for RUB

    order = Order(
        user_id=user_id,
        block_id=block_id,
        amount=price_rub,
        currency="RUB",
        provider="yukassa",
        status=OrderStatus.PENDING,
        order_type="primary_purchase",
    )
    db.add(order)
    db.flush()

    # Create YooKassa payment
    idempotency_key = str(uuid.uuid4())
    amount_value = f"{price_rub / 100:.2f}"

    payment_data = {
        "amount": {
            "value": amount_value,
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": f"{settings.FRONTEND_URL}/purchase/success?provider=yukassa&order_id={order.id}"
        },
        "capture": True,
        "description": f"Pixel Block ({block.x}, {block.y}) - {block.width}x{block.height}",
        "metadata": {
            "order_id": str(order.id),
            "block_id": str(block_id),
            "user_id": str(user_id),
            "order_type": "primary_purchase"
        }
    }

    with httpx.Client() as client:
        resp = client.post(
            f"{YUKASSA_API_URL}/payments",
            json=payment_data,
            auth=_get_auth(),
            headers={
                "Idempotence-Key": idempotency_key,
                "Content-Type": "application/json"
            }
        )

    if resp.status_code not in (200, 201):
        logger.error(f"YooKassa error: {resp.status_code} {resp.text}")
        raise ValueError(f"Payment creation failed: {resp.text}")

    payment = resp.json()
    payment_id = payment["id"]
    confirmation_url = payment["confirmation"]["confirmation_url"]

    order.provider_session_id = payment_id
    db.commit()

    return {
        "checkout_url": confirmation_url,
        "session_id": payment_id,
        "order_id": order.id,
    }


def create_yukassa_resale_checkout(db: Session, user_id: int, listing_id: int) -> dict:
    """Create YooKassa payment for resale purchase."""
    listing = db.query(Listing).with_for_update().filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.ACTIVE
    ).first()
    if not listing:
        raise ValueError("Listing not found or no longer active")
    if listing.seller_id == user_id:
        raise ValueError("Cannot buy your own listing")

    block = db.query(Block).with_for_update().filter(Block.id == listing.block_id).first()
    if not block or block.status != BlockStatus.LISTED:
        raise ValueError("Block is not available")

    block.status = BlockStatus.RESERVED
    block.reserved_by = user_id
    block.reserved_until = datetime.now(timezone.utc) + timedelta(seconds=settings.RESERVATION_TIMEOUT_SECONDS)

    order = Order(
        user_id=user_id,
        block_id=block.id,
        amount=listing.price,
        currency="RUB",
        provider="yukassa",
        status=OrderStatus.PENDING,
        order_type="resale_purchase",
        listing_id=listing.id,
    )
    db.add(order)
    db.flush()

    idempotency_key = str(uuid.uuid4())
    amount_value = f"{listing.price / 100:.2f}"

    payment_data = {
        "amount": {
            "value": amount_value,
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": f"{settings.FRONTEND_URL}/purchase/success?provider=yukassa&order_id={order.id}"
        },
        "capture": True,
        "description": f"Pixel Block ({block.x}, {block.y}) - Resale",
        "metadata": {
            "order_id": str(order.id),
            "block_id": str(block.id),
            "user_id": str(user_id),
            "listing_id": str(listing.id),
            "order_type": "resale_purchase",
        }
    }

    with httpx.Client() as client:
        resp = client.post(
            f"{YUKASSA_API_URL}/payments",
            json=payment_data,
            auth=_get_auth(),
            headers={
                "Idempotence-Key": idempotency_key,
                "Content-Type": "application/json"
            }
        )

    if resp.status_code not in (200, 201):
        raise ValueError(f"Payment creation failed: {resp.text}")

    payment = resp.json()
    order.provider_session_id = payment["id"]
    db.commit()

    return {
        "checkout_url": payment["confirmation"]["confirmation_url"],
        "session_id": payment["id"],
        "order_id": order.id,
    }


def handle_yukassa_webhook(db: Session, payment_data: dict):
    """Process YooKassa webhook notification."""
    payment_obj = payment_data.get("object", {})
    payment_id = payment_obj.get("id")
    status = payment_obj.get("status")
    metadata = payment_obj.get("metadata", {})
    order_id = int(metadata.get("order_id", 0))

    if not payment_id or not order_id:
        logger.warning(f"YooKassa webhook: missing payment_id or order_id")
        return

    order = db.query(Order).with_for_update().filter(
        Order.id == order_id,
        Order.provider_session_id == payment_id,
    ).first()

    if not order:
        logger.warning(f"YooKassa: order not found for payment {payment_id}")
        return

    if order.status != OrderStatus.PENDING:
        logger.info(f"YooKassa: order {order_id} already processed")
        return

    if status == "succeeded":
        block = db.query(Block).with_for_update().filter(Block.id == order.block_id).first()
        if not block:
            order.status = OrderStatus.FAILED
            db.commit()
            return

        order.status = OrderStatus.PAID

        if order.order_type == "resale_purchase":
            listing_id = int(metadata.get("listing_id", 0))
            listing = db.query(Listing).filter(Listing.id == listing_id).first()
            if listing:
                listing.status = ListingStatus.SOLD

            fee_amount = int(order.amount * settings.RESALE_FEE_PERCENT / 100)

            block.owner_id = order.user_id
            block.status = BlockStatus.OWNED
            block.reserved_by = None
            block.reserved_until = None
            block.current_price = order.amount

            txn = Transaction(
                order_id=order.id, user_id=order.user_id, block_id=block.id,
                transaction_type=TransactionType.RESALE_PURCHASE,
                amount=order.amount, fee_amount=fee_amount,
            )
            db.add(txn)
        else:
            block.owner_id = order.user_id
            block.status = BlockStatus.OWNED
            block.reserved_by = None
            block.reserved_until = None

            txn = Transaction(
                order_id=order.id, user_id=order.user_id, block_id=block.id,
                transaction_type=TransactionType.PRIMARY_PURCHASE,
                amount=order.amount, fee_amount=0,
            )
            db.add(txn)

        db.commit()
        logger.info(f"YooKassa: order {order_id} completed")

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(manager.broadcast({
                    "type": "block_update",
                    "block": {
                        "id": block.id, "x": block.x, "y": block.y,
                        "status": block.status.value, "owner_id": block.owner_id,
                        "current_price": block.current_price,
                    },
                }))
        except Exception as e:
            logger.error(f"Broadcast error: {e}")

    elif status in ("canceled", "expired"):
        order.status = OrderStatus.CANCELED if status == "canceled" else OrderStatus.EXPIRED
        block = db.query(Block).filter(Block.id == order.block_id).first()
        if block and block.status == BlockStatus.RESERVED and block.reserved_by == order.user_id:
            if block.owner_id:
                block.status = BlockStatus.OWNED
            else:
                block.status = BlockStatus.FREE
            block.reserved_by = None
            block.reserved_until = None
        db.commit()
