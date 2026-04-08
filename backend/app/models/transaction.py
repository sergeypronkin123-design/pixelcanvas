from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class TransactionType(str, enum.Enum):
    PRIMARY_PURCHASE = "primary_purchase"
    RESALE_PURCHASE = "resale_purchase"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=False, index=True)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    amount = Column(Integer, nullable=False)
    fee_amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order = relationship("Order", back_populates="transactions")
