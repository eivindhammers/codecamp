# CodeCamp Development Roadmap

## Current Status

CodeCamp now has an async, server-side grading path for two exercises:

- `intro-r/basics/arithmetic`
- `intro-python/basics/hello-python`

The grading pipeline is:

1. Frontend submits code to `POST /api/submissions`.
2. API stores submission metadata in SQLite and enqueues a BullMQ job.
3. Worker claims queued jobs, runs language-specific checker, and finalizes results.
4. Frontend polls `GET /api/submissions/:id` until completed.

Primary target users are economics students, with platform usage planned across multiple courses:
- Statistics
- Microeconomics
- Macroeconomics
- Data Science

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

6. Attempts and progress read APIs + exercise history UI
- Added `GET /api/attempts` with user/course and optional exercise filters.
- Added `GET /api/progress` for single exercise or course progress reads.
- Added submission history panel in `ExerciseEditor` for server-graded exercises.

7. Python server-side grading parity (first exercise)
- Added Python checker runner (`lib/grading/runPythonChecker.ts`).
- Migrated `intro-python/basics/hello-python` to server-side grading with filesystem checker content.
- Worker now routes both `r` and `python` submissions through language-specific checkers.

8. Sandbox hardening (phase 1)
- Added shared checker process runner with bounded output, isolated working directory, and restricted env.
- Enforced checker execution timeout (`GRADER_TIMEOUT_MS`, clamped 1000-30000ms, default 8000ms).
- Unified R/Python checker output parsing to reduce divergence in grading behavior.

9. Sandbox hardening (phase 2, partial)
- Added optional Docker sandbox mode for checker execution (`GRADER_SANDBOX_MODE=docker`).
- Docker mode runs checkers with `--network none`, memory/CPU/PID limits, read-only root FS, and tmpfs `/tmp`.
- Checker files are copied into ephemeral work directories before execution for tighter isolation from repo paths.

10. Classroom model foundation APIs
- Added classroom data model tables for `academic_terms`, `class_sections`, `user_profiles`, `section_enrollments`, and `assignments`.
- Added API routes:
  - `POST /api/classroom/profile`
  - `GET|POST /api/classroom/terms`
  - `GET|POST /api/classroom/sections`
  - `GET|POST /api/classroom/enrollments`
  - `GET|POST /api/classroom/assignments`
- Added typed contracts and DB helpers to support multi-course term/section enrollment and assignment publishing workflows.

11. Instructor monitoring API (phase 1)
- Added section learner metrics endpoint: `GET /api/classroom/sections/metrics?sectionId=...`.
- Metrics currently include attempts count, completed exercise count, last attempt time, and last completion time per active student enrollment.

12. Classroom authorization baseline (pre-auth)
- Added classroom authorization helper checks for staff actions.
- Protected term creation and section management endpoints with actor role checks.
- Protected section-scoped enrollment, assignment, and metrics endpoints with section staff checks via `x-actor-user-id`.

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

5. Python server-side grading pass/fail
- Intro to Python -> Python Basics -> Hello, Python!
- Submit `print("Hello, Python!")` and then an incorrect output to verify pass/fail feedback.

## Next Milestones (Priority Order)

1. Harden execution sandbox (phase 2 completion)
- Add deployment/runtime configuration so Docker sandbox mode is enabled by default in production.
- Validate and tune image strategy (`GRADER_DOCKER_R_IMAGE`, `GRADER_DOCKER_PYTHON_IMAGE`) and startup performance.
- Add integration checks that enforce no-network and resource-limit policies in CI.

2. Classroom identity and enrollment model (phase 2 completion)
- Add real login/session and replace header-based actor identity with authenticated sessions.
- Keep and harden instructor/TA/student authorization rules on classroom routes.
- Keep migration path from local IDs where possible.

3. Instructor workflow (teaching operations, phase 2)
- Add UI views for instructor monitoring: completion, attempts, pass rate, and stuck learners.
- Add exportable progress/grade summaries for classroom use.
- Add assignment due-date status and late submission indicators.

4. Multi-course content pipeline expansion
- Migrate more exercises from inline definitions to `content/exercises/...`.
- Add templates/checker scaffolds for statistics, microeconomics, macroeconomics, and data science tracks.
- Add author validation scripts and CI checks for new exercise packs.

5. Learner progress sync and cross-device continuity
- Replace frontend-local progress as source-of-truth with backend-synced state.
- Ensure progress and XP remain consistent across sessions/devices.

## Known Constraints / Technical Debt

1. Server-side grading currently covers two exercises (`intro-r/basics/arithmetic`, `intro-python/basics/hello-python`).
2. Frontend progress context still exists locally and should eventually sync with backend truth.
3. Queue enqueue path uses a typed cast around BullMQ `add` due TS friction in current setup.
4. Worker and API run in-process/local; no production orchestration yet.
5. Docker daemon must be available for `redis:up`.
6. Docker sandbox mode is optional and not yet default; host runtime fallback still exists.
7. Classroom APIs still rely on caller-provided `x-actor-user-id` until real auth/session integration is implemented.

## Suggested Next Session Start

1. Pull latest branch.
2. Open this file and confirm priority milestone.
3. Start Redis/dev/worker.
4. Implement milestone 1 (sandbox phase-2 completion or classroom identity/auth phase-2).
