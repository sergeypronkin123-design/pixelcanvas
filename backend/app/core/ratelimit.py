"""
Rate limiter для защиты от брутфорса и абьюза.

Лимиты:
- /auth/login: 5/min/IP (защита от brute-force пароля)
- /auth/register: 3/min/IP (защита от спам-регистраций)
- /pixels/place: 100/min/user (защита от бот-ферм)
- /subscribe/checkout: 10/min/user (защита от абьюза)
- default: 60/min/IP (общий)
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request


def _key_func(request: Request) -> str:
    """Ключ лимита: авторизованный user_id или IP"""
    # Пытаемся достать user_id из токена (если есть)
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    # X-Forwarded-For учитывается slowapi автоматически
    return get_remote_address(request)


limiter = Limiter(key_func=_key_func, default_limits=["60/minute"])
