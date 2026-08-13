"""Shared auth dependency for the single-user access gate.

Private routers include this so every data endpoint requires a valid signed
session cookie. The auth and health endpoints stay open.
"""
from __future__ import annotations

from fastapi import HTTPException, Request

from api.auth_token import request_is_authenticated


def require_auth(request: Request) -> None:
    if not request_is_authenticated(request):
        raise HTTPException(status_code=401, detail="Not authenticated")
