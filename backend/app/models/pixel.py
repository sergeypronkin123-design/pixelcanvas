from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class PixelData(Base):
    __tablename__ = "pixel_data"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id", ondelete="CASCADE"), nullable=False, index=True)
    local_x = Column(Integer, nullable=False)
    local_y = Column(Integer, nullable=False)
    color = Column(String(7), nullable=False, default="#000000")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_pixel_block_xy", "block_id", "local_x", "local_y", unique=True),
    )

    block = relationship("Block", back_populates="pixels")
