"""
Mouse Mentor API: auth (register/login), chat, and saved trip per user.
Developed by Sydney Edwards.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import auth
import store
from ai import generate_reply as ai_generate_reply

app = FastAPI(title="Mouse Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    auth.init_users()
    store.init_db()


# ----- Auth -----


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


def get_current_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Optional[int]:
    """Return user_id from Bearer token, or None if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "").strip()
    return auth.decode_access_token(token)


def require_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> int:
    """Return user_id from Bearer token or raise 401."""
    user_id = get_current_user_id(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sign in to save or load your trip")
    if auth.get_user_by_id(user_id) is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


@app.post("/auth/register", response_model=TokenResponse)
def register(data: RegisterRequest):
    if not data.email.strip():
        raise HTTPException(status_code=400, detail="Email required")
    if len(data.password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
    existing = auth.get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = auth.create_user(data.email, data.password)
    token = auth.create_access_token(user["id"])
    return TokenResponse(access_token=token, email=user["email"])


@app.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest):
    user = auth.get_user_by_email(data.email)
    if not user or not auth.verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_access_token(user["id"])
    return TokenResponse(access_token=token, email=user["email"])


# ----- Chat & Trip -----


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
    flexible_travel_period: Optional[str] = None
    park_days: Optional[int] = None
    priorities: Optional[List[str]] = None
    on_site: Optional[bool] = None
    resort_tier: Optional[str] = None
    first_visit: Optional[bool] = None
    special_occasion: Optional[str] = None
    trip_pace: Optional[str] = None
    budget_vibe: Optional[str] = None
    ride_preference: Optional[str] = None
    genie_plus_interest: Optional[str] = None
    dietary_notes: Optional[str] = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    trip_info: Optional[TripInfo] = None
    save_trip: bool = False


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    user_id = get_current_user_id(authorization)
    if request.save_trip and request.trip_info:
        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Sign in to save your trip",
            )
        store.save_trip(user_id, request.trip_info.model_dump())
    elif not request.save_trip and user_id is not None:
        store.delete_trip(user_id)

    last = request.messages[-1] if request.messages else None
    trip = request.trip_info

    if last and last.text.strip():
        messages_payload = [{"role": m.role, "text": m.text} for m in request.messages]
        trip_dict = trip.model_dump() if trip else None
        reply = ai_generate_reply(
            messages=messages_payload,
            trip_info=trip_dict,
            use_web_search=True,
        )
    else:
        reply = "Share your trip details above, then ask about parks, hotels, dining, or dates."
    return ChatResponse(reply=reply)


@app.get("/trip")
def get_saved_trip(user_id: int = Depends(require_user)):
    data = store.get_trip(user_id)
    return {"trip": data}


@app.delete("/trip")
def delete_saved_trip(user_id: int = Depends(require_user)):
    store.delete_trip(user_id)
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
