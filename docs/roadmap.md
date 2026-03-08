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
- Protected section-scoped enrollment, assignment, and metrics endpoints with section staff checks.

14. Classroom session authentication (phase 1)
- Added session persistence table and DB helpers for create/read/delete auth sessions.
- Added `POST|GET|DELETE /api/auth/session` with HttpOnly session cookie (`codecamp_session`).
- Switched classroom authorization helpers from header-based identity to session-backed identity.

15. Instructor export API (phase 1)
- Added `GET /api/classroom/sections/export?sectionId=...&format=json|csv`.
- Endpoint returns per-student assignment completion summaries and supports CSV downloads for gradebook workflows.

13. Backend-to-frontend progress sync (phase 1)
- Exercise editor now hydrates local `ProgressContext` from backend `/api/progress` for server-graded exercises.
- Existing local completion state is preserved while backend truth fills missing completion state for returning learners on the same device.

16. Instructor dashboard UI (phase 1)
- Added `/classroom` dashboard with session sign-in/out, section activity views, and CSV export links.
- Added header navigation entry to classroom dashboard.
- Added bootstrap instructor role mapping via `AUTH_BOOTSTRAP_INSTRUCTOR_EMAILS` for local staging.

17. Sandbox production defaults (phase 2 progress)
- Checker sandbox now defaults to Docker when `NODE_ENV=production` (host mode remains default in development).
- Added `npm run check:sandbox` to enforce production sandbox config (Docker mode + explicit grader images).

18. Instructor assignment workflow UI (phase 1)
- Extended `/classroom` with per-section assignment creation forms (title, chapter, exercise, optional due date).
- Added assignment due-state indicators in dashboard (`Open`, `Upcoming`, `Late`).
- Dashboard now loads section assignments alongside learner metrics for instructor operations.

19. Instructor pass-rate and stuck-learner indicators (phase 1)
- Classroom dashboard now loads section grade summary data from export API (`format=json`).
- Added aggregate dashboard cards for average completion rate and stuck learner count.
- Added per-section pass-rate and stuck-learner indicators in section headers.

20. Assignment authoring exercise picker (phase 1)
- Classroom assignment form now derives chapter/exercise options from `lib/courses.ts` based on section course.
- Assignment creation no longer depends on free-text chapter/exercise IDs in instructor UI.

21. Learner-level assignment risk indicators (phase 1)
- Section activity tables now show per-learner completion rate and risk status.
- Risk status currently combines overdue assignment pressure and repeated low-completion attempt behavior.

22. CI sandbox policy enforcement (phase 2)
- Added GitHub Actions CI workflow (`.github/workflows/ci.yml`) to run sandbox checks, lint, and build.
- Added `npm run check:sandbox-policy` to verify required Docker sandbox flags remain present in checker runner implementation.

23. Instructor dashboard filtering and pagination (phase 2 progress)
- Added course-level section filtering in `/classroom` activity panels.
- Added per-section learner filtering (search + risk state) and paginated learner tables for larger cohorts.
- Added overdue-assignment visibility directly in learner activity rows.

24. Assignment authoring guardrails (phase 2 progress)
- `POST /api/classroom/assignments` now validates section/course consistency and requires valid course/chapter/exercise targets.
- Due dates are now validated against section term windows to prevent out-of-term assignment deadlines.

25. Per-assignment learner breakdowns (phase 2 progress)
- Added `GET /api/classroom/sections/assignment-breakdown?sectionId=...` for assignment-level completion rollups.
- `/classroom` assignment tables now show completed learners, completion rate, last completion time, and stalled overdue indicators.

26. CI runtime sandbox execution checks (phase 2 progress)
- Added `npm run check:sandbox-runtime` to execute both R and Python graders in Docker sandbox mode as a CI smoke check.
- CI now runs config, policy, and runtime sandbox checks before lint/build.

27. Production auth integration foundation (phase 2 progress)
- Added OIDC auth endpoints: `GET /api/auth/config`, `GET /api/auth/login`, `GET /api/auth/callback`.
- `AUTH_MODE=oidc` now enables authorization-code login flow with userinfo-based identity mapping into existing session auth (`codecamp_session` cookie).
- Classroom dashboard now detects auth mode and shows SSO login flow for OIDC deployments (while retaining bootstrap email sign-in for local/dev mode).

28. CI sandbox fault-injection checks (phase 2 progress)
- Added `npm run check:sandbox-faults` to assert Docker sandbox timeout handling for both Python and R checker runtimes.
- CI now validates sandbox config, policy, runtime execution, and timeout fault behavior before lint/build.

29. OIDC role-claim mapping sync (phase 2 progress)
- OIDC callback now maps identity claims to classroom roles (`instructor`/`ta`/`student`) and syncs profile roles on each sign-in.
- Added flexible env-driven claim mapping for role/group/email-based role assignment.

30. Configurable classroom risk thresholds (phase 2 progress)
- Added `GET /api/classroom/risk-config` with env-driven defaults for learner/assignment risk thresholds.
- Dashboard now applies configurable thresholds for stuck-learner, at-risk learner, and stalled assignment indicators.

31. Section-level risk policy overrides (phase 2 progress)
- Added `GET|PUT|DELETE /api/classroom/sections/risk-policy?sectionId=...` for section staff to manage risk policy overrides.
- Dashboard now includes per-section risk policy controls and applies effective section policy values to learner/assignment indicators.

32. Risk policy audit trail (phase 2 progress)
- Risk policy API now returns change history with actor + timestamp and records updates/resets in persistent audit storage.
- Dashboard section cards now show recent policy changes for quick instructor governance visibility.

33. Sandbox pressure fault checks (phase 2 progress)
- Expanded `check:sandbox-faults` to include memory-pressure and PID-pressure failure coverage in Docker sandbox mode.
- CI fault checks now verify timeout, memory pressure, and process-limit pressure behavior for graders.

34. Risk policy audit filtering and search view (phase 2 progress)
- Added audit API filtering options (`limit`, `action`, `actor`) for section risk policy history.
- Added dedicated classroom risk-audit table with actor/action filtering and cross-section visibility.

35. Sandbox network isolation regression check (phase 2 progress)
- Expanded `check:sandbox-faults` with outbound socket connectivity checks to assert Docker `--network none` isolation.
- Fault suite now validates timeout, memory pressure, PID pressure, and network isolation behavior.

36. Risk policy export and retention controls (phase 2 progress)
- Added `GET /api/classroom/sections/risk-policy/export` with CSV/JSON export and filter support (`sectionId`, `limit`, `action`, `actor`).
- Added configurable audit retention controls in persistence layer via `CLASSROOM_RISK_AUDIT_RETENTION_DAYS` and `CLASSROOM_RISK_AUDIT_MAX_ROWS_PER_SECTION`.
- Dashboard section policy panels now include audit export links aligned with active audit filters.

37. Server-backed section pagination/sorting (phase 2 progress)
- `GET /api/classroom/sections` now supports `search`, `courseSlug`, `sort`, `limit`, and `offset`, and returns paging metadata.
- Classroom dashboard section activity now uses paged API loading with server-backed search/sort and load-more controls.

38. Assignment pacing-window and publish-horizon validation (phase 2 progress)
- `POST /api/classroom/assignments` now enforces `CLASSROOM_ASSIGNMENT_MAX_DUE_DAYS_AHEAD` (default 180) to prevent long-range publish drift.
- Assignment due dates now also enforce chapter pacing windows derived from section term duration, with an early tolerance via `CLASSROOM_ASSIGNMENT_PACING_EARLY_TOLERANCE_DAYS` (default 14).

39. IdP-aligned section staff authorization (phase 2 progress)
- Section-scoped classroom APIs now support role-based staff access in OIDC mode without requiring explicit per-section staff enrollment.
- `AUTH_SECTION_STAFF_ROLE_BYPASS` controls this behavior (defaults to enabled for `AUTH_MODE=oidc`, disabled for bootstrap mode).

40. Risk audit archival policy options (phase 2 progress)
- Added `GET|PUT /api/classroom/sections/risk-policy/archive?sectionId=...` for section staff to configure archive cadence, retention window, and destination label.
- Classroom dashboard section policy panels now expose archive-policy controls and show computed next-archive schedule visibility.

41. Archive execution governance reporting (phase 2 progress)
- Added `GET|POST /api/classroom/sections/risk-policy/archive/report?sectionId=...` for section-level archive run reporting (success/failure outcomes, recent runs, and 30-day failure metrics).
- Dashboard archive policy panels now show archive run health summaries (success/failure counts, failure rate, last success/failure) and recent run history.

42. CI sandbox startup performance gate (phase 2 progress)
- Added `npm run check:sandbox-startup` to measure docker grader startup runtime for R/Python checkers with configurable thresholds (`GRADER_STARTUP_MAX_MS_R`, `GRADER_STARTUP_MAX_MS_PYTHON`).
- CI now enforces startup performance checks alongside sandbox config/policy/runtime/fault validations before lint/build.

43. Enrollment role-assignment guardrails (phase 2 progress)
- `POST /api/classroom/enrollments` now restricts staff-role assignments (`instructor`/`ta`) to instructor actors.
- TA actors can continue enrolling students but can no longer elevate section staff roles.

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
- Validate and tune image strategy (`GRADER_DOCKER_R_IMAGE`, `GRADER_DOCKER_PYTHON_IMAGE`) to reduce startup variability and pull overhead.
- Add optional network/isolation regression checks to complement current timeout/memory/process pressure coverage.

2. Classroom identity and enrollment model (phase 2 completion)
- Continue hardening instructor/TA/student authorization edge cases on classroom routes.
- Keep migration path from local IDs where possible.

3. Instructor workflow (teaching operations, phase 2)
- Add section list virtualization/performance tuning and richer term-based filtering for very large datasets.
- Automate archive execution scheduling and delivery (currently governance reporting is available, execution still manual).

4. Multi-course content pipeline expansion
- Migrate more exercises from inline definitions to `content/exercises/...`.
- Add templates/checker scaffolds for statistics, microeconomics, macroeconomics, and data science tracks.
- Add author validation scripts and CI checks for new exercise packs.

5. Learner progress sync and cross-device continuity (phase 2)
- Expand backend sync beyond server-graded exercises to full course catalogs.
- Replace frontend-local progress as source-of-truth with backend-synced state.
- Ensure progress and XP remain consistent across sessions/devices.

## Known Constraints / Technical Debt

1. Server-side grading currently covers two exercises (`intro-r/basics/arithmetic`, `intro-python/basics/hello-python`).
2. Frontend progress context still exists locally and should eventually sync with backend truth.
3. Queue enqueue path uses a typed cast around BullMQ `add` due TS friction in current setup.
4. Worker and API run in-process/local; no production orchestration yet.
5. Docker daemon must be available for `redis:up`.
6. Docker sandbox defaults are production-safe, but host runtime fallback still exists for development and explicit host mode.
7. OIDC integration exists, but deployment still requires configuring provider env vars and role-claim mappings per institution.
8. Session lifecycle is API-managed; dedicated account/settings UX beyond sign-in/out is still minimal.

## Suggested Next Session Start

1. Pull latest branch.
2. Open this file and confirm priority milestone.
3. Start Redis/dev/worker.
4. Implement milestone 1 (sandbox phase-2 completion or classroom identity/auth phase-2).
