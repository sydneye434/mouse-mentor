"""
Background task: poll dining availability on an interval.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import asyncio
import logging
import os

from database import async_session_maker

logger = logging.getLogger(__name__)

_poll_task: asyncio.Task | None = None


async def _poll_loop() -> None:
    if os.environ.get("DISABLE_DINING_POLL", "").lower() in ("1", "true", "yes"):
        await asyncio.Event().wait()
        return
    interval = max(60, int(os.environ.get("POLL_INTERVAL_SECONDS", "240")))
    await asyncio.sleep(5)
    while True:
        await asyncio.sleep(interval)
        try:
            async with async_session_maker() as session:
                from dining_availability import poll_all_active_alerts

                await poll_all_active_alerts(session)
                await session.commit()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("dining availability poll iteration")


def start_dining_poll_task() -> asyncio.Task | None:
    global _poll_task
    if os.environ.get("DISABLE_DINING_POLL", "").lower() in ("1", "true", "yes"):
        return None
    _poll_task = asyncio.create_task(_poll_loop(), name="dining_poll")
    return _poll_task


async def stop_dining_poll_task(task: asyncio.Task | None) -> None:
    if task is None:
        return
    if task.done():
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
