from django.contrib import admin
from django.urls import path

from core.views import graphql_view, health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("graphql/", graphql_view),
    path("health/", health_check),
]
