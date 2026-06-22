from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from django.db import transaction
from django.db.models import Max

from core.bird_assignment import pick_bird_image
from core.models import Task, TaskStatus, User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _active_tasks(user: User):
    return Task.objects.filter(user=user, status=TaskStatus.ACTIVE).order_by("position")


def _normalize_positions(user: User, ordered_tasks: list[Task]) -> list[Task]:
    for index, task in enumerate(ordered_tasks):
        task.position = index + 10_000
    Task.objects.bulk_update(ordered_tasks, ["position"])
    for index, task in enumerate(ordered_tasks):
        task.position = index
    Task.objects.bulk_update(ordered_tasks, ["position"])
    return ordered_tasks


def _next_position(user: User) -> int:
    result = _active_tasks(user).aggregate(max_pos=Max("position"))
    max_pos = result["max_pos"]
    return 0 if max_pos is None else max_pos + 1


@transaction.atomic
def add_task(user: User, title: str, notes: str | None, do_next: bool = False) -> Task:
    if do_next:
        active = list(_active_tasks(user))
        task = Task.objects.create(
            user=user,
            title=title,
            notes=notes or None,
            status=TaskStatus.ACTIVE,
            position=10_000,
            bird_image=pick_bird_image(user),
        )
        ordered = [task, *active]
        _normalize_positions(user, ordered)
        task.refresh_from_db()
        return task

    return Task.objects.create(
        user=user,
        title=title,
        notes=notes or None,
        status=TaskStatus.ACTIVE,
        position=_next_position(user),
        bird_image=pick_bird_image(user),
    )


@transaction.atomic
def complete_task(user: User, task_id: UUID | str) -> Task:
    task = Task.objects.select_for_update().get(id=task_id, user=user)
    if task.status != TaskStatus.ACTIVE:
        raise ValueError("Task is not active")

    task.status = TaskStatus.DONE
    task.completed_at = _utcnow()
    task.save(update_fields=["status", "completed_at"])

    remaining = [t for t in _active_tasks(user).select_for_update()]
    _normalize_positions(user, remaining)
    return task


@transaction.atomic
def skip_task(user: User, task_id: UUID | str) -> Task:
    tasks = list(_active_tasks(user).select_for_update())
    task = next((t for t in tasks if str(t.id) == str(task_id)), None)
    if task is None:
        raise Task.DoesNotExist()
    if task.status != TaskStatus.ACTIVE:
        raise ValueError("Task is not active")

    tasks.remove(task)
    tasks.append(task)
    _normalize_positions(user, tasks)
    task.refresh_from_db()
    return task


@transaction.atomic
def update_task(
    user: User,
    task_id: UUID | str,
    *,
    title: str | None = None,
    notes: str | None = None,
) -> Task:
    task = Task.objects.select_for_update().get(id=task_id, user=user)
    update_fields: list[str] = []

    if title is not None:
        trimmed = title.strip()
        if not trimmed:
            raise ValueError("Title cannot be empty")
        task.title = trimmed
        update_fields.append("title")

    if notes is not None:
        task.notes = notes.strip() or None
        update_fields.append("notes")

    if update_fields:
        task.save(update_fields=update_fields)
    return task


@transaction.atomic
def delete_task(user: User, task_id: UUID | str) -> bool:
    task = Task.objects.select_for_update().get(id=task_id, user=user)
    was_active = task.status == TaskStatus.ACTIVE
    task.delete()
    if was_active:
        remaining = list(_active_tasks(user).select_for_update())
        if remaining:
            _normalize_positions(user, remaining)
    return True


@transaction.atomic
def abandon_task(user: User, task_id: UUID | str) -> Task:
    task = Task.objects.select_for_update().get(id=task_id, user=user)
    if task.status != TaskStatus.ACTIVE:
        raise ValueError("Task is not active")

    task.status = TaskStatus.ABANDONED
    task.save(update_fields=["status"])

    remaining = list(_active_tasks(user).select_for_update())
    _normalize_positions(user, remaining)
    return task


@transaction.atomic
def promote_task(user: User, task_id: UUID | str) -> Task:
    tasks = list(_active_tasks(user).select_for_update())
    task = next((t for t in tasks if str(t.id) == str(task_id)), None)
    if task is None:
        raise Task.DoesNotExist()
    if task.status != TaskStatus.ACTIVE:
        raise ValueError("Task is not active")

    tasks.remove(task)
    tasks.insert(0, task)
    _normalize_positions(user, tasks)
    task.refresh_from_db()
    return task


@transaction.atomic
def reorder_tasks(user: User, ordered_ids: list[UUID]) -> list[Task]:
    active = list(_active_tasks(user).select_for_update())
    active_ids = {task.id for task in active}

    if set(ordered_ids) != active_ids or len(ordered_ids) != len(active):
        raise ValueError("orderedIds must contain all active task IDs exactly once")

    id_to_task = {task.id: task for task in active}
    ordered = [id_to_task[task_id] for task_id in ordered_ids]
    return _normalize_positions(user, ordered)


@transaction.atomic
def uncomplete_task(user: User, task_id: UUID | str) -> Task:
    task = Task.objects.select_for_update().get(id=task_id, user=user)
    if task.status != TaskStatus.DONE:
        raise ValueError("Task is not completed")

    task.status = TaskStatus.ACTIVE
    task.completed_at = None
    task.position = _next_position(user)
    task.save(update_fields=["status", "completed_at", "position"])
    return task


@transaction.atomic
def clear_history(user: User) -> int:
    deleted, _ = Task.objects.filter(user=user, status=TaskStatus.DONE).delete()
    return deleted
