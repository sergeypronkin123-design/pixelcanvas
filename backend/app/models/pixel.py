from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Index
from app.core.database import Base


class Pixel(Base):
    __tablename__ = "pixels"
    id = Column(Integer, primary_key=True, index=True)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    color = Column(String(7), nullable=False, default="#000000")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    clan_id = Column(Integer, nullable=True, index=True)  # какой клан владеет пикселем
    placed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_pixels_xy", "x", "y", unique=True),
    )
