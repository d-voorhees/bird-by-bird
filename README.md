# Bird by Bird

A single-task focus tool. One active task at a time, a deliberate backlog (the flock), and a quiet history of what you finished. The constraint is the product.

**Live:** [bird-by-bird.vercel.app](https://bird-by-bird.vercel.app) &nbsp;·&nbsp; **Current release:** v1.4

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 15 + TypeScript + Tailwind | App Router, strong typing, fast UI iteration |
| API | Django 5 + Graphene GraphQL | Explicit schema, mature ORM, revocable sessions |
| Database | PostgreSQL | Composite constraints for queue positions |
| Auth | JWT in HTTP-only cookies + sessions table | Revocable server-side sessions, no OAuth scope creep |
| Package mgmt | pnpm (frontend), uv (backend) | Fast, reproducible installs |

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

Monorepo layout:

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

**Queries:** `me`, `currentBird`, `flock`, `history(limit, offset)`

**Mutations:**

| Group | Mutations |
|-------|-----------|
| Auth | `signUp`, `signIn`, `signOut` |
| Email | `verifyEmail`, `resendVerificationEmail` |
| Password | `requestPasswordReset`, `resetPassword` |
| Tasks | `addTask`, `completeTask`, `uncompleteTask`, `skipTask`, `abandonTask`, `deleteTask`, `updateTask`, `reorderTasks`, `promoteTask`, `clearHistory` |

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

Tags, projects, due dates, reminders, sharing, analytics, streaks, search. The single-task constraint is intentional.

## License

MIT — see [LICENSE](LICENSE)
