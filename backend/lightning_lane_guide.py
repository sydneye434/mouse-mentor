"""
Structured LLM output: Lightning Lane Multi Pass, Single Pass, Individual LL,
plus personalized booking order and wake times from trip onboarding.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

import ai as ai_mod


def _extract_json_object(text: str) -> dict[str, Any]:
    t = text.strip()
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)```$", t, re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()
    return json.loads(t)


def normalize_lightning_guide(data: Any) -> dict[str, Any]:
    """Coerce model output into our stable schema."""
    if not isinstance(data, dict):
        return _empty_guide()
    explainer = data.get("explainer") or {}
    if not isinstance(explainer, dict):
        explainer = {}

    def _block(key: str, title_fallback: str) -> dict[str, str]:
        b = explainer.get(key)
        if not isinstance(b, dict):
            return {
                "title": title_fallback,
                "plain_language": "",
                "best_for": "",
            }
        return {
            "title": str(b.get("title") or title_fallback).strip() or title_fallback,
            "plain_language": str(b.get("plain_language") or "").strip(),
            "best_for": str(b.get("best_for") or "").strip(),
        }

    days_out: list[dict[str, Any]] = []
    for d in data.get("days") or []:
        if not isinstance(d, dict):
            continue
        order: list[dict[str, Any]] = []
        for o in d.get("booking_priority_order") or []:
            if not isinstance(o, dict):
                continue
            try:
                rank = int(o.get("order", len(order) + 1))
            except (TypeError, ValueError):
                rank = len(order) + 1
            order.append(
                {
                    "order": rank,
                    "attraction": str(o.get("attraction") or "").strip()
                    or "Attraction",
                    "use_ll_type": str(
                        o.get("use_ll_type") or "multi_pass"
                    ).strip(),
                    "why_this_order": str(o.get("why_this_order") or "").strip(),
                    "thrill_rationale": str(o.get("thrill_rationale") or "").strip(),
                }
            )
        order.sort(key=lambda x: x["order"])
        skip = d.get("rides_to_skip_ll_for") or []
        if not isinstance(skip, list):
            skip = []
        days_out.append(
            {
                "date": str(d.get("date") or "").strip(),
                "park_name": str(d.get("park_name") or "").strip() or "Park",
                "wake_up_time": str(d.get("wake_up_time") or "").strip(),
                "wake_up_why": str(d.get("wake_up_why") or "").strip(),
                "first_booking_window_tip": str(
                    d.get("first_booking_window_tip") or ""
                ).strip(),
                "booking_priority_order": order[:20],
                "rides_to_skip_ll_for": [str(x).strip() for x in skip if x][:12],
                "day_tip": str(d.get("day_tip") or "").strip(),
            }
        )

    return {
        "intro": str(data.get("intro") or "").strip(),
        "explainer": {
            "lightning_lane_multi_pass": _block(
                "lightning_lane_multi_pass",
                "Lightning Lane Multi Pass",
            ),
            "lightning_lane_single_pass": _block(
                "lightning_lane_single_pass",
                "Lightning Lane Single Pass",
            ),
            "individual_lightning_lane": _block(
                "individual_lightning_lane",
                "Individual Lightning Lane",
            ),
        },
        "how_they_work_together": str(
            data.get("how_they_work_together") or ""
        ).strip(),
        "personalized_for_your_party": str(
            data.get("personalized_for_your_party") or ""
        ).strip(),
        "days": days_out,
        "disclaimer": str(data.get("disclaimer") or "").strip(),
    }


def _empty_guide() -> dict[str, Any]:
    return normalize_lightning_guide(
        {
            "intro": "",
            "explainer": {},
            "days": [],
        }
    )


def generate_lightning_lane_guide(trip_info: Optional[dict[str, Any]]) -> dict[str, Any]:
    """
    Single JSON response: explainer + per-day LL priorities for this party.
    """
    if ai_mod.AI_PROVIDER == "groq" and not ai_mod.GROQ_API_KEY:
        raise RuntimeError("Set GROQ_API_KEY in the backend to generate this guide.")
    if ai_mod.AI_PROVIDER == "gemini" and not ai_mod.GEMINI_API_KEY:
        raise RuntimeError("Set GEMINI_API_KEY in the backend to generate this guide.")

    trip_blob = json.dumps(trip_info or {}, indent=2)

    system = (
        "You are a Walt Disney World touring expert. Explain Disney's paid skip-the-line "
        "products in plain language, then give a STRUCTURED personalized plan.\n\n"
        "Use CURRENT naming for Walt Disney World: "
        "Lightning Lane Multi Pass (access to many attractions with limits per day), "
        "Lightning Lane Single Pass (one-time purchase for one attraction when you don't want Multi Pass), "
        "and Individual Lightning Lane (à la carte purchase for the most in-demand rides, "
        "priced per person, separate from Multi Pass selections).\n\n"
        "Be accurate: do not invent prices; say 'check the Disney app' for pricing. "
        "Mention that rules and ride lists change—guests must verify in the app.\n\n"
        "Use the trip JSON heavily: party_age_under_7, party_age_7_12, party_age_teen, party_age_adult, "
        "number_of_adults, number_of_children, child_ages, thrill_tolerance, "
        "parks_planned, park_schedule_notes, arrival_date, departure_date, genie_plus_interest, "
        "first_timer_focus, mobility_notes.\n\n"
        "Return ONLY valid JSON (no markdown) with this exact shape:\n"
        '{'
        '"intro":"2-3 sentences welcoming them and what this guide covers",'
        '"explainer":{'
        '"lightning_lane_multi_pass":{"title":"string","plain_language":"2-4 sentences","best_for":"who should buy"},'
        '"lightning_lane_single_pass":{"title":"string","plain_language":"2-4 sentences","best_for":"when it makes sense"},'
        '"individual_lightning_lane":{"title":"string","plain_language":"2-4 sentences","best_for":"who needs ILL most"}'
        "},"
        '"how_they_work_together":"2-4 sentences comparing when to stack Multi + ILL vs Single",'
        '"personalized_for_your_party":"2-5 sentences tying recommendations to THIS party and thrill_tolerance",'
        '"days":['
        "{"
        '"date":"YYYY-MM-DD",'
        '"park_name":"primary park that day",'
        '"wake_up_time":"e.g. 6:00 AM",'
        '"wake_up_why":"why for rope drop / booking window / kids",'
        '"first_booking_window_tip":"when to book next LL on phone (plain language)",'
        '"booking_priority_order":['
        "{"
        '"order":1,'
        '"attraction":"ride or show name",'
        '"use_ll_type":"multi_pass|single_pass|individual_ll|either",'
        '"why_this_order":"crowds / kids / distance",'
        '"thrill_rationale":"how this fits thrill_tolerance and ages"'
        "}"
        "],"
        '"rides_to_skip_ll_for":["attractions where standby or shows are fine for this group"],'
        '"day_tip":"one practical tip"'
        "}"
        "],"
        '"disclaimer":"Verify in official Disney app; plans are suggestions."'
        "}\n"
        "Include one entry in days for each calendar day between arrival and departure (inclusive) "
        "that is a park day; align parks_planned when provided. "
        "booking_priority_order must list attractions in the order the guest should TRY to book them "
        "(first = book or prioritize first). "
        "At least 3 and at most 8 items per day when the park has that many suitable rides."
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
            temperature=0.35,
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
                temperature=0.35,
                response_mime_type="application/json",
            ),
        )
        raw = (resp.text or "").strip()

    parsed = _extract_json_object(raw)
    return normalize_lightning_guide(parsed)
