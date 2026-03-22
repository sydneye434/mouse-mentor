"""
Rate-limit key helpers for /chat: per authenticated user vs per client IP.
Developed by Sydney Edwards.
"""

from __future__ import annotations

from slowapi.util import get_remote_address
from starlette.requests import Request

import auth


def chat_rate_limit_key(request: Request) -> str:
    """
    Return a stable key for slowapi: user:{id} when Bearer token is valid,
    otherwise ip:{remote_addr}.
    """
    auth_header = request.headers.get("Authorization") or ""
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
        uid = auth.decode_access_token(token)
        if uid is not None:
            return f"user:{uid}"
    host = get_remote_address(request) or "unknown"
    return f"ip:{host}"


def chat_limit_for_key(key: str) -> str:
    """Authenticated users get a higher limit than anonymous (IP) clients."""
    if key.startswith("user:"):
        return "30/hour"
    return "5/hour"
