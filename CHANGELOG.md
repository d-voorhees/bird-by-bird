# Changelog

A running log of what changed and why.

---

## v1.9 Remove redundant Fly.io machine — August 13, 2026

### Infrastructure cleanup
- Scaled the backend app down from 2 machines to 1 (`fly scale count 1`). The app was provisioned with 2 machines in `dfw` at some point, but with `min_machines_running = 0` neither one was ever a warm standby — both sat stopped between requests, so the second machine was pure idle allocation, not redundancy.
- This is a Fly control-plane change, not a config or code change — machine count isn't tracked in `fly.toml`, so there's nothing to diff in git.

---

## v1.8 Reduce Fly.io hosting cost — August 2, 2026

### Backend deploy config
- Changed backend deploy config so the app machine scales to zero when idle (`min_machines_running` 1 → 0) instead of running 24/7.
- Reduced VM size from 1GB to 256MB, since the Django backend doesn't need that much memory at this traffic level.
- Tradeoff: the first request after a period of inactivity now takes ~8 seconds to spin the machine back up, in exchange for only paying for compute while the app is actually being used.

---

## v1.7 Stop leaking raw DB errors to the browser — July 27, 2026

### Occasional "terminating connection due to administrator command" errors

- Fixed a bug where a database connection getting killed server-side (idle timeout, restart) could send its raw Postgres error text straight to the browser instead of a normal error.
- Backend now masks any GraphQL error that wasn't raised intentionally by app code — unexpected exceptions (DB errors, bugs) are logged server-side and return a generic "Something went wrong. Please try again." message instead of leaking internals. Errors we raise on purpose (e.g. "Task not found") are unaffected.
- Removed Django's persistent DB connections (`CONN_MAX_AGE` 600s → 0), which was the root cause: a request could get handed a connection that had already been killed on the server since the last time it was used. Traffic is light enough that reconnecting per request is negligible.
- Added a one-time automatic frontend retry (Apollo `ErrorLink`) for the narrow class of masked errors caused by a dropped connection, so a rare remaining case resolves itself instead of surfacing to the user at all.

---

## v1.6 Fix double-complete deadlock — July 22, 2026

### Completing tasks quickly

- Fixed a bug where marking two tasks complete in quick succession could deadlock in the database, causing one of the two to silently fail and pop up a raw, meaningless error (e.g. a bare HTTP status code) instead of succeeding or showing a clear message.
- `completeTask` now locks all of a user's active (or flying-later) tasks in a single, consistently-ordered query instead of locking the target task first and its siblings second, which is what caused the deadlock under concurrent completions.
- Added a one-time automatic retry on the backend if a lock conflict does still occur, so a rare conflict resolves itself instead of surfacing to the user.

---

## v1.5 Flying later queue — July 16, 2026

### What changed in the flock
- Added a new task status, **Flying later**.
- Added a dedicated **Flying later** section between **Awaiting flight** and **This bird has flown**.
- Added drag/drop between **Awaiting flight** and **Flying later** and kept manual order in both lists.
- Added a hide/show toggle for **Flying later** and save that preference in the browser.

### Focus + counts

- Tasks in **Flying later** do not show up in focus (or active counts) until moved back to **Awaiting flight**.
- Added GraphQL support for this flow via `flyingLater`, `setTaskStatus`, and `reorderFlyingLaterTasks`.

---

## v1.4 Performance enhancements — June 23, 2026

### Internal signup notifications

- After sending the verification email on new account creation, a second email now fires to `onboarding@mediumandmessage.com` with the subject `New bird-by-bird signup: {user email}` and a one-liner HTML body with the signup timestamp (UTC).
- Verification email `from` address updated.

### Task transitions feel faster

- Task state changes now update instantly in the UI (done, undo done, skip, add) via optimistic Apollo cache updates instead of waiting on refetch round-trips.
- Added shared cache transition helpers in `frontend/lib/taskCache.ts` to keep behavior consistent across Flock, Focus, and completed-task rows.

### Flock page load

- Reduced auth/session overhead that could delay protected page render: auth now hydrates `me` from Apollo cache before background verification, and backend session expiry refresh writes are throttled to the final day before expiry.

---

## v1.3 — June 23, 2026

### Routes

- **Root (`/`)** is now the canonical public landing page.
- **Authenticated single-bird view** moved to `/focus` (with redirects/links updated from `/`).
- **`/welcome` now redirects to `/`** to avoid duplicate marketing URLs.

---

## v1.2 Onboarding — June 22, 2026

### Onboarding & routes

- **Welcome screen restored** as public landing page.
- **Authenticated onboarding screen** moved to `/first-bird`.
- All `/welcome` references updated to `/first-bird`.

### Auth

- **Password visibility toggle** on sign-up and reset-password pages.

---

## v1.1 Auth, Exportable History - June 21, 2026

### Auth & account

- **Sign-in / sign-up branding:** title is **Bird by Bird**; **Artboard27.svg** at 300px wide above the form (no extra vertical margin on the image).
- **Auth footer (bottom right):** `privacy · credits` — small muted links with bullet separator.
- **Privacy policy** at `/privacy` — public page with email collection, data retention, analytics, transactional email, and third-party disclosure copy.
- **Sign-up** links to the privacy policy; toast after account creation prompts user to check email.
- **Email verification:** token sent on sign-up; link opens `/verify-email`; `verifyEmail` and `resendVerificationEmail` GraphQL mutations; `emailVerified` on `me`; banner on bird page with resend until verified. Dev emails print to Django console; production uses `FRONTEND_URL`, `DEFAULT_FROM_EMAIL`, and SMTP (see `.env.example`). Existing users marked verified in migration.
- **Credits page** is public (no auth required); shows Flock or Sign in in header depending on session.

### Flock & history footers

- **Flock / history footer (bottom right):** `privacy · credits · logout` (privacy link added).

### Flock

- **add another** under **Awaiting flight** — same secondary style as **older history**; opens the add-task modal.
- **`FlockListFooter`** + `.flock-list-footer__action` for consistent spacing under flock lists.

### Making Task History Exportable

- **Export** completed tasks as **Markdown** (grouped by date) or **CSV** (`tasks`, `notes`, `date`, `time`).
- Download filenames: `finished-birds-MMDDYYYY-HMMam.{md|csv}` (local date/time).
- Header actions **Download · Clear** on one line — dropdown menus instead of modals.
- **Clear:** click **are you sure?** inside dropdown to confirm; outside click cancels.

### UI polish

- **Theme toggle:** border removed — icon only, muted with hover to full ink.
- **Drag reorder:** optimistic local order + Apollo cache write; layout animation disabled so rows snap without bounce.

### Backend (v1.1)

| Addition | Purpose |
|----------|---------|
| `email_verified` on users | Track verification state |
| `EmailVerificationToken` model | One-time verify links (48h TTL) |
| `verifyEmail` mutation | Confirm email from link token |
| `resendVerificationEmail` mutation | Resend from in-app banner |
| `core/email_verification.py` | Token creation + mail send |

---

## Baseline (v1.0) - June 21, 2026

- **Stack:** Next.js 14 + TypeScript + Tailwind, Django 5 + Graphene GraphQL, PostgreSQL, JWT in HTTP-only cookies
- **Data model:** Three tables only (`users`, `tasks`, `sessions`)
- **Screens:** Bird (`/`), Add task modal, Flock (`/flock`), History (`/history`)
- **Auth:** Sign up / sign in; protected routes; no password reset in v1
- **Keyboard shortcuts:** `d` Done, `s` Skip, `a` Add, `Esc` close modal
- **Phase 5 (AWS deployment):** Deferred as requested

## Visual & typography

| Area | Initial plan | Shipped |
|------|--------|---------|
| Font | Unspecified | **Geist Mono** app-wide via Google Fonts |
| Light theme accent | Warm/minimal implied | **Blue** accent (`#1d4e89`) instead of brown on cream |
| Dark mode | Not in initial plan | Full **light/dark toggle** — dark blue paper, CSS variables on `html`/`body` |
| Theme toggle | — | **Moon** icon in light mode, **sun** in dark (not text labels) |
| Bird image size | Unspecified | **300px** on bird page; **100px** inline on flock/history |
| Bird images | Not in initial plan | **28 SVGs**, random assignment with **no repeat until all 28 used**; stored on task as `bird_image` |
| Flock action buttons | Generic | **4px rounded corners**, **lighter borders** (`stone/30`) |
| Row padding | — | `.flock-row` horizontal padding; `.flock-row__text` gets `15px 0` vertical padding |

## Task / Bird page (`/`)

- **Done / Skip / +** in one horizontal row; **+** is a compact plus button (not "Add a new bird" text).
- **Adding a task** from + or "Add another" uses `doNext: true` and **pins the new task on screen** immediately (no flash back to the previous bird).
- **Single-bird skip:** if only one active task, Skip shows *"There's only one bird currently."* + **Add another** (opens the same add modal as +).
- **Inline editing:** click title or notes to edit; save on Enter / blur; **clear notes** by deleting text + Enter (`notes: ""` → `null` on server).
- **No visible "Add a note…"** — empty notes area is a silent click target.
- **Credits link** only on flock + history (not bird page); see **v1.1** for privacy + logout footer links.
- **Fade transition** on Done/Skip (~180ms).

## Flock page (list of tasks) (`/flock`)

### Structure (beyond the original single-list scope)

- **Awaiting flight** — active queue
- **This bird has flown** — completed tasks (**today only**, local timezone)
- **older history** link under today's list when older completions exist → `/history`

### Row layout

- No bullets anywhere — `div.flock-list`, not `<ul>`.
- Single horizontal row: **checkbox → bird → title/notes → drag handle → trash**.
- **20×20px square checkboxes** via dedicated `.bird-checkbox` CSS.
- Completed rows: checkbox shows **checked** (accent fill + mark).

### Drag & drop

- Single **↑↓ handle** (not separate up/down buttons).
- **Optimistic local order** + Apollo cache update; no refetch race.
- **No bouncy layout animation** — rows snap into place on reorder.

### Copy & notes

- Notes: **12px, muted**, same on awaiting + flown lists.
- **Title-only rows:** title **vertically centered**; full text area still clickable to add a note (overlay pattern).
- Same behavior on **flown** section and **history**.

### Header

- **"X completed today"** (local date) + link to History.

## History page (`/history`)

- Grouped by day with **local timestamps** (e.g. *June 18 3:29pm*).
- **Bird images** on each row (inline layout matching flock).
- **`max-w-4xl`** alignment to match flock.
- **Clear history** on the latest date row → confirmation modal (Yes plain, No accent; Yes first).
- **`clearHistory` mutation** — deletes all completed tasks (active flock untouched).
- **Credits** pinned bottom-right of viewport; **v1.1** adds privacy link and history export/clear dropdowns.
- **Load more** pagination (50 per page).

## Credits (`/credits`)

- Minimal page: same header as bird, centered "credits".
- Linked from flock + history footers; **v1.1** also links from auth and adds privacy alongside credits.

## Backend extensions

| Addition | Purpose |
|----------|---------|
| `updateTask` | Inline title/notes edit |
| `deleteTask` | Trash on flock |
| `uncompleteTask` | Uncheck completed → back to awaiting flight |
| `clearHistory` | Wipe completed archive |
| `bird_image` on tasks | Persist assigned bird art |

## Reliability & infrastructure fixes

- Fixed sign-up / fetch (proxy, CORS, cookies).
- **Auth timeout** so pages don't hang on "Loading…".
- **Apollo fetch timeout**; flock/history sections load independently.
- **`app/error.tsx`** for real errors instead of Next's "missing required error components".

## Design principles that emerged

1. **Constraint stays central** — one bird at a time; flock is deliberate, not a dashboard.
2. **Fewer buttons, clearer gestures** — checkbox to complete, drag handle to reorder, trash to delete.
3. **Explicit CSS for fragile UI** — checkboxes, flock rows, edit fields (after Tailwind-only attempts failed).
4. **Today vs archive** — flock shows **today's wins**; history holds **everything older**.
5. **Quiet affordances** — no "Add a note…" placeholder; credits and older history are small, secondary links.
6. **Local time everywhere** — completion counts, day grouping, timestamps use the browser timezone (counts don't auto-refresh at midnight without a reload).

## Dev utilities

- `python manage.py seed_yesterday_task` — adds a completed task with yesterday's date for demo/testing (defaults to most recently active user).
