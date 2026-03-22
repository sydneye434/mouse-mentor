"""
Saved trip data per user (async SQLAlchemy + JSON column).
Developed by Sydney Edwards.
"""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import SavedTrip, StoredChatMessage


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


async def get_trip_bundle(
    session: AsyncSession, user_id: int
) -> Optional[dict[str, Any]]:
    """Trip JSON plus optional structured itinerary from LLM."""
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return {
        "trip": dict(row.trip_data),
        "generated_itinerary": row.generated_itinerary,
        "lightning_lane_guide": row.lightning_lane_guide,
        "dining_restaurants": row.dining_restaurants,
        "dining_want_to_go": list(row.dining_want_to_go or []),
        "dining_reminder_enabled": bool(row.dining_reminder_enabled),
    }


async def set_generated_itinerary(
    session: AsyncSession, user_id: int, itinerary: dict[str, Any]
) -> None:
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise ValueError("No saved trip for user")
    row.generated_itinerary = itinerary
    await session.flush()


async def set_lightning_lane_guide(
    session: AsyncSession, user_id: int, guide: dict[str, Any]
) -> None:
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise ValueError("No saved trip for user")
    row.lightning_lane_guide = guide
    await session.flush()


async def set_dining_restaurants(
    session: AsyncSession, user_id: int, data: dict[str, Any]
) -> None:
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise ValueError("No saved trip for user")
    row.dining_restaurants = data
    await session.flush()


async def update_dining_preferences(
    session: AsyncSession,
    user_id: int,
    *,
    want_to_go: Optional[list[str]] = None,
    reminder_enabled: Optional[bool] = None,
) -> None:
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise ValueError("No saved trip for user")
    if want_to_go is not None:
        row.dining_want_to_go = want_to_go
    if reminder_enabled is not None:
        row.dining_reminder_enabled = reminder_enabled
    await session.flush()


async def delete_trip(session: AsyncSession, user_id: int) -> None:
    result = await session.execute(
        select(SavedTrip).where(SavedTrip.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is not None:
        await session.delete(row)
    await session.flush()


async def set_chat_messages(
    session: AsyncSession, user_id: int, messages: list[dict[str, str]]
) -> None:
    """Replace all chat messages for the user with the given list (ordered)."""
    await session.execute(
        delete(StoredChatMessage).where(StoredChatMessage.user_id == user_id)
    )
    for seq, m in enumerate(messages):
        role = m.get("role", "")
        text = m.get("text", "")
        if role not in ("user", "assistant") or not text.strip():
            continue
        session.add(
            StoredChatMessage(
                user_id=user_id,
                role=role,
                text=text,
                seq=seq,
            )
        )
    await session.flush()


async def get_chat_messages(
    session: AsyncSession, user_id: int
) -> list[StoredChatMessage]:
    result = await session.execute(
        select(StoredChatMessage)
        .where(StoredChatMessage.user_id == user_id)
        .order_by(StoredChatMessage.seq.asc())
    )
    return list(result.scalars().all())


async def clear_chat_messages(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        delete(StoredChatMessage).where(StoredChatMessage.user_id == user_id)
    )
    await session.flush()
