"""
API tests: health, chat, auth (register/login), and protected trip endpoints.
Developed by Sydney Edwards.
"""

import asyncio
import json
from unittest.mock import patch

from fastapi.testclient import TestClient

import auth
from database import async_session_maker
from main import app, limiter

client = TestClient(app)


def _mark_user_pro(token: str) -> None:
    """Grant Pro in DB for the user tied to this JWT (for tests)."""
    uid = auth.decode_access_token(token)
    assert uid is not None

    async def _grant() -> None:
        async with async_session_maker() as session:
            await auth.set_user_pro(session, uid)
            await session.commit()

    asyncio.run(_grant())


def _sse_collect_text(body: str) -> str:
    """Concatenate token payloads from an SSE /chat response body."""
    parts = []
    for line in body.splitlines():
        line = line.strip()
        if not line.startswith("data: "):
            continue
        try:
            obj = json.loads(line[6:])
        except json.JSONDecodeError:
            continue
        if obj.get("type") == "token":
            parts.append(obj.get("text", ""))
    return "".join(parts)


def _sse_has_done(body: str) -> bool:
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("data: "):
            try:
                obj = json.loads(line[6:])
                if obj.get("type") == "done":
                    return True
            except json.JSONDecodeError:
                continue
    return False


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_wait_times_endpoint():
    """GET /wait-times returns parks + top10 (mocked upstream via conftest)."""
    response = client.get("/wait-times")
    assert response.status_code == 200
    data = response.json()
    assert "parks" in data
    assert "top10_shortest" in data
    assert "fetched_at" in data
    assert "cached" in data


def test_chat_empty_messages():
    response = client.post("/chat", json={"messages": []})
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("text/event-stream")
    body = response.text
    reply = _sse_collect_text(body).lower()
    assert "disney" in reply or "trip" in reply or "parks" in reply
    assert _sse_has_done(body)


async def _fake_stream_short(*args, **kwargs):
    yield "Best time to visit is typically off-peak. Ask me about crowds and events!"


@patch("main.ai_stream_reply", side_effect=_fake_stream_short)
def test_chat_rate_limit_unauthenticated(mock_stream):
    """Anonymous clients: 5 requests/hour per IP; 6th returns 429 + Retry-After."""
    limiter.reset()
    prev = limiter.enabled
    limiter.enabled = True
    try:
        payload = {"messages": [{"role": "user", "text": "Rate limit probe"}]}
        for _ in range(5):
            r = client.post("/chat", json=payload)
            assert r.status_code == 200
        blocked = client.post("/chat", json=payload)
        assert blocked.status_code == 429
        body = blocked.json()
        assert "detail" in body
        assert body.get("error") == "rate_limited"
        assert blocked.headers.get("Retry-After")
    finally:
        limiter.enabled = prev
        limiter.reset()


@patch("main.ai_stream_reply", side_effect=_fake_stream_short)
def test_chat_with_message(mock_stream):
    response = client.post(
        "/chat",
        json={
            "messages": [{"role": "user", "text": "Best time to visit?"}],
        },
    )
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("text/event-stream")
    text = _sse_collect_text(response.text)
    assert "Best" in text or "visit" in text.lower()
    assert _sse_has_done(response.text)
    mock_stream.assert_called_once()


async def _fake_stream_trip(*args, **kwargs):
    yield (
        "For Walt Disney World with 2 adults and 1 child over 5 days, "
        "I'd suggest Magic Kingdom, Epcot, and Hollywood Studios. Book park reservations early!"
    )


@patch("main.ai_stream_reply", side_effect=_fake_stream_trip)
def test_chat_with_trip_info(mock_stream):
    response = client.post(
        "/chat",
        json={
            "messages": [{"role": "user", "text": "What parks should I book?"}],
            "trip_info": {
                "destination": "disney-world",
                "arrival_date": "2025-06-01",
                "departure_date": "2025-06-05",
                "number_of_adults": 2,
                "number_of_children": 1,
                "length_of_stay_days": 5,
            },
        },
    )
    assert response.status_code == 200
    text = _sse_collect_text(response.text)
    assert "Walt Disney World" in text or "disney-world" in text
    assert "2" in text or "3" in text  # party size
    assert _sse_has_done(response.text)
    mock_stream.assert_called_once()


def test_chat_invalid_body_rejected():
    response = client.post("/chat", json={})
    assert response.status_code == 422


def test_chat_save_trip_requires_auth():
    response = client.post(
        "/chat",
        json={
            "messages": [{"role": "user", "text": "Hi"}],
            "trip_info": {"destination": "disney-world"},
            "save_trip": True,
        },
    )
    assert response.status_code == 401
    assert "Sign in" in response.json()["detail"]


def test_export_requires_auth():
    response = client.post(
        "/export",
        json={"messages": [{"role": "user", "text": "Hi"}]},
    )
    assert response.status_code == 401


def test_export_requires_pro():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/export",
        json={"messages": [{"role": "user", "text": "Hi"}]},
        headers=headers,
    )
    assert response.status_code == 403
    assert "Pro" in response.json().get("detail", "")


def test_export_requires_messages_when_pro():
    token = get_auth_token()
    _mark_user_pro(token)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/export", json={"messages": []}, headers=headers)
    assert response.status_code == 400


def test_get_messages_empty_when_logged_in():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    client.delete("/messages", headers=headers)
    response = client.get("/messages", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"messages": []}


async def _stream_hi(*args, **kwargs):
    yield "Hi there"


@patch("main.ai_stream_reply", side_effect=_stream_hi)
def test_chat_persists_messages_when_save_trip(mock_stream):
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    client.delete("/messages", headers=headers)
    r = client.post(
        "/chat",
        json={
            "messages": [{"role": "user", "text": "Hello"}],
            "trip_info": {"destination": "disney-world"},
            "save_trip": True,
        },
        headers=headers,
    )
    assert r.status_code == 200
    _ = r.text
    loaded = client.get("/messages", headers=headers)
    assert loaded.status_code == 200
    msgs = loaded.json()["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[0]["text"] == "Hello"
    assert msgs[1]["role"] == "assistant"
    assert "Hi there" in msgs[1]["text"]
    mock_stream.assert_called_once()
    client.delete("/messages", headers=headers)


@patch("main.itinerary_export.build_itinerary_pdf", return_value=b"%PDF-1.4\n")
@patch(
    "main.itinerary_export.extract_itinerary_json",
    return_value={"summary": "Test trip", "days": []},
)
def test_export_returns_pdf(mock_extract, mock_build):
    token = get_auth_token()
    _mark_user_pro(token)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/export",
        json={"messages": [{"role": "user", "text": "Plan my day at EPCOT"}]},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("application/pdf")
    assert "attachment" in response.headers.get("content-disposition", "").lower()
    assert response.content.startswith(b"%PDF")
    mock_extract.assert_called_once()
    mock_build.assert_called_once()


def test_get_trip_requires_auth():
    response = client.get("/trip")
    assert response.status_code == 401


def test_get_messages_requires_auth():
    response = client.get("/messages")
    assert response.status_code == 401


def test_clear_messages_requires_auth():
    response = client.delete("/messages")
    assert response.status_code == 401


def get_auth_token():
    email = "testuser@example.com"
    password = "testpass123"
    reg = client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    assert reg.status_code in (200, 400)
    if reg.status_code == 400 and "already" in reg.json().get("detail", "").lower():
        login = client.post("/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200
        data = login.json()
        assert "access_token" in data
        assert data["email"] == email
        return data["access_token"]
    assert reg.status_code == 200
    data = reg.json()
    assert "access_token" in data
    assert data["email"] == email
    return data["access_token"]


def test_get_trip_after_save():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    trip = {
        "destination": "disney-world",
        "number_of_adults": 2,
    }

    async def _saved_stream(*args, **kwargs):
        yield "Saved!"

    with patch("main.ai_stream_reply", side_effect=_saved_stream):
        client.post(
            "/chat",
            json={
                "messages": [{"role": "user", "text": "Hi"}],
                "trip_info": trip,
                "save_trip": True,
            },
            headers=headers,
        )
    response = client.get("/trip", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["trip"] is not None
    assert data["trip"]["destination"] == "disney-world"
    assert data["trip"]["number_of_adults"] == 2


def test_delete_trip():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    async def _hi_stream(*args, **kwargs):
        yield "Hi!"

    with patch("main.ai_stream_reply", side_effect=_hi_stream):
        client.post(
            "/chat",
            json={
                "messages": [{"role": "user", "text": "Hi"}],
                "trip_info": {"destination": "disney-world"},
                "save_trip": True,
            },
            headers=headers,
        )
    response = client.get("/trip", headers=headers)
    assert response.json()["trip"] is not None
    del_response = client.delete("/trip", headers=headers)
    assert del_response.status_code == 200
    assert del_response.json() == {"deleted": True}
    get_again = client.get("/trip", headers=headers)
    assert get_again.status_code == 200
    assert get_again.json()["trip"] is None


# ----- Auth API security -----


def test_register_rejects_empty_email():
    """Registration must reject empty email."""
    response = client.post(
        "/auth/register",
        json={"email": "   ", "password": "validpass8"},
    )
    assert response.status_code == 400
    assert "email" in response.json().get("detail", "").lower()


def test_register_rejects_short_password():
    """Registration must enforce minimum password length (8 characters)."""
    response = client.post(
        "/auth/register",
        json={"email": "newuser@example.com", "password": "short"},
    )
    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "8" in detail or "password" in detail.lower()


def test_register_rejects_duplicate_email():
    """Registration must reject an email that is already registered."""
    email = "duplicate@example.com"
    password = "password123"
    first = client.post("/auth/register", json={"email": email, "password": password})
    # First attempt may succeed (200) or already exist from prior run (400)
    assert first.status_code in (200, 400)
    second = client.post("/auth/register", json={"email": email, "password": password})
    assert second.status_code == 400
    assert "already" in second.json().get("detail", "").lower()


def test_login_rejects_wrong_password():
    """Login must return 401 for wrong password."""
    email = "loginwrong@example.com"
    client.post("/auth/register", json={"email": email, "password": "correctpass8"})
    response = client.post(
        "/auth/login",
        json={"email": email, "password": "wrongpassword"},
    )
    assert response.status_code == 401
    detail = response.json().get("detail", "").lower()
    assert "invalid" in detail or "password" in detail


def test_login_rejects_unknown_email_same_status():
    """Login must return 401 for unknown email (same as wrong password, no user enumeration)."""
    response = client.post(
        "/auth/login",
        json={"email": "nonexistent@example.com", "password": "anypassword"},
    )
    assert response.status_code == 401
    detail = response.json().get("detail", "").lower()
    assert "invalid" in detail or "password" in detail or "email" in detail


def test_get_trip_rejects_malformed_bearer_token():
    """Protected route must return 401 when Bearer token is missing or malformed."""
    r1 = client.get("/trip", headers={"Authorization": "Bearer"})
    assert r1.status_code == 401
    r2 = client.get("/trip", headers={"Authorization": "Basic foo"})
    assert r2.status_code == 401


def test_get_trip_rejects_invalid_jwt():
    """Protected route must return 401 when token is invalid or tampered."""
    token = auth.create_access_token(999)
    tampered = token[:-1] + ("x" if token[-1] != "x" else "y")
    response = client.get("/trip", headers={"Authorization": f"Bearer {tampered}"})
    assert response.status_code == 401


def test_delete_trip_requires_valid_token():
    """DELETE /trip must return 401 without valid token."""
    response = client.delete("/trip")
    assert response.status_code == 401


def test_trip_share_requires_auth():
    response = client.post("/trip/share")
    assert response.status_code == 401


def test_public_trip_not_found():
    response = client.get("/public/trip/doesnotexist")
    assert response.status_code == 404


def test_dining_alerts_requires_auth():
    r = client.get("/dining/alerts")
    assert r.status_code == 401
    r2 = client.post(
        "/dining/alerts",
        json={
            "restaurant": "Test",
            "restaurant_slug": "cinderellas-royal-table",
            "date": "2026-06-01",
            "party_size": 2,
            "time_windows": ["12:00 PM – 1:00 PM"],
        },
    )
    assert r2.status_code == 401


@patch(
    "dining_suggest_times.suggest_dining_times",
    return_value=[
        {
            "time_window": "12:00 PM – 1:00 PM",
            "reason": "Test reason here.",
            "confidence": "high",
        },
        {
            "time_window": "6:00 PM – 7:00 PM",
            "reason": "Dinner window.",
            "confidence": "medium",
        },
    ],
)
def test_dining_suggest_times(mock_suggest):
    response = client.post(
        "/dining/suggest-times",
        json={
            "restaurant": "Cinderella's Royal Table",
            "date": "2026-06-01",
            "trip_info": {
                "destination": "disney-world",
                "number_of_adults": 2,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert len(data["suggestions"]) == 2
    mock_suggest.assert_called_once()


def test_tips_generate_requires_auth():
    response = client.post(
        "/tips/generate",
        json={"trip_info": {"destination": "disney-world"}},
    )
    assert response.status_code == 401


@patch(
    "main.trip_tips.generate_personalized_tips",
    return_value={
        "generation_id": "genabc",
        "tips": [
            {"id": "genabc-t1", "title": "T1", "body": "B1"},
            {"id": "genabc-t2", "title": "T2", "body": "B2"},
            {"id": "genabc-t3", "title": "T3", "body": "B3"},
            {"id": "genabc-t4", "title": "T4", "body": "B4"},
            {"id": "genabc-t5", "title": "T5", "body": "B5"},
        ],
    },
)
def test_tips_generate_cached_and_regenerate(mock_gen):
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    body = {
        "trip_info": {
            "destination": "disney-world",
            "party_age_under_7": 1,
        },
        "regenerate": False,
    }
    r1 = client.post("/tips/generate", json=body, headers=headers)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["generation_id"] == "genabc"
    assert len(d1["tips"]) == 5
    mock_gen.assert_called_once()

    r2 = client.post("/tips/generate", json=body, headers=headers)
    assert r2.status_code == 200
    assert r2.json() == d1
    assert mock_gen.call_count == 1

    r3 = client.post(
        "/tips/generate",
        json={**body, "regenerate": True},
        headers=headers,
    )
    assert r3.status_code == 200
    assert mock_gen.call_count == 2

    r_get = client.get("/trip", headers=headers)
    assert r_get.status_code == 200
    assert r_get.json().get("generated_tips") == r3.json()


def test_share_and_public_trip_roundtrip():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    trip = {
        "destination": "disney-world",
        "number_of_adults": 2,
    }

    async def _saved_stream(*args, **kwargs):
        yield "Saved!"

    with patch("main.ai_stream_reply", side_effect=_saved_stream):
        client.post(
            "/chat",
            json={
                "messages": [{"role": "user", "text": "Hi"}],
                "trip_info": trip,
                "save_trip": True,
            },
            headers=headers,
        )
    share = client.post("/trip/share", headers=headers)
    assert share.status_code == 200
    assert "share_token" in share.json()
    share_token = share.json()["share_token"]
    assert len(share_token) >= 8

    public = client.get(f"/public/trip/{share_token}")
    assert public.status_code == 200
    assert public.json()["trip"]["destination"] == "disney-world"

    second = client.post("/trip/share", headers=headers)
    assert second.status_code == 200
    assert second.json()["share_token"] == share_token


@patch(
    "main.itinerary_export.generate_structured_itinerary_from_trip",
    return_value={
        "summary": "Test plan",
        "days": [
            {
                "date": "2025-06-01",
                "park_name": "Magic Kingdom",
                "blocks": [
                    {
                        "period": "morning",
                        "items": [
                            {
                                "name": "Haunted Mansion",
                                "estimated_wait_minutes": 35,
                                "walking_tip": "Start in Liberty Square.",
                            }
                        ],
                    }
                ],
            }
        ],
    },
)
def test_itinerary_generate_returns_json(mock_gen):
    trip = {
        "destination": "disney-world",
        "arrival_date": "2025-06-01",
        "departure_date": "2025-06-02",
    }
    response = client.post("/itinerary/generate", json={"trip_info": trip})
    assert response.status_code == 200
    data = response.json()
    assert "itinerary" in data
    assert data["itinerary"]["summary"] == "Test plan"
    mock_gen.assert_called_once()


@patch(
    "main.ll_guide.generate_lightning_lane_guide",
    return_value={
        "intro": "LL intro",
        "explainer": {
            "lightning_lane_multi_pass": {
                "title": "Multi Pass",
                "plain_language": "x",
                "best_for": "y",
            },
            "lightning_lane_single_pass": {
                "title": "Single Pass",
                "plain_language": "x",
                "best_for": "y",
            },
            "individual_lightning_lane": {
                "title": "ILL",
                "plain_language": "x",
                "best_for": "y",
            },
        },
        "days": [],
    },
)
def test_lightning_lane_guide_generate(mock_ll):
    trip = {
        "destination": "disney-world",
        "arrival_date": "2025-06-01",
        "departure_date": "2025-06-02",
    }
    response = client.post(
        "/lightning-lane-guide/generate", json={"trip_info": trip}
    )
    assert response.status_code == 200
    data = response.json()
    assert "guide" in data
    assert data["guide"]["intro"] == "LL intro"
    mock_ll.assert_called_once()


@patch(
    "main.dining_rec.generate_top_restaurants",
    return_value={
        "restaurants": [
            {
                "id": "test-1",
                "name": "Test Kitchen",
                "location": "EPCOT",
                "brief_description": "Fun for families.",
                "price_range": "$$",
                "best_for_your_group": "Great with kids",
            }
        ]
    },
)
def test_dining_generate_returns_restaurants(mock_dining):
    trip = {
        "destination": "disney-world",
        "arrival_date": "2025-08-01",
        "departure_date": "2025-08-05",
    }
    response = client.post(
        "/api/dining/generate", json={"trip_info": trip}
    )
    assert response.status_code == 200
    data = response.json()
    assert "restaurants" in data
    assert len(data["restaurants"]) >= 1
    mock_dining.assert_called_once()
