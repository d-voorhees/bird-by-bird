from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import jwt
from django.conf import settings
from django.http import HttpRequest

from core.models import Session, User

SESSION_COOKIE_NAME = "bird_session"
SESSION_DURATION_DAYS = 30


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_session_token(user: User, session: Session) -> str:
    payload: dict[str, Any] = {
        "sub": str(user.id),
        "sid": str(session.id),
        "exp": int(session.expires_at.timestamp()),
        "iat": int(_utcnow().timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def create_session(user: User) -> tuple[Session, str]:
    expires_at = _utcnow() + timedelta(days=SESSION_DURATION_DAYS)
    session = Session(user=user, token="", expires_at=expires_at)
    session.save()
    token = create_session_token(user, session)
    session.token = token
    session.save(update_fields=["token"])
    return session, token


def refresh_session(session: Session) -> None:
    session.expires_at = _utcnow() + timedelta(days=SESSION_DURATION_DAYS)
    session.save(update_fields=["expires_at"])


def get_token_from_request(request: HttpRequest) -> str | None:
    return request.COOKIES.get(SESSION_COOKIE_NAME)


def get_user_from_request(request: HttpRequest) -> User | None:
    token = get_token_from_request(request)
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None

    session_id = payload.get("sid")
    user_id = payload.get("sub")
    if not session_id or not user_id:
        return None

    try:
        session = Session.objects.select_related("user").get(
            id=UUID(session_id),
            token=token,
            user_id=UUID(user_id),
        )
    except (Session.DoesNotExist, ValueError):
        return None

    if session.expires_at <= _utcnow():
        session.delete()
        return None

    refresh_session(session)
    return session.user


def cookie_settings() -> dict[str, Any]:
    secure = os.environ.get("DJANGO_COOKIE_SECURE", "false").lower() == "true"
    return {
        "key": SESSION_COOKIE_NAME,
        "httponly": True,
        "secure": secure,
        "samesite": "Lax",
        "max_age": SESSION_DURATION_DAYS * 24 * 60 * 60,
        "path": "/",
    }
