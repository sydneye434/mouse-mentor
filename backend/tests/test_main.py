from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_empty_messages():
    response = client.post("/chat", json={"messages": []})
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    reply = data["reply"].lower()
    assert "disney" in reply or "trip" in reply or "parks" in reply


def test_chat_with_message():
    response = client.post(
        "/chat",
        json={
            "messages": [{"role": "user", "text": "Best time to visit?"}],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert (
        "Placeholder" in data["reply"]
        or "Best" in data["reply"]
        or "visit" in data["reply"].lower()
    )


def test_chat_invalid_body_rejected():
    response = client.post("/chat", json={})
    assert response.status_code == 422


def test_chat_with_trip_info():
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
