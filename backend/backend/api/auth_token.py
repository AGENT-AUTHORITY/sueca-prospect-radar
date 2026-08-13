"""Small signed bearer token used when browsers block cross-site cookies."""
from __future__ import annotations

import hashlib
import hmac
import time

import config


def create_auth_token() -> str:
    expires_at = int(time.time()) + config.SESSION_MAX_AGE
    payload = str(expires_at)
    signature = hmac.new(
        config.SESSION_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}.{signature}"


def verify_auth_token(token: str) -> bool:
    try:
        payload, supplied_signature = token.split(".", 1)
        expires_at = int(payload)
    except (TypeError, ValueError):
        return False

    if expires_at < int(time.time()):
        return False

    expected_signature = hmac.new(
        config.SESSION_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(supplied_signature, expected_signature)


def request_is_authenticated(request) -> bool:
    if request.session.get("authed"):
        return True

    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    return scheme.lower() == "bearer" and bool(token) and verify_auth_token(token)
