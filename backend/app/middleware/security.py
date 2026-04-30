"""
Security middleware for FastAPI.

Sets industry-standard headers:
- HSTS (force HTTPS for 2 years)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Opener-Policy
- Strict CSP (Content Security Policy)
"""
import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


CSP_DIRECTIVES = {
    "default-src": "'self'",
    "script-src": "'self' 'unsafe-inline' https://challenges.cloudflare.com https://mc.yandex.ru",
    "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src": "'self' https://fonts.gstatic.com data:",
    "img-src": "'self' data: blob: https:",
    "connect-src": "'self' wss: https://pixelcanvas-api.onrender.com https://*.sentry.io https://mc.yandex.ru",
    "frame-src": "https://challenges.cloudflare.com",
    "frame-ancestors": "'none'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "upgrade-insecure-requests": "",
}


def build_csp() -> str:
    """Compose CSP header from directive dict."""
    return "; ".join(
        f"{key} {value}".strip() for key, value in CSP_DIRECTIVES.items()
    )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Apply security headers to every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Headers that should be on every response
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload",
        )
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self)",
        )
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("X-Permitted-Cross-Domain-Policies", "none")

        # CSP — only on HTML responses to avoid breaking API JSON
        ctype = response.headers.get("content-type", "")
        if "text/html" in ctype:
            response.headers.setdefault("Content-Security-Policy", build_csp())

        # Cache hints
        if request.url.path.startswith("/api/"):
            response.headers.setdefault(
                "Cache-Control", "no-store, no-cache, must-revalidate, private"
            )

        return response


class IpAnonymizationMiddleware(BaseHTTPMiddleware):
    """
    For ФЗ-152 compliance: zero out the last octet of client IP in logs.
    Doesn't affect rate-limiting which keys on full IP in memory.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Anonymize client IP for downstream logging
        if request.client:
            ip = request.client.host
            if "." in ip:  # IPv4
                parts = ip.split(".")
                anonymized = ".".join(parts[:3] + ["0"])
                request.scope["client"] = (anonymized, request.client.port)
            elif ":" in ip:  # IPv6 — zero out last 80 bits
                parts = ip.split(":")
                anonymized = ":".join(parts[:3] + ["0"] * 5)
                request.scope["client"] = (anonymized, request.client.port)

        return await call_next(request)
