"""
Unit tests for auth module: password hashing, JWT, and user storage.
Verify cybersecurity properties (no plaintext passwords, token validation, injection resistance).
Developed by Sydney Edwards.
"""

from __future__ import annotations

import datetime

import jwt
import pytest

import auth


@pytest.fixture
def isolated_db(tmp_path, monkeypatch):
    """Use a temporary database for auth so tests don't touch the real DB."""
    db_path = str(tmp_path / "test_auth.db")
    monkeypatch.setattr(auth, "_db_path", db_path)
    auth.init_users()
    yield db_path


# ----- Password hashing -----


def test_password_is_hashed_not_plaintext():
    """Passwords must never be stored or returned in plaintext."""
    plain = "mySecretPassword123"
    hashed = auth.hash_password(plain)
    assert hashed != plain
    assert plain not in hashed
    assert len(hashed) > len(plain)


def test_password_hash_is_salted():
    """Each hash should be unique (bcrypt uses a random salt)."""
    plain = "samePassword"
    h1 = auth.hash_password(plain)
    h2 = auth.hash_password(plain)
    assert h1 != h2
    assert auth.verify_password(plain, h1)
    assert auth.verify_password(plain, h2)


def test_verify_password_accepts_correct_password():
    """Correct password must verify against its hash."""
    plain = "correctPassword9"
    hashed = auth.hash_password(plain)
    assert auth.verify_password(plain, hashed) is True


def test_verify_password_rejects_wrong_password():
    """Wrong password must not verify."""
    plain = "rightPassword"
    wrong = "wrongPassword"
    hashed = auth.hash_password(plain)
    assert auth.verify_password(wrong, hashed) is False


def test_verify_password_rejects_invalid_hash():
    """Malformed or invalid hash must not raise; must return False."""
    assert auth.verify_password("any", "") is False
    assert auth.verify_password("any", "not-a-valid-bcrypt-hash") is False
    assert auth.verify_password("any", "$$2b$12$short") is False


# ----- User storage (passwords hashed in DB) -----


def test_create_user_stores_hashed_password(isolated_db):
    """User record must contain hashed password, never plaintext."""
    email = "secure@example.com"
    password = "plaintextPassword8"
    auth.create_user(email, password)
    user = auth.get_user_by_email(email)
    assert user is not None
    assert user["hashed_password"] != password
    assert user["email"] == email
    assert auth.verify_password(password, user["hashed_password"])


def test_create_user_normalizes_email(isolated_db):
    """Email must be stored normalized (lowercase, stripped)."""
    auth.create_user("  UPPER@Example.COM  ", "password123")
    user = auth.get_user_by_email("upper@example.com")
    assert user is not None
    assert user["email"] == "upper@example.com"


def test_sql_injection_in_email_does_not_break_auth(isolated_db):
    """Email containing SQL-like content must be stored safely (parameterized queries)."""
    malicious_email = "'; DROP TABLE users;--"
    auth.create_user(malicious_email, "password123")
    # Email is normalized to lowercase; important: it was stored safely (parameterized)
    user = auth.get_user_by_email(malicious_email)
    assert user is not None
    assert user["email"] == malicious_email.strip().lower()
    # Table must still exist and be usable
    auth.create_user("other@example.com", "otherpass8")
    other = auth.get_user_by_email("other@example.com")
    assert other is not None


# ----- JWT -----


def test_create_and_decode_token_roundtrip():
    """Valid token must decode back to the same user_id."""
    user_id = 42
    token = auth.create_access_token(user_id)
    decoded = auth.decode_access_token(token)
    assert decoded == user_id


def test_decode_access_token_rejects_invalid_string():
    """Garbage or malformed token must return None, not raise."""
    assert auth.decode_access_token("") is None
    assert auth.decode_access_token("not.jwt.here") is None
    assert auth.decode_access_token("Bearer abc") is None


def test_decode_access_token_rejects_tampered_token():
    """Token tampered with after signing must decode to None."""
    token = auth.create_access_token(1)
    parts = token.split(".")
    assert len(parts) == 3
    # Corrupt the signature (third part) so it no longer verifies
    sig = parts[2]
    mid = len(sig) // 2
    tampered_sig = sig[:mid] + ("x" if sig[mid] != "x" else "y") + sig[mid + 1 :]
    tampered = f"{parts[0]}.{parts[1]}.{tampered_sig}"
    assert auth.decode_access_token(tampered) is None


def test_decode_access_token_rejects_wrong_secret():
    """Token signed with a different secret must not be accepted."""
    payload = {
        "sub": "1",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1),
    }
    wrong_secret = "x" * 32  # avoid InsecureKeyLengthWarning
    wrong_secret_token = jwt.encode(payload, wrong_secret, algorithm=auth.ALGORITHM)
    assert auth.decode_access_token(wrong_secret_token) is None


def test_decode_access_token_rejects_expired():
    """Expired token must return None."""
    payload = {
        "sub": "1",
        "exp": datetime.datetime.utcnow() - datetime.timedelta(seconds=1),
    }
    expired_token = jwt.encode(payload, auth.SECRET_KEY, algorithm=auth.ALGORITHM)
    assert auth.decode_access_token(expired_token) is None


def test_decode_access_token_rejects_missing_sub():
    """Token without 'sub' claim must return None."""
    payload = {"exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)}
    token = jwt.encode(payload, auth.SECRET_KEY, algorithm=auth.ALGORITHM)
    assert auth.decode_access_token(token) is None
