"""Shared auth dependency for the single-user access gate.

Private routers include this so every data endpoint requires a valid signed
session cookie. The auth and health endpoints stay open.
"""
from __future__ import annotations

from fastapi import HTTPException, Request


def require_auth(request: Request) -> None:
    if not request.session.get("authed"):
        raise HTTPException(status_code=401, detail="Not authenticated")
