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

13. Classroom session authentication (phase 1)
- Added session persistence table and DB helpers for create/read/delete auth sessions.
- Added `POST|GET|DELETE /api/auth/session` with HttpOnly session cookie (`codecamp_session`).
- Switched classroom authorization helpers from header-based identity to session-backed identity.

15. Instructor export API (phase 1)
- Added `GET /api/classroom/sections/export?sectionId=...&format=json|csv`.
- Endpoint returns per-student assignment completion summaries and supports CSV downloads for gradebook workflows.

14. Backend-to-frontend progress sync (phase 1)
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

44. Automated risk-audit archive execution (phase 2 progress)
- Added archive automation service (`lib/classroom/riskAuditArchiveAutomation.ts`) with due-policy scheduling based on section archive cadence and last archive timestamp.
- Added `POST /api/classroom/risk-archive/run` for staff-triggered execution (single section or all due sections) and `npm run archive:risk-audit` for scheduler/cron integration.
- Archive deliveries are now persisted as JSON artifacts under `.data/risk-audit-archives/...`, and run records capture delivery references for governance traceability.

45. Archive webhook destination delivery (phase 2 progress)
- Archive automation now supports webhook destinations via `destinationLabel=webhook:<url>` with configurable host allowlist and request timeout controls.
- Archive runs continue writing local artifacts and now attempt webhook delivery with section/export metadata, recording webhook delivery refs or failures in run history.

46. Archive delivery retry/backoff controls (phase 2 progress)
- Webhook archive delivery now retries failed attempts with configurable retry count/backoff policy.
- Retry controls are configurable via `CLASSROOM_RISK_ARCHIVE_DELIVERY_RETRY_COUNT` and `CLASSROOM_RISK_ARCHIVE_DELIVERY_RETRY_BACKOFF_MS`.

47. Term-based section activity filtering (phase 2 progress)
- Classroom dashboard section activity controls now include term selection and server-backed `termId` filtering.
- `/api/classroom/sections` term filtering is now wired into dashboard search/sort/pagination requests for larger multi-term datasets.

48. Archive PUT destination delivery (phase 2 progress)
- Archive automation now supports `destinationLabel=puturl:<url>` to upload archive artifact JSON via HTTP PUT (for pre-signed/object-storage style destinations).
- PUT destination host allowlisting and timeout controls are configurable for safer outbound delivery.

49. Instructor-only term/section creation guardrails (phase 2 progress)
- `POST /api/classroom/terms` and `POST /api/classroom/sections` now require the actor profile role to be `instructor`.
- TA staff retain read/operational access but can no longer create new academic terms or sections.

50. Section overview aggregation API (phase 2 progress)
- Added `GET /api/classroom/sections/overview?sectionId=...` to aggregate section dashboard data in one response (metrics, assignments, breakdowns, risk config/history, archive health).
- Classroom dashboard section loading now uses the overview endpoint, reducing multi-endpoint fanout during paged section refreshes.

51. Content exercise pack validation gate (phase 2 progress)
- Added `npm run check:content-packs` to validate `content/exercises/*/*/*` packs against `lib/courses.ts` metadata and required checker/solution files by language.
- CI now enforces content-pack validation before lint/build to catch malformed or orphaned exercise packs earlier.

52. Instructor-only archive execution writes (phase 2 progress)
- `POST /api/classroom/risk-archive/run` now requires instructor role, preventing TA/global-staff archive execution writes.
- `POST /api/classroom/sections/risk-policy/archive/report` now also requires instructor role for manual archive run recording.

53. Sandbox image pull optimization (phase 2 progress)
- Sandbox runtime/startup/fault scripts now inspect local Docker images first and only pull when missing.
- This reduces redundant image pulls during CI sandbox validation sequences and lowers startup variability from repeated network fetches.

54. Archive run export endpoint (phase 2 progress)
- Added `GET /api/classroom/sections/risk-policy/archive/report/export` to export archive run history as CSV/JSON with optional status filter.
- Dashboard archive policy panel now includes an archive-run CSV export shortcut for section governance workflows.

55. Archive governance config visibility (phase 2 progress)
- Added `GET /api/classroom/risk-archive/config` to expose archive-delivery governance settings (host allowlists, timeouts, retry/backoff, batch limit).
- Classroom dashboard now surfaces archive governance configuration for instructor-facing operational visibility.

56. Section page-size performance control (phase 2 progress)
- Classroom dashboard section activity now supports configurable server-backed page sizes (10/25/50 per page).
- Section page-size selection is wired into section list pagination requests to improve large-cohort browsing ergonomics.

57. Archive destination preflight validation (phase 2 progress)
- Added `POST /api/classroom/sections/risk-policy/archive/validate?sectionId=...` so section staff can preflight destination labels before saving archive policy changes.
- Validation now checks webhook/PUT destination protocol + host allowlist compatibility using the same governance rules as archive automation delivery.
- Classroom dashboard archive policy controls now include a "Validate destination" action with inline pass/fail guidance.

58. Archive destination reference indirection (phase 2 progress)
- Archive automation now supports `webhookref:<name>` and `puturlref:<name>` destination labels that resolve to env-managed URLs (`CLASSROOM_RISK_ARCHIVE_DESTINATION_<NAME>`).
- Added governance visibility for configured destination reference names via `CLASSROOM_RISK_ARCHIVE_DESTINATION_REF_NAMES` in archive config responses/dashboard cards.
- This enables destination URL rotation/revocation without rewriting section archive policies.

59. Deferred section detail rendering controls (phase 2 progress)
- Classroom dashboard section cards now default to collapsed details, with per-section expand/collapse actions.
- Added global "Expand all" / "Collapse all" controls in section activity filters for faster bulk navigation.
- This defers heavy learner/policy/assignment table rendering until needed, improving large-section-list responsiveness.

60. Archive destination ref revocation controls (phase 2 progress)
- Archive destination ref resolution now enforces configured refs (`CLASSROOM_RISK_ARCHIVE_DESTINATION_REF_NAMES`) and blocks revoked refs (`CLASSROOM_RISK_ARCHIVE_DESTINATION_REVOKED_REF_NAMES`).
- Validation and automation share the same ref-governance enforcement, so revoked/unlisted refs fail preflight and run-time delivery resolution consistently.
- Archive governance config/dashboard visibility now includes revoked ref names for operational rotation/revocation workflows.

61. Section list virtualization controls (phase 2 progress)
- Classroom dashboard section activity now supports a virtualized list mode with scroll-window rendering and overscan for large section sets.
- Virtualized mode keeps only a subset of section cards mounted in the DOM at once and shows live in-DOM/total counts for visibility.
- Instructors can toggle virtualized rendering on/off from section controls to balance performance vs full-list rendering behavior.

62. Instructor-only assignment creation writes (phase 2 progress)
- `POST /api/classroom/assignments` now requires the actor profile role to be `instructor`.
- Section staff TAs retain assignment visibility (`GET`) but can no longer publish assignment writes.

63. Content-pack metadata parity validation (phase 2 progress)
- `check:content-packs` now validates each pack `exercise.json` contract (`id`, `language`, `title`, `instructions`, `starterCode`, `xp`, `checker`) in addition to checker/solution file presence.
- Manifest fields are now cross-checked against `lib/courses.ts` so migrated filesystem packs stay in sync with course definitions.

64. Exercise-pack scaffolding workflow (phase 2 progress)
- Added `npm run scaffold:content-pack -- --key <courseSlug/chapterId/exerciseId>` to scaffold `exercise.json`, checker, and solution files from `lib/courses.ts` metadata.
- Supports `--force` for intentional regeneration, helping multi-course filesystem migration while keeping metadata parity with source course definitions.

65. Enrollment status write guardrails (phase 2 progress)
- Added `PATCH /api/classroom/enrollments` to update section enrollment status (`active`/`dropped`) with section-staff auth checks.
- Staff-status updates for non-student enrollments are instructor-only; TAs can only manage student enrollment status changes.

66. Archive destination reference health visibility (phase 2 progress)
- `GET /api/classroom/risk-archive/config` now includes per-reference health metadata (ref name, env key, revoked flag, URL-present flag).
- Classroom dashboard governance panel now renders destination reference health rows to support rotation/revocation and missing-secret detection.

67. Archive destination ref configuration check gate (phase 2 progress)
- Added `npm run check:archive-refs` to validate destination reference env consistency (configured refs, revoked-ref list coherence, URL protocol, and host allowlist compatibility).
- CI now runs archive-ref checks alongside existing content/sandbox gates before lint/build.

68. Sandbox read-only filesystem regression check (phase 2 progress)
- Expanded `check:sandbox-faults` to assert Docker read-only root filesystem enforcement by verifying checker attempts to write under `/` fail.
- Fault suite now validates timeout, memory pressure, PID pressure, network isolation, and read-only root filesystem behavior.

69. Full-catalog backend progress hydration (phase 2 progress)
- `GET /api/progress?userId=...` now returns catalog-wide progress rows (course filter optional), while exercise-level queries continue to support `courseSlug/chapterId/exerciseId`.
- `ProgressContext` now hydrates from backend catalog progress at startup and merges it with local storage completion state for cross-device continuity on broader exercise sets.

70. Enrollment invariants hardening (phase 2 progress)
- Enrollment routes now validate section existence for `GET|POST|PATCH /api/classroom/enrollments` to prevent orphan enrollment operations.
- Enrollment writes now prevent removing/demoting the final active instructor in a section, preserving minimum instructional governance.

71. Sandbox image reference validation gate (phase 2 progress)
- Added `npm run check:sandbox-images` to enforce explicit docker image references (tag or digest) and disallow `latest` tags for grader runtimes.
- CI now enforces sandbox image reference checks before sandbox runtime/fault checks.

72. Backend progress write sync for client-validated exercises (phase 2 progress)
- Added `POST /api/progress` to persist first-pass completions for locally validated exercises with idempotent XP awarding semantics.
- `ExerciseEditor` now syncs successful local validations through backend progress writes and applies awarded XP from backend response, tightening cross-device consistency.

73. Enrollment role-mutation boundary hardening (phase 2 progress)
- `POST /api/classroom/enrollments` now treats role changes on existing enrollments as instructor-only writes, preventing TA-driven staff-role demotions via upsert behavior.
- Staff-role enrollment assignments now reject targets explicitly profiled as `student`, while still allowing profile-missing IDs for migration compatibility.

74. Sandbox capability drop and privilege escalation hardening (phase 2 progress)
- Docker grader execution now runs with `--cap-drop ALL` and `--security-opt no-new-privileges` in addition to existing network/memory/pid/read-only constraints.
- `check:sandbox-policy` now gates these flags in CI so sandbox runtime hardening remains enforced across future changes.

75. Production sandbox fallback governance + digest-strict readiness (phase 2 progress)
- Runtime sandbox selection now forces Docker in production even if `GRADER_SANDBOX_MODE=host`, unless explicit breakglass override (`GRADER_ALLOW_HOST_MODE_IN_PRODUCTION=true`) is set.
- `check:sandbox-images` now supports optional digest-only enforcement via `GRADER_REQUIRE_IMAGE_DIGESTS=true` to enable staged rollout toward fully digest-pinned grader images.

76. Archive incident runbook guidance in governance UI (phase 2 progress)
- Archive Delivery Governance now includes a concrete incident runbook for destination validation, ref health triage, and recovery/export workflow.
- This gives instructors explicit rotation/revocation failure-handling steps from the same panel used to review archive config and reference health.

77. Backend-first progress reconciliation policy (phase 2 progress)
- `ProgressContext` hydration now treats backend progress as authoritative whenever backend records exist, preventing stale local cache from silently overriding backend truth.
- Local cache remains a fallback only when backend has no rows yet, preserving first-session usability while converging to backend-first continuity.

78. Multi-course content-pack throughput expansion (phase 2 progress)
- Added scaffolded filesystem packs for `intermediate-python/pandas/groupby`, `economics-data-science/regression/ols`, and `r-for-economists/panel-data/fe-regression`.
- `check:content-packs` now validates these additional packs successfully, increasing migration coverage across both Python and R course tracks.

79. Authenticated self-profile write boundary (phase 2 progress)
- `POST /api/classroom/profile` now requires an active session and only allows actors to update their own profile record (`userId` must match session user).
- Profile writes can no longer override session identity email or role through this route, closing a profile-write privilege boundary gap.

80. Classroom metadata read authentication boundaries (phase 2 progress)
- `GET /api/classroom/terms` and `GET /api/classroom/sections` now require authenticated global staff sessions, preventing unauthenticated classroom metadata reads.
- This aligns read access with existing staff-only dashboard usage and closes a classroom identity exposure gap.

81. Instructor-triggered archive execution from dashboard (phase 2 progress)
- Section archive controls now run real archive automation via `POST /api/classroom/risk-archive/run` instead of synthetic run recording actions.
- Dashboard shows immediate per-section execution outcome (`success`/`skipped`/`failure`) and then refreshes archive run history.

82. Progress sync UX visibility hardening (phase 2 progress)
- `ProgressContext` now exposes backend hydration sync state (`syncing`/`synced`/`error`) and surfaces explicit error text when catalog sync fails.
- Header XP UI now shows sync-in-progress and sync-issue indicators so backend progress failures are no longer silent.

83. Classroom risk-config read authentication boundary (phase 2 progress)
- `GET /api/classroom/risk-config` now requires authenticated global staff session access.
- This closes remaining unauthenticated classroom policy-read exposure and aligns with other classroom governance endpoints.

84. Multi-page information architecture foundation (phase 2 progress)
- Added first-class top-level routes: `/learn`, `/practice`, and `/progress`, with homepage shifted to a hub-style landing page.
- Header navigation now links across Learn/Practice/Progress/Classroom, creating a scalable route structure for future features like leaderboard/high scores.

85. Navigation refinement for multi-page UX (phase 2 progress)
- Consolidated redundant learner navigation by redirecting `/practice` to `/learn`, while keeping `/progress` as the distinct progress surface.
- Updated global navigation to Home/Learn/Classroom/Progress and introduced Datacamp-style left sidebar navigation on `/learn` and `/classroom` for section-level jump links.
- Removed decorative emoji-heavy labels from core navigation and landing surfaces for a cleaner, more product-like visual tone.
- Sidebar navigation is now rendered as a true fixed left rail (`xl` breakpoint) on Learn/Classroom pages rather than an in-content column.
- Added mobile/tablet hamburger-triggered side-nav drawer on Learn/Classroom so navigation remains accessible when the fixed left rail is hidden.

86. Content-pack migration throughput expansion (phase 2 progress)
- Scaffolded filesystem pack for `intro-python/basics/variables` via `scaffold:content-pack`, including `exercise.json`, `checker.py`, and `solution.py`.
- Added additional scaffolded packs for `intro-python/basics/conditionals` and `intro-r/basics/data-types` to keep migration throughput moving on beginner tracks.
- Added scaffolded packs for `intro-r/basics/hello-r` and `intro-python/lists-dicts/lists` to expand beginner coverage across both language tracks.
- Added scaffolded packs for `intro-r/vectors/create-vector` and `intro-python/lists-dicts/dicts` for broader beginner sequence coverage.
- Added scaffolded packs for `intro-r/vectors/vector-ops` and `intro-python/functions/define-function` to extend beginner progression into vectors and functions.
- Added scaffolded pack for `intro-python/functions/list-comprehension`, completing filesystem pack coverage for all intro-python exercises currently defined in `lib/courses.ts`.
- Replaced placeholder scaffold checkers with exercise-specific Python checks for intro-python packs (`variables`, `conditionals`, `lists`, `dicts`, `define-function`, `list-comprehension`) using structured checker output (`STATUS/FEEDBACK/TEST`).
- Added scaffolded packs for `intro-r/data-frames/create-df` and `intro-r/data-frames/df-subset`, completing filesystem pack coverage for all intro-r exercises currently defined in `lib/courses.ts`.
- Replaced placeholder scaffold checkers with exercise-specific R checks for intro-r packs (`hello-r`, `data-types`, `create-vector`, `vector-ops`, `create-df`, `df-subset`) using structured checker output (`STATUS/FEEDBACK/TEST`).
- Added scaffolded packs for `intermediate-python/numpy/arrays`, `intermediate-python/numpy/array-ops`, `intermediate-python/pandas/dataframes`, and `intermediate-python/matplotlib/line-plot`.
- Replaced placeholder scaffold checkers with exercise-specific Python checks for intermediate-python packs (`arrays`, `array-ops`, `dataframes`, `groupby`, `line-plot`) using structured checker output (`STATUS/FEEDBACK/TEST`).
- Added scaffolded packs for economics and economist tracks: `economics-data-science/regression/interpretation`, `economics-data-science/causal-inference/diff-in-diff`, `economics-data-science/time-series/rolling-stats`, `economics-data-science/time-series/arima`, `r-for-economists/iv-regression/2sls`, and `r-for-economists/reproducible-research/regression-table`.
- Replaced placeholder scaffold checkers with exercise-specific checks across economics and economist packs (`ols`, `interpretation`, `diff-in-diff`, `rolling-stats`, `arima`, `fe-regression`, `2sls`, `regression-table`) using structured checker output (`STATUS/FEEDBACK/TEST`).
- Added scaffolded packs for remaining intermediate-r exercises (`dplyr/filter-mutate`, `dplyr/group-summarise`, `ggplot2/scatter-plot`, `ggplot2/bar-chart`, `tidyr-purrr/pivot-wider`, `tidyr-purrr/map-functions`) to close catalog migration gaps.
- Replaced placeholder scaffold checkers with exercise-specific R checks for intermediate-r packs (`filter-mutate`, `group-summarise`, `scatter-plot`, `bar-chart`, `pivot-wider`, `map-functions`) using structured checker output (`STATUS/FEEDBACK/TEST`).
- Keeps migration momentum on the current "Content migration throughput" Now item while preserving metadata parity and pack validation workflows.

87. Archive escalation and lifecycle hooks (phase 2 progress)
- Archive automation now computes per-section failure streaks and escalation levels (`none`/`warning`/`critical`) at execution time, with recommended remediation actions attached to run results.
- Governance config now exposes escalation thresholds and notification target settings (`CLASSROOM_RISK_ARCHIVE_ESCALATION_*`) for staff visibility.
- Classroom run-now feedback now surfaces escalation metadata (failure streak, notify target, and next actions) so incidents are actionable without leaving the dashboard.
- Governance panel now supports a global "Run due archives now" action with cross-section outcome summary (success/failure/skipped counts plus critical escalation indicator).

88. Enrollment identity edge-case hardening (phase 2 progress)
- Added `requireSectionInstructor` auth helper to centralize instructor-level write checks for section-scoped APIs.
- Enrollment write routes now enforce instructor-only staff mutations using section-scoped instructor role when section bypass is disabled, and global instructor role when bypass is enabled.
- Closes a remaining boundary gap where global role checks could diverge from section enrollment role expectations.

89. Learner progress surface expansion (phase 2 progress)
- Expanded `/progress` with learner-facing activity metrics: current streak, best streak, and completions in the last 7 days.
- Added top-course-by-XP summary and last completion timestamp to improve at-a-glance motivation and orientation.
- Progress page now surfaces backend timeline fetch failures with explicit messaging while preserving cached totals display.

90. Classroom onboarding empty-state guidance (phase 2 progress)
- Added a first-time "Getting started checklist" on `/classroom` when no sections exist, clarifying the sequence from sign-in to first learner submission.
- Added quick-create forms in the onboarding panel for instructors to create an academic term and first section directly from the dashboard.
- Checklist completion state now reflects live dashboard data (term/section/assignment/attempt milestones).

91. Classroom archive UX simplification (phase 2 progress)
- Renamed the archive area to plain-language "Backups and archive settings" and updated action copy to "Run backups now."
- Added an explicit note that most instructors can ignore archive governance unless handling backup incidents.
- Hid technical governance details (allowlists, retries/timeouts, destination health, runbook internals) behind an opt-in advanced toggle.

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

1. Progress/XP idempotency for local-validation path
- Submit a correct non-server exercise and confirm `POST /api/progress` records completion and awards XP once.
- Re-submit the same exercise; expect no additional XP award.

2. Server-graded pass/fail behavior
- Intro to R -> Basic Arithmetic: submit a pass then fail case and verify status/feedback.
- Intro to Python -> Python Basics -> Hello, Python!: submit pass then fail case and verify status/feedback.

3. Worker and attempts visibility
- Worker logs should show queued/running/completed jobs.
- Submission history in `ExerciseEditor` should reflect recent attempts.

4. Classroom enrollment guardrails
- Verify TA cannot mutate an existing enrollment role.
- Verify staff-role assignment to an explicitly student-profile user is rejected.
- Verify `/api/classroom/profile` rejects unauthenticated writes and rejects cross-user profile updates.
- Verify unauthenticated requests to `/api/classroom/terms` and `/api/classroom/sections` are rejected.
- Verify unauthenticated requests to `/api/classroom/risk-config` are rejected.

5. Governance/sandbox gates
- Run `npm run check:sandbox-images`, `npm run check:sandbox-policy`, `npm run check:sandbox-faults` (docker mode).
- Run `npm run check:archive-refs` and `npm run check:content-packs`.

## Strategic Tracks (Priority Order)

1. Harden execution sandbox (phase 2 completion)
- Finalize image strategy for CI/production (digest-pinned defaults + pull/warm-cache guidance).
- Decide and document production stance for host fallback behavior.

2. Classroom identity and enrollment model (phase 2 completion)
- Continue hardening instructor/TA/student authorization edge cases on classroom routes (especially write-level privilege boundaries).
- Add explicit lifecycle guidance for migrating legacy/local IDs to institution-backed identities.

3. Instructor workflow (teaching operations, phase 2)
- Add destination credential lifecycle management (rotation/revocation playbooks) for archive delivery integrations.
- Add runbook-oriented archive incident workflows (delivery failures, revoked refs, and recovery steps).

4. Multi-course content pipeline expansion
- Migrate more exercises from inline definitions to `content/exercises/...`.
- Add templates/checker scaffolds for statistics, microeconomics, macroeconomics, and data science tracks.
- Expand content validation coverage (beyond file presence) as additional exercise-pack authoring flows are introduced.

5. Learner progress sync and cross-device continuity (phase 2)
- Reduce frontend-local progress cache authority so backend becomes the source of truth.
- Add explicit reconciliation rules for XP/progress conflicts between local cache and backend records.
- Ensure progress and XP remain consistent across sessions/devices.

## Execution Steering Model (Now / Next / Later)

Use this queue for day-to-day execution; keep it small and rotate items after each completed slice.

- WIP limit: max 2 items in **Now** at once.
- Every **Now** item must include explicit acceptance checks.
- On completion: ship code + update roadmap + move the next highest-priority **Next** item into **Now**.

### Now
1. Progress and leaderboard surfaces
- Outcome: extend `/progress` with learner-visible streaks/milestones/high-score summaries.
- Acceptance: progress route shows new learner-facing metrics using existing progress data; lint/build pass.

2. Broader server-side grading coverage
- Outcome: enable backend grading on additional migrated filesystem exercises with checker parity.
- Acceptance: selected new exercises submit through `/api/submissions` and complete grading end-to-end; lint/build pass.

### Next
1. Sandbox digest-only rollout
- Move production/CI image references to digest-pinned form with strict enforcement enabled.

2. Broader server-side grading coverage
- Enable server-graded checkers for more migrated filesystem exercises across both R and Python tracks.

3. Progress and leaderboard surfaces
- Build on the new `/progress` route with high scores, streaks, and milestone/achievement views.

### Later
1. Broader server-side grading coverage across additional exercises/courses.
2. Production orchestration hardening for worker/API deployment topology.

## Known Constraints / Technical Debt

1. Server-side grading currently covers two exercises (`intro-r/basics/arithmetic`, `intro-python/basics/hello-python`).
2. `ProgressContext` still persists local cache in storage, but backend hydration is now authoritative whenever backend records exist.
3. Queue enqueue path uses a typed cast around BullMQ `add` due TS friction in current setup.
4. Worker and API run in-process/local; no production orchestration yet.
5. Docker daemon must be available for `redis:up`.
6. Docker sandbox defaults are production-safe, but host runtime fallback policy still needs explicit production governance guidance.
7. OIDC integration exists, but deployment still requires configuring provider env vars and role-claim mappings per institution.
8. Session lifecycle is API-managed; dedicated account/settings UX beyond sign-in/out is still minimal.

## Suggested Next Session Start

1. Pull latest branch.
2. Open this file and confirm priority milestone.
3. Start Redis/dev/worker.
4. Implement milestone 1 (sandbox phase-2 completion or classroom identity/auth phase-2).
