from __future__ import annotations

import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from core.models import PasswordResetToken, Session, User

TOKEN_TTL = timedelta(hours=1)


def _frontend_reset_url(token: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/reset-password?token={token}"


def create_and_send_password_reset_email(user: User) -> None:
    PasswordResetToken.objects.filter(user=user).delete()
    token = secrets.token_urlsafe(32)
    PasswordResetToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + TOKEN_TTL,
    )

    reset_url = _frontend_reset_url(token)
    send_mail(
        subject="Reset your Bird by Bird password",
        message=(
            "We received a request to reset your password.\n\n"
            f"Open this link to choose a new password:\n{reset_url}\n\n"
            "The link expires in one hour. If you did not request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def reset_password_with_token(token: str, new_password: str) -> User:
    if not new_password:
        raise ValueError("Password is required")

    try:
        record = PasswordResetToken.objects.select_related("user").get(token=token)
    except PasswordResetToken.DoesNotExist as exc:
        raise ValueError("Invalid or expired reset link") from exc

    if record.expires_at < timezone.now():
        record.delete()
        raise ValueError("Invalid or expired reset link")

    user = record.user
    user.set_password(new_password)
    user.save(update_fields=["password_hash"])

    PasswordResetToken.objects.filter(user=user).delete()
    Session.objects.filter(user=user).delete()
    return user
