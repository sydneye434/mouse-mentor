"""
Pytest configuration: env vars before engine import; DB init; table cleanup.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import os

# Must be set before database.main (or any module that imports database) is imported.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault(
    "JWT_SECRET_KEY", "test-jwt-secret-key-minimum-32-characters-long!!"
)

import pytest_asyncio
from sqlalchemy import delete

from models import SavedTrip, User


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _init_database():
    from database import init_db

    await init_db()


@pytest_asyncio.fixture(autouse=True)
async def clean_tables():
    """Clear user/trip rows between tests (SQLite in-memory shared engine)."""
    from database import async_session_maker

    async with async_session_maker() as session:
        await session.execute(delete(SavedTrip))
        await session.execute(delete(User))
        await session.commit()
    yield
