from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.db import InterfaceError, OperationalError
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView
from graphql.error import GraphQLError

logger = logging.getLogger(__name__)

GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again."

# Sent as an extension on masked errors caused by a dropped/killed DB
# connection, so the frontend can safely retry these (and only these)
# without a user ever seeing an error.
TRANSIENT_ERROR_CODE = "TRANSIENT_ERROR"


class BirdGraphQLContext:
    def __init__(self, request: HttpRequest) -> None:
        self.request = request
        self.cookies_to_set: list[dict[str, Any]] = []
        self.cookies_to_delete: list[str] = []


class BirdGraphQLView(GraphQLView):
    @staticmethod
    def format_error(error: GraphQLError) -> dict[str, Any]:
        # graphql-core's located_error() wraps whatever a resolver raised into
        # a fresh GraphQLError, passing the raised exception through as
        # `original_error`. When we raise GraphQLError ourselves on purpose
        # (e.g. "Task not found"), original_error is that same GraphQLError
        # instance — safe to show verbatim. Anything else (a DB error, a bug)
        # wasn't meant for the user, so log it and mask the message instead.
        original = error.original_error
        if original is not None and not isinstance(original, GraphQLError):
            logger.exception("Unhandled GraphQL resolver error", exc_info=original)
            extensions = None
            if isinstance(original, (OperationalError, InterfaceError)):
                extensions = {"code": TRANSIENT_ERROR_CODE}
            return GraphQLError(
                GENERIC_ERROR_MESSAGE, nodes=error.nodes, path=error.path, extensions=extensions
            ).formatted
        return error.formatted

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
