"""
Shared pytest fixtures: mock ThemeParks Wiki wait-times fetch for chat tests.
Developed by Sydney Edwards.
"""

import os

# Disable slowapi during tests so suite can POST /chat many times without 429.
os.environ.setdefault("RATELIMIT_ENABLED", "false")

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="session", autouse=True)
def _run_app_lifespan():
    """Trigger FastAPI lifespan so init_db() creates tables (SQLite/Postgres)."""
    with TestClient(app):
        yield


@pytest.fixture(autouse=True)
def mock_wait_times_for_chat():
    """Avoid real HTTP to api.themeparks.wiki during API tests."""
    with patch(
        "main.wait_times.get_wait_times_response",
        new_callable=AsyncMock,
    ) as m:
        m.return_value = {
            "parks": [],
            "top10_shortest": [],
            "fetched_at": "2020-01-01T00:00:00Z",
            "cached": True,
        }
        yield m
