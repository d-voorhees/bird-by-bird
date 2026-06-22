from __future__ import annotations

import graphene
from django.db.models import Q
from django.utils import timezone
from graphql import GraphQLError

from core import task_service
from core.auth import SESSION_COOKIE_NAME, cookie_settings, create_session, get_user_from_request
from core.email_verification import create_and_send_verification_email, verify_email_token
from core.password_reset import create_and_send_password_reset_email, reset_password_with_token
from core.models import Session, Task, TaskStatus, User


class TaskStatusEnum(graphene.Enum):
    ACTIVE = "active"
    DONE = "done"
    ABANDONED = "abandoned"


class UserType(graphene.ObjectType):
    id = graphene.ID(required=True)
    email = graphene.String(required=True)
    email_verified = graphene.Boolean(required=True)
    created_at = graphene.DateTime(required=True)

    def resolve_id(self, info: graphene.ResolveInfo) -> str:
        return str(self.id)

    def resolve_created_at(self, info: graphene.ResolveInfo):
        return self.created_at


class TaskType(graphene.ObjectType):
    id = graphene.ID(required=True)
    title = graphene.String(required=True)
    notes = graphene.String()
    status = TaskStatusEnum(required=True)
    position = graphene.Int(required=True)
    bird_image = graphene.String()
    created_at = graphene.DateTime(required=True)
    completed_at = graphene.DateTime()

    def resolve_id(self, info: graphene.ResolveInfo) -> str:
        return str(self.id)

    def resolve_status(self, info: graphene.ResolveInfo):
        raw = self.status
        if not isinstance(raw, str):
            raw = raw.value
        return getattr(TaskStatusEnum, raw.upper())

    def resolve_created_at(self, info: graphene.ResolveInfo):
        return self.created_at

    def resolve_completed_at(self, info: graphene.ResolveInfo):
        return self.completed_at

    def resolve_bird_image(self, info: graphene.ResolveInfo):
        return self.bird_image or None


class AuthPayload(graphene.ObjectType):
    token = graphene.String(required=True)
    user = graphene.Field(UserType, required=True)


def _require_user(info: graphene.ResolveInfo) -> User:
    user = get_user_from_request(info.context.request)
    if user is None:
        raise GraphQLError("Authentication required")
    return user


def _require_verified_user(info: graphene.ResolveInfo) -> User:
    user = _require_user(info)
    if not user.email_verified:
        raise GraphQLError("Please verify your email address to continue.")
    return user


def _set_auth_cookie(info: graphene.ResolveInfo, token: str) -> None:
    settings = cookie_settings()
    info.context.cookies_to_set.append(
        {
            "key": settings["key"],
            "value": token,
            "httponly": settings["httponly"],
            "secure": settings["secure"],
            "samesite": settings["samesite"],
            "max_age": settings["max_age"],
            "path": settings["path"],
        }
    )


class SignUp(graphene.Mutation):
    class Arguments:
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    Output = AuthPayload

    def mutate(self, info: graphene.ResolveInfo, email: str, password: str) -> AuthPayload:
        normalized_email = email.strip().lower()
        if not normalized_email or not password:
            raise GraphQLError("Email and password are required")
        if User.objects.filter(email=normalized_email).exists():
            raise GraphQLError("Email already registered")

        user = User(email=normalized_email)
        user.set_password(password)
        user.save()

        try:
            create_and_send_verification_email(user)
        except Exception as exc:
            user.delete()
            raise GraphQLError("Could not send verification email. Please try again.") from exc

        _, token = create_session(user)
        _set_auth_cookie(info, token)
        return AuthPayload(token=token, user=user)


class SignIn(graphene.Mutation):
    class Arguments:
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    Output = AuthPayload

    def mutate(self, info: graphene.ResolveInfo, email: str, password: str) -> AuthPayload:
        normalized_email = email.strip().lower()
        try:
            user = User.objects.get(email=normalized_email)
        except User.DoesNotExist:
            raise GraphQLError("Invalid email or password") from None

        if not user.check_password(password):
            raise GraphQLError("Invalid email or password")

        _, token = create_session(user)
        _set_auth_cookie(info, token)
        return AuthPayload(token=token, user=user)


class SignOut(graphene.Mutation):
    Output = graphene.Boolean

    def mutate(self, info: graphene.ResolveInfo) -> bool:
        token = info.context.request.COOKIES.get(SESSION_COOKIE_NAME)
        if token:
            Session.objects.filter(token=token).delete()
        info.context.cookies_to_delete.append(SESSION_COOKIE_NAME)
        return True


class AddTask(graphene.Mutation):
    class Arguments:
        title = graphene.String(required=True)
        notes = graphene.String()
        do_next = graphene.Boolean(default_value=False)

    Output = TaskType

    def mutate(
        self,
        info: graphene.ResolveInfo,
        title: str,
        notes: str | None = None,
        do_next: bool = False,
    ) -> Task:
        user = _require_verified_user(info)
        trimmed = title.strip()
        if not trimmed:
            raise GraphQLError("Title is required")
        if len(trimmed) > 280:
            raise GraphQLError("Title must be 280 characters or fewer")

        return task_service.add_task(user, trimmed, notes, do_next=do_next)


class CompleteTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    Output = TaskType

    def mutate(self, info: graphene.ResolveInfo, id: str) -> Task:
        user = _require_verified_user(info)
        try:
            return task_service.complete_task(user, id)
        except Task.DoesNotExist:
            raise GraphQLError("Task not found") from None
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc


class SkipTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    Output = TaskType

    def mutate(self, info: graphene.ResolveInfo, id: str) -> Task:
        user = _require_verified_user(info)
        try:
            return task_service.skip_task(user, id)
        except Task.DoesNotExist:
            raise GraphQLError("Task not found") from None
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc


class UpdateTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        title = graphene.String()
        notes = graphene.String()

    Output = TaskType

    def mutate(
        self,
        info: graphene.ResolveInfo,
        id: str,
        title: str | None = None,
        notes: str | None = None,
    ) -> Task:
        user = _require_verified_user(info)
        if title is None and notes is None:
            raise GraphQLError("Provide title or notes to update")
        try:
            return task_service.update_task(user, id, title=title, notes=notes)
        except Task.DoesNotExist:
            raise GraphQLError("Task not found") from None
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc


class DeleteTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(self, info: graphene.ResolveInfo, id: str) -> "DeleteTask":
        user = _require_verified_user(info)
        try:
            task_service.delete_task(user, id)
        except Task.DoesNotExist:
            raise GraphQLError("Task not found") from None
        return DeleteTask(ok=True)


class AbandonTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    Output = TaskType

    def mutate(self, info: graphene.ResolveInfo, id: str) -> Task:
        user = _require_verified_user(info)
        try:
            return task_service.abandon_task(user, id)
        except Task.DoesNotExist:
            raise GraphQLError("Task not found") from None
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc


class ReorderTasks(graphene.Mutation):
    class Arguments:
        ordered_ids = graphene.List(graphene.NonNull(graphene.ID), required=True)

    Output = graphene.List(graphene.NonNull(TaskType))

    def mutate(self, info: graphene.ResolveInfo, ordered_ids: list[str]) -> list[Task]:
        user = _require_verified_user(info)
        try:
            from uuid import UUID

            return task_service.reorder_tasks(user, [UUID(task_id) for task_id in ordered_ids])
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc


class PromoteTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    Output = TaskType

    def mutate(self, info: graphene.ResolveInfo, id: str) -> Task:
        user = _require_verified_user(info)
        try:
            return task_service.promote_task(user, id)
        except Task.DoesNotExist:
            raise GraphQLError("Task not found") from None
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc


class UncompleteTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    Output = TaskType

    def mutate(self, info: graphene.ResolveInfo, id: str) -> Task:
        user = _require_verified_user(info)
        try:
            return task_service.uncomplete_task(user, id)
        except Task.DoesNotExist:
            raise GraphQLError("Task not found") from None
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc


class ClearHistory(graphene.Mutation):
    ok = graphene.Boolean(required=True)
    deleted_count = graphene.Int(required=True)

    def mutate(self, info: graphene.ResolveInfo) -> "ClearHistory":
        user = _require_verified_user(info)
        deleted_count = task_service.clear_history(user)
        return ClearHistory(ok=True, deleted_count=deleted_count)


class VerifyEmail(graphene.Mutation):
    class Arguments:
        token = graphene.String(required=True)

    ok = graphene.Boolean(required=True)
    user = graphene.Field(UserType)

    def mutate(self, info: graphene.ResolveInfo, token: str) -> "VerifyEmail":
        try:
            user = verify_email_token(token.strip())
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc
        return VerifyEmail(ok=True, user=user)


class ResendVerificationEmail(graphene.Mutation):
    ok = graphene.Boolean(required=True)

    def mutate(self, info: graphene.ResolveInfo) -> "ResendVerificationEmail":
        user = _require_user(info)
        if user.email_verified:
            raise GraphQLError("Email is already verified")
        try:
            create_and_send_verification_email(user)
        except Exception as exc:
            raise GraphQLError("Could not send verification email. Please try again.") from exc
        return ResendVerificationEmail(ok=True)


class RequestPasswordReset(graphene.Mutation):
    class Arguments:
        email = graphene.String(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(self, info: graphene.ResolveInfo, email: str) -> "RequestPasswordReset":
        normalized_email = email.strip().lower()
        if not normalized_email:
            raise GraphQLError("Email is required")

        try:
            user = User.objects.get(email=normalized_email)
        except User.DoesNotExist:
            raise GraphQLError("No account found for that email address.") from None

        try:
            create_and_send_password_reset_email(user)
        except Exception as exc:
            raise GraphQLError("Could not send reset email. Please try again.") from exc

        return RequestPasswordReset(ok=True)


class ResetPassword(graphene.Mutation):
    class Arguments:
        token = graphene.String(required=True)
        password = graphene.String(required=True)

    ok = graphene.Boolean(required=True)

    def mutate(self, info: graphene.ResolveInfo, token: str, password: str) -> "ResetPassword":
        try:
            reset_password_with_token(token.strip(), password)
        except ValueError as exc:
            raise GraphQLError(str(exc)) from exc
        return ResetPassword(ok=True)


class Query(graphene.ObjectType):
    me = graphene.Field(UserType)
    current_bird = graphene.Field(TaskType)
    flock = graphene.List(graphene.NonNull(TaskType), required=True)
    history = graphene.List(
        graphene.NonNull(TaskType),
        required=True,
        limit=graphene.Int(default_value=50),
        offset=graphene.Int(default_value=0),
    )

    def resolve_me(self, info: graphene.ResolveInfo):
        return get_user_from_request(info.context.request)

    def resolve_current_bird(self, info: graphene.ResolveInfo):
        user = get_user_from_request(info.context.request)
        if user is None or not user.email_verified:
            return None
        return (
            Task.objects.filter(user=user, status=TaskStatus.ACTIVE)
            .order_by("position")
            .first()
        )

    def resolve_flock(self, info: graphene.ResolveInfo):
        user = _require_verified_user(info)
        return Task.objects.filter(user=user, status=TaskStatus.ACTIVE).order_by("position")

    def resolve_history(
        self,
        info: graphene.ResolveInfo,
        limit: int = 50,
        offset: int = 0,
    ):
        user = _require_verified_user(info)
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        return Task.objects.filter(user=user, status=TaskStatus.DONE).order_by(
            "-completed_at", "-created_at"
        )[offset : offset + limit]


class Mutation(graphene.ObjectType):
    sign_up = SignUp.Field()
    sign_in = SignIn.Field()
    sign_out = SignOut.Field()
    add_task = AddTask.Field()
    complete_task = CompleteTask.Field()
    skip_task = SkipTask.Field()
    abandon_task = AbandonTask.Field()
    delete_task = DeleteTask.Field()
    update_task = UpdateTask.Field()
    reorder_tasks = ReorderTasks.Field()
    promote_task = PromoteTask.Field()
    uncomplete_task = UncompleteTask.Field()
    clear_history = ClearHistory.Field()
    verify_email = VerifyEmail.Field()
    resend_verification_email = ResendVerificationEmail.Field()
    request_password_reset = RequestPasswordReset.Field()
    reset_password = ResetPassword.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
