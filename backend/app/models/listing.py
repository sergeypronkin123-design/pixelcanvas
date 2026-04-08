from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Enum as SAEnum, String
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ListingStatus(str, enum.Enum):
    ACTIVE = "active"
    SOLD = "sold"
    CANCELED = "canceled"


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    price = Column(Integer, nullable=False)
    status = Column(SAEnum(ListingStatus), default=ListingStatus.ACTIVE, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    block = relationship("Block", back_populates="listings")
    seller = relationship("User", back_populates="listings")
