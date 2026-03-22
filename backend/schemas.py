"""Shared Pydantic response models."""

from __future__ import annotations

from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    is_pro: bool = False
