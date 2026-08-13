"""Access gate: login / logout / session.

Single-user authentication for this phase. The access code is validated
server-side against a SHA-256 hash (never shipped to the browser) and, on
success, a signed session cookie is issued by SessionMiddleware.
"""
from __future__ import annotations

import hashlib
import hmac

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import config

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    code: str


def _code_matches(code: str) -> bool:
    if not config.ACCESS_CODE_HASH:
        return False  # fail closed when no code is configured (e.g. prod misconfig)
    digest = hashlib.sha256(code.encode("utf-8")).hexdigest()
    return hmac.compare_digest(digest, config.ACCESS_CODE_HASH)


@router.post("/login")
def login(body: LoginIn, request: Request) -> dict:
    if not _code_matches(body.code.strip()):
        raise HTTPException(status_code=401, detail="Código de acceso incorrecto")
    request.session["authed"] = True
    return {"authenticated": True}


@router.post("/logout")
def logout(request: Request) -> dict:
    request.session.clear()
    return {"authenticated": False}


@router.get("/session")
def session(request: Request) -> dict:
    return {"authenticated": bool(request.session.get("authed"))}
