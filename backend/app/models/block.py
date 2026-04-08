from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Index, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class BlockStatus(str, enum.Enum):
    FREE = "free"
    RESERVED = "reserved"
    OWNED = "owned"
    LISTED = "listed"


class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False, default=10)
    height = Column(Integer, nullable=False, default=10)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    status = Column(SAEnum(BlockStatus), default=BlockStatus.FREE, nullable=False, index=True)
    base_price = Column(Integer, nullable=False, default=100)
    current_price = Column(Integer, nullable=False, default=100)
    reserved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reserved_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_blocks_xy", "x", "y", unique=True),
        Index("ix_blocks_status", "status"),
    )

    owner = relationship("User", back_populates="blocks", foreign_keys=[owner_id])
    pixels = relationship("PixelData", back_populates="block", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="block")
    listings = relationship("Listing", back_populates="block")
