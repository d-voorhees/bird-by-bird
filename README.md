# Bird

Bird is a single-task focus tool: one active task at a time, a deliberate backlog (the flock), and a quiet history of what you finished. The constraint is the product.

**Current release: v1.1**

## Styling

The UI is built with **Tailwind CSS** (utility classes in components) plus a small amount of custom CSS where needed.

| File | Role |
|------|------|
| `frontend/tailwind.config.ts` | Tailwind theme — maps `paper`, `ink`, `accent`, etc. to CSS variables; Geist Mono font; `darkMode: "class"` |
| `frontend/app/globals.css` | Theme variables (light/dark), flock row layout, checkboxes, inline edit fields |
| `frontend/app/layout.tsx` | Imports `globals.css`; loads Geist Mono |

Most screens use Tailwind classes directly in JSX. Shared class strings live in small helpers like `historyActionsStyles.ts` and the footer components.

## Architecture

```
┌─────────────┐     HTTP-only JWT cookie      ┌──────────────────┐
│  Next.js    │ ────────────────────────────► │  Django GraphQL  │
│  (Vercel)   │         credentials           │  (ECS Fargate)   │
└─────────────┘                               └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │   PostgreSQL     │
                                              │   (RDS)          │
                                              └──────────────────┘
```

Monorepo layout:

- `frontend/` — Next.js 14 App Router, TypeScript, Tailwind, Apollo Client
- `backend/` — Django 5, Graphene-Django, JWT auth, pytest
- `infra/` — reserved for Phase 5 (AWS deployment, not implemented yet)

## Stack and rationale

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 + TypeScript + Tailwind | App Router, strong typing, fast UI iteration |
| API | Django + Graphene GraphQL | Explicit schema, mature ORM, portfolio-grade backend |
| Database | PostgreSQL 15+ | Composite constraints for queue positions |
| Auth | JWT in HTTP-only cookies + sessions table | Revocable sessions, no OAuth scope creep in v1 |
| Package mgmt | pnpm (frontend), uv (backend) | Fast, reproducible installs |

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
createdb bird -O bird  # if not already created
```

Copy environment variables:

```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local  # or use the included .env.local
```

### Backend

```bash
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
```

GraphiQL: [http://localhost:8000/graphql/](http://localhost:8000/graphql/)

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

## GraphQL schema (summary)

**Queries:** `me`, `currentBird`, `flock`, `history(limit, offset)`

**Mutations:** `signUp`, `signIn`, `signOut`, `addTask`, `completeTask`, `skipTask`, `abandonTask`, `reorderTasks`, `promoteTask`

Three tables only: `users`, `tasks`, `sessions`. Active task positions are unique per user via a partial unique index.

## Deployment (Phase 5 — deferred)

Planned production path:

- Frontend → Vercel
- Django API → AWS ECS Fargate behind ALB
- Postgres → AWS RDS
- Secrets → AWS Secrets Manager
- IaC → Terraform in `infra/`

Not implemented in this repo yet.

## Known limitations / v2 candidates

- **No password reset** — document-only for v1; email flow is a v2 item
- **No OAuth** — email/password only
- **Session refresh** — extends `sessions.expires_at` on activity; JWT expiry is set at sign-in
- **"Completed today"** — derived from the first page of history (50 items), not a dedicated aggregate

Explicitly out of scope: tags, projects, due dates, reminders, sharing, analytics, streaks, search, export.

## Keyboard shortcuts (home)

| Key | Action |
|-----|--------|
| `d` | Done |
| `s` | Skip |
| `a` | Add task |
| `Esc` | Close add modal |
