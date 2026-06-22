from __future__ import annotations

import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from core.models import EmailVerificationToken, User

TOKEN_TTL = timedelta(hours=48)


def _frontend_verify_url(token: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/verify-email?token={token}"


def create_and_send_verification_email(user: User) -> None:
    EmailVerificationToken.objects.filter(user=user).delete()
    token = secrets.token_urlsafe(32)
    EmailVerificationToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + TOKEN_TTL,
    )

    verify_url = _frontend_verify_url(token)
    send_mail(
        subject="Verify your Bird by Bird account",
        message=(
            "Thanks for signing up.\n\n"
            f"Verify your email address by opening this link:\n{verify_url}\n\n"
            "If you did not create an account, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def verify_email_token(token: str) -> User:
    try:
        record = EmailVerificationToken.objects.select_related("user").get(token=token)
    except EmailVerificationToken.DoesNotExist as exc:
        raise ValueError("Invalid or expired verification link") from exc

    if record.expires_at < timezone.now():
        record.delete()
        raise ValueError("Invalid or expired verification link")

    user = record.user
    if not user.email_verified:
        user.email_verified = True
        user.save(update_fields=["email_verified"])

    EmailVerificationToken.objects.filter(user=user).delete()
    return user
