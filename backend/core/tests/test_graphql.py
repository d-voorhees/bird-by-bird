import json
from typing import Any

import pytest
from django.test import Client

from core.auth import SESSION_COOKIE_NAME
from core.models import Task, TaskStatus, User

pytestmark = pytest.mark.django_db


@pytest.fixture
def client() -> Client:
    return Client()


@pytest.fixture
def user(db: None) -> User:
    user = User(email="test@example.com", email_verified=True)
    user.set_password("password123")
    user.save()
    return user


def graphql(client: Client, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"query": query}
    if variables:
        payload["variables"] = variables
    response = client.post(
        "/graphql/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200
    return response.json()


def auth_client(client: Client, user: User) -> Client:
    response = graphql(
        client,
        """
        mutation SignIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) {
            token
            user { id email }
          }
        }
        """,
        {"email": user.email, "password": "password123"},
    )
    assert "errors" not in response
    token = response["data"]["signIn"]["token"]
    client.cookies[SESSION_COOKIE_NAME] = token
    return client


class TestAuth:
    def test_sign_up_and_me(self, client: Client) -> None:
        response = graphql(
            client,
            """
            mutation {
              signUp(email: "new@example.com", password: "password123") {
                token
                user { email }
              }
            }
            """
        )
        assert "errors" not in response
        assert response["data"]["signUp"]["user"]["email"] == "new@example.com"
        assert SESSION_COOKIE_NAME in client.cookies

        me_response = graphql(
            client,
            """
            query {
              me { email emailVerified }
            }
            """
        )
        assert me_response["data"]["me"]["email"] == "new@example.com"
        assert me_response["data"]["me"]["emailVerified"] is False

    def test_verify_email(self, client: Client) -> None:
        response = graphql(
            client,
            """
            mutation {
              signUp(email: "verify@example.com", password: "password123") {
                user { id email }
              }
            }
            """
        )
        assert "errors" not in response

        from core.models import EmailVerificationToken

        token = EmailVerificationToken.objects.get(user__email="verify@example.com").token
        verify_response = graphql(
            client,
            """
            mutation VerifyEmail($token: String!) {
              verifyEmail(token: $token) {
                ok
                user { email emailVerified }
              }
            }
            """,
            {"token": token},
        )
        assert "errors" not in verify_response
        assert verify_response["data"]["verifyEmail"]["ok"] is True
        assert verify_response["data"]["verifyEmail"]["user"]["emailVerified"] is True

    def test_sign_in_invalid_password(self, client: Client, user: User) -> None:
        response = graphql(
            client,
            """
            mutation {
              signIn(email: "test@example.com", password: "wrong") {
                token
              }
            }
            """
        )
        assert response["data"]["signIn"] is None
        assert response["errors"]

    def test_sign_out(self, client: Client, user: User) -> None:
        auth_client(client, user)
        response = graphql(
            client,
            """
            mutation {
              signOut
            }
            """
        )
        assert response["data"]["signOut"] is True

        me_response = graphql(client, "query { me { email } }")
        assert me_response["data"]["me"] is None

    def test_request_password_reset_unknown_email(self, client: Client) -> None:
        response = graphql(
            client,
            """
            mutation RequestPasswordReset($email: String!) {
              requestPasswordReset(email: $email) {
                ok
              }
            }
            """,
            {"email": "missing@example.com"},
        )
        assert response["data"]["requestPasswordReset"] is None
        assert response["errors"][0]["message"] == "No account found for that email address."

    def test_unverified_user_cannot_use_app(self, client: Client) -> None:
        graphql(
            client,
            """
            mutation {
              signUp(email: "blocked@example.com", password: "password123") {
                token
              }
            }
            """
        )

        response = graphql(client, 'mutation { addTask(title: "Nope") { id } }')
        assert response["data"]["addTask"] is None
        assert response["errors"][0]["message"] == "Please verify your email address to continue."

    def test_request_password_reset_sends_token(self, client: Client, user: User) -> None:
        response = graphql(
            client,
            """
            mutation RequestPasswordReset($email: String!) {
              requestPasswordReset(email: $email) {
                ok
              }
            }
            """,
            {"email": user.email},
        )
        assert "errors" not in response
        assert response["data"]["requestPasswordReset"]["ok"] is True

        from core.models import PasswordResetToken

        assert PasswordResetToken.objects.filter(user=user).exists()

    def test_reset_password(self, client: Client, user: User) -> None:
        graphql(
            client,
            """
            mutation RequestPasswordReset($email: String!) {
              requestPasswordReset(email: $email) { ok }
            }
            """,
            {"email": user.email},
        )

        from core.models import PasswordResetToken

        token = PasswordResetToken.objects.get(user=user).token
        response = graphql(
            client,
            """
            mutation ResetPassword($token: String!, $password: String!) {
              resetPassword(token: $token, password: $password) {
                ok
              }
            }
            """,
            {"token": token, "password": "newpassword123"},
        )
        assert "errors" not in response
        assert response["data"]["resetPassword"]["ok"] is True

        user.refresh_from_db()
        assert user.check_password("newpassword123")

        sign_in = graphql(
            client,
            """
            mutation SignIn($email: String!, $password: String!) {
              signIn(email: $email, password: $password) {
                token
              }
            }
            """,
            {"email": user.email, "password": "newpassword123"},
        )
        assert "errors" not in sign_in


class TestTasks:
    def test_add_and_current_bird(self, client: Client, user: User) -> None:
        auth_client(client, user)
        response = graphql(
            client,
            """
            mutation {
              addTask(title: "First bird") {
                id
                title
                position
                status
              }
            }
            """
        )
        assert "errors" not in response
        task = response["data"]["addTask"]
        assert task["title"] == "First bird"
        assert task["position"] == 0
        assert task["status"] == "ACTIVE"

        current = graphql(client, "query { currentBird { title position } }")
        assert current["data"]["currentBird"]["title"] == "First bird"

    def test_do_next_inserts_at_front(self, client: Client, user: User) -> None:
        auth_client(client, user)
        graphql(client, 'mutation { addTask(title: "One") { id } }')
        response = graphql(
            client,
            """
            mutation {
              addTask(title: "Urgent", doNext: true) {
                title
                position
              }
            }
            """
        )
        assert response["data"]["addTask"]["position"] == 0
        current = graphql(client, "query { currentBird { title } }")
        assert current["data"]["currentBird"]["title"] == "Urgent"

    def test_complete_task(self, client: Client, user: User) -> None:
        auth_client(client, user)
        first = graphql(client, 'mutation { addTask(title: "A") { id } }')["data"]["addTask"]["id"]
        graphql(client, 'mutation { addTask(title: "B") { id } }')

        response = graphql(
            client,
            f"""
            mutation {{
              completeTask(id: "{first}") {{
                status
                completedAt
              }}
            }}
            """
        )
        assert response["data"]["completeTask"]["status"] == "DONE"
        assert response["data"]["completeTask"]["completedAt"] is not None

        current = graphql(client, "query { currentBird { title } }")
        assert current["data"]["currentBird"]["title"] == "B"

    def test_skip_task_moves_to_bottom(self, client: Client, user: User) -> None:
        auth_client(client, user)
        first = graphql(client, 'mutation { addTask(title: "A") { id } }')["data"]["addTask"]["id"]
        graphql(client, 'mutation { addTask(title: "B") { id } }')

        graphql(client, f'mutation {{ skipTask(id: "{first}") {{ position }} }}')
        current = graphql(client, "query { currentBird { title } flock { title position } }")
        assert current["data"]["currentBird"]["title"] == "B"
        flock = current["data"]["flock"]
        assert flock[0]["title"] == "B"
        assert flock[1]["title"] == "A"

    def test_abandon_task(self, client: Client, user: User) -> None:
        auth_client(client, user)
        task_id = graphql(client, 'mutation { addTask(title: "Drop") { id } }')["data"]["addTask"]["id"]
        response = graphql(
            client,
            f'mutation {{ abandonTask(id: "{task_id}") {{ status }} }}'
        )
        assert response["data"]["abandonTask"]["status"] == "ABANDONED"
        current = graphql(client, "query { currentBird { title } }")
        assert current["data"]["currentBird"] is None

    def test_promote_task(self, client: Client, user: User) -> None:
        auth_client(client, user)
        first = graphql(client, 'mutation { addTask(title: "A") { id } }')["data"]["addTask"]["id"]
        second = graphql(client, 'mutation { addTask(title: "B") { id } }')["data"]["addTask"]["id"]

        graphql(client, f'mutation {{ promoteTask(id: "{second}") {{ position }} }}')
        current = graphql(client, "query { currentBird { title } }")
        assert current["data"]["currentBird"]["title"] == "B"

    def test_reorder_tasks(self, client: Client, user: User) -> None:
        auth_client(client, user)
        a = graphql(client, 'mutation { addTask(title: "A") { id } }')["data"]["addTask"]["id"]
        b = graphql(client, 'mutation { addTask(title: "B") { id } }')["data"]["addTask"]["id"]
        c = graphql(client, 'mutation { addTask(title: "C") { id } }')["data"]["addTask"]["id"]

        response = graphql(
            client,
            """
            mutation Reorder($ids: [ID!]!) {
              reorderTasks(orderedIds: $ids) {
                title
                position
              }
            }
            """,
            {"ids": [c, a, b]},
        )
        titles = [task["title"] for task in response["data"]["reorderTasks"]]
        assert titles == ["C", "A", "B"]

    def test_history_pagination(self, client: Client, user: User) -> None:
        auth_client(client, user)
        task_id = graphql(client, 'mutation { addTask(title: "Done task") { id } }')["data"]["addTask"]["id"]
        graphql(client, f'mutation {{ completeTask(id: "{task_id}") {{ id }} }}')

        history = graphql(
            client,
            "query { history(limit: 10, offset: 0) { title status } }"
        )
        assert history["data"]["history"][0]["title"] == "Done task"
        assert history["data"]["history"][0]["status"] == "DONE"

    def test_flock_requires_auth(self, client: Client) -> None:
        response = graphql(client, "query { flock { id } }")
        assert response["errors"]

    def test_uncomplete_task(self, client: Client, user: User) -> None:
        auth_client(client, user)
        task_id = graphql(client, 'mutation { addTask(title: "Oops") { id } }')["data"]["addTask"]["id"]
        graphql(client, f'mutation {{ completeTask(id: "{task_id}") {{ id }} }}')

        response = graphql(
            client,
            f'mutation {{ uncompleteTask(id: "{task_id}") {{ status position completedAt }} }}',
        )
        assert response["data"]["uncompleteTask"]["status"] == "ACTIVE"
        assert response["data"]["uncompleteTask"]["completedAt"] is None

        flock = graphql(client, "query { flock { title status } }")
        assert flock["data"]["flock"][0]["title"] == "Oops"
        assert flock["data"]["flock"][0]["status"] == "ACTIVE"

    def test_update_task(self, client: Client, user: User) -> None:
        auth_client(client, user)
        task_id = graphql(
            client,
            'mutation { addTask(title: "Original", notes: "Old note") { id } }',
        )["data"]["addTask"]["id"]

        response = graphql(
            client,
            f'mutation {{ updateTask(id: "{task_id}", title: "Renamed", notes: "New note") {{ title notes }} }}',
        )
        assert response["data"]["updateTask"]["title"] == "Renamed"
        assert response["data"]["updateTask"]["notes"] == "New note"

        current = graphql(client, "query { currentBird { title notes } }")
        assert current["data"]["currentBird"]["title"] == "Renamed"
        assert current["data"]["currentBird"]["notes"] == "New note"

        cleared = graphql(
            client,
            f'mutation {{ updateTask(id: "{task_id}", notes: "") {{ notes }} }}',
        )
        assert cleared["data"]["updateTask"]["notes"] is None

    def test_clear_history(self, client: Client, user: User) -> None:
        auth_client(client, user)
        active_id = graphql(
            client,
            'mutation { addTask(title: "Still active") { id } }',
        )["data"]["addTask"]["id"]
        done_id = graphql(
            client,
            'mutation { addTask(title: "Done task") { id } }',
        )["data"]["addTask"]["id"]
        graphql(client, f'mutation {{ completeTask(id: "{done_id}") {{ id }} }}')

        response = graphql(client, "mutation { clearHistory { ok deletedCount } }")
        assert response["data"]["clearHistory"]["ok"] is True
        assert response["data"]["clearHistory"]["deletedCount"] == 1

        history = graphql(client, "query { history(limit: 10, offset: 0) { id } }")
        assert history["data"]["history"] == []

        flock = graphql(client, "query { flock { id title } }")
        assert len(flock["data"]["flock"]) == 1
        assert flock["data"]["flock"][0]["id"] == active_id

    def test_bird_images_unique_per_cycle(self, client: Client, user: User) -> None:
        auth_client(client, user)
        images: list[str] = []
        for index in range(26):
            response = graphql(
                client,
                f'mutation {{ addTask(title: "Bird {index}") {{ birdImage }} }}',
            )
            assert "errors" not in response
            images.append(response["data"]["addTask"]["birdImage"])

        assert len(set(images)) == 26
        assert all(image.endswith(".svg") for image in images)
