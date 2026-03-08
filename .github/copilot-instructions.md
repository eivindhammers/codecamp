# Copilot Instructions

## Commands

```bash
npm run dev         # Dev server (Turbopack, http://localhost:3000)
npm run build       # Production build
npm run lint        # ESLint
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

Connecting these two (syncing backend progress → frontend `ProgressContext`) is an open task.

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

### Working style (from project Copilot.md)
- Read relevant files before editing.
- Prefer existing patterns over introducing new architecture.
- Keep edits focused; avoid unrelated changes.
- Output per turn: what changed → files touched → lint/build result → next options.
