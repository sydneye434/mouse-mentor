"""
CRUD for dining_alerts (availability watches).
Developed by Sydney Edwards.
"""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import DiningAlert, DiningPollLog


async def create_alert(
    session: AsyncSession,
    user_id: int,
    *,
    restaurant: str,
    restaurant_slug: str,
    reservation_date: str,
    party_size: int,
    time_windows: list[str],
) -> DiningAlert:
    row = DiningAlert(
        user_id=user_id,
        restaurant=restaurant,
        restaurant_slug=restaurant_slug,
        reservation_date=reservation_date,
        party_size=party_size,
        time_windows=time_windows,
        active=True,
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return row


async def list_active_alerts_for_user(
    session: AsyncSession, user_id: int
) -> list[DiningAlert]:
    result = await session.execute(
        select(DiningAlert)
        .where(DiningAlert.user_id == user_id, DiningAlert.active.is_(True))
        .order_by(DiningAlert.created_at.desc())
    )
    return list(result.scalars().all())


async def list_all_active_alerts(session: AsyncSession) -> list[DiningAlert]:
    result = await session.execute(
        select(DiningAlert).where(DiningAlert.active.is_(True))
    )
    return list(result.scalars().all())


async def soft_delete_alert(
    session: AsyncSession, user_id: int, alert_id: int
) -> bool:
    result = await session.execute(
        select(DiningAlert).where(
            DiningAlert.id == alert_id,
            DiningAlert.user_id == user_id,
            DiningAlert.active.is_(True),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        return False
    row.active = False
    await session.flush()
    return True


async def deactivate_alert_by_id(session: AsyncSession, alert_id: int) -> None:
    await session.execute(
        update(DiningAlert).where(DiningAlert.id == alert_id).values(active=False)
    )
    await session.flush()


async def add_poll_log(
    session: AsyncSession,
    *,
    alert_id: Optional[int],
    outcome: str,
    message: str,
) -> None:
    session.add(
        DiningPollLog(
            alert_id=alert_id,
            outcome=outcome,
            message=message[:8000],
        )
    )
    await session.flush()


def alert_to_dict(row: DiningAlert) -> dict[str, Any]:
    return {
        "id": row.id,
        "restaurant": row.restaurant,
        "restaurant_slug": row.restaurant_slug,
        "date": row.reservation_date,
        "party_size": row.party_size,
        "time_windows": list(row.time_windows or []),
        "created_at": row.created_at.isoformat() if row.created_at else "",
    }
