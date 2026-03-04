"""
Simple SQLite store for trip data attached to a session.
Only used when the user explicitly opts in to save their data.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Optional

_db_path: Optional[str] = None


def _get_db_path() -> str:
    global _db_path
    if _db_path is None:
        base = Path(__file__).resolve().parent
        _db_path = str(base / "saved_trips.db")
    return _db_path


def _conn() -> sqlite3.Connection:
    path = _get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the saved_trips table if it does not exist."""
    with _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_trips (
                session_id TEXT PRIMARY KEY,
                trip_data TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )


def save_trip(session_id: str, trip_data: dict[str, Any]) -> None:
    """Save or replace trip data for the given session_id."""
    import datetime

    init_db()
    raw = json.dumps(trip_data)
    updated = datetime.datetime.utcnow().isoformat() + "Z"
    with _conn() as c:
        c.execute(
            """
            INSERT INTO saved_trips (session_id, trip_data, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                trip_data = excluded.trip_data,
                updated_at = excluded.updated_at
            """,
            (session_id, raw, updated),
        )


def get_trip(session_id: str) -> Optional[dict[str, Any]]:
    """Return saved trip data for the session, or None."""
    init_db()
    with _conn() as c:
        row = c.execute(
            "SELECT trip_data FROM saved_trips WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    if row is None:
        return None
    return json.loads(row["trip_data"])


def delete_trip(session_id: str) -> None:
    """Remove any saved trip for this session (e.g. when user opts out)."""
    init_db()
    with _conn() as c:
        c.execute("DELETE FROM saved_trips WHERE session_id = ?", (session_id,))
