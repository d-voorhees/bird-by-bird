from django.db import migrations


def backfill_bird_images(apps, schema_editor):
    import random

    User = apps.get_model("core", "User")
    Task = apps.get_model("core", "Task")

    bird_images = [
        "Artboard1.svg",
        "Artboard2.svg",
        "Artboard3.svg",
        "Artboard4.svg",
        "Artboard5.svg",
        "Artboard6.svg",
        "Artboard7.svg",
        "Artboard8.svg",
        "Artboard9.svg",
        "Artboard10.svg",
        "Artboard11.svg",
        "Artboard12.svg",
        "Artboard13.svg",
        "Artboard14.svg",
        "Artboard15.svg",
        "Artboard16.svg",
        "Artboard17.svg",
        "Artboard18.svg",
        "Artboard19.svg",
        "Artboard20.svg",
        "Artboard21.svg",
        "Artboard22.svg",
        "Artboard23.svg",
        "Artboard25.svg",
        "Artboard26.svg",
        "Artboard27.svg",
        "Artboard28.svg",
    ]

    def pick_bird(user):
        pool = list(user.bird_assignment_pool or [])
        if not pool:
            pool = random.sample(bird_images, len(bird_images))
        index = random.randrange(len(pool))
        bird = pool.pop(index)
        user.bird_assignment_pool = pool
        user.save(update_fields=["bird_assignment_pool"])
        return bird

    for user in User.objects.all():
        tasks = Task.objects.filter(user=user, bird_image="").order_by("created_at")
        for task in tasks:
            task.bird_image = pick_bird(user)
            task.save(update_fields=["bird_image"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_task_bird_image_user_bird_assignment_pool"),
    ]

    operations = [
        migrations.RunPython(backfill_bird_images, migrations.RunPython.noop),
    ]
