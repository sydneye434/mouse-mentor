"""
Fetch Disney dining pages and match rough time strings to user windows.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import TYPE_CHECKING

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

import auth
import dining_alerts_store as das
from dining_email import send_dining_alert_email_sync
from dining_restaurants_list import ALLOWED_SLUGS

if TYPE_CHECKING:
    from models import DiningAlert

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _parse_time_to_minutes(s: str) -> int | None:
    s = re.sub(r"\s+", "", s.strip().upper())
    m = re.match(r"^(\d{1,2}):(\d{2})(AM|PM)$", s)
    if not m:
        return None
    h, mn, ap = int(m.group(1)), int(m.group(2)), m.group(3)
    if ap == "PM" and h != 12:
        h += 12
    if ap == "AM" and h == 12:
        h = 0
    if h > 23:
        return None
    return h * 60 + mn


def _parse_window_range(window: str) -> tuple[int, int] | None:
    parts = re.split(r"\s*[–\-]\s*", window.strip())
    if len(parts) != 2:
        return None
    a = _parse_time_to_minutes(parts[0])
    b = _parse_time_to_minutes(parts[1])
    if a is None or b is None:
        return None
    return (min(a, b), max(a, b))


def _time_in_windows(minutes: int, windows: list[str]) -> bool:
    for w in windows:
        pr = _parse_window_range(w)
        if pr and pr[0] <= minutes <= pr[1]:
            return True
    return False


def _extract_times_from_html(html: str) -> list[int]:
    found: list[int] = []
    for m in re.finditer(
        r"\b(\d{1,2}):(\d{2})\s*(AM|PM)\b", html, re.IGNORECASE
    ):
        chunk = f"{m.group(1)}:{m.group(2)}{m.group(3)}"
        t = _parse_time_to_minutes(chunk)
        if t is not None:
            found.append(t)
    return found


async def fetch_dining_page(slug: str) -> str:
    url = f"https://disneyworld.disney.go.com/dining/{slug}/"
    async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
        r = await client.get(url, headers={"User-Agent": USER_AGENT})
        r.raise_for_status()
        return r.text


async def check_one_alert(session: AsyncSession, alert: DiningAlert) -> None:
    slug = alert.restaurant_slug
    if slug not in ALLOWED_SLUGS:
        await das.add_poll_log(
            session,
            alert_id=alert.id,
            outcome="error",
            message="invalid restaurant slug",
        )
        return

    try:
        html = await fetch_dining_page(slug)
    except Exception as e:
        await das.add_poll_log(
            session,
            alert_id=alert.id,
            outcome="error",
            message=str(e)[:2000],
        )
        return

    times = _extract_times_from_html(html)
    windows = list(alert.time_windows or [])

    matched: int | None = None
    for tmin in times:
        if _time_in_windows(tmin, windows):
            matched = tmin
            break

    if matched is not None:
        h, m = divmod(matched, 60)
        ap = "AM" if h < 12 else "PM"
        h12 = h % 12
        if h12 == 0:
            h12 = 12
        label = f"{h12}:{m:02d} {ap}"
        await das.add_poll_log(
            session,
            alert_id=alert.id,
            outcome="found",
            message=f"found time-like token {label} in page",
        )
        u = await auth.get_user_by_id(session, alert.user_id)
        email = u.get("email") if u else None
        if email:
            await asyncio.to_thread(
                send_dining_alert_email_sync,
                to_email=email,
                restaurant=alert.restaurant,
                reservation_date=alert.reservation_date,
                party_size=alert.party_size,
                matched_detail=f"Possible match around {label} for your windows.",
                restaurant_slug=alert.restaurant_slug,
            )
        await das.deactivate_alert_by_id(session, alert.id)
        return

    await das.add_poll_log(
        session,
        alert_id=alert.id,
        outcome="miss",
        message=f"no matching time in {len(times)} parsed tokens",
    )


async def poll_all_active_alerts(session: AsyncSession) -> None:
    alerts = await das.list_all_active_alerts(session)
    for alert in alerts:
        try:
            await check_one_alert(session, alert)
        except Exception:
            logger.exception("check alert %s", alert.id)
            await das.add_poll_log(
                session,
                alert_id=alert.id,
                outcome="error",
                message="internal error during check",
            )
