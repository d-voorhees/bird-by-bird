from __future__ import annotations

from datetime import datetime, timedelta, timezone

from django.core.management.base import BaseCommand, CommandError

from core.bird_assignment import pick_bird_image
from core.models import Session, Task, TaskStatus, User


class Command(BaseCommand):
    help = "Add a completed task with yesterday's date for demo/testing."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--email",
            help="User email. Defaults to the first user in the database.",
        )
        parser.add_argument(
            "--title",
            default="Yesterday's bird",
            help="Task title.",
        )

    def handle(self, *args, **options) -> None:
        email = options["email"]
        if email:
            try:
                user = User.objects.get(email=email.strip().lower())
            except User.DoesNotExist as exc:
                raise CommandError(f"No user with email {email}") from exc
        else:
            session = (
                Session.objects.filter(expires_at__gt=datetime.now(timezone.utc))
                .select_related("user")
                .order_by("-expires_at")
                .first()
            )
            user = session.user if session else User.objects.order_by("created_at").first()
            if user is None:
                raise CommandError("No users found. Sign up first.")

        completed_at = datetime.now(timezone.utc) - timedelta(days=1)
        task = Task.objects.create(
            user=user,
            title=options["title"],
            status=TaskStatus.DONE,
            position=0,
            completed_at=completed_at,
            bird_image=pick_bird_image(user),
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Created "{task.title}" for {user.email} '
                f"with completed_at={completed_at.isoformat()}"
            )
        )
