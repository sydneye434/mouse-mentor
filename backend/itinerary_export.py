"""
LLM extraction of a day-by-day itinerary from chat + PDF generation (ReportLab).
Developed by Sydney Edwards.
"""

from __future__ import annotations

import json
import re
from io import BytesIO
from typing import Any, Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

import ai as ai_mod


def _destination_label(dest: Optional[str]) -> str:
    if dest == "disney-world":
        return "Walt Disney World"
    if dest == "disneyland":
        return "Disneyland Resort"
    return dest or "Not specified"


def _format_trip_header(trip: Optional[dict[str, Any]]) -> list[tuple[str, str]]:
    """Lines for PDF header (label, value)."""
    rows: list[tuple[str, str]] = []
    if not trip:
        rows.append(("Trip details", "Not provided in planner"))
        return rows
    rows.append(("Destination", _destination_label(trip.get("destination"))))
    if trip.get("arrival_date"):
        rows.append(("Arrival", str(trip["arrival_date"])))
    if trip.get("departure_date"):
        rows.append(("Departure", str(trip["departure_date"])))
    adults = trip.get("number_of_adults", 1)
    kids = trip.get("number_of_children", 0)
    rows.append(("Party", f"{adults} adult(s), {kids} child(ren)"))
    if trip.get("child_ages"):
        rows.append(("Child ages", ", ".join(trip["child_ages"])))
    if trip.get("length_of_stay_days"):
        rows.append(("Length of stay", f"{trip['length_of_stay_days']} days"))
    if trip.get("park_days") is not None:
        rows.append(("Park days", str(trip["park_days"])))
    if trip.get("priorities"):
        rows.append(("Priorities", ", ".join(trip["priorities"])))
    if trip.get("parks_planned"):
        rows.append(("Parks planned", ", ".join(trip["parks_planned"])))
    if trip.get("park_schedule_notes"):
        rows.append(("Park day plan", str(trip["park_schedule_notes"])[:500]))
    u7 = trip.get("party_age_under_7")
    r712 = trip.get("party_age_7_12")
    teen = trip.get("party_age_teen")
    adult = trip.get("party_age_adult")
    if any(x is not None for x in (u7, r712, teen, adult)):
        rows.append(
            (
                "Party by age",
                f"under 7: {u7 or 0}; 7–12: {r712 or 0}; "
                f"teens: {teen or 0}; adults: {adult or 0}",
            )
        )
    if trip.get("thrill_tolerance"):
        rows.append(("Thrill tolerance", str(trip["thrill_tolerance"])))
    if trip.get("first_timer_focus"):
        rows.append(("Top priority", str(trip["first_timer_focus"])))
    if trip.get("mobility_notes"):
        rows.append(("Mobility", str(trip["mobility_notes"])[:300]))
    if trip.get("dietary_restrictions"):
        rows.append(("Dietary", str(trip["dietary_restrictions"])[:300]))
    return rows


def _chat_transcript(messages: list[dict[str, str]]) -> str:
    lines = []
    for m in messages:
        role = m.get("role", "")
        text = (m.get("text") or "").strip()
        if not text:
            continue
        who = "Guest" if role == "user" else "Mouse Mentor"
        lines.append(f"{who}: {text}")
    return "\n\n".join(lines)


def _extract_json_object(text: str) -> dict[str, Any]:
    """Parse JSON from model output; strip markdown fences if present."""
    t = text.strip()
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)```$", t, re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()
    return json.loads(t)


def extract_itinerary_json(
    messages: list[dict[str, str]],
    trip_info: Optional[dict[str, Any]],
) -> dict[str, Any]:
    """
    Call the configured LLM to produce structured itinerary JSON.
    Schema: { "summary": str, "days": [ { "title": str, "items": [str] } ] }
    """
    if ai_mod.AI_PROVIDER == "groq" and not ai_mod.GROQ_API_KEY:
        raise RuntimeError("Set GROQ_API_KEY in the backend to export an itinerary.")
    if ai_mod.AI_PROVIDER == "gemini" and not ai_mod.GEMINI_API_KEY:
        raise RuntimeError("Set GEMINI_API_KEY in the backend to export an itinerary.")

    transcript = _chat_transcript(messages)
    trip_blob = json.dumps(trip_info or {}, indent=2)

    system = (
        "You extract a practical day-by-day Disney vacation itinerary from a chat transcript. "
        "Use trip JSON for dates and party when present; align day labels with arrival/departure. "
        "If the chat is sparse, infer reasonable daily themes from what was discussed. "
        "Return ONLY valid JSON (no markdown) with this exact shape:\n"
        '{"summary":"one short paragraph overview","days":['
        '{"title":"Day 1 — YYYY-MM-DD or label","items":["bullet or sentence","..."]}'
        "]}\n"
        "Use 1–14 day entries; each item is one line of plan (parks, meals, tips)."
    )
    user = f"Trip details (JSON):\n{trip_blob}\n\nConversation:\n{transcript}"

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
            temperature=0.25,
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
                temperature=0.25,
                response_mime_type="application/json",
            ),
        )
        raw = (resp.text or "").strip()

    data = _extract_json_object(raw)
    if not isinstance(data, dict):
        raise ValueError("Model returned non-object JSON")
    if "days" not in data:
        data["days"] = []
    if "summary" not in data:
        data["summary"] = ""
    return data


def build_itinerary_pdf(
    trip_info: Optional[dict[str, Any]],
    itinerary: dict[str, Any],
) -> bytes:
    """Build PDF bytes with ReportLab."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ItinTitle",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=colors.HexColor("#1a365d"),
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        name="DayHeading",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#2c5282"),
        spaceBefore=14,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        name="ItinBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
    )
    label_style = ParagraphStyle(
        name="Label",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#4a5568"),
    )

    story: list[Any] = []
    story.append(Paragraph("Mouse Mentor — Your Itinerary", title_style))
    story.append(Spacer(1, 0.08 * inch))

    for label, value in _format_trip_header(trip_info):
        story.append(
            Paragraph(
                f"<b>{escape(label)}:</b> {escape(value)}",
                label_style,
            ),
        )
        story.append(Spacer(1, 0.06 * inch))

    story.append(Spacer(1, 0.12 * inch))
    summary = (itinerary.get("summary") or "").strip()
    if summary:
        story.append(Paragraph("<b>Overview</b>", heading_style))
        sum_safe = escape(summary).replace("\n", "<br/>")
        story.append(Paragraph(sum_safe, body_style))
        story.append(Spacer(1, 0.1 * inch))

    days = itinerary.get("days") or []
    if not days:
        story.append(
            Paragraph(
                "No day-by-day plan could be derived from this conversation. "
                "Try asking Mouse Mentor for a suggested daily schedule, then export again.",
                body_style,
            )
        )
    for day in days:
        if not isinstance(day, dict):
            continue
        title = str(day.get("title") or "Day").strip()
        story.append(Paragraph(escape(title), heading_style))
        items = day.get("items") or []
        if isinstance(items, list) and items:
            for it in items:
                if not it:
                    continue
                line = escape(str(it).strip())
                story.append(Paragraph(f"• {line}", body_style))
        else:
            body = (day.get("body") or day.get("notes") or "").strip()
            if body:
                safe = escape(body).replace("\n", "<br/>")
                story.append(Paragraph(safe, body_style))
        story.append(Spacer(1, 0.08 * inch))

    story.append(Spacer(1, 0.2 * inch))
    story.append(
        Paragraph(
            "<i>Generated by Mouse Mentor from your chat. Plans are suggestions—verify park hours, "
            "reservations, and official Disney information before your trip.</i>",
            ParagraphStyle(
                name="Footer",
                parent=styles["Normal"],
                fontSize=8,
                textColor=colors.grey,
            ),
        )
    )

    doc.build(story)
    return buffer.getvalue()
