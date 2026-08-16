# Bird by Bird

A single-task focus tool. One active task at a time, a deliberate backlog (the flock), and a history of what you finished.

**Live:** [bird-by-bird.vercel.app](https://bird-by-bird.vercel.app) &nbsp;·&nbsp; **Current release:** v1.10

---

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 + TypeScript + Tailwind |
| API | Django 5 + Graphene GraphQL |
| Database | PostgreSQL |
| Auth | JWT in HTTP-only cookies + sessions table |
| Package mgmt | pnpm (frontend), uv (backend) |

## Architecture

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

## GraphQL schema

**Queries:** `me`, `currentBird`, `flock`, `flyingLater`, `history(limit, offset)`

**Mutations:**

| Group | Mutations |
|-------|-----------|
| Auth | `signUp`, `signIn`, `signOut` |
| Email | `verifyEmail`, `resendVerificationEmail` |
| Password | `requestPasswordReset`, `resetPassword` |
| Tasks | `addTask`, `completeTask`, `uncompleteTask`, `skipTask`, `abandonTask`, `deleteTask`, `updateTask`, `reorderTasks`, `reorderFlyingLaterTasks`, `setTaskStatus`, `promoteTask`, `clearHistory` |

## What's new in v1.10

- Added dark-mode bird icons: `frontend/public/img-dark/` mirrors `frontend/public/img/`, and `BirdImage` now switches between the two sets based on the light/dark theme toggle.
- Added an Apple touch icon (`frontend/public/apple-touch-icon.png`) — the landing-page bird on a brand dark-blue background — so bookmarking the site on iOS shows the bird instead of a generic icon.
- Double-clicking a task row in **Awaiting flight** or **Flying later** now opens an edit modal (`EditTaskModal`), in addition to the existing click-to-edit-inline behavior.
- Fixed the Add Task modal closing on stray taps that started inside the modal but ended outside it; it now only closes via its explicit close/cancel action or Escape.

## What's new in v1.7

- Fixed a bug where a database connection getting killed server-side (idle timeout, restart) could send its raw Postgres error text ("terminating connection due to administrator command") straight to the browser instead of a normal error.
- The GraphQL backend now masks any error that wasn't raised intentionally by app code, logging the real exception server-side and returning a generic message to the client. Intentional errors (e.g. "Task not found") are unaffected.
- Removed Django's persistent DB connections (`CONN_MAX_AGE` 600s → 0), the root cause: a request could get handed a connection the server had already killed since it was last used.
- Added a one-time automatic frontend retry for the narrow class of masked errors caused by a dropped connection, so the rare remaining case resolves itself instead of surfacing to the user.

## What's new in v1.6

- Fixed a database deadlock that could occur when completing two tasks in quick succession, which was causing one completion to fail with a raw, meaningless error and silently revert in the UI.
- `completeTask` now acquires locks on all of a user's active (or flying-later) tasks in one consistently-ordered query instead of locking the target task and its siblings separately, removing the lock-order inversion that caused the deadlock.
- Added a one-time automatic retry on the backend if a lock conflict still occurs.

## What's new in v1.5

- Added a new persisted task status, `flying_later`, shown as a dedicated section between **Awaiting flight** and **This bird has flown** on the flock page.
- Tasks can now be dragged between **Awaiting flight** and **Flying later**, with manual ordering preserved inside each list.
- Added a hide/show toggle for the **Flying later** section on flock, with the preference remembered locally.
- `flyingLater` tasks are excluded from focus and non-flying-later counts until moved back to `awaiting flight`.

## Summary since last commit

- Added smooth cross-list drag behavior between **Awaiting flight** and **Flying later** (live move on drag-over, no duplicate rows on cross-list drags, and persisted final order/status on drop).
- Completing a task from **Flying later** now works server-side and moves the task into **This bird has flown**.
- **Flying later** now supports:
  - `hide tasks` under the list when expanded
  - `show tasks` when collapsed
  - collapsed section remains a valid drop target; dropping into it opens the section
  - no toggle shown when there are zero flying-later tasks
- Added completed-list visibility controls with the same conditional behavior:
  - `hide completed` / `show completed`
  - toggle shown only when there are completed tasks in the section
- Updated copy on empty awaiting state action:
  - empty **Awaiting flight**: `add new task`
  - non-empty **Awaiting flight**: `add another`
- Updated landing-page messaging in **How it works**:
  - added a dedicated Step 3 for shifting priorities with a `later list`
  - moved **Finish and move on** to Step 4 and updated copy to mention an exportable history record
- Updated landing-page mock UI and responsive behavior:
  - added a mock **Flying later** card in the rail
  - matched label styling (including `Today`) across mock sections
  - kept mobile-style row behavior up to `1280px`, then restored desktop behavior above that
  - adjusted section widths to `xl:w-1/2` while preserving existing behavior below `1280px`
- Updated landing example copy:
  - changed `Write the agenda so meeting has a point` to `write meeting agenda`

Three core tables: `users`, `tasks`, `sessions`. Active task positions are unique per user via a partial unique index. Bird image assignment cycles through all 28 illustrations before repeating.

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

## Out of scope

No tags, projects, due dates, reminders, sharing, or streaks. Intentionally.

## License

MIT — see [LICENSE](LICENSE)
