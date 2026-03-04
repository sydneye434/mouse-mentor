"""
SQLite store for trip data. Trips are saved per user account (user_id).
Session-based storage has been removed. Developed by Sydney Edwards.
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
    conn = sqlite3.connect(_get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create the saved_trips table if it does not exist (keyed by user_id). Migrate from session_id schema if present."""
    with _conn() as c:
        cur = c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='saved_trips'"
        )
        if cur.fetchone():
            info = c.execute("PRAGMA table_info(saved_trips)").fetchall()
            columns = [row[1] for row in info]
            if "user_id" not in columns:
                c.execute("DROP TABLE saved_trips")
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_trips (
                user_id INTEGER PRIMARY KEY,
                trip_data TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )


def save_trip(user_id: int, trip_data: dict[str, Any]) -> None:
    """Save or replace trip data for the given user_id."""
    import datetime

    init_db()
    raw = json.dumps(trip_data)
    updated = datetime.datetime.utcnow().isoformat() + "Z"
    with _conn() as c:
        c.execute(
            """
            INSERT INTO saved_trips (user_id, trip_data, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                trip_data = excluded.trip_data,
                updated_at = excluded.updated_at
            """,
            (user_id, raw, updated),
        )


def get_trip(user_id: int) -> Optional[dict[str, Any]]:
    """Return saved trip data for the user, or None."""
    init_db()
    with _conn() as c:
        row = c.execute(
            "SELECT trip_data FROM saved_trips WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if row is None:
        return None
    return json.loads(row["trip_data"])


def delete_trip(user_id: int) -> None:
    """Remove saved trip for this user."""
    init_db()
    with _conn() as c:
        c.execute("DELETE FROM saved_trips WHERE user_id = ?", (user_id,))
