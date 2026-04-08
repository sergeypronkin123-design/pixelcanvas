from sqlalchemy.orm import Session
from app.models.block import Block, BlockStatus
from app.core.config import get_settings

settings = get_settings()


def calculate_block_price(db: Session, block: Block) -> int:
    """Calculate dynamic price for a block based on location and scarcity."""
    base = settings.BASE_BLOCK_PRICE

    # Scarcity multiplier: as more blocks are owned, price increases
    total_blocks = db.query(Block).count()
    owned_blocks = db.query(Block).filter(Block.status.in_([BlockStatus.OWNED, BlockStatus.LISTED])).count()

    if total_blocks > 0:
        occupancy = owned_blocks / total_blocks
        scarcity_mult = 1.0 + (occupancy * 2.0)  # Up to 3x at full occupancy
    else:
        scarcity_mult = 1.0

    # Location multiplier: center blocks are more valuable
    cx = settings.CANVAS_WIDTH / 2
    cy = settings.CANVAS_HEIGHT / 2
    dist = ((block.x - cx) ** 2 + (block.y - cy) ** 2) ** 0.5
    max_dist = (cx ** 2 + cy ** 2) ** 0.5
    location_mult = 1.0 + (1.0 - dist / max_dist) * 0.5  # Up to 1.5x at center

    return int(base * scarcity_mult * location_mult)


def calculate_resale_fee(amount: int) -> int:
    """Calculate platform fee on resale."""
    return int(amount * settings.RESALE_FEE_PERCENT / 100)
