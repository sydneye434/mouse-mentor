"""
LLM-generated personalized dashboard tips from onboarding / trip profile.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import json
import re
import secrets
from typing import Any, Optional

import ai as ai_mod


def _extract_json_object(text: str) -> dict[str, Any]:
    t = text.strip()
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)```$", t, re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()
    return json.loads(t)


def normalize_tips_payload(
    data: Any, generation_id: Optional[str] = None
) -> dict[str, Any]:
    """Coerce model output to { generation_id, tips: [{ id, title, body }] } with exactly 5 tips."""
    gid = generation_id or secrets.token_hex(8)
    tips_out: list[dict[str, str]] = []
    if isinstance(data, dict):
        raw_list = data.get("tips")
        if isinstance(raw_list, list):
            for i, item in enumerate(raw_list):
                if not isinstance(item, dict):
                    continue
                title = str(item.get("title") or "").strip() or f"Tip {i + 1}"
                body = str(item.get("body") or "").strip() or ""
                tips_out.append({"id": "", "title": title, "body": body})

    # Pad or trim to exactly 5
    while len(tips_out) < 5:
        n = len(tips_out) + 1
        tips_out.append(
            {
                "id": "",
                "title": f"Planning tip {n}",
                "body": "Tap Get more tips to refresh these suggestions.",
            }
        )
    tips_out = tips_out[:5]
    for i, t in enumerate(tips_out):
        t["id"] = f"{gid}-t{i + 1}"

    return {"generation_id": gid, "tips": tips_out}


def generate_personalized_tips(trip_info: Optional[dict[str, Any]]) -> dict[str, Any]:
    """
    Return { generation_id, tips } with 5 short, actionable tips tailored to the trip JSON.
    """
    if ai_mod.AI_PROVIDER == "groq" and not ai_mod.GROQ_API_KEY:
        raise RuntimeError("Set GROQ_API_KEY in the backend to generate tips.")
    if ai_mod.AI_PROVIDER == "gemini" and not ai_mod.GEMINI_API_KEY:
        raise RuntimeError("Set GEMINI_API_KEY in the backend to generate tips.")

    trip_blob = json.dumps(trip_info or {}, indent=2)
    dest = (trip_info or {}).get("destination") or "disney-world"
    dest_label = (
        "Disneyland Resort (California)"
        if dest == "disneyland"
        else "Walt Disney World (Florida)"
    )

    system = (
        "You are a friendly Disney parks planning coach. Generate exactly 5 concise, "
        "personalized tips for ONE guest or family based ONLY on their trip profile JSON.\n\n"
        f"Destination context: {dest_label}. Mention the correct resort name when it matters.\n\n"
        "Personalization rules (use when relevant):\n"
        "- If party_age_under_7 > 0 or number_of_children > 0 with young ages: include at least one tip "
        "about character meet & greets (where to find times in the app, autograph book, patience at peak times) "
        "and one about height restrictions / Rider Switch / measuring at rides—name a few example rides "
        "appropriate to the destination without claiming exact inch numbers (say 'check the official guide "
        "or cast member').\n"
        "- If thrill_tolerance is no_scary or ride_preference is mild: emphasize shows, parades, gentle rides.\n"
        "- If mobility_notes or dietary_restrictions / dietary_notes exist: acknowledge them in at least one tip.\n"
        "- If first_visit is true: one tip can be rope drop or arriving early vs midday crowds.\n"
        "- If on_site is true: mention resort perks briefly (Early Entry where applicable); if false, "
        "transportation/parking realism.\n"
        "- If genie_plus_interest suggests interest: one tip may mention Lightning Lane / booking windows "
        "without inventing prices.\n\n"
        "Each tip: one short title (max 8 words) and a body of 2–4 sentences (under 500 characters). "
        "Be specific and practical; avoid generic filler. Do not invent policies or prices—say 'check the app' "
        "when needed.\n\n"
        "Return ONLY valid JSON with this exact shape:\n"
        '{"tips":['
        '{"title":"string","body":"string"},'
        '{"title":"string","body":"string"},'
        '{"title":"string","body":"string"},'
        '{"title":"string","body":"string"},'
        '{"title":"string","body":"string"}'
        "]}\n"
        "No markdown, no extra keys."
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
            max_tokens=2048,
            temperature=0.45,
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
                max_output_tokens=2048,
                temperature=0.45,
                response_mime_type="application/json",
            ),
        )
        raw = (resp.text or "").strip()

    parsed = _extract_json_object(raw)
    return normalize_tips_payload(parsed)
