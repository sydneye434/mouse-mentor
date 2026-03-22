"""
FastAPI dependencies: auth guards.
Developed by Sydney Edwards.
"""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

import auth
from database import get_session


def get_current_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Optional[int]:
    """Return user_id from Bearer token, or None if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "").strip()
    return auth.decode_access_token(token)


async def require_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    session: AsyncSession = Depends(get_session),
) -> int:
    """Return user_id from Bearer token or raise 401."""
    user_id = get_current_user_id(authorization)
    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Sign in to save or load your trip",
        )
    user = await auth.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


async def require_pro(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    session: AsyncSession = Depends(get_session),
) -> int:
    """Require signed-in user with Pro (JWT or DB)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Sign in to use this feature.",
        )
    token = authorization.replace("Bearer ", "").strip()
    claims = auth.decode_token_claims(token)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = claims["user_id"]
    user = await auth.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not user["is_pro"]:
        raise HTTPException(
            status_code=403,
            detail="Mouse Mentor Pro required for this feature.",
        )
    return user_id
