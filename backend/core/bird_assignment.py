from __future__ import annotations

import random

from core.bird_images import BIRD_IMAGES
from core.models import Task, TaskStatus, User


_VALID_IMAGES = frozenset(BIRD_IMAGES)
_OPEN_STATUSES = (TaskStatus.ACTIVE, TaskStatus.FLYING_LATER)


def _images_in_use(user: User) -> set[str]:
    return set(
        Task.objects.filter(user=user, status__in=_OPEN_STATUSES)
        .exclude(bird_image="")
        .values_list("bird_image", flat=True)
    )


def pick_bird_image(user: User) -> str:
    pool = [img for img in (user.bird_assignment_pool or []) if img in _VALID_IMAGES]
    if not pool:
        pool = random.sample(list(BIRD_IMAGES), len(BIRD_IMAGES))

    in_use = _images_in_use(user)
    available = [img for img in pool if img not in in_use]

    if not available:
        # This cycle's leftovers are all already on other open tasks; start a
        # fresh cycle before considering a repeat.
        pool = random.sample(list(BIRD_IMAGES), len(BIRD_IMAGES))
        available = [img for img in pool if img not in in_use]

    if not available:
        # Every image is already attached to another open task, so a repeat
        # is unavoidable.
        available = pool

    bird = random.choice(available)
    pool.remove(bird)
    user.bird_assignment_pool = pool
    user.save(update_fields=["bird_assignment_pool"])
    return bird
