from django.contrib import admin

from core.models import Session, Task, User

admin.site.register(User)
admin.site.register(Task)
admin.site.register(Session)
