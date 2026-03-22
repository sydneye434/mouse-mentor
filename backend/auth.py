"""
User accounts and JWT auth. Async SQLAlchemy for user persistence.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import datetime
import os
from typing import Any, Optional

import bcrypt
import jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

import env  # noqa: F401
from models import User


# JWT secret: required in production (set JWT_SECRET_KEY)
def _jwt_secret() -> str:
    key = os.environ.get("JWT_SECRET_KEY", "").strip()
    if key:
        return key
    environment = os.environ.get("ENVIRONMENT", "").lower()
    if environment in ("production", "prod"):
        raise RuntimeError("JWT_SECRET_KEY must be set in production")
    return "dev-only-jwt-secret-change-in-production-min-32-chars"


SECRET_KEY = _jwt_secret()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


async def create_user(
    session: AsyncSession, email: str, password: str
) -> dict[str, Any]:
    normalized = email.strip().lower()
    hashed = hash_password(password)
    user = User(email=normalized, hashed_password=hashed)
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "is_pro": bool(user.is_pro),
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


async def get_user_by_email(
    session: AsyncSession, email: str
) -> Optional[dict[str, Any]]:
    result = await session.execute(
        select(User).where(User.email == email.strip().lower())
    )
    user = result.scalar_one_or_none()
    if user is None:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "is_pro": bool(user.is_pro),
        "hashed_password": user.hashed_password,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


async def get_user_by_id(
    session: AsyncSession, user_id: int
) -> Optional[dict[str, Any]]:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "is_pro": bool(user.is_pro),
        "hashed_password": user.hashed_password,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


async def set_user_pro(session: AsyncSession, user_id: int) -> None:
    """Mark account as Pro (one-time purchase)."""
    await session.execute(update(User).where(User.id == user_id).values(is_pro=True))


def create_access_token(user_id: int, is_pro: bool = False) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(
        days=ACCESS_TOKEN_EXPIRE_DAYS,
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "is_pro": is_pro,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token_claims(token: str) -> Optional[dict[str, Any]]:
    """Decode JWT; return user_id and is_pro, or None if invalid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            return None
        return {
            "user_id": int(sub),
            "is_pro": bool(payload.get("is_pro", False)),
        }
    except (jwt.PyJWTError, ValueError, TypeError):
        return None


def decode_access_token(token: str) -> Optional[int]:
    claims = decode_token_claims(token)
    return claims["user_id"] if claims else None
