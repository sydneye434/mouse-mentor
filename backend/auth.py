"""
User accounts and JWT auth. Users table and trip storage are tied to user_id.
Developed by Sydney Edwards.
"""

from __future__ import annotations

import datetime
import secrets
import sqlite3
from pathlib import Path
from typing import Any, Optional

import bcrypt
import jwt

_db_path: Optional[str] = None


# Use same DB as store for simplicity
def _get_db_path() -> str:
    global _db_path
    if _db_path is None:
        base = Path(__file__).resolve().parent
        _db_path = str(base / "saved_trips.db")
    return _db_path


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_users() -> None:
    with _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_user(email: str, password: str) -> dict[str, Any]:
    init_users()
    hashed = hash_password(password)
    created = datetime.datetime.utcnow().isoformat() + "Z"
    with _conn() as c:
        cur = c.execute(
            "INSERT INTO users (email, hashed_password, created_at) VALUES (?, ?, ?)",
            (email.strip().lower(), hashed, created),
        )
        uid = cur.lastrowid
    return {"id": uid, "email": email.strip().lower(), "created_at": created}


def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    init_users()
    with _conn() as c:
        row = c.execute(
            "SELECT id, email, hashed_password, created_at FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "hashed_password": row["hashed_password"],
        "created_at": row["created_at"],
    }


def get_user_by_id(user_id: int) -> Optional[dict[str, Any]]:
    init_users()
    with _conn() as c:
        row = c.execute(
            "SELECT id, email, hashed_password, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "hashed_password": row["hashed_password"],
        "created_at": row["created_at"],
    }


# JWT: use a fixed secret for dev; in production set via env
SECRET_KEY = secrets.token_urlsafe(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def create_access_token(user_id: int) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(
        days=ACCESS_TOKEN_EXPIRE_DAYS,
    )
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except (jwt.PyJWTError, ValueError, TypeError):
        return None
