"""
API tests: health, chat, auth (register/login), and protected trip endpoints.
Developed by Sydney Edwards.
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

import auth
from main import app

client = TestClient(app)


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
    data = response.json()
    assert "reply" in data
    reply = data["reply"].lower()
    assert "disney" in reply or "trip" in reply or "parks" in reply


@patch("main.ai_generate_reply")
def test_chat_with_message(mock_generate_reply):
    mock_generate_reply.return_value = (
        "Best time to visit is typically off-peak. Ask me about crowds and events!"
    )
    response = client.post(
        "/chat",
        json={
            "messages": [{"role": "user", "text": "Best time to visit?"}],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "Best" in data["reply"] or "visit" in data["reply"].lower()
    mock_generate_reply.assert_called_once()


@patch("main.ai_generate_reply")
def test_chat_with_trip_info(mock_generate_reply):
    mock_generate_reply.return_value = (
        "For Walt Disney World with 2 adults and 1 child over 5 days, "
        "I'd suggest Magic Kingdom, Epcot, and Hollywood Studios. Book park reservations early!"
    )
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
    data = response.json()
    assert "reply" in data
    assert "Walt Disney World" in data["reply"] or "disney-world" in data["reply"]
    assert "2" in data["reply"] or "3" in data["reply"]  # party size
    mock_generate_reply.assert_called_once()


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


def test_get_trip_requires_auth():
    response = client.get("/trip")
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
    with patch("main.ai_generate_reply", return_value="Saved!"):
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
    with patch("main.ai_generate_reply", return_value="Hi!"):
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
