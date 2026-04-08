from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Block, BlockStatus, PixelData, User
from app.schemas import PixelUpdate, PixelOut, BlockPixelsOut
from app.services.websocket import manager
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pixels", tags=["pixels"])


@router.get("/block/{block_id}", response_model=BlockPixelsOut)
def get_block_pixels(block_id: int, db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(404, "Block not found")

    pixels = db.query(PixelData).filter(PixelData.block_id == block_id).all()
    return BlockPixelsOut(
        block_id=block_id,
        pixels=[PixelOut.model_validate(p) for p in pixels],
    )


@router.get("/region")
def get_region_pixels(
    x_min: int = 0, y_min: int = 0, x_max: int = 1000, y_max: int = 1000,
    db: Session = Depends(get_db),
):
    """Get all pixels in a viewport region for rendering."""
    blocks = db.query(Block).filter(
        Block.x >= x_min, Block.y >= y_min,
        Block.x < x_max, Block.y < y_max,
        Block.status.in_([BlockStatus.OWNED, BlockStatus.LISTED]),
    ).all()

    block_ids = [b.id for b in blocks]
    if not block_ids:
        return {"pixels": []}

    block_map = {b.id: b for b in blocks}
    pixels = db.query(PixelData).filter(PixelData.block_id.in_(block_ids)).all()

    result = []
    for p in pixels:
        b = block_map.get(p.block_id)
        if b:
            result.append({
                "x": b.x + p.local_x,
                "y": b.y + p.local_y,
                "color": p.color,
            })

    return {"pixels": result}


@router.post("/draw")
def draw_pixels(data: PixelUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    block = db.query(Block).filter(Block.id == data.block_id).first()
    if not block:
        raise HTTPException(404, "Block not found")
    if block.owner_id != user.id:
        raise HTTPException(403, "You don't own this block")
    if block.status not in (BlockStatus.OWNED, BlockStatus.LISTED):
        raise HTTPException(400, "Block is not in drawable state")

    if len(data.pixels) > 100:
        raise HTTPException(400, "Too many pixels in single request (max 100)")

    updated_pixels = []
    for px in data.pixels:
        if px.local_x < 0 or px.local_x >= block.width or px.local_y < 0 or px.local_y >= block.height:
            continue

        existing = db.query(PixelData).filter(
            PixelData.block_id == data.block_id,
            PixelData.local_x == px.local_x,
            PixelData.local_y == px.local_y,
        ).first()

        if existing:
            existing.color = px.color
        else:
            new_pixel = PixelData(
                block_id=data.block_id,
                local_x=px.local_x,
                local_y=px.local_y,
                color=px.color,
            )
            db.add(new_pixel)

        updated_pixels.append({
            "x": block.x + px.local_x,
            "y": block.y + px.local_y,
            "color": px.color,
        })

    db.commit()

    # Broadcast pixel updates
    if updated_pixels:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(manager.broadcast({
                    "type": "pixel_update",
                    "pixels": updated_pixels,
                }))
        except Exception as e:
            logger.error(f"Broadcast error: {e}")

    return {"status": "ok", "updated": len(updated_pixels)}
