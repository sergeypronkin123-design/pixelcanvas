from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELED = "canceled"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="usd")
    provider = Column(String(50), nullable=False, default="stripe")
    provider_session_id = Column(String(255), nullable=True, unique=True, index=True)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)
    order_type = Column(String(50), nullable=False, default="primary_purchase")
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="orders")
    block = relationship("Block", back_populates="orders")
    listing = relationship("Listing", foreign_keys=[listing_id])
    transactions = relationship("Transaction", back_populates="order")
