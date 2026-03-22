"""
Mouse Mentor API: auth (register/login), chat, and saved trip per user.
Async FastAPI + SQLAlchemy. Developed by Sydney Edwards.
"""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.responses import JSONResponse

import auth
import env  # noqa: F401  # load .env before database/auth read os.environ
import itinerary_export
import lightning_lane_guide as ll_guide
import store
import wait_times
from ai import (
    CHAT_HISTORY_WINDOW,
    summarize_conversation_messages,
)
from ai import (
    stream_reply as ai_stream_reply,
)
from billing import router as billing_router
from database import async_session_maker, get_session, init_db
from deps import get_current_user_id, require_pro, require_user
from rate_limit import chat_limit_for_key, chat_rate_limit_key
from schemas import TokenResponse

# Per-route limits use chat_rate_limit_key + chat_limit_for_key; default key is IP.
limiter = Limiter(
    key_func=get_remote_address,
    headers_enabled=True,
    retry_after="seconds",
)


def _cors_origins() -> List[str]:
    raw = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Mouse Mentor API", lifespan=lifespan)

app.state.limiter = limiter


def rate_limit_exceeded_handler(
    request: Request, _exc: RateLimitExceeded
) -> JSONResponse:
    """JSON body + Retry-After / X-RateLimit-* via slowapi when limits are exceeded."""
    response = JSONResponse(
        status_code=429,
        content={
            "detail": "Too many chat requests. Please wait before trying again.",
            "error": "rate_limited",
        },
    )
    return request.app.state.limiter._inject_headers(
        response, request.state.view_rate_limit
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
)

app.include_router(billing_router, prefix="/billing", tags=["billing"])


# ----- Auth -----


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/register", response_model=TokenResponse)
async def register(data: RegisterRequest, session: AsyncSession = Depends(get_session)):
    if not data.email.strip():
        raise HTTPException(status_code=400, detail="Email required")
    if len(data.password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
    existing = await auth.get_user_by_email(session, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await auth.create_user(session, data.email, data.password)
    token = auth.create_access_token(user["id"], is_pro=bool(user.get("is_pro")))
    return TokenResponse(
        access_token=token,
        email=user["email"],
        is_pro=bool(user.get("is_pro")),
    )


@app.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_session)):
    user = await auth.get_user_by_email(session, data.email)
    if not user or not auth.verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_access_token(user["id"], is_pro=bool(user.get("is_pro")))
    return TokenResponse(
        access_token=token,
        email=user["email"],
        is_pro=bool(user.get("is_pro")),
    )


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
    # First-time visitor wizard (primary personalization for AI)
    parks_planned: Optional[List[str]] = None
    park_schedule_notes: Optional[str] = None
    party_age_under_7: int = 0
    party_age_7_12: int = 0
    party_age_teen: int = 0
    party_age_adult: int = 1
    thrill_tolerance: Optional[str] = None
    mobility_notes: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    first_timer_focus: Optional[str] = None


class ShortestWaitItem(BaseModel):
    """Top shortest waits (e.g. from /wait-times) passed for AI context."""

    name: str
    wait_minutes: int
    park_name: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    trip_info: Optional[TripInfo] = None
    save_trip: bool = False
    shortest_waits: Optional[list[ShortestWaitItem]] = None


class ExportRequest(BaseModel):
    """Chat transcript + optional trip for PDF itinerary export."""

    messages: list[ChatMessage]
    trip_info: Optional[TripInfo] = None


class ItineraryGenerateRequest(BaseModel):
    """Trip context + optional wait samples for structured day-by-day JSON."""

    trip_info: TripInfo
    shortest_waits: Optional[list[ShortestWaitItem]] = None


class LightningLaneGuideRequest(BaseModel):
    """Onboarding trip profile for structured Lightning Lane guide JSON."""

    trip_info: TripInfo


def _sse_data(obj: dict) -> str:
    """One Server-Sent Event data line (JSON payload)."""
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/wait-times")
async def get_wait_times(refresh: bool = False):
    """Real-time WDW standby waits (ThemeParks Wiki), cached 5 minutes."""
    try:
        return await wait_times.get_wait_times_response(force_refresh=refresh)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not load wait times: {e!s}",
        ) from e


@app.post("/chat")
@limiter.limit(chat_limit_for_key, key_func=chat_rate_limit_key)
async def chat(
    request: Request,
    body: ChatRequest,
    session: AsyncSession = Depends(get_session),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    user_id = get_current_user_id(authorization)
    if body.save_trip and body.trip_info:
        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Sign in to save your trip",
            )
        await store.save_trip(session, user_id, body.trip_info.model_dump())
    elif not body.save_trip and user_id is not None:
        await store.delete_trip(session, user_id)
        await store.clear_chat_messages(session, user_id)

    last = body.messages[-1] if body.messages else None
    trip = body.trip_info

    messages_payload = [{"role": m.role, "text": m.text} for m in body.messages]
    conv_summary: Optional[str] = None
    messages_for_llm = messages_payload
    if last and last.text.strip() and len(messages_payload) > CHAT_HISTORY_WINDOW:
        older = messages_payload[:-CHAT_HISTORY_WINDOW]
        messages_for_llm = messages_payload[-CHAT_HISTORY_WINDOW:]
        try:
            conv_summary = await asyncio.to_thread(
                summarize_conversation_messages, older
            )
        except Exception:
            conv_summary = None

    persist_messages = user_id is not None and body.save_trip

    async def event_generator():
        full_reply: list[str] = []
        completion_ok = False
        try:
            if not last or not last.text.strip():
                static = "Share your trip details above, then ask about parks, hotels, dining, or dates."
                yield _sse_data({"type": "token", "text": static})
                yield _sse_data({"type": "done"})
                return

            trip_dict = trip.model_dump() if trip else None

            wait_list: list[dict] = []
            if body.shortest_waits:
                wait_list = [w.model_dump() for w in body.shortest_waits]
            else:
                try:
                    wt = await wait_times.get_wait_times_response()
                    wait_list = wt.get("top10_shortest") or []
                except Exception:
                    wait_list = []

            wait_ctx = wait_times.format_shortest_waits_for_ai(wait_list) or None

            async for token in ai_stream_reply(
                messages=messages_for_llm,
                trip_info=trip_dict,
                use_web_search=True,
                wait_times_context=wait_ctx,
                conversation_summary=conv_summary,
            ):
                if token:
                    full_reply.append(token)
                    yield _sse_data({"type": "token", "text": token})
            yield _sse_data({"type": "done"})
            completion_ok = True
        except Exception as e:
            yield _sse_data({"type": "error", "message": str(e)})
        finally:
            if (
                persist_messages
                and user_id is not None
                and completion_ok
                and full_reply
            ):
                text = "".join(full_reply)
                try:
                    async with async_session_maker() as session:
                        msgs = [{"role": m.role, "text": m.text} for m in body.messages]
                        msgs.append({"role": "assistant", "text": text})
                        await store.set_chat_messages(session, user_id, msgs)
                        await session.commit()
                except Exception:
                    pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/export")
async def export_itinerary_pdf(
    request: ExportRequest,
    _user_id: int = Depends(require_pro),
):
    """
    Extract a day-by-day itinerary from the conversation via the LLM and return a PDF.
    Requires Mouse Mentor Pro.
    """
    if not request.messages:
        raise HTTPException(
            status_code=400,
            detail="Add some chat messages before exporting.",
        )
    messages_payload = [{"role": m.role, "text": m.text} for m in request.messages]
    trip_dict = request.trip_info.model_dump() if request.trip_info else None
    try:
        itinerary = await asyncio.to_thread(
            itinerary_export.extract_itinerary_json,
            messages_payload,
            trip_dict,
        )
        pdf_bytes = await asyncio.to_thread(
            itinerary_export.build_itinerary_pdf,
            trip_dict,
            itinerary,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse itinerary from the model: {e!s}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not generate PDF: {e!s}",
        ) from e
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="mouse-mentor-itinerary.pdf"',
        },
    )


@app.post("/itinerary/generate")
@limiter.limit("30/hour")
async def generate_structured_itinerary(
    request: Request,
    body: ItineraryGenerateRequest,
    session: AsyncSession = Depends(get_session),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """
    One-shot LLM call: full day-by-day plan as JSON (timeline schema).
    Anonymous OK (rate limited); signed-in users also persist to saved_trips.
    """
    user_id = get_current_user_id(authorization)
    trip_dict = body.trip_info.model_dump()
    wait_list = [w.model_dump() for w in (body.shortest_waits or [])]
    try:
        itinerary = await asyncio.to_thread(
            itinerary_export.generate_structured_itinerary_from_trip,
            trip_dict,
            wait_list,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse itinerary JSON: {e!s}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not generate itinerary: {e!s}",
        ) from e

    if user_id is not None:
        await store.save_trip(session, user_id, trip_dict)
        await store.set_generated_itinerary(session, user_id, itinerary)

    return {"itinerary": itinerary}


@app.post("/itinerary/export-pdf")
async def export_structured_itinerary_pdf(
    user_id: int = Depends(require_pro),
    session: AsyncSession = Depends(get_session),
):
    """Download PDF of the structured timeline (Pro)."""
    bundle = await store.get_trip_bundle(session, user_id)
    if not bundle or not bundle.get("generated_itinerary"):
        raise HTTPException(
            status_code=400,
            detail="Generate your itinerary from the trip planner first.",
        )
    trip_dict = bundle["trip"]
    itinerary = bundle["generated_itinerary"]
    try:
        pdf_bytes = await asyncio.to_thread(
            itinerary_export.build_structured_itinerary_pdf,
            trip_dict,
            itinerary,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not build PDF: {e!s}",
        ) from e
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="mouse-mentor-itinerary.pdf"',
        },
    )


@app.post("/lightning-lane-guide/generate")
@limiter.limit("30/hour")
async def generate_lightning_lane_guide_endpoint(
    request: Request,
    body: LightningLaneGuideRequest,
    session: AsyncSession = Depends(get_session),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """
    Structured JSON: Multi Pass / Single Pass / Individual LL explainer + per-day
    booking order and wake times from party composition and thrill tolerance.
    """
    user_id = get_current_user_id(authorization)
    trip_dict = body.trip_info.model_dump()
    try:
        guide = await asyncio.to_thread(
            ll_guide.generate_lightning_lane_guide,
            trip_dict,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse Lightning Lane guide JSON: {e!s}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not generate Lightning Lane guide: {e!s}",
        ) from e

    if user_id is not None:
        await store.save_trip(session, user_id, trip_dict)
        await store.set_lightning_lane_guide(session, user_id, guide)

    return {"guide": guide}


@app.get("/messages")
async def get_saved_messages(
    user_id: int = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Load persisted chat history (users who save trip + chat data)."""
    rows = await store.get_chat_messages(session, user_id)
    return {
        "messages": [{"id": str(r.id), "role": r.role, "text": r.text} for r in rows]
    }


@app.delete("/messages")
async def clear_saved_messages(
    user_id: int = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Clear stored chat history for the current user."""
    await store.clear_chat_messages(session, user_id)
    return {"cleared": True}


@app.get("/trip")
async def get_saved_trip(
    user_id: int = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    bundle = await store.get_trip_bundle(session, user_id)
    if bundle is None:
        return {
            "trip": None,
            "generated_itinerary": None,
            "lightning_lane_guide": None,
        }
    return {
        "trip": bundle["trip"],
        "generated_itinerary": bundle.get("generated_itinerary"),
        "lightning_lane_guide": bundle.get("lightning_lane_guide"),
    }


@app.delete("/trip")
async def delete_saved_trip(
    user_id: int = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    await store.delete_trip(session, user_id)
    await store.clear_chat_messages(session, user_id)
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
