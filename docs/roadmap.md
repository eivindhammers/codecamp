# CodeCamp Development Roadmap

## Current Status

CodeCamp now has an async, server-side grading path for one exercise:

- Course: `intro-r`
- Chapter: `basics`
- Exercise: `arithmetic`

The grading pipeline is:

1. Frontend submits code to `POST /api/submissions`.
2. API stores submission metadata in SQLite and enqueues a BullMQ job.
3. Worker claims queued jobs, runs R checker, and finalizes results.
4. Frontend polls `GET /api/submissions/:id` until completed.

## Completed Milestones

1. Theme and readability fixes
- Persistent light/dark toggle.
- Better default contrast and explicit theme control.

2. Local validation improvements
- Basic fallback validator no longer accepts any submission.
- Placeholder checks and commutative form support for simple assignments.

3. Server-side grading MVP (single exercise)
- `Rscript`-based checker for Intro to R arithmetic.
- Structured grading result contract and test feedback.

4. Async queue architecture
- Redis + BullMQ queue added.
- Dedicated worker process (`npm run worker`).

5. Persistence foundation
- SQLite-backed submissions in `.data/codecamp.db`.
- Added `users`, `attempts`, and `progress` tables.
- XP awarded only on first pass per user/exercise (`awardedXp` in result).

## Runtime Setup

From repo root:

```bash
npm install
npm run redis:up
```

Terminal 1:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Terminal 2:

```bash
npm run worker
```

Stop Redis when done:

```bash
npm run redis:down
```

## Verification Checklist (Current)

1. First pass awards XP
- Intro to R -> Basic Arithmetic -> submit correct answer.

2. Repeat pass does not award XP
- Submit correct answer again, expect no additional XP.

3. Wrong answer fails
- Submit `result <- 7*7`, expect failed test feedback.

4. Worker activity visible
- Worker logs should show completed jobs.

## Next Milestones (Priority Order)

1. API for user attempts/progress history
- Add endpoints to fetch attempt list and completion state by user/course.
- Surface that data in UI (submission history panel per exercise).

2. Python server-side grading parity
- Add Python checker runner and migrate one Intro to Python exercise.
- Keep same result schema and first-pass XP rules.

3. Harden execution sandbox
- Move checker execution to isolated containers with resource limits.
- Enforce timeout/memory constraints and no-network policy.

4. Auth layer (replace local user ID)
- Add real login/session and map `userId` to authenticated user.
- Keep compatibility migration from local IDs where possible.

5. Content pipeline expansion
- Migrate more exercises from inline definitions to `content/exercises/...`.
- Add checker templates and author validation scripts.

## Known Constraints / Technical Debt

1. Only one exercise currently uses server-side grading.
2. Frontend progress context still exists locally and should eventually sync with backend truth.
3. Queue enqueue path uses a typed cast around BullMQ `add` due TS friction in current setup.
4. Worker and API run in-process/local; no production orchestration yet.
5. Docker daemon must be available for `redis:up`.

## Suggested Next Session Start

1. Pull latest branch.
2. Open this file and confirm priority milestone.
3. Start Redis/dev/worker.
4. Implement milestone 1 (attempt/progress read APIs + UI view).
