from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket import manager
from app.core.security import decode_access_token
from app.core.database import SessionLocal
from app.models.user import User
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = Query(None)):
    """
    WebSocket с опциональной авторизацией.
    Неавторизованные подключения получают broadcast, но не считаются в online_count.
    """
    user_id = None
    if token:
        try:
            payload = decode_access_token(token)
            user_id = int(payload.get("sub", 0)) if payload else None
        except Exception:
            user_id = None

    await manager.connect(websocket, user_id=user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WS error: {e}")
        await manager.disconnect(websocket)
