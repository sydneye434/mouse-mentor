"""
Shared pytest fixtures: mock ThemeParks Wiki wait-times fetch for chat tests.
Developed by Sydney Edwards.
"""

from unittest.mock import AsyncMock, patch

import pytest


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
