from __future__ import annotations

import random

from core.bird_images import BIRD_IMAGES
from core.models import User


_VALID_IMAGES = frozenset(BIRD_IMAGES)


def pick_bird_image(user: User) -> str:
    pool = [img for img in (user.bird_assignment_pool or []) if img in _VALID_IMAGES]
    if not pool:
        pool = random.sample(list(BIRD_IMAGES), len(BIRD_IMAGES))

    index = random.randrange(len(pool))
    bird = pool.pop(index)
    user.bird_assignment_pool = pool
    user.save(update_fields=["bird_assignment_pool"])
    return bird
