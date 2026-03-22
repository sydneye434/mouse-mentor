"""
Unit tests for ThemeParks Wiki wait-time parsing. Developed by Sydney Edwards.
"""

from wait_times import _parse_live_data


def test_parse_live_data_groups_parks_and_top10():
    raw = {
        "liveData": [
            {
                "id": "p1",
                "name": "Magic Kingdom Park",
                "entityType": "PARK",
                "parkId": None,
            },
            {
                "id": "p2",
                "name": "EPCOT",
                "entityType": "PARK",
                "parkId": None,
            },
            {
                "name": "Ride A",
                "entityType": "ATTRACTION",
                "parkId": "p1",
                "status": "OPERATING",
                "queue": {"STANDBY": {"waitTime": 30}},
            },
            {
                "name": "Ride B",
                "entityType": "ATTRACTION",
                "parkId": "p2",
                "status": "OPERATING",
                "queue": {"STANDBY": {"waitTime": 10}},
            },
            {
                "name": "Closed Thing",
                "entityType": "ATTRACTION",
                "parkId": "p1",
                "status": "CLOSED",
                "queue": {"STANDBY": {"waitTime": 5}},
            },
            {
                "name": "Restaurant",
                "entityType": "RESTAURANT",
                "parkId": "p1",
                "status": "OPERATING",
                "queue": {"STANDBY": {"waitTime": 15}},
            },
        ]
    }
    out = _parse_live_data(raw)
    assert "fetched_at" in out
    assert len(out["top10_shortest"]) == 2
    assert out["top10_shortest"][0]["name"] == "Ride B"
    assert out["top10_shortest"][0]["wait_minutes"] == 10
    park_names = {p["park_name"] for p in out["parks"]}
    assert "EPCOT" in park_names
    assert "Magic Kingdom Park" in park_names
