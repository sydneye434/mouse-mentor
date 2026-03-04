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
    assert "Disney" in data["reply"] or "disney" in data["reply"].lower()


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
