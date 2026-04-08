from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from app.core.database import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), nullable=False, default="stripe")
    event_type = Column(String(100), nullable=False)
    external_id = Column(String(255), unique=True, nullable=False, index=True)
    processed = Column(Boolean, default=False, nullable=False)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
