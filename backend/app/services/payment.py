import stripe
import json
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.config import get_settings
from app.models import Block, BlockStatus, Order, OrderStatus, Transaction, TransactionType, Listing, ListingStatus, WebhookEvent
from app.services.pricing import calculate_resale_fee
from app.services.websocket import manager
import asyncio

logger = logging.getLogger(__name__)
settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_primary_checkout(db: Session, user_id: int, block_id: int) -> dict:
    """Create a Stripe checkout session for primary block purchase."""
    block = db.query(Block).with_for_update().filter(Block.id == block_id).first()
    if not block:
        raise ValueError("Block not found")
    if block.status not in (BlockStatus.FREE,):
        raise ValueError("Block is not available for purchase")

    # Reserve the block
    block.status = BlockStatus.RESERVED
    block.reserved_by = user_id
    block.reserved_until = datetime.now(timezone.utc) + timedelta(seconds=settings.RESERVATION_TIMEOUT_SECONDS)

    # Create order
    order = Order(
        user_id=user_id,
        block_id=block_id,
        amount=block.current_price,
        currency=settings.CURRENCY,
        provider="stripe",
        status=OrderStatus.PENDING,
        order_type="primary_purchase",
    )
    db.add(order)
    db.flush()

    # Create Stripe session
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": settings.CURRENCY,
                "unit_amount": block.current_price,
                "product_data": {
                    "name": f"Pixel Block ({block.x}, {block.y})",
                    "description": f"{block.width}x{block.height} pixel block at position ({block.x}, {block.y})",
                },
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{settings.FRONTEND_URL}/purchase/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/purchase/cancel?session_id={{CHECKOUT_SESSION_ID}}",
        metadata={
            "order_id": str(order.id),
            "block_id": str(block_id),
            "user_id": str(user_id),
            "order_type": "primary_purchase",
        },
        expires_at=int((datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp()),
    )

    order.provider_session_id = session.id
    db.commit()

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "order_id": order.id,
    }


def create_resale_checkout(db: Session, user_id: int, listing_id: int) -> dict:
    """Create checkout session for resale purchase."""
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

    # Reserve
    block.status = BlockStatus.RESERVED
    block.reserved_by = user_id
    block.reserved_until = datetime.now(timezone.utc) + timedelta(seconds=settings.RESERVATION_TIMEOUT_SECONDS)

    order = Order(
        user_id=user_id,
        block_id=block.id,
        amount=listing.price,
        currency=settings.CURRENCY,
        provider="stripe",
        status=OrderStatus.PENDING,
        order_type="resale_purchase",
        listing_id=listing.id,
    )
    db.add(order)
    db.flush()

    fee = calculate_resale_fee(listing.price)

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": settings.CURRENCY,
                "unit_amount": listing.price,
                "product_data": {
                    "name": f"Pixel Block ({block.x}, {block.y}) - Resale",
                    "description": f"Resale of {block.width}x{block.height} block at ({block.x}, {block.y})",
                },
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{settings.FRONTEND_URL}/purchase/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/purchase/cancel?session_id={{CHECKOUT_SESSION_ID}}",
        metadata={
            "order_id": str(order.id),
            "block_id": str(block.id),
            "user_id": str(user_id),
            "listing_id": str(listing.id),
            "order_type": "resale_purchase",
            "fee_amount": str(fee),
        },
        expires_at=int((datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp()),
    )

    order.provider_session_id = session.id
    db.commit()

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "order_id": order.id,
    }


def handle_checkout_completed(db: Session, session_data: dict):
    """Process successful Stripe checkout - called from webhook."""
    session_id = session_data.get("id")
    metadata = session_data.get("metadata", {})
    order_id = int(metadata.get("order_id", 0))
    order_type = metadata.get("order_type", "primary_purchase")

    order = db.query(Order).with_for_update().filter(
        Order.id == order_id,
        Order.provider_session_id == session_id,
        Order.status == OrderStatus.PENDING,
    ).first()

    if not order:
        logger.warning(f"Order not found or already processed: order_id={order_id}, session={session_id}")
        return

    block = db.query(Block).with_for_update().filter(Block.id == order.block_id).first()
    if not block:
        logger.error(f"Block not found for order {order_id}")
        order.status = OrderStatus.FAILED
        db.commit()
        return

    # Mark order paid
    order.status = OrderStatus.PAID

    if order_type == "resale_purchase":
        listing_id = int(metadata.get("listing_id", 0))
        fee_amount = int(metadata.get("fee_amount", 0))

        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if listing:
            listing.status = ListingStatus.SOLD

        # Transfer ownership
        block.owner_id = order.user_id
        block.status = BlockStatus.OWNED
        block.reserved_by = None
        block.reserved_until = None
        block.current_price = order.amount

        # Create transaction
        txn = Transaction(
            order_id=order.id,
            user_id=order.user_id,
            block_id=block.id,
            transaction_type=TransactionType.RESALE_PURCHASE,
            amount=order.amount,
            fee_amount=fee_amount,
        )
        db.add(txn)
    else:
        # Primary purchase
        block.owner_id = order.user_id
        block.status = BlockStatus.OWNED
        block.reserved_by = None
        block.reserved_until = None

        txn = Transaction(
            order_id=order.id,
            user_id=order.user_id,
            block_id=block.id,
            transaction_type=TransactionType.PRIMARY_PURCHASE,
            amount=order.amount,
            fee_amount=0,
        )
        db.add(txn)

    db.commit()
    logger.info(f"Order {order_id} completed successfully")

    # Broadcast update
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(manager.broadcast({
                "type": "block_update",
                "block": {
                    "id": block.id,
                    "x": block.x,
                    "y": block.y,
                    "status": block.status.value,
                    "owner_id": block.owner_id,
                    "current_price": block.current_price,
                },
            }))
    except Exception as e:
        logger.error(f"Failed to broadcast update: {e}")


def cleanup_expired_reservations(db: Session):
    """Release blocks with expired reservations."""
    now = datetime.now(timezone.utc)
    expired_blocks = db.query(Block).filter(
        Block.status == BlockStatus.RESERVED,
        Block.reserved_until < now,
    ).all()

    for block in expired_blocks:
        # Check if there was a listing before reservation
        active_listing = db.query(Listing).filter(
            Listing.block_id == block.id,
            Listing.status == ListingStatus.ACTIVE,
        ).first()

        if active_listing and block.owner_id:
            block.status = BlockStatus.LISTED
        elif block.owner_id:
            block.status = BlockStatus.OWNED
        else:
            block.status = BlockStatus.FREE

        block.reserved_by = None
        block.reserved_until = None

        # Expire related pending orders
        db.query(Order).filter(
            Order.block_id == block.id,
            Order.status == OrderStatus.PENDING,
        ).update({"status": OrderStatus.EXPIRED})

    if expired_blocks:
        db.commit()
        logger.info(f"Cleaned up {len(expired_blocks)} expired reservations")
