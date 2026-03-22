"""
Walt Disney World live standby waits via ThemeParks Wiki API (api.themeparks.wiki).
In-memory TTL cache to limit upstream requests. Developed by Sydney Edwards.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

WDW_DESTINATION_ID = "e957da41-3552-4cf6-b636-5babc5cbc4e5"
THEMEPARKS_API_BASE = "https://api.themeparks.wiki/v1"
CACHE_TTL_SECONDS = 300

# Parsed payload (without cached flag) + monotonic expiry
_cache: dict[str, Any] = {
    "payload": None,
    "expires_at_monotonic": 0.0,
}


def _parse_live_data(raw: dict[str, Any]) -> dict[str, Any]:
    """Build park groups, ride rows, and top-10 shortest from destination /live JSON."""
    live_data = raw.get("liveData") or []
    park_names: dict[str, str] = {}
    for item in live_data:
        if item.get("entityType") == "PARK" and item.get("id"):
            park_names[item["id"]] = item.get("name") or "Unknown park"

    rows: list[dict[str, Any]] = []
    for item in live_data:
        et = item.get("entityType")
        if et not in ("ATTRACTION", "SHOW"):
            continue
        park_id = item.get("parkId")
        if not park_id:
            continue
        queue = item.get("queue") or {}
        standby = queue.get("STANDBY") or {}
        wait = standby.get("waitTime")
        if wait is None or not isinstance(wait, int):
            continue
        if item.get("status") == "CLOSED":
            continue

        park_name = park_names.get(park_id, "Unknown park")
        rows.append(
            {
                "name": item.get("name") or "Unknown",
                "wait_minutes": wait,
                "status": item.get("status"),
                "park_name": park_name,
                "park_id": park_id,
            }
        )

    # Group by park, sort rides by wait within each park
    by_park: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        pn = r["park_name"]
        by_park.setdefault(pn, []).append(r)

    parks_out: list[dict[str, Any]] = []
    for park_name in sorted(by_park.keys()):
        rides_sorted = sorted(by_park[park_name], key=lambda x: x["wait_minutes"])
        parks_out.append(
            {
                "park_name": park_name,
                "rides": [
                    {
                        "name": x["name"],
                        "wait_minutes": x["wait_minutes"],
                        "status": x["status"],
                    }
                    for x in rides_sorted
                ],
            }
        )

    sorted_all = sorted(rows, key=lambda x: x["wait_minutes"])
    top10 = [
        {
            "name": r["name"],
            "wait_minutes": r["wait_minutes"],
            "park_name": r["park_name"],
        }
        for r in sorted_all[:10]
    ]

    fetched_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return {
        "parks": parks_out,
        "top10_shortest": top10,
        "fetched_at": fetched_at,
    }


async def _fetch_live_json() -> dict[str, Any]:
    url = f"{THEMEPARKS_API_BASE}/entity/{WDW_DESTINATION_ID}/live"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


async def get_wait_times_response(force_refresh: bool = False) -> dict[str, Any]:
    """
    Return WDW wait times. Uses a 5-minute in-memory cache unless force_refresh is True.
    Response includes: parks, top10_shortest, fetched_at, cached (bool).
    """
    now = time.monotonic()
    if (
        not force_refresh
        and _cache["payload"] is not None
        and now < _cache["expires_at_monotonic"]
    ):
        out = dict(_cache["payload"])
        out["cached"] = True
        return out

    raw = await _fetch_live_json()
    parsed = _parse_live_data(raw)
    _cache["payload"] = parsed
    _cache["expires_at_monotonic"] = now + CACHE_TTL_SECONDS
    out = dict(parsed)
    out["cached"] = False
    return out


def format_shortest_waits_for_ai(waits: Optional[list[dict[str, Any]]]) -> str:
    """Human-readable block for the system prompt (top 10)."""
    if not waits:
        return ""
    lines = []
    for w in waits[:10]:
        name = w.get("name") or "?"
        minutes = w.get("wait_minutes")
        if minutes is None:
            minutes = w.get("waitMinutes", "?")
        park = w.get("park_name") or w.get("parkName") or "?"
        lines.append(f"- {name} ({park}): {minutes} min standby")
    return (
        "Current Walt Disney World standby waits (ThemeParks Wiki; approximate, refresh every few minutes):\n"
        + "\n".join(lines)
    )
