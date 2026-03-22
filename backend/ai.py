"""
Mouse Mentor AI: uses trip info + web search to answer Disney trip questions.
Supports Groq (default, free) and Google Gemini with streaming. Developed by Sydney Edwards.
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator
from typing import Any, Optional

from dotenv import load_dotenv

load_dotenv()

# Provider: "groq" (default, free) or "gemini"
AI_PROVIDER = os.environ.get("AI_PROVIDER", "groq").strip().lower()
if AI_PROVIDER not in ("groq", "gemini"):
    AI_PROVIDER = "groq"

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

# Fast/cheap model for summarizing older chat (defaults to main Groq model)
SUMMARY_MODEL = os.environ.get("SUMMARY_MODEL", GROQ_MODEL)
# Keep this many recent messages verbatim; summarize everything before that
CHAT_HISTORY_WINDOW = int(os.environ.get("CHAT_HISTORY_WINDOW", "10"))


def _park_label_map() -> dict[str, str]:
    return {
        "magic-kingdom": "Magic Kingdom",
        "epcot": "EPCOT",
        "hollywood-studios": "Disney's Hollywood Studios",
        "animal-kingdom": "Disney's Animal Kingdom",
        "typhoon-lagoon": "Typhoon Lagoon",
        "blizzard-beach": "Blizzard Beach",
        "disney-springs": "Disney Springs",
        "disneyland-park": "Disneyland Park",
        "california-adventure": "Disney California Adventure",
        "downtown-disney": "Downtown Disney",
    }


def _thrill_label(t: Optional[str]) -> str:
    if not t:
        return ""
    return {
        "no_scary": "No scary rides — gentle attractions & shows",
        "some_thrills": "Some thrills — mix of mild and moderate",
        "bring_it_on": "Bring it on — coasters & intense attractions welcome",
    }.get(t, t)


def _focus_label(t: Optional[str]) -> str:
    if not t:
        return ""
    return {
        "rides": "Rides & attractions",
        "characters": "Character meets & greets",
        "shows": "Shows, parades & fireworks",
        "food": "Food & dining",
    }.get(t, t)


def _trip_context(trip: Optional[dict[str, Any]]) -> str:
    """Build a rich context string from trip info (first-time visitor fields prioritized)."""
    if not trip:
        return "The guest has not shared trip details yet."
    parts = []
    dest = trip.get("destination")
    if dest:
        name = "Walt Disney World" if dest == "disney-world" else "Disneyland"
        parts.append(f"Destination: {name}")

    if trip.get("first_visit") is True:
        parts.append("FIRST-TIME VISITOR — explain basics; prioritize clarity and pacing")

    u7 = trip.get("party_age_under_7")
    r712 = trip.get("party_age_7_12")
    teen = trip.get("party_age_teen")
    adult = trip.get("party_age_adult")
    if any(x is not None for x in (u7, r712, teen, adult)):
        parts.append(
            f"Party by age — under 7: {u7 or 0} | 7–12: {r712 or 0} | "
            f"teens (13–17): {teen or 0} | adults (18+): {adult or 0}"
        )

    adults = trip.get("number_of_adults", 1)
    kids = trip.get("number_of_children", 0)
    parts.append(f"Party totals (tickets): {adults} adult(s), {kids} child(ren)")
    if trip.get("child_ages"):
        parts.append(f"Child age ranges (legacy): {', '.join(trip['child_ages'])}")

    if trip.get("arrival_date"):
        parts.append(f"Arrival: {trip['arrival_date']}")
    if trip.get("departure_date"):
        parts.append(f"Departure: {trip['departure_date']}")
    if trip.get("length_of_stay_days"):
        parts.append(f"Length of stay: {trip['length_of_stay_days']} days")
    if trip.get("dates_flexible"):
        parts.append("Dates are flexible")
    if trip.get("flexible_travel_period"):
        period = trip["flexible_travel_period"]
        period_labels = {
            "jan-feb": "Jan–Feb",
            "mar-may": "Mar–May",
            "jun-aug": "Jun–Aug",
            "sep-oct": "Sep–Oct",
            "nov-dec": "Nov–Dec",
        }
        parts.append(f"Flexible timing: {period_labels.get(period, period)}")

    parks = trip.get("parks_planned")
    if parks:
        labels = _park_label_map()
        parts.append(
            "Parks they plan to visit: "
            + ", ".join(labels.get(p, p) for p in parks)
        )
    if trip.get("park_schedule_notes"):
        parts.append(f"Day-by-day plan (notes): {trip['park_schedule_notes']}")

    if trip.get("park_days"):
        parts.append(f"Park days (legacy): {trip['park_days']}")

    tt = trip.get("thrill_tolerance")
    if tt:
        parts.append(f"Thrill tolerance: {_thrill_label(tt)}")
    if trip.get("mobility_notes"):
        parts.append(f"Mobility / accessibility: {trip['mobility_notes']}")
    if trip.get("dietary_restrictions"):
        parts.append(f"Dietary restrictions: {trip['dietary_restrictions']}")

    ff = trip.get("first_timer_focus")
    if ff:
        parts.append(f"What matters most on this trip: {_focus_label(ff)}")

    if trip.get("priorities"):
        parts.append(f"Priorities (legacy): {', '.join(trip['priorities'])}")
    if trip.get("on_site") is not None:
        parts.append("Staying on-site" if trip["on_site"] else "Staying off-site")
    if trip.get("resort_tier"):
        parts.append(f"Resort tier: {trip['resort_tier']}")
    if trip.get("first_visit") is False:
        parts.append("Returning visitor")
    if trip.get("special_occasion"):
        parts.append(f"Celebrating: {trip['special_occasion']}")
    if trip.get("trip_pace"):
        parts.append(f"Pace: {trip['trip_pace']}")
    if trip.get("budget_vibe"):
        parts.append(f"Budget vibe: {trip['budget_vibe']}")
    if trip.get("ride_preference"):
        parts.append(f"Ride preference (legacy): {trip['ride_preference']}")
    if trip.get("genie_plus_interest"):
        parts.append(f"Genie+ / Lightning Lanes: {trip['genie_plus_interest']}")
    if trip.get("dietary_notes"):
        parts.append(f"Other notes (combined): {trip['dietary_notes']}")

    return " | ".join(parts) if parts else "Trip details not specified."


def _web_search(query: str, max_results: int = 5) -> str:
    """Search the web and return concatenated snippets."""
    try:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            return ""
        snippets = []
        for r in results[:max_results]:
            title = r.get("title", "")
            body = r.get("body", "")
            if title or body:
                snippets.append(
                    f"- {title}\n  {body[:400]}{'...' if len(body) > 400 else ''}"
                )
        return "\n\n".join(snippets) if snippets else ""
    except Exception:
        return ""


def _build_system_and_messages(
    messages: list[dict[str, str]],
    trip_info: Optional[dict[str, Any]],
    use_web_search: bool,
    wait_times_context: Optional[str],
    conversation_summary: Optional[str] = None,
) -> tuple[str, list[dict[str, str]]]:
    """System prompt + OpenAI-format chat messages."""
    trip_ctx = _trip_context(trip_info)
    last_user = next(
        (m["text"] for m in reversed(messages) if m.get("role") == "user"), ""
    ).strip()

    web_ctx = ""
    if use_web_search and last_user:
        dest = (trip_info or {}).get("destination", "")
        park = "Walt Disney World" if dest == "disney-world" else "Disneyland"
        search_query = f"{park} {last_user}"
        web_ctx = _web_search(search_query)
        if web_ctx:
            web_ctx = "Relevant information from the web:\n\n" + web_ctx

    system_parts = [
        "You are Mouse Mentor, a friendly Disney vacation planning assistant for guests—especially first-timers. "
        "FIRST-TIME PERSONALIZATION (when first_visit is true or party_age_* / thrill_tolerance / first_timer_focus "
        "are set): Use parks_planned and park_schedule_notes for which park on which day; "
        "party_age_under_7, party_age_7_12, party_age_teen, party_age_adult for ride height, "
        "scariness, stroller needs, and dining; thrill_tolerance (no_scary / some_thrills / bring_it_on) for "
        "how intense rides should be; mobility_notes and dietary_restrictions for accessibility and food; "
        "first_timer_focus (rides vs characters vs shows vs food) to weight recommendations. "
        "Explain park basics, Genie+, and boarding when relevant—don't assume prior knowledge. "
        "Use the guest's trip details to personalize every answer: "
        "destination for park-specific info; dates (or flexible_travel_period) for crowds and events; "
        "park_days and length_of_stay for itinerary depth; "
        "party size and child_ages (legacy) for age-appropriate suggestions; "
        "priorities (legacy list) for emphasis; "
        "trip_pace to suggest how many activities per day and when to rest; "
        "budget_vibe (value/moderate/splurge) for dining and experience recommendations; "
        "ride_preference (thrill/mix/mild) for attraction suggestions; "
        "genie_plus_interest to explain Genie+ or Lightning Lanes when relevant or skip when they're not using them; "
        "first visit vs returning to tailor depth (more how-to for first-timers, shortcuts for returning); "
        "special occasion and any notes (dietary, must-dos, characters, mobility) for restaurant and experience tips. "
        "Be concise, practical, and encouraging. "
        "If you use information from the web context, cite it naturally (e.g. 'According to recent info...'). "
        "If the guest hasn't shared trip details, suggest they complete the trip questionnaire for better advice.",
        "\n\nGuest trip context: ",
        trip_ctx,
    ]
    if web_ctx:
        system_parts.extend(["\n\n", web_ctx])
    if wait_times_context:
        system_parts.extend(["\n\n", wait_times_context])
    if conversation_summary:
        system_parts.extend(
            [
                "\n\nEarlier conversation summary (for continuity; guest may refer to these topics):\n",
                conversation_summary,
            ]
        )
    system_content = "".join(system_parts)

    openai_messages = []
    for m in messages:
        role = m.get("role")
        text = m.get("text", "")
        if role in ("user", "assistant") and text:
            openai_messages.append({"role": role, "content": text})

    return system_content, openai_messages


def summarize_conversation_messages(messages: list[dict[str, str]]) -> str:
    """
    Compress older chat turns into a short summary (cheap LLM call).
    Used when the transcript exceeds CHAT_HISTORY_WINDOW messages.
    """
    if not messages:
        return ""

    lines = []
    for m in messages:
        role = m.get("role")
        text = (m.get("text") or "").strip()
        if not text:
            continue
        who = "Guest" if role == "user" else "Assistant"
        lines.append(f"{who}: {text}")
    transcript = "\n\n".join(lines)
    if len(transcript) > 14000:
        transcript = transcript[:14000] + "\n\n[... truncated for summarization ...]"

    prompt = (
        "Summarize this Disney trip planning chat in 6–12 bullet points or short paragraphs. "
        "Capture parks mentioned, dates, dining, priorities, decisions, and open questions. "
        "Be factual and concise. Do not add new advice.\n\n---\n\n"
        f"{transcript}"
    )

    if AI_PROVIDER == "groq" and GROQ_API_KEY:
        from openai import OpenAI

        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=GROQ_API_KEY,
        )
        resp = client.chat.completions.create(
            model=SUMMARY_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You compress chat logs for a travel assistant. Output plain text only.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=512,
            temperature=0.2,
        )
        return (resp.choices[0].message.content or "").strip()

    if AI_PROVIDER == "gemini" and GEMINI_API_KEY:
        from google import genai
        from google.genai.types import Content, GenerateContentConfig, Part

        client = genai.Client(api_key=GEMINI_API_KEY)
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                Content(
                    role="user",
                    parts=[Part(text=prompt)],
                )
            ],
            config=GenerateContentConfig(
                system_instruction=(
                    "You compress chat logs for a travel assistant. Output plain text only."
                ),
                max_output_tokens=512,
                temperature=0.2,
            ),
        )
        return (resp.text or "").strip()

    return transcript[:2000] + ("\n..." if len(transcript) > 2000 else "")


async def _stream_groq(
    system_content: str, openai_messages: list[dict[str, str]]
) -> AsyncIterator[str]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
    )
    stream = await client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": system_content}] + openai_messages,
        max_tokens=1024,
        temperature=0.7,
        stream=True,
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        choice = chunk.choices[0]
        delta = choice.delta
        if delta and delta.content:
            yield delta.content


async def _stream_gemini(
    system_content: str, openai_messages: list[dict[str, str]]
) -> AsyncIterator[str]:
    from google import genai
    from google.genai.types import Content, GenerateContentConfig, Part

    client = genai.Client(api_key=GEMINI_API_KEY)
    contents = []
    for m in openai_messages:
        role = m.get("role")
        text = m.get("content", "")
        if not text:
            continue
        if role == "user":
            contents.append(Content(role="user", parts=[Part(text=text)]))
        elif role == "assistant":
            contents.append(Content(role="model", parts=[Part(text=text)]))

    def sync_chunks():
        stream = client.models.generate_content_stream(
            model=GEMINI_MODEL,
            contents=contents,
            config=GenerateContentConfig(
                system_instruction=system_content,
                max_output_tokens=1024,
                temperature=0.7,
            ),
        )
        cumulative = ""
        for chunk in stream:
            t = getattr(chunk, "text", None) or ""
            if not t:
                continue
            if cumulative and t.startswith(cumulative):
                piece = t[len(cumulative) :]
                cumulative = t
                if piece:
                    yield piece
            elif not cumulative:
                cumulative = t
                yield t
            else:
                cumulative = cumulative + t
                yield t

    iterator = sync_chunks()
    while True:
        try:
            piece = await asyncio.to_thread(next, iterator)
            yield piece
        except StopIteration:
            break


async def stream_reply(
    messages: list[dict[str, str]],
    trip_info: Optional[dict[str, Any]] = None,
    use_web_search: bool = True,
    wait_times_context: Optional[str] = None,
    conversation_summary: Optional[str] = None,
) -> AsyncIterator[str]:
    """
    Stream assistant reply as text chunks (tokens / fragments).
    messages: list of {"role": "user"|"assistant", "text": "..."}
    """
    if AI_PROVIDER == "groq" and not GROQ_API_KEY:
        yield (
            "I can't answer yet — set GROQ_API_KEY in the backend (free at console.groq.com). "
            "Restart the server after adding it."
        )
        return
    if AI_PROVIDER == "gemini" and not GEMINI_API_KEY:
        yield (
            "I can't answer yet — set GEMINI_API_KEY in the backend (free at aistudio.google.com). "
            "Restart the server after adding it."
        )
        return

    system_content, openai_messages = _build_system_and_messages(
        messages,
        trip_info,
        use_web_search,
        wait_times_context,
        conversation_summary,
    )

    try:
        if AI_PROVIDER == "groq":
            async for chunk in _stream_groq(system_content, openai_messages):
                yield chunk
        else:
            async for chunk in _stream_gemini(system_content, openai_messages):
                yield chunk
    except Exception as e:
        yield (
            f"I ran into an issue: {e!s}. Please try again or rephrase your question."
        )


def generate_reply(
    messages: list[dict[str, str]],
    trip_info: Optional[dict[str, Any]] = None,
    use_web_search: bool = True,
    wait_times_context: Optional[str] = None,
    conversation_summary: Optional[str] = None,
) -> str:
    """
    Non-streaming full reply (collects stream). Useful for tests or scripts.
    """

    async def _collect() -> str:
        parts: list[str] = []
        async for t in stream_reply(
            messages,
            trip_info,
            use_web_search,
            wait_times_context,
            conversation_summary,
        ):
            parts.append(t)
        return "".join(parts).strip()

    return asyncio.run(_collect())
