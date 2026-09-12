# Bird by Bird

Bird by Bird is a deployed full-stack task-focus application built to turn a deliberately constrained productivity workflow into a reliable web product. It combines a Next.js and TypeScript client with a Django GraphQL API, PostgreSQL persistence, JWT authentication in HTTP-only cookies, and separate Vercel and Fly.io deployments; the application supports task prioritization, cross-list reordering, completion history, and exportable task records.

**Live:** [bird-by-bird.vercel.app](https://bird-by-bird.vercel.app) &nbsp;·&nbsp; **Current release:** v1.16

---

## Business problem and workflow

The app is built around one active task at a time rather than an open-ended list. Work is organized into three lists on the flock page:

- **Awaiting flight** — the active queue, in manual priority order
- An optional **custom section** — one user-named section for a second grouping
- **Flying later** — deferred work, excluded from the active count until moved back

Tasks can be dragged freely between all three lists. Completing one moves it into history (**This bird has flown**), which can be reviewed by day, exported, or cleared.

The project intentionally excludes tags, projects, due dates, reminders, sharing, and streaks — see [Out of scope](#out-of-scope).

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 + TypeScript + Tailwind |
| API | Django 5 + Graphene GraphQL |
| Database | PostgreSQL |
| Auth | JWT in HTTP-only cookies + sessions table |
| Package mgmt | pnpm (frontend), uv (backend) |

## Architecture and request flow

The Next.js client (Vercel) sends every request to the Django GraphQL API (Fly.io) with credentials included, so the browser's HTTP-only session cookie goes along automatically — there's no token handling in client JS. The API verifies the signed JWT from that cookie and checks it against a matching session row in PostgreSQL (also on Fly.io), so a session can be checked for expiry or invalidated server-side rather than trusting the token alone. PostgreSQL is the system of record for users, tasks, and sessions; the API reads and writes through Django's ORM.

```
┌─────────────────┐    HTTP-only JWT cookie    ┌──────────────────┐
│   Next.js       │ ─────────────────────────► │  Django GraphQL  │
│   (Vercel)      │        credentials         │   (Fly.io)       │
└─────────────────┘                            └────────┬─────────┘
                                                        │
                                                        ▼
                                               ┌──────────────────┐
                                               │   PostgreSQL     │
                                               │   (Fly.io)       │
                                               └──────────────────┘
```

- `frontend/` — Next.js App Router, TypeScript, Tailwind, Apollo Client
- `backend/` — Django 5, Graphene-Django, JWT auth, pytest
- `infra/` — reserved for future infrastructure-as-code

## Local development

### Prerequisites

- Node.js 20+
- pnpm
- Python 3.11+
- [uv](https://docs.astral.sh/uv/)
- PostgreSQL 15+ (Homebrew or Docker via `docker-compose.yml`)

### Database

```bash
# Option A: Docker
docker compose up -d postgres

# Option B: Homebrew (macOS)
brew services start postgresql@15
createdb bird -O bird
```

### Environment variables

```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
```

### Backend

```bash
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
```

Run tests:

```bash
cd backend
uv run pytest -v
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

App: [http://localhost:3000](http://localhost:3000)

Lint and typecheck:

```bash
cd frontend
pnpm lint
pnpm exec tsc --noEmit
```

## Validation and quality checks

- **Backend:** `uv run pytest -v` runs the GraphQL integration suite (`backend/core/tests/test_graphql.py`, 24 tests) covering sign-up/email verification/password reset, task creation and completion (including completing from Flying later), skip/abandon/promote, reordering within and across lists, history pagination, the auth-required guard on protected queries, and bird-image cycling.
- **Frontend:** `pnpm lint` (ESLint via `next lint`) and `pnpm exec tsc --noEmit` check the client.
- These checks are run locally as part of development; this repository has no `.github/workflows` or other CI configuration, so they are not run automatically on push.

## API contract

The Django backend exposes a single GraphQL endpoint (`/graphql/`) covering auth, task lifecycle, and history — the same contract the Next.js client consumes.

**Queries:** `me`, `currentBird`, `flock`, `flyingLater`, `customSection`, `history(limit, offset)`

**Mutations:**

| Group | Mutations |
|-------|-----------|
| Auth | `signUp`, `signIn`, `signOut` |
| Email | `verifyEmail`, `resendVerificationEmail` |
| Password | `requestPasswordReset`, `resetPassword` |
| Tasks | `addTask`, `completeTask`, `uncompleteTask`, `skipTask`, `abandonTask`, `deleteTask`, `updateTask`, `reorderTasks`, `reorderFlyingLaterTasks`, `reorderCustomSectionTasks`, `setTaskStatus`, `setCustomSectionName`, `promoteTask`, `clearHistory` |

## Data model

The schema stays small and purpose-built: `users`, `tasks`, and `sessions` are the core tables, plus `email_verification_tokens` and `password_reset_tokens` backing the two token-based auth flows. Active task position is enforced unique per user via a partial unique index (`unique_active_position_per_user`, scoped to `status = active`). Task status is a five-value enum — `active`, `flying_later`, `custom`, `done`, `abandoned` — covering the three open lists plus completion and abandonment. Bird-image assignment cycles through all 22 illustrations in the assignment pool, avoiding any image already on another of the user's open tasks, before a repeat is allowed.

## Reliability and operational considerations

- Task completion acquires locks on a user's active (or flying-later) tasks in a single, consistently-ordered query (`select_for_update().order_by("id")`) instead of locking the target task and its siblings separately, avoiding the lock-order inversion that previously caused deadlocks under rapid completions; a one-time backend retry handles a remaining lock conflict.
- Unexpected backend exceptions — anything not raised intentionally as a `GraphQLError` by app code — are logged server-side via Python's `logging` module and returned to the client as a generic "Something went wrong. Please try again." message instead of raw database or internal error text. Errors raised on purpose (e.g. "Task not found") pass through unchanged.
- Errors caused by a dropped database connection are tagged with a `TRANSIENT_ERROR` extension code server-side; the frontend's Apollo error link retries that specific case once automatically, so the rare remaining failure resolves itself instead of reaching the user.
- Django's persistent database connections are disabled (`CONN_MAX_AGE = 0`) — the fix for a bug where a request could be handed a connection the server had already killed (idle timeout, restart), which had been surfacing as a raw Postgres error in the browser.
- A stale reorder request — client task order drifted from the server's, usually from a long-idle tab — is rejected server-side with a dedicated `StaleOrderError` whose internal message never reaches the client; the frontend shows a friendly "Awakening from a slumber, one moment…" instead.
- On the frontend, `friendlyErrorMessage()` only surfaces GraphQL error text the backend sent intentionally; network errors, timeouts, and other exceptions collapse into a generic fallback message instead of leaking raw error text into the UI.
- Auth-sensitive mutations (sign-up, sign-in, password reset, resend verification) are rate-limited per IP address via Django's cache framework, returning a generic "Too many requests" message rather than allowing unlimited attempts.

## Deployment

| Layer | Platform |
|-------|----------|
| Frontend | Vercel |
| Django API | Fly.io |
| PostgreSQL | Fly.io |

Backend environment variables (secret keys, database URL, SMTP credentials) are stored as Fly secrets and never committed. See `.env.example` for the full variable reference.

## Styling

| File | Role |
|------|------|
| `frontend/tailwind.config.ts` | Theme — maps `paper`, `ink`, `accent` to CSS variables; Geist Mono font; `darkMode: "class"` |
| `frontend/app/globals.css` | Theme variables (light/dark), flock row layout, checkboxes, inline edit fields |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `d` | Done |
| `s` | Skip |
| `a` | Add task |
| `Esc` | Close modal |

## Current release

**v1.16 — Hover delay before a collapsed section opens on drag**

- Dragging a task onto a collapsed **Flying later** or custom section no longer opens it instantly — it now opens (and drops the task in) only after the drag hovers near the section's title for 2 seconds, so passing over the header on the way elsewhere doesn't pop it open by accident.

Full version history, including prior reliability fixes and UI changes by release: see [CHANGELOG.md](CHANGELOG.md).

## Out of scope

No tags, projects, due dates, reminders, sharing, or streaks. Intentionally — the constraint (one active task, a deliberate backlog, a clean history) is the product.

## License

MIT — see [LICENSE](LICENSE)
