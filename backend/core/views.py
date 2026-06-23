from __future__ import annotations

from typing import Any

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView


class BirdGraphQLContext:
    def __init__(self, request: HttpRequest) -> None:
        self.request = request
        self.cookies_to_set: list[dict[str, Any]] = []
        self.cookies_to_delete: list[str] = []


class BirdGraphQLView(GraphQLView):
    def get_context(self, request: HttpRequest) -> BirdGraphQLContext:
        context = BirdGraphQLContext(request=request)
        request._bird_graphql_context = context
        return context

    def dispatch(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        response = super().dispatch(request, *args, **kwargs)

        context = getattr(request, "_bird_graphql_context", None)
        if context is not None:
            for cookie in context.cookies_to_set:
                response.set_cookie(**cookie)
            for cookie_name in context.cookies_to_delete:
                response.delete_cookie(cookie_name, path="/")

        return response


graphql_view = csrf_exempt(BirdGraphQLView.as_view(graphiql=settings.DEBUG))


def health_check(_request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})
