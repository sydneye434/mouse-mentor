"""
Mouse Mentor AI: uses trip info + web search to answer Disney trip questions.
Supports Groq (default, free) and Google Gemini. Developed by Sydney Edwards.
"""
from __future__ import annotations

import os
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


def _trip_context(trip: Optional[dict[str, Any]]) -> str:
    """Build a short context string from trip info."""
    if not trip:
        return "The guest has not shared trip details yet."
    parts = []
    dest = trip.get("destination")
    if dest:
        name = "Walt Disney World" if dest == "disney-world" else "Disneyland"
        parts.append(f"Destination: {name}")
    adults = trip.get("number_of_adults", 1)
    kids = trip.get("number_of_children", 0)
    parts.append(f"Party: {adults} adult(s), {kids} child(ren)")
    if trip.get("child_ages"):
        parts.append(f"Child ages: {', '.join(trip['child_ages'])}")
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
    if trip.get("park_days"):
        parts.append(f"Park days: {trip['park_days']}")
    if trip.get("priorities"):
        parts.append(f"Priorities: {', '.join(trip['priorities'])}")
    if trip.get("on_site") is not None:
        parts.append("Staying on-site" if trip["on_site"] else "Staying off-site")
    if trip.get("resort_tier"):
        parts.append(f"Resort tier: {trip['resort_tier']}")
    if trip.get("first_visit") is not None:
        parts.append("First visit" if trip["first_visit"] else "Returning visitor")
    if trip.get("special_occasion"):
        parts.append(f"Celebrating: {trip['special_occasion']}")
    if trip.get("trip_pace"):
        parts.append(f"Pace: {trip['trip_pace']}")
    if trip.get("budget_vibe"):
        parts.append(f"Budget vibe: {trip['budget_vibe']}")
    if trip.get("ride_preference"):
        parts.append(f"Ride preference: {trip['ride_preference']}")
    if trip.get("genie_plus_interest"):
        parts.append(f"Genie+ / Lightning Lanes: {trip['genie_plus_interest']}")
    if trip.get("dietary_notes"):
        parts.append(f"Dietary notes: {trip['dietary_notes']}")
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
                snippets.append(f"- {title}\n  {body[:400]}{'...' if len(body) > 400 else ''}")
        return "\n\n".join(snippets) if snippets else ""
    except Exception:
        return ""


def _call_groq(system_content: str, openai_messages: list[dict[str, str]]) -> str:
    """Call Groq via OpenAI-compatible API."""
    from openai import OpenAI

    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
    )
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": system_content}] + openai_messages,
        max_tokens=1024,
        temperature=0.7,
    )
    return (resp.choices[0].message.content or "").strip()


def _call_gemini(system_content: str, openai_messages: list[dict[str, str]]) -> str:
    """Call Google Gemini with system instruction and chat history."""
    from google import genai
    from google.genai.types import GenerateContentConfig, Content, Part

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
    resp = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=GenerateContentConfig(
            system_instruction=system_content,
            max_output_tokens=1024,
            temperature=0.7,
        ),
    )
    if resp.text:
        return resp.text.strip()
    return ""


def generate_reply(
    messages: list[dict[str, str]],
    trip_info: Optional[dict[str, Any]] = None,
    use_web_search: bool = True,
) -> str:
    """
    Generate an assistant reply using trip context and optional web search.
    messages: list of {"role": "user"|"assistant", "text": "..."}
    trip_info: optional trip dict from frontend (snake_case keys).
    Uses AI_PROVIDER (groq or gemini); Groq is default and free.
    """
    if AI_PROVIDER == "groq" and not GROQ_API_KEY:
        return (
            "I can't answer yet — set GROQ_API_KEY in the backend (free at console.groq.com). "
            "Restart the server after adding it."
        )
    if AI_PROVIDER == "gemini" and not GEMINI_API_KEY:
        return (
            "I can't answer yet — set GEMINI_API_KEY in the backend (free at aistudio.google.com). "
            "Restart the server after adding it."
        )

    trip_ctx = _trip_context(trip_info)
    last_user = next((m["text"] for m in reversed(messages) if m.get("role") == "user"), "").strip()

    web_ctx = ""
    if use_web_search and last_user:
        dest = (trip_info or {}).get("destination", "")
        park = "Walt Disney World" if dest == "disney-world" else "Disneyland"
        search_query = f"{park} {last_user}"
        web_ctx = _web_search(search_query)
        if web_ctx:
            web_ctx = "Relevant information from the web:\n\n" + web_ctx

    system_parts = [
        "You are Mouse Mentor, a friendly Disney vacation planning assistant. "
        "Use the guest's trip details to personalize every answer: "
        "destination for park-specific info; dates (or flexible_travel_period) for crowds and events; "
        "park_days and length_of_stay for how many parks to recommend and itinerary depth; "
        "party size and child_ages for ride height requirements, age-appropriate suggestions, and dining; "
        "priorities to emphasize what they care about most (rides, food, characters, shows, parades, relaxation, shopping, table-service); "
        "trip_pace to suggest how many activities per day and when to rest; "
        "budget_vibe (value/moderate/splurge) for dining and experience recommendations; "
        "ride_preference (thrill/mix/mild) for attraction suggestions; "
        "genie_plus_interest to explain Genie+ or Lightning Lanes when relevant or skip when they're not using them; "
        "first visit vs returning to tailor depth (more how-to for first-timers, shortcuts for returning); "
        "special occasion and any notes (dietary, must-dos, characters, mobility) for restaurant and experience tips. "
        "Be concise, practical, and encouraging. "
        "If you use information from the web context, cite it naturally (e.g. 'According to recent info...'). "
        "If the guest hasn't shared trip details, suggest they fill out the trip form for better advice.",
        "\n\nGuest trip context: ",
        trip_ctx,
    ]
    if web_ctx:
        system_parts.extend(["\n\n", web_ctx])
    system_content = "".join(system_parts)

    openai_messages = []
    for m in messages:
        role = m.get("role")
        text = m.get("text", "")
        if role in ("user", "assistant") and text:
            openai_messages.append({"role": role, "content": text})

    try:
        if AI_PROVIDER == "groq":
            return _call_groq(system_content, openai_messages)
        return _call_gemini(system_content, openai_messages)
    except Exception as e:
        return f"I ran into an issue: {e!s}. Please try again or rephrase your question."
