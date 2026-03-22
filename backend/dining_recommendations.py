"""
AI-generated first-timer-friendly WDW restaurant list with personalized tags.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import json
import re
from datetime import date, datetime, time as dtime, timedelta, timezone
from typing import Any, Optional

import ai as ai_mod

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None  # type: ignore


def _extract_json_object(text: str) -> dict[str, Any]:
    t = text.strip()
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)```$", t, re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()
    return json.loads(t)


def normalize_restaurants(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        return {"restaurants": []}
    out: list[dict[str, Any]] = []
    for i, r in enumerate(data.get("restaurants") or []):
        if not isinstance(r, dict):
            continue
        rid = str(r.get("id") or "").strip() or f"restaurant-{i+1}"
        out.append(
            {
                "id": rid,
                "name": str(r.get("name") or "Restaurant").strip(),
                "location": str(r.get("location") or "").strip(),
                "brief_description": str(r.get("brief_description") or "").strip(),
                "price_range": str(r.get("price_range") or "$$").strip(),
                "best_for_your_group": str(r.get("best_for_your_group") or "").strip(),
            }
        )
    return {"restaurants": out[:10]}


def generate_top_restaurants(trip_info: Optional[dict[str, Any]]) -> dict[str, Any]:
    """Return JSON with exactly 10 first-timer-friendly WDW table-service restaurants."""
    if ai_mod.AI_PROVIDER == "groq" and not ai_mod.GROQ_API_KEY:
        raise RuntimeError("Set GROQ_API_KEY in the backend to generate dining picks.")
    if ai_mod.AI_PROVIDER == "gemini" and not ai_mod.GEMINI_API_KEY:
        raise RuntimeError("Set GEMINI_API_KEY in the backend to generate dining picks.")

    trip_blob = json.dumps(trip_info or {}, indent=2)

    system = (
        "You are a Walt Disney World dining expert helping first-time visitors. "
        "Pick exactly 10 TABLE-SERVICE restaurants across Walt Disney World that are "
        "especially welcoming for first-timers (clear menus, atmosphere, reliability). "
        "Mix parks, resorts, and Disney Springs. Use real restaurant names that exist at WDW. "
        "For each: write a brief_description (2-3 sentences), price_range as one of "
        "'$', '$$', '$$$', or '$$$$' (approximate), and best_for_your_group — a short tag line "
        "explaining why it fits THIS party using dietary_notes, dietary_restrictions, "
        "party ages (party_age_under_7, etc.), number_of_children, child_ages, and trip vibe. "
        "Return ONLY valid JSON: "
        '{"restaurants":['
        '{"id":"unique-slug","name":"","location":"park or resort area",'
        '"brief_description":"","price_range":"$$","best_for_your_group":""}'
        "]}\n"
        "Exactly 10 items. No markdown."
    )
    user = f"Trip profile (JSON):\n{trip_blob}"

    if ai_mod.AI_PROVIDER == "groq":
        from openai import OpenAI

        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=ai_mod.GROQ_API_KEY,
        )
        resp = client.chat.completions.create(
            model=ai_mod.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=4096,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        raw = (resp.choices[0].message.content or "").strip()
    else:
        from google import genai
        from google.genai.types import Content, GenerateContentConfig, Part

        client = genai.Client(api_key=ai_mod.GEMINI_API_KEY)
        resp = client.models.generate_content(
            model=ai_mod.GEMINI_MODEL,
            contents=[
                Content(
                    role="user",
                    parts=[Part(text=user)],
                )
            ],
            config=GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=4096,
                temperature=0.4,
                response_mime_type="application/json",
            ),
        )
        raw = (resp.text or "").strip()

    parsed = _extract_json_object(raw)
    return normalize_restaurants(parsed)


def booking_window_opens_at_utc(arrival_date_str: Optional[str]) -> Optional[datetime]:
    """
    Disney dining: guests typically book 60 days before arrival at 6:00 AM Eastern
    (on-site guests may have length-of-stay rules — we use simple 60-day window for reminders).
    """
    if not arrival_date_str or not str(arrival_date_str).strip():
        return None
    try:
        arrival = date.fromisoformat(str(arrival_date_str).strip()[:10])
    except ValueError:
        return None
    opens_local_date = arrival - timedelta(days=60)
    if ZoneInfo is None:
        # Fallback: naive 6 AM UTC-5 approximation (not DST-safe)
        opens = datetime.combine(
            opens_local_date, dtime(6, 0), tzinfo=timezone(timedelta(hours=-5))
        )
        return opens.astimezone(timezone.utc)

    eastern = ZoneInfo("America/New_York")
    opens_local = datetime.combine(opens_local_date, dtime(6, 0), tzinfo=eastern)
    return opens_local.astimezone(timezone.utc)


def days_until_booking_window(now_utc: datetime, opens_utc: Optional[datetime]) -> Optional[int]:
    """Calendar days until 6 AM Eastern booking day (first-timer messaging)."""
    if opens_utc is None:
        return None
    if now_utc >= opens_utc:
        return 0
    if ZoneInfo is not None:
        eastern = ZoneInfo("America/New_York")
        now_local = now_utc.astimezone(eastern).date()
        opens_local = opens_utc.astimezone(eastern).date()
        return max(0, (opens_local - now_local).days)
    delta = opens_utc.date() - now_utc.date()
    return max(0, delta.days)


def booking_window_opened(now_utc: datetime, opens_utc: Optional[datetime]) -> bool:
    if opens_utc is None:
        return False
    return now_utc >= opens_utc
