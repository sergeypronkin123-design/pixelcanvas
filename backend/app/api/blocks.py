from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models import Block, BlockStatus, User
from app.schemas import BlockOut, BlockBulkOut, CanvasStateOut
from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/blocks", tags=["blocks"])


@router.get("/canvas", response_model=CanvasStateOut)
def get_canvas_state(
    x_min: int = Query(0, ge=0),
    y_min: int = Query(0, ge=0),
    x_max: int = Query(1000),
    y_max: int = Query(1000),
    db: Session = Depends(get_db),
):
    """Get all blocks within viewport for rendering."""
    blocks = db.query(Block).filter(
        and_(
            Block.x >= x_min,
            Block.y >= y_min,
            Block.x < x_max,
            Block.y < y_max,
        )
    ).all()

    return CanvasStateOut(
        blocks=[BlockBulkOut(
            id=b.id, x=b.x, y=b.y,
            status=b.status.value, owner_id=b.owner_id,
            current_price=b.current_price,
        ) for b in blocks],
        canvas_width=settings.CANVAS_WIDTH,
        canvas_height=settings.CANVAS_HEIGHT,
        block_size=settings.BLOCK_SIZE,
    )


@router.get("/{block_id}", response_model=BlockOut)
def get_block(block_id: int, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(404, "Block not found")

    owner_username = None
    if block.owner_id:
        owner = db.query(User).filter(User.id == block.owner_id).first()
        if owner:
            owner_username = owner.username

    out = BlockOut.model_validate(block)
    out.owner_username = owner_username
    return out


@router.get("/at/{x}/{y}", response_model=BlockOut)
def get_block_at(x: int, y: int, db: Session = Depends(get_db)):
    # Snap to block grid
    bx = (x // settings.BLOCK_SIZE) * settings.BLOCK_SIZE
    by = (y // settings.BLOCK_SIZE) * settings.BLOCK_SIZE

    block = db.query(Block).filter(Block.x == bx, Block.y == by).first()
    if not block:
        raise HTTPException(404, "Block not found")

    owner_username = None
    if block.owner_id:
        owner = db.query(User).filter(User.id == block.owner_id).first()
        if owner:
            owner_username = owner.username

    out = BlockOut.model_validate(block)
    out.owner_username = owner_username
    return out


@router.get("/owned/me", response_model=List[BlockOut])
def get_my_blocks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    blocks = db.query(Block).filter(
        Block.owner_id == user.id,
        Block.status.in_([BlockStatus.OWNED, BlockStatus.LISTED])
    ).all()
    result = []
    for b in blocks:
        out = BlockOut.model_validate(b)
        out.owner_username = user.username
        result.append(out)
    return result
