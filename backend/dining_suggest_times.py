"""
LLM: ranked dining time windows for a restaurant + trip day.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

import ai as ai_mod

SYSTEM_PROMPT = (
    "You are a Disney World dining expert helping a first-time visitor find the best dining times. "
    "Given their trip details and chosen restaurant, suggest 2-4 ideal dining time windows for that day. "
    "Consider their park schedule, group pace, any young children, and typical Disney dining patterns "
    "(e.g. avoid peak 12–1pm and 6–7pm rushes unless the restaurant is less popular). "
    "Return ONLY valid JSON with a single key \"suggestions\" whose value is an array of 2-4 objects. "
    "Each object: time_window (string), reason (one sentence, max 12 words), "
    'confidence ("high"|"medium"|"low"). No markdown fences.'
)


def _fallback_suggestions() -> list[dict[str, Any]]:
    return [
        {
            "time_window": "11:30 AM – 12:30 PM",
            "reason": "Before the lunch rush.",
            "confidence": "medium",
        },
        {
            "time_window": "1:00 PM – 2:30 PM",
            "reason": "Quieter after peak lunch.",
            "confidence": "high",
        },
        {
            "time_window": "6:00 PM – 7:30 PM",
            "reason": "Classic dinner window.",
            "confidence": "medium",
        },
    ]


def _normalize_item(raw: Any) -> Optional[dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    tw = str(raw.get("time_window") or "").strip()
    reason = str(raw.get("reason") or "").strip()
    conf = str(raw.get("confidence") or "medium").strip().lower()
    if conf not in ("high", "medium", "low"):
        conf = "medium"
    if not tw:
        return None
    words = reason.split()
    if len(words) > 12:
        reason = " ".join(words[:12])
    return {"time_window": tw, "reason": reason, "confidence": conf}


def _coerce_suggestions(parsed: Any) -> list[dict[str, Any]]:
    arr: list[Any]
    if isinstance(parsed, list):
        arr = parsed
    elif isinstance(parsed, dict):
        arr = parsed.get("suggestions") or parsed.get("times") or []
    else:
        return []
    out: list[dict[str, Any]] = []
    for x in arr:
        n = _normalize_item(x)
        if n:
            out.append(n)
    return out


def suggest_dining_times(
    restaurant: str,
    date: str,
    trip_info: Optional[dict[str, Any]],
) -> list[dict[str, Any]]:
    if ai_mod.AI_PROVIDER == "groq" and not ai_mod.GROQ_API_KEY:
        raise RuntimeError("Set GROQ_API_KEY in the backend to suggest dining times.")
    if ai_mod.AI_PROVIDER == "gemini" and not ai_mod.GEMINI_API_KEY:
        raise RuntimeError("Set GEMINI_API_KEY in the backend to suggest dining times.")

    trip_blob = json.dumps(trip_info or {}, indent=2)
    user = (
        f"Restaurant: {restaurant}\n"
        f"Reservation date: {date}\n\n"
        f"Full trip profile (JSON):\n{trip_blob}"
    )

    try:
        if ai_mod.AI_PROVIDER == "groq":
            from openai import OpenAI

            client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=ai_mod.GROQ_API_KEY,
            )
            resp = client.chat.completions.create(
                model=ai_mod.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user},
                ],
                max_tokens=1024,
                temperature=0.4,
                response_format={"type": "json_object"},
            )
            inner = (resp.choices[0].message.content or "").strip()
            parsed = json.loads(inner)
        else:
            from google import genai
            from google.genai.types import Content, GenerateContentConfig, Part

            client = genai.Client(api_key=ai_mod.GEMINI_API_KEY)
            resp = client.models.generate_content(
                model=ai_mod.GEMINI_MODEL,
                contents=[Content(role="user", parts=[Part(text=user)])],
                config=GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=1024,
                    temperature=0.4,
                    response_mime_type="application/json",
                ),
            )
            inner = (resp.text or "").strip()
            parsed = json.loads(inner)

        out = _coerce_suggestions(parsed)
        if 2 <= len(out) <= 4:
            return out
        if len(out) > 4:
            return out[:4]
        if len(out) == 1:
            fb = _fallback_suggestions()
            return (out + fb)[:4]
    except (json.JSONDecodeError, TypeError, ValueError, KeyError):
        pass
    except Exception:
        pass

    return _fallback_suggestions()
