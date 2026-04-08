from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Block, BlockStatus, Listing, ListingStatus, User
from app.schemas import CreateListing, ListingOut
from app.services.websocket import manager
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("/listings", response_model=List[ListingOut])
def get_listings(
    sort: str = Query("recent", enum=["recent", "price_asc", "price_desc"]),
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Listing).filter(Listing.status == ListingStatus.ACTIVE)

    if min_price is not None:
        q = q.filter(Listing.price >= min_price)
    if max_price is not None:
        q = q.filter(Listing.price <= max_price)

    if sort == "price_asc":
        q = q.order_by(Listing.price.asc())
    elif sort == "price_desc":
        q = q.order_by(Listing.price.desc())
    else:
        q = q.order_by(Listing.created_at.desc())

    listings = q.offset(offset).limit(limit).all()

    result = []
    for l in listings:
        block = db.query(Block).filter(Block.id == l.block_id).first()
        seller = db.query(User).filter(User.id == l.seller_id).first()
        out = ListingOut.model_validate(l)
        out.block_x = block.x if block else 0
        out.block_y = block.y if block else 0
        out.seller_username = seller.username if seller else ""
        result.append(out)

    return result


@router.post("/list", response_model=ListingOut)
def create_listing(data: CreateListing, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    block = db.query(Block).with_for_update().filter(Block.id == data.block_id).first()
    if not block:
        raise HTTPException(404, "Block not found")
    if block.owner_id != user.id:
        raise HTTPException(403, "You don't own this block")
    if block.status != BlockStatus.OWNED:
        raise HTTPException(400, "Block cannot be listed in current state")

    # Check for existing active listing
    existing = db.query(Listing).filter(
        Listing.block_id == data.block_id,
        Listing.status == ListingStatus.ACTIVE,
    ).first()
    if existing:
        raise HTTPException(400, "Block already has an active listing")

    listing = Listing(
        block_id=data.block_id,
        seller_id=user.id,
        price=data.price,
        status=ListingStatus.ACTIVE,
    )
    db.add(listing)

    block.status = BlockStatus.LISTED
    block.current_price = data.price
    db.commit()
    db.refresh(listing)

    out = ListingOut.model_validate(listing)
    out.block_x = block.x
    out.block_y = block.y
    out.seller_username = user.username

    # Broadcast
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(manager.broadcast({
                "type": "block_update",
                "block": {
                    "id": block.id, "x": block.x, "y": block.y,
                    "status": block.status.value,
                    "owner_id": block.owner_id,
                    "current_price": block.current_price,
                },
            }))
    except Exception:
        pass

    return out


@router.delete("/delist/{listing_id}")
def cancel_listing(listing_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.seller_id == user.id,
        Listing.status == ListingStatus.ACTIVE,
    ).first()
    if not listing:
        raise HTTPException(404, "Listing not found")

    listing.status = ListingStatus.CANCELED

    block = db.query(Block).filter(Block.id == listing.block_id).first()
    if block and block.status == BlockStatus.LISTED:
        block.status = BlockStatus.OWNED

    db.commit()

    return {"status": "delisted"}


@router.get("/my-listings", response_model=List[ListingOut])
def my_listings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listings = db.query(Listing).filter(Listing.seller_id == user.id).order_by(Listing.created_at.desc()).all()
    result = []
    for l in listings:
        block = db.query(Block).filter(Block.id == l.block_id).first()
        out = ListingOut.model_validate(l)
        out.block_x = block.x if block else 0
        out.block_y = block.y if block else 0
        out.seller_username = user.username
        result.append(out)
    return result
