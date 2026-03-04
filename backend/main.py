from __future__ import annotations

from typing import List, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import store

app = FastAPI(title="Mouse Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    text: str


class TripInfo(BaseModel):
    """Basic trip details provided by the user."""

    destination: str
    arrival_date: Optional[str] = None
    departure_date: Optional[str] = None
    number_of_adults: int = 1
    number_of_children: int = 0
    child_ages: Optional[List[str]] = None
    length_of_stay_days: Optional[int] = None
    dates_flexible: bool = False
    priorities: Optional[List[str]] = None
    on_site: Optional[bool] = None  # True = staying at Disney resort
    resort_tier: Optional[str] = None  # e.g. "value", "moderate", "deluxe"
    first_visit: Optional[bool] = None
    special_occasion: Optional[str] = None  # e.g. "birthday", "anniversary"
    trip_pace: Optional[str] = None  # e.g. "relaxed", "balanced", "go-go-go"
    dietary_notes: Optional[str] = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    trip_info: Optional[TripInfo] = None
    # Only when True do we save trip_info on the server. Default is False (opt-out).
    save_trip: bool = False
    # Identifies the browser session; only used when save_trip is True, or to clear on opt-out.
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    # Respect save preference: only store when explicitly opted in; clear when opted out.
    if request.session_id:
        if request.save_trip and request.trip_info:
            store.save_trip(
                request.session_id,
                request.trip_info.model_dump(),
            )
        elif not request.save_trip:
            store.delete_trip(request.session_id)

    last = request.messages[-1] if request.messages else None
    trip = request.trip_info

    if last and last.text.strip():
        if trip:
            dest = (
                "Walt Disney World"
                if trip.destination == "disney-world"
                else "Disneyland"
            )
            party = trip.number_of_adults + trip.number_of_children
            days = trip.length_of_stay_days or (
                _days_between(trip.arrival_date, trip.departure_date)
                if trip.arrival_date and trip.departure_date
                else None
            )
            context = f"Your trip: {dest}, {party} guest(s)"
            if trip.child_ages:
                context += f", kids age ranges: {', '.join(trip.child_ages)}"
            if days:
                context += f", {days} day(s)"
            if trip.dates_flexible:
                context += ", flexible dates"
            elif trip.arrival_date:
                context += f", arriving {trip.arrival_date}"
            if trip.priorities:
                context += f", priorities: {', '.join(trip.priorities)}"
            if trip.on_site is not None:
                context += ", on-site" if trip.on_site else ", off-site"
            if trip.resort_tier:
                context += f", {trip.resort_tier} resort"
            if trip.first_visit is not None:
                context += ", first visit" if trip.first_visit else ", returning"
            if trip.special_occasion:
                context += f", celebrating {trip.special_occasion}"
            if trip.trip_pace:
                context += f", pace: {trip.trip_pace}"
            if trip.dietary_notes:
                context += f", dietary: {trip.dietary_notes}"
            context += ". "
            reply = f"{context}You asked: {last.text} I'll use this to personalize tips once we add an assistant."
        else:
            reply = f"(Placeholder) You said: {last.text}"
    else:
        reply = "Share your trip details above, then ask about parks, hotels, dining, or dates."
    return ChatResponse(reply=reply)


@app.get("/trip")
def get_saved_trip(
    session_id: Optional[str] = Query(None, description="Session ID for saved trip"),
):
    """Return trip data previously saved for this session, if any. Only exists when user opted in to save."""
    if not session_id:
        return {"trip": None}
    data = store.get_trip(session_id)
    return {"trip": data}


@app.delete("/trip")
def delete_saved_trip(
    session_id: Optional[str] = Query(None, description="Session ID for saved trip"),
):
    """Permanently delete trip data saved for this session."""
    if session_id:
        store.delete_trip(session_id)
    return {"deleted": True}


def _days_between(start: Optional[str], end: Optional[str]) -> Optional[int]:
    if not start or not end:
        return None
    try:
        from datetime import datetime

        a = datetime.strptime(start, "%Y-%m-%d")
        b = datetime.strptime(end, "%Y-%m-%d")
        return max(0, (b - a).days) + 1
    except (ValueError, TypeError):
        return None
