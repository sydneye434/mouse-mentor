"""
Async SQLAlchemy engine and session factory for PostgreSQL (production) or SQLite (tests).
Developed by Sydney Edwards.
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool, StaticPool

import env  # noqa: F401
from models import Base


def normalize_database_url(url: str) -> str:
    """Render/Heroku use postgres://; SQLAlchemy async needs postgresql+asyncpg://."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        # Local dev fallback (use PostgreSQL in production — see .env.example)
        url = "sqlite+aiosqlite:///./local.db"
    return normalize_database_url(url)


def _create_engine():
    url = _database_url()
    kwargs: dict = {
        "echo": os.environ.get("SQL_ECHO", "").lower() in ("1", "true", "yes")
    }
    if "sqlite" in url:
        kwargs["connect_args"] = {"check_same_thread": False}
        kwargs["poolclass"] = StaticPool
    else:
        # Serverless-friendly: small pool; Render sets connection limits
        kwargs["pool_pre_ping"] = True
        if os.environ.get("DATABASE_POOL_CLASS") == "null":
            kwargs["poolclass"] = NullPool
    return create_async_engine(url, **kwargs)


engine = _create_engine()

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def _migrate_users_is_pro_column(connection) -> None:
    """Add is_pro to existing databases created before this column existed."""
    insp = inspect(connection)
    try:
        cols = [c["name"] for c in insp.get_columns("users")]
    except Exception:
        return
    if "is_pro" in cols:
        return
    dialect = connection.dialect.name
    if dialect == "sqlite":
        connection.execute(
            text("ALTER TABLE users ADD COLUMN is_pro BOOLEAN NOT NULL DEFAULT 0")
        )
    else:
        connection.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro "
                "BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )


async def init_db() -> None:
    """Create tables if they do not exist; migrate legacy schemas."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_users_is_pro_column)
