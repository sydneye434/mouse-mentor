"""
Saved trip data per user (async SQLAlchemy + JSON column).
Developed by Sydney Edwards.
"""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import SavedTrip


async def save_trip(
    session: AsyncSession, user_id: int, trip_data: dict[str, Any]
) -> None:
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        session.add(SavedTrip(user_id=user_id, trip_data=trip_data))
    else:
        row.trip_data = trip_data
    await session.flush()


async def get_trip(session: AsyncSession, user_id: int) -> Optional[dict[str, Any]]:
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return dict(row.trip_data)


async def delete_trip(session: AsyncSession, user_id: int) -> None:
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is not None:
        await session.delete(row)
    await session.flush()
