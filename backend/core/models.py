import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.db.models import Q


class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=128)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    bird_assignment_pool = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "users"

    def set_password(self, raw_password: str) -> None:
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.password_hash)

    def __str__(self) -> str:
        return self.email


class TaskStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    DONE = "done", "Done"
    ABANDONED = "abandoned", "Abandoned"


class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=280)
    notes = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.ACTIVE,
        db_index=True,
    )
    position = models.IntegerField(db_index=True)
    bird_image = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "tasks"
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "status", "position"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "position"],
                condition=Q(status=TaskStatus.ACTIVE),
                name="unique_active_position_per_user",
            )
        ]

    def __str__(self) -> str:
        return self.title


class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    token = models.CharField(max_length=512, unique=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        db_table = "sessions"

    def __str__(self) -> str:
        return f"Session for {self.user.email}"


class EmailVerificationToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_verification_tokens")
    token = models.CharField(max_length=128, unique=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_verification_tokens"

    def __str__(self) -> str:
        return f"Email verification for {self.user.email}"


class PasswordResetToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.CharField(max_length=128, unique=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_reset_tokens"

    def __str__(self) -> str:
        return f"Password reset for {self.user.email}"
