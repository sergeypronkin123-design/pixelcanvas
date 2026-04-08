from sqlalchemy.orm import Session
from app.models.block import Block, BlockStatus
from app.core.config import get_settings
from app.services.pricing import calculate_block_price
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


def initialize_canvas(db: Session):
    """Create all blocks for the canvas if not already created."""
    existing = db.query(Block).first()
    if existing:
        logger.info("Canvas already initialized")
        return

    logger.info(f"Initializing canvas: {settings.CANVAS_WIDTH}x{settings.CANVAS_HEIGHT}, block size {settings.BLOCK_SIZE}")

    blocks_x = settings.CANVAS_WIDTH // settings.BLOCK_SIZE
    blocks_y = settings.CANVAS_HEIGHT // settings.BLOCK_SIZE

    blocks = []
    for bx in range(blocks_x):
        for by in range(blocks_y):
            x = bx * settings.BLOCK_SIZE
            y = by * settings.BLOCK_SIZE
            block = Block(
                x=x, y=y,
                width=settings.BLOCK_SIZE,
                height=settings.BLOCK_SIZE,
                status=BlockStatus.FREE,
                base_price=settings.BASE_BLOCK_PRICE,
                current_price=settings.BASE_BLOCK_PRICE,
            )
            blocks.append(block)

    db.bulk_save_objects(blocks)
    db.commit()
    logger.info(f"Created {len(blocks)} blocks")

    # Update prices based on location
    all_blocks = db.query(Block).all()
    for block in all_blocks:
        block.current_price = calculate_block_price(db, block)
    db.commit()
    logger.info("Updated block prices")
