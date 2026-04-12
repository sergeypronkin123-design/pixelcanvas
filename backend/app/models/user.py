from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_subscriber = Column(Boolean, default=False)
    subscription_until = Column(DateTime(timezone=True), nullable=True)
    last_pixel_at = Column(DateTime(timezone=True), nullable=True)
    pixels_placed_total = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
