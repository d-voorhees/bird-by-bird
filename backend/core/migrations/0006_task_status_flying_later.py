from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_password_reset_token"),
    ]

    operations = [
        migrations.AlterField(
            model_name="task",
            name="status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("flying_later", "Flying Later"),
                    ("done", "Done"),
                    ("abandoned", "Abandoned"),
                ],
                db_index=True,
                default="active",
                max_length=20,
            ),
        ),
    ]
