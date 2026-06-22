from __future__ import annotations

import random

from core.bird_images import BIRD_IMAGES
from core.models import User


def pick_bird_image(user: User) -> str:
    pool = list(user.bird_assignment_pool or [])
    if not pool:
        pool = random.sample(list(BIRD_IMAGES), len(BIRD_IMAGES))

    index = random.randrange(len(pool))
    bird = pool.pop(index)
    user.bird_assignment_pool = pool
    user.save(update_fields=["bird_assignment_pool"])
    return bird
