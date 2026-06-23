from __future__ import annotations

from django.core.cache import cache
from django.http import HttpRequest


def get_client_ip(request: HttpRequest) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def is_rate_limited(request: HttpRequest, action: str, limit: int, window: int) -> bool:
    """Return True if this IP has exceeded `limit` calls to `action` within `window` seconds."""
    ip = get_client_ip(request)
    key = f"rl:{action}:{ip}"
    count = cache.get(key, 0)
    if count >= limit:
        return True
    cache.set(key, count + 1, timeout=window)
    return False
