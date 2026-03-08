# Copilot Instructions

## Commands

```bash
npm run dev         # Dev server (Turbopack, http://localhost:3000)
npm run build       # Production build
npm run lint        # ESLint
npm run check:sandbox # Validate grader sandbox production config
npm run check:sandbox-policy # Verify sandbox policy flags are enforced in runner
npm run check:sandbox-runtime # Execute R/Python graders in docker sandbox as smoke check
npm run check:sandbox-startup # Measure R/Python docker grader startup time against thresholds
npm run check:sandbox-faults # Assert timeout fault handling in docker sandbox
npm run check:content-packs # Validate filesystem exercise packs against course metadata/contracts
npm run archive:risk-audit # Execute due risk-audit archive runs and record outcomes
npm run worker      # Background grading worker (requires Redis)
npm run redis:up    # Start Redis via Docker Compose
npm run redis:down  # Stop Redis
```

No unit test suite exists yet. Playwright is available for end-to-end tests (`@playwright/test`). After edits, always run `npm run lint` then `npm run build` and fix any failures before finishing.

## Architecture

**CodeCamp** is a gamified, open-source coding learning platform (R/Python) built with Next.js App Router + TypeScript.

### Stack
- **Next.js 16** (App Router, TypeScript, Turbopack)
- **React 19** with Tailwind CSS v4
- **SQLite** (`better-sqlite3`) at `.data/codecamp.db` — authoritative progress store
- **Redis + BullMQ** — async job queue for code grading
- **Monaco Editor** — in-browser code editor (loaded via dynamic import, client-only)

### Key data flow: exercise submission
```
ExerciseEditor (client)
  → client-side validation (lib/exerciseValidation.ts)
  → POST /api/submissions  → insert DB row + enqueue BullMQ job
  → worker/submissionWorker.ts picks up job
      → language-specific grader runs content/exercises/{course}/{chapter}/{exercise}/checker
      → updates DB with result + awards XP
  → client polls GET /api/submissions/[id] until complete
```

### State management: two sources of truth
- **localStorage** (`codecamp_progress`, `codecamp_user_id`) — client-side XP/completion cache via `ProgressContext` (`useReducer`)
- **SQLite** — backend authoritative record; queried via `/api/progress` and `/api/attempts`

Backend progress now hydrates `ProgressContext` for server-graded exercises; full catalog sync is still an open task.

### All courses are defined in TypeScript
`lib/courses.ts` (~645 lines) contains all `Course → Chapter → Exercise` data as typed objects. There is no CMS or database for course content.

### Exercise checker content lives in the filesystem
```
content/exercises/{courseSlug}/{chapterId}/{exerciseId}/
  checker.R|checker.py  # Runs submitted code + assertions; output parsed by language-specific grader
  solution.R|solution.py # Reference solution
```
Both R and Python have server-side grading support (currently enabled for selected exercises).

### API routes all use `runtime = 'nodejs'`
Required for `better-sqlite3` and Redis. Every `app/api/*/route.ts` must include:
```ts
export const runtime = 'nodejs';
```

### Classroom backend foundation exists
`/api/classroom/*` includes terms, sections, enrollments, assignments, profile, metrics, and export endpoints backed by SQLite tables in `submissionDb.ts`.
`/api/classroom/sections/metrics` provides instructor-oriented learner progress rollups per section.
Protected classroom routes now use session-backed identity (`codecamp_session` cookie) with role/section checks; production identity provider integration is still pending.
`/api/classroom/sections/export` provides JSON/CSV grade-summary exports for section instructors.
`/api/classroom/sections/assignment-breakdown` provides assignment-level completion rollups for section staff.
`/api/classroom/risk-config` returns environment-backed thresholds used by dashboard risk indicators.
`/api/classroom/sections/risk-policy` supports per-section staff overrides and returns policy audit history (filterable via `limit`, `action`, `actor` query params).
`/api/classroom/sections/risk-policy/export` provides CSV/JSON exports for section policy audit history.
`/api/classroom/sections/risk-policy/archive` manages section-level audit archival cadence/retention policy metadata.
`/api/classroom/sections/risk-policy/archive/report` exposes archive run outcomes (success/failure), recent runs, and failure-rate reporting.
`/api/classroom/sections/risk-policy/archive/report/export` exports archive run history (CSV/JSON) for section governance reviews.
`/api/classroom/risk-archive/run` executes due archive policies (or a specific section) for operational automation.
`/api/classroom/sections/overview` returns aggregated section dashboard data to reduce multi-endpoint fetch fanout.
`/api/classroom/sections` supports server-backed filtering/sorting/pagination via query params (`termId`, `search`, `courseSlug`, `sort`, `limit`, `offset`).
Auth supports two modes via `AUTH_MODE`: `bootstrap` (email POST to `/api/auth/session`) and `oidc` (redirect via `/api/auth/login` and callback at `/api/auth/callback`).
`/classroom` provides an instructor dashboard client for section metrics and exports.
The classroom dashboard also supports assignment creation and due-state indicators per section.
Dashboard cards and section headers include pass-rate and stuck-learner indicators derived from section export summaries.
Assignment authoring in the dashboard uses chapter/exercise options derived from `lib/courses.ts` for the selected section course.
Learner rows in section activity include completion-rate and risk-state badges derived from assignment due dates and summary metrics.
Section activity supports course filtering plus per-section learner search/risk filters with pagination for larger rosters.
Section activity controls also include term-based filtering wired to server-backed section paging.
Enrollment API enforces role assignment guardrails: only instructor actors can assign `instructor`/`ta` roles in section enrollments.
Term/section creation endpoints are instructor-only (`POST /api/classroom/terms`, `POST /api/classroom/sections`).
Assignment creation API validates section/course alignment, exercise existence in `lib/courses.ts`, and due dates within the section term window.
Assignment creation also enforces max due-date publish horizon and chapter pacing windows via env-configurable policies.
Assignment tables include per-assignment completion/last-completion data and stalled overdue indicators.
Dashboard section risk panels include archive run governance summaries (30-day totals, failures, and last run outcomes).
Archive automation writes local JSON artifacts to `.data/risk-audit-archives/` and stores delivery refs on archive runs.
Archive automation also supports webhook delivery via destination labels (`webhook:<url>`), with host allowlisting for outbound safety.
Archive automation supports archive upload destinations via `puturl:<url>` (HTTP PUT of archive artifact JSON, useful for pre-signed object storage endpoints).
Archive execution and manual archive-run recording endpoints are instructor-only write actions.

## Conventions

### Exercise key format
`"${courseSlug}/${chapterId}/${exerciseId}"` — used everywhere for tracking completion (localStorage, DB queries, progress context).

### Component boundary
- Server Components: layout, data fetching, course/exercise page wrappers
- Client Components (`"use client"`): `ExerciseEditor`, `CourseCard`, `XPBar`, `ThemeToggle`, `ProgressContext`
- Monaco Editor must be loaded with `dynamic(..., { ssr: false })`

### TypeScript strictness is enforced
`tsconfig.json` has `"strict": true`. Preserve this — no `any` escapes, no implicit returns on union types.

### Import alias
`@/` maps to the repo root. Use it for all non-relative imports.

### DB helpers are in `lib/grading/submissionDb.ts`
All SQLite reads/writes go through the typed helpers there. Don't use raw `better-sqlite3` calls outside that file.

### Response/contract types are in `lib/grading/contracts.ts`
Use these for API response shapes. Add new types here rather than inline.

### Sandbox mode controls
- `GRADER_SANDBOX_MODE=docker` enables Docker-isolated checker execution.
- `GRADER_TIMEOUT_MS` controls checker timeout (1000-30000ms, default 8000).
- Docker mode uses `GRADER_DOCKER_R_IMAGE` / `GRADER_DOCKER_PYTHON_IMAGE` when set.
- Startup check thresholds are env-configurable via `GRADER_STARTUP_MAX_MS_R` and `GRADER_STARTUP_MAX_MS_PYTHON`.
- `AUTH_BOOTSTRAP_INSTRUCTOR_EMAILS` (comma-separated) grants bootstrap instructor role for listed emails during session sign-in.
- OIDC mode requires `AUTH_OIDC_AUTHORIZATION_URL`, `AUTH_OIDC_TOKEN_URL`, `AUTH_OIDC_USERINFO_URL`, `AUTH_OIDC_CLIENT_ID`, `AUTH_OIDC_CLIENT_SECRET` (+ optional `AUTH_OIDC_REDIRECT_URI`, `AUTH_OIDC_SCOPE`).
- OIDC role sync supports env-driven claim mapping: `AUTH_OIDC_ROLE_CLAIM`, `AUTH_OIDC_GROUP_CLAIM`, `AUTH_OIDC_INSTRUCTOR_ROLE_VALUES`, `AUTH_OIDC_TA_ROLE_VALUES`, `AUTH_OIDC_INSTRUCTOR_GROUP_VALUES`, `AUTH_OIDC_TA_GROUP_VALUES`, `AUTH_OIDC_INSTRUCTOR_EMAILS`, `AUTH_OIDC_TA_EMAILS`, `AUTH_OIDC_DEFAULT_ROLE`.
- Section-staff auth can be role-derived via `AUTH_SECTION_STAFF_ROLE_BYPASS` (defaults true in OIDC mode, false in bootstrap mode).
- Risk indicator thresholds are env-configurable via `CLASSROOM_RISK_MIN_ATTEMPTS`, `CLASSROOM_RISK_MAX_COMPLETION_RATE`, `CLASSROOM_RISK_OVERDUE_INCOMPLETE_ENABLED`, `CLASSROOM_STALLED_MAX_COMPLETION_RATE`.
- Dashboard applies per-section effective risk policies when overrides are saved via section risk-policy API.
- Risk policy changes are audit-recorded with actor user ID and timestamp for section governance visibility.
- Classroom dashboard includes a dedicated cross-section risk-policy audit table with actor/action filters.
- Classroom dashboard section activity list uses server-backed paging with search/sort and load-more controls.
- Assignment due-date governance supports `CLASSROOM_ASSIGNMENT_MAX_DUE_DAYS_AHEAD` (default 180) and `CLASSROOM_ASSIGNMENT_PACING_EARLY_TOLERANCE_DAYS` (default 14).
- Risk policy audit retention controls are env-driven: `CLASSROOM_RISK_AUDIT_RETENTION_DAYS`, `CLASSROOM_RISK_AUDIT_MAX_ROWS_PER_SECTION`.
- Risk audit archival defaults are env-configurable with `CLASSROOM_RISK_ARCHIVE_DEFAULT_CADENCE` and `CLASSROOM_RISK_ARCHIVE_DEFAULT_RETENTION_DAYS`.
- Archive automation controls include `CLASSROOM_RISK_ARCHIVE_BASE_DIR`, `CLASSROOM_RISK_ARCHIVE_BATCH_LIMIT`, `CLASSROOM_RISK_ARCHIVE_ACTOR_USER_ID`, `CLASSROOM_RISK_ARCHIVE_WEBHOOK_ALLOW_HOSTS`, and `CLASSROOM_RISK_ARCHIVE_WEBHOOK_TIMEOUT_MS`.
- Webhook delivery retries are configurable via `CLASSROOM_RISK_ARCHIVE_DELIVERY_RETRY_COUNT` and `CLASSROOM_RISK_ARCHIVE_DELIVERY_RETRY_BACKOFF_MS`.
- PUT destination controls are env-configurable via `CLASSROOM_RISK_ARCHIVE_UPLOAD_ALLOW_HOSTS` and `CLASSROOM_RISK_ARCHIVE_UPLOAD_TIMEOUT_MS`.
- In production, sandbox mode defaults to Docker when `GRADER_SANDBOX_MODE` is unset.
- CI workflow (`.github/workflows/ci.yml`) enforces `check:sandbox`, `check:sandbox-policy`, `check:sandbox-runtime`, `check:sandbox-startup`, `check:sandbox-faults`, lint, and build.
- CI workflow (`.github/workflows/ci.yml`) also enforces `check:content-packs` before lint/build.
- `check:sandbox-faults` covers timeout, memory pressure, process-limit pressure, and outbound-network isolation scenarios for Docker grader execution.
- Sandbox runtime/startup/fault scripts avoid redundant pulls by inspecting local Docker images before pulling missing images.

### Working style (from project Copilot.md)
- Read relevant files before editing.
- Prefer existing patterns over introducing new architecture.
- Keep edits focused; avoid unrelated changes.
- Output per turn: what changed → files touched → lint/build result → next options.
