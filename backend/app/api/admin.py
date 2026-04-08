from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.core.security import require_admin
from app.models import User, Block, BlockStatus, Order, OrderStatus, Transaction, Listing, ListingStatus
from app.schemas import AdminStats, UserPublic, OrderOut, ListingOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def get_stats(admin=Depends(require_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_owned = db.query(Block).filter(Block.status.in_([BlockStatus.OWNED, BlockStatus.LISTED])).count()
    total_orders = db.query(Order).filter(Order.status == OrderStatus.PAID).count()
    total_revenue = db.query(func.coalesce(func.sum(Transaction.amount), 0)).scalar()
    active_listings = db.query(Listing).filter(Listing.status == ListingStatus.ACTIVE).count()

    return AdminStats(
        total_users=total_users,
        total_blocks_owned=total_owned,
        total_orders=total_orders,
        total_revenue=total_revenue,
        active_listings=active_listings,
    )


@router.get("/users", response_model=List[UserPublic])
def list_users(
    limit: int = Query(50, le=200),
    offset: int = 0,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return [UserPublic.model_validate(u) for u in users]


@router.get("/orders", response_model=List[OrderOut])
def list_orders(
    limit: int = Query(50, le=200),
    offset: int = 0,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    orders = db.query(Order).order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    return [OrderOut.model_validate(o) for o in orders]


@router.get("/transactions")
def list_transactions(
    limit: int = Query(50, le=200),
    offset: int = 0,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    txns = db.query(Transaction).order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()
    return [{
        "id": t.id, "order_id": t.order_id, "user_id": t.user_id,
        "block_id": t.block_id, "type": t.transaction_type.value,
        "amount": t.amount, "fee_amount": t.fee_amount,
        "created_at": t.created_at.isoformat(),
    } for t in txns]


@router.get("/listings", response_model=List[ListingOut])
def list_all_listings(
    limit: int = Query(50, le=200),
    offset: int = 0,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    listings = db.query(Listing).order_by(Listing.created_at.desc()).offset(offset).limit(limit).all()
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
