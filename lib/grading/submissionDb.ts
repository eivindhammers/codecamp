import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";
import {
  AcademicTermRecord,
  AuthSessionRecord,
  AttemptHistoryItem,
  AssignmentRecord,
  ClassSectionRecord,
  ClassroomRole,
  EnrollmentStatus,
  ExerciseProgressRecord,
  GradingResult,
  SectionEnrollmentRecord,
  SectionAssignmentBreakdownRecord,
  SectionGradeSummaryRecord,
  SectionLearnerMetric,
  SectionRiskPolicyRecord,
  SectionRiskPolicyAuditRecord,
  SubmissionStatus,
  SubmissionStatusResponse,
  UserProfileRecord,
} from "@/lib/grading/contracts";
import { Language } from "@/lib/types";

const dataDir = path.join(process.cwd(), ".data");
mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "codecamp.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    submission_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_slug TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    xp INTEGER NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL,
    result_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attempts (
    attempt_id TEXT PRIMARY KEY,
    submission_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    course_slug TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    status TEXT NOT NULL,
    result_json TEXT,
    submitted_at INTEGER NOT NULL,
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id TEXT NOT NULL,
    course_slug TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    first_pass_submission_id TEXT NOT NULL,
    xp_awarded INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, course_slug, chapter_id, exercise_id)
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS academic_terms (
    term_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS class_sections (
    section_id TEXT PRIMARY KEY,
    term_id TEXT NOT NULL,
    course_slug TEXT NOT NULL,
    title TEXT NOT NULL,
    instructor_user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS section_enrollments (
    enrollment_id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    enrolled_at INTEGER NOT NULL,
    UNIQUE(section_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    assignment_id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    course_slug TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    title TEXT NOT NULL,
    due_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS section_risk_policies (
    section_id TEXT PRIMARY KEY,
    min_attempts_at_risk INTEGER,
    max_completion_rate_at_risk REAL,
    overdue_incomplete_flags_at_risk INTEGER,
    max_completion_rate_stalled_assignment REAL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS section_risk_policy_audit (
    event_id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    min_attempts_at_risk INTEGER,
    max_completion_rate_at_risk REAL,
    overdue_incomplete_flags_at_risk INTEGER,
    max_completion_rate_stalled_assignment REAL,
    created_at INTEGER NOT NULL
  );
`);

interface CreateSubmissionInput {
  submissionId: string;
  userId: string;
  courseSlug: string;
  chapterId: string;
  exerciseId: string;
  xp: number;
  language: Language;
  code: string;
}

export interface SubmissionWorkItem {
  submissionId: string;
  userId: string;
  courseSlug: string;
  chapterId: string;
  exerciseId: string;
  xp: number;
  language: Language;
  code: string;
}

interface ColumnInfo {
  name: string;
}

interface AttemptRow {
  attempt_id: string;
  submission_id: string;
  status: SubmissionStatus;
  result_json: string | null;
  submitted_at: number;
  completed_at: number | null;
}

interface ProgressRow {
  user_id: string;
  course_slug: string;
  chapter_id: string;
  exercise_id: string;
  first_pass_submission_id: string;
  xp_awarded: number;
  completed_at: number;
}

interface UserProfileRow {
  user_id: string;
  display_name: string;
  email: string;
  role: ClassroomRole;
  created_at: number;
  updated_at: number;
}

interface AcademicTermRow {
  term_id: string;
  title: string;
  starts_at: number;
  ends_at: number;
  created_at: number;
}

interface ClassSectionRow {
  section_id: string;
  term_id: string;
  course_slug: string;
  title: string;
  instructor_user_id: string;
  created_at: number;
}

interface SectionEnrollmentRow {
  enrollment_id: string;
  section_id: string;
  user_id: string;
  role: ClassroomRole;
  status: EnrollmentStatus;
  enrolled_at: number;
}

interface AssignmentRow {
  assignment_id: string;
  section_id: string;
  course_slug: string;
  chapter_id: string;
  exercise_id: string;
  title: string;
  due_at: number | null;
  created_at: number;
}

interface SectionLearnerMetricRow {
  section_id: string;
  user_id: string;
  attempts_count: number;
  completed_exercises: number;
  last_attempt_at: number | null;
  last_completion_at: number | null;
}

interface AuthSessionRow {
  session_id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  last_seen_at: number;
}

interface SectionGradeSummaryRow {
  section_id: string;
  user_id: string;
  assignments_count: number;
  completed_assignments: number;
  completion_rate: number;
  attempts_count: number;
  last_attempt_at: number | null;
}

interface SectionAssignmentBreakdownRow {
  assignment_id: string;
  section_id: string;
  title: string;
  chapter_id: string;
  exercise_id: string;
  due_at: number | null;
  learners_total: number;
  completed_learners: number;
  completion_rate: number;
  last_completion_at: number | null;
}

interface SectionRiskPolicyRow {
  section_id: string;
  min_attempts_at_risk: number | null;
  max_completion_rate_at_risk: number | null;
  overdue_incomplete_flags_at_risk: number | null;
  max_completion_rate_stalled_assignment: number | null;
  updated_at: number;
}

interface SectionRiskPolicyAuditRow {
  event_id: string;
  section_id: string;
  actor_user_id: string;
  action: "upsert" | "reset";
  min_attempts_at_risk: number | null;
  max_completion_rate_at_risk: number | null;
  overdue_incomplete_flags_at_risk: number | null;
  max_completion_rate_stalled_assignment: number | null;
  created_at: number;
}

function hasColumn(tableName: string, columnName: string) {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as ColumnInfo[];
  return columns.some((column) => column.name === columnName);
}

function ensureLegacyColumns() {
  if (!hasColumn("submissions", "user_id")) {
    db.exec(`ALTER TABLE submissions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy-user'`);
  }
  if (!hasColumn("submissions", "course_slug")) {
    db.exec(`ALTER TABLE submissions ADD COLUMN course_slug TEXT NOT NULL DEFAULT 'legacy-course'`);
  }
  if (!hasColumn("submissions", "chapter_id")) {
    db.exec(`ALTER TABLE submissions ADD COLUMN chapter_id TEXT NOT NULL DEFAULT 'legacy-chapter'`);
  }
  if (!hasColumn("submissions", "xp")) {
    db.exec(`ALTER TABLE submissions ADD COLUMN xp INTEGER NOT NULL DEFAULT 0`);
  }
}

ensureLegacyColumns();

export function createSubmission(input: CreateSubmissionInput) {
  const now = Date.now();
  const upsertUser = db.prepare(
    `
      INSERT INTO users (user_id, created_at, last_seen_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
    `
  );

  const insertSubmission = db.prepare(
    `
      INSERT INTO submissions (
        submission_id, user_id, course_slug, chapter_id, exercise_id, xp, language, code, status, result_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `
  );

  const insertAttempt = db.prepare(
    `
      INSERT INTO attempts (
        attempt_id, submission_id, user_id, course_slug, chapter_id, exercise_id, status, result_json, submitted_at, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
    `
  );

  const tx = db.transaction(() => {
    upsertUser.run(input.userId, now, now);
    insertSubmission.run(
      input.submissionId,
      input.userId,
      input.courseSlug,
      input.chapterId,
      input.exerciseId,
      input.xp,
      input.language,
      input.code,
      "queued",
      now,
      now
    );
    insertAttempt.run(
      input.submissionId,
      input.submissionId,
      input.userId,
      input.courseSlug,
      input.chapterId,
      input.exerciseId,
      "queued",
      now
    );
  });

  tx();
}

export function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
  result?: GradingResult
) {
  const now = Date.now();
  const resultJson = result ? JSON.stringify(result) : null;
  db.prepare(
    `
      UPDATE submissions
      SET status = ?, result_json = ?, updated_at = ?
      WHERE submission_id = ?
    `
  ).run(status, resultJson, now, submissionId);

  db.prepare(
    `
      UPDATE attempts
      SET status = ?, result_json = ?, completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END
      WHERE submission_id = ?
    `
  ).run(status, resultJson, status, now, submissionId);
}

export function finalizeSubmission(
  submissionId: string,
  result: GradingResult
): GradingResult {
  const now = Date.now();
  const row = db
    .prepare(
      `
        SELECT user_id, course_slug, chapter_id, exercise_id, xp
        FROM submissions
        WHERE submission_id = ?
      `
    )
    .get(submissionId) as
    | {
        user_id: string;
        course_slug: string;
        chapter_id: string;
        exercise_id: string;
        xp: number;
      }
    | undefined;

  if (!row) {
    updateSubmissionStatus(submissionId, "completed", {
      ...result,
      awardedXp: 0,
    });
    return {
      ...result,
      awardedXp: 0,
    };
  }

  let awardedXp = 0;
  if (result.status === "passed") {
    const insertProgress = db.prepare(
      `
        INSERT INTO progress (
          user_id, course_slug, chapter_id, exercise_id, first_pass_submission_id, xp_awarded, completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, course_slug, chapter_id, exercise_id) DO NOTHING
      `
    );

    const inserted = insertProgress.run(
      row.user_id,
      row.course_slug,
      row.chapter_id,
      row.exercise_id,
      submissionId,
      row.xp,
      now
    );

    if (inserted.changes > 0) {
      awardedXp = row.xp;
    }
  }

  const resultWithXp: GradingResult = {
    ...result,
    awardedXp,
  };
  updateSubmissionStatus(submissionId, "completed", resultWithXp);
  return resultWithXp;
}

export function claimSubmissionForGrading(
  submissionId: string
): SubmissionWorkItem | undefined {
  const now = Date.now();
  const claimed = db
    .prepare(
      `
        UPDATE submissions
        SET status = ?, updated_at = ?
        WHERE submission_id = ? AND status = ?
      `
    )
    .run("running", now, submissionId, "queued");

  if (claimed.changes === 0) return undefined;

  db.prepare(
    `
      UPDATE attempts
      SET status = ?
      WHERE submission_id = ?
    `
  ).run("running", submissionId);

  const row = db
    .prepare(
      `
        SELECT submission_id, user_id, course_slug, chapter_id, exercise_id, xp, language, code
        FROM submissions
        WHERE submission_id = ?
      `
    )
    .get(submissionId) as
    | {
        submission_id: string;
        user_id: string;
        course_slug: string;
        chapter_id: string;
        exercise_id: string;
        xp: number;
        language: Language;
        code: string;
      }
    | undefined;

  if (!row) return undefined;

  return {
    submissionId: row.submission_id,
    userId: row.user_id,
    courseSlug: row.course_slug,
    chapterId: row.chapter_id,
    exerciseId: row.exercise_id,
    xp: row.xp,
    language: row.language,
    code: row.code,
  };
}

export function getSubmission(
  submissionId: string
): SubmissionStatusResponse | undefined {
  const row = db
    .prepare(
      `
        SELECT submission_id, status, result_json
        FROM submissions
        WHERE submission_id = ?
      `
    )
    .get(submissionId) as
    | {
        submission_id: string;
        status: SubmissionStatus;
        result_json: string | null;
      }
    | undefined;

  if (!row) return undefined;

  return {
    submissionId: row.submission_id,
    status: row.status,
    result: row.result_json ? (JSON.parse(row.result_json) as GradingResult) : undefined,
  };
}

interface ListAttemptsInput {
  userId: string;
  courseSlug: string;
  chapterId?: string;
  exerciseId?: string;
  limit?: number;
}

function mapAttemptRowToHistoryItem(row: AttemptRow): AttemptHistoryItem {
  return {
    attemptId: row.attempt_id,
    submissionId: row.submission_id,
    status: row.status,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    result: row.result_json ? (JSON.parse(row.result_json) as GradingResult) : undefined,
  };
}

export function listAttempts(input: ListAttemptsInput): AttemptHistoryItem[] {
  const safeLimit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  if (input.chapterId && input.exerciseId) {
    const rows = db
      .prepare(
        `
          SELECT attempt_id, submission_id, status, result_json, submitted_at, completed_at
          FROM attempts
          WHERE user_id = ? AND course_slug = ? AND chapter_id = ? AND exercise_id = ?
          ORDER BY submitted_at DESC
          LIMIT ?
        `
      )
      .all(
        input.userId,
        input.courseSlug,
        input.chapterId,
        input.exerciseId,
        safeLimit
      ) as AttemptRow[];

    return rows.map(mapAttemptRowToHistoryItem);
  }

  const rows = db
    .prepare(
      `
        SELECT attempt_id, submission_id, status, result_json, submitted_at, completed_at
        FROM attempts
        WHERE user_id = ? AND course_slug = ?
        ORDER BY submitted_at DESC
        LIMIT ?
      `
    )
    .all(input.userId, input.courseSlug, safeLimit) as AttemptRow[];

  return rows.map(mapAttemptRowToHistoryItem);
}

function mapProgressRowToRecord(row: ProgressRow): ExerciseProgressRecord {
  return {
    userId: row.user_id,
    courseSlug: row.course_slug,
    chapterId: row.chapter_id,
    exerciseId: row.exercise_id,
    firstPassSubmissionId: row.first_pass_submission_id,
    xpAwarded: row.xp_awarded,
    completedAt: row.completed_at,
  };
}

export function getExerciseProgress(
  userId: string,
  courseSlug: string,
  chapterId: string,
  exerciseId: string
): ExerciseProgressRecord | undefined {
  const row = db
    .prepare(
      `
        SELECT user_id, course_slug, chapter_id, exercise_id, first_pass_submission_id, xp_awarded, completed_at
        FROM progress
        WHERE user_id = ? AND course_slug = ? AND chapter_id = ? AND exercise_id = ?
      `
    )
    .get(userId, courseSlug, chapterId, exerciseId) as ProgressRow | undefined;

  return row ? mapProgressRowToRecord(row) : undefined;
}

export function listCourseProgress(
  userId: string,
  courseSlug: string
): ExerciseProgressRecord[] {
  const rows = db
    .prepare(
      `
        SELECT user_id, course_slug, chapter_id, exercise_id, first_pass_submission_id, xp_awarded, completed_at
        FROM progress
        WHERE user_id = ? AND course_slug = ?
        ORDER BY completed_at DESC
      `
    )
    .all(userId, courseSlug) as ProgressRow[];

  return rows.map(mapProgressRowToRecord);
}

function mapUserProfileRow(row: UserProfileRow): UserProfileRecord {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface UpsertUserProfileInput {
  userId: string;
  displayName: string;
  email: string;
  role: ClassroomRole;
}

export function upsertUserProfile(input: UpsertUserProfileInput): UserProfileRecord {
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO user_profiles (user_id, display_name, email, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        display_name = excluded.display_name,
        email = excluded.email,
        role = excluded.role,
        updated_at = excluded.updated_at
    `
  ).run(input.userId, input.displayName, input.email, input.role, now, now);

  const row = db
    .prepare(
      `
        SELECT user_id, display_name, email, role, created_at, updated_at
        FROM user_profiles
        WHERE user_id = ?
      `
    )
    .get(input.userId) as UserProfileRow | undefined;

  if (!row) {
    throw new Error("Failed to upsert user profile.");
  }

  return mapUserProfileRow(row);
}

export function getUserProfile(userId: string): UserProfileRecord | undefined {
  const row = db
    .prepare(
      `
        SELECT user_id, display_name, email, role, created_at, updated_at
        FROM user_profiles
        WHERE user_id = ?
      `
    )
    .get(userId) as UserProfileRow | undefined;

  return row ? mapUserProfileRow(row) : undefined;
}

export function getUserProfileByEmail(email: string): UserProfileRecord | undefined {
  const row = db
    .prepare(
      `
        SELECT user_id, display_name, email, role, created_at, updated_at
        FROM user_profiles
        WHERE email = ?
      `
    )
    .get(email) as UserProfileRow | undefined;

  return row ? mapUserProfileRow(row) : undefined;
}

function mapAuthSessionRow(row: AuthSessionRow): AuthSessionRecord {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    expiresAt: row.expires_at,
  };
}

function purgeExpiredAuthSessions(now: number) {
  db.prepare(`DELETE FROM auth_sessions WHERE expires_at <= ?`).run(now);
}

export function createAuthSession(
  sessionId: string,
  userId: string,
  ttlMs: number
): AuthSessionRecord {
  const now = Date.now();
  const expiresAt = now + ttlMs;
  purgeExpiredAuthSessions(now);
  db.prepare(
    `
      INSERT INTO auth_sessions (session_id, user_id, created_at, expires_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(sessionId, userId, now, expiresAt, now);

  return {
    sessionId,
    userId,
    expiresAt,
  };
}

export function getAuthSession(sessionId: string): AuthSessionRecord | undefined {
  const now = Date.now();
  purgeExpiredAuthSessions(now);
  const row = db
    .prepare(
      `
        SELECT session_id, user_id, created_at, expires_at, last_seen_at
        FROM auth_sessions
        WHERE session_id = ? AND expires_at > ?
      `
    )
    .get(sessionId, now) as AuthSessionRow | undefined;

  if (!row) return undefined;

  db.prepare(
    `
      UPDATE auth_sessions
      SET last_seen_at = ?
      WHERE session_id = ?
    `
  ).run(now, sessionId);

  return mapAuthSessionRow(row);
}

export function deleteAuthSession(sessionId: string) {
  db.prepare(`DELETE FROM auth_sessions WHERE session_id = ?`).run(sessionId);
}

interface CreateAcademicTermInput {
  termId: string;
  title: string;
  startsAt: number;
  endsAt: number;
}

function mapAcademicTermRow(row: AcademicTermRow): AcademicTermRecord {
  return {
    termId: row.term_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

export function createAcademicTerm(input: CreateAcademicTermInput): AcademicTermRecord {
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO academic_terms (term_id, title, starts_at, ends_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(input.termId, input.title, input.startsAt, input.endsAt, now);

  const row = db
    .prepare(
      `
        SELECT term_id, title, starts_at, ends_at, created_at
        FROM academic_terms
        WHERE term_id = ?
      `
    )
    .get(input.termId) as AcademicTermRow | undefined;

  if (!row) {
    throw new Error("Failed to create academic term.");
  }

  return mapAcademicTermRow(row);
}

export function listAcademicTerms(): AcademicTermRecord[] {
  const rows = db
    .prepare(
      `
        SELECT term_id, title, starts_at, ends_at, created_at
        FROM academic_terms
        ORDER BY starts_at DESC, created_at DESC
      `
    )
    .all() as AcademicTermRow[];

  return rows.map(mapAcademicTermRow);
}

interface CreateClassSectionInput {
  sectionId: string;
  termId: string;
  courseSlug: string;
  title: string;
  instructorUserId: string;
}

function mapClassSectionRow(row: ClassSectionRow): ClassSectionRecord {
  return {
    sectionId: row.section_id,
    termId: row.term_id,
    courseSlug: row.course_slug,
    title: row.title,
    instructorUserId: row.instructor_user_id,
    createdAt: row.created_at,
  };
}

export function createClassSection(input: CreateClassSectionInput): ClassSectionRecord {
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO class_sections (section_id, term_id, course_slug, title, instructor_user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.sectionId,
    input.termId,
    input.courseSlug,
    input.title,
    input.instructorUserId,
    now
  );

  const row = db
    .prepare(
      `
        SELECT section_id, term_id, course_slug, title, instructor_user_id, created_at
        FROM class_sections
        WHERE section_id = ?
      `
    )
    .get(input.sectionId) as ClassSectionRow | undefined;

  if (!row) {
    throw new Error("Failed to create class section.");
  }

  return mapClassSectionRow(row);
}

type SectionSort = "created_desc" | "created_asc" | "title_asc" | "title_desc";

interface ListClassSectionsOptions {
  termId?: string;
  courseSlug?: string;
  search?: string;
  sort?: SectionSort;
  limit?: number;
  offset?: number;
}

function normalizeListClassSectionsOptions(
  termIdOrOptions?: string | ListClassSectionsOptions
): ListClassSectionsOptions {
  if (!termIdOrOptions) return {};
  if (typeof termIdOrOptions === "string") return { termId: termIdOrOptions };
  return termIdOrOptions;
}

function getSectionsOrderBy(sort?: SectionSort): string {
  switch (sort) {
    case "created_asc":
      return "created_at ASC";
    case "title_asc":
      return "title ASC, created_at DESC";
    case "title_desc":
      return "title DESC, created_at DESC";
    case "created_desc":
    default:
      return "created_at DESC";
  }
}

function buildSectionsWhere(options: ListClassSectionsOptions): {
  clause: string;
  params: Array<string | number>;
} {
  const whereParts: string[] = [];
  const params: Array<string | number> = [];
  if (options.termId && options.termId.trim().length > 0) {
    whereParts.push("term_id = ?");
    params.push(options.termId.trim());
  }
  if (options.courseSlug && options.courseSlug.trim().length > 0) {
    whereParts.push("course_slug = ?");
    params.push(options.courseSlug.trim());
  }
  if (options.search && options.search.trim().length > 0) {
    const needle = `%${options.search.trim().toLowerCase()}%`;
    whereParts.push(
      "(LOWER(title) LIKE ? OR LOWER(section_id) LIKE ? OR LOWER(course_slug) LIKE ?)"
    );
    params.push(needle, needle, needle);
  }
  return {
    clause: whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "",
    params,
  };
}

export function listClassSections(
  termIdOrOptions?: string | ListClassSectionsOptions
): ClassSectionRecord[] {
  const options = normalizeListClassSectionsOptions(termIdOrOptions);
  const { clause, params } = buildSectionsWhere(options);
  const limit = Math.min(Math.max(options.limit ?? 1000, 1), 1000);
  const offset = Math.max(options.offset ?? 0, 0);
  const orderBy = getSectionsOrderBy(options.sort);

  const rows = db
    .prepare(
      `
        SELECT section_id, term_id, course_slug, title, instructor_user_id, created_at
        FROM class_sections
        ${clause}
        ORDER BY ${orderBy}
        LIMIT ?
        OFFSET ?
      `
    )
    .all(...params, limit, offset) as ClassSectionRow[];

  return rows.map(mapClassSectionRow);
}

export function countClassSections(
  termIdOrOptions?: string | ListClassSectionsOptions
): number {
  const options = normalizeListClassSectionsOptions(termIdOrOptions);
  const { clause, params } = buildSectionsWhere(options);
  const row = db
    .prepare(
      `
        SELECT COUNT(*) AS total_count
        FROM class_sections
        ${clause}
      `
    )
    .get(...params) as { total_count: number };
  return row.total_count;
}

interface EnrollUserInput {
  enrollmentId: string;
  sectionId: string;
  userId: string;
  role: ClassroomRole;
}

function mapEnrollmentRow(row: SectionEnrollmentRow): SectionEnrollmentRecord {
  return {
    enrollmentId: row.enrollment_id,
    sectionId: row.section_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    enrolledAt: row.enrolled_at,
  };
}

export function enrollUserInSection(input: EnrollUserInput): SectionEnrollmentRecord {
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO section_enrollments (enrollment_id, section_id, user_id, role, status, enrolled_at)
      VALUES (?, ?, ?, ?, 'active', ?)
      ON CONFLICT(section_id, user_id) DO UPDATE SET
        role = excluded.role,
        status = 'active',
        enrolled_at = excluded.enrolled_at
    `
  ).run(input.enrollmentId, input.sectionId, input.userId, input.role, now);

  const row = db
    .prepare(
      `
        SELECT enrollment_id, section_id, user_id, role, status, enrolled_at
        FROM section_enrollments
        WHERE section_id = ? AND user_id = ?
      `
    )
    .get(input.sectionId, input.userId) as SectionEnrollmentRow | undefined;

  if (!row) {
    throw new Error("Failed to create enrollment.");
  }

  return mapEnrollmentRow(row);
}

export function listSectionEnrollments(sectionId: string): SectionEnrollmentRecord[] {
  const rows = db
    .prepare(
      `
        SELECT enrollment_id, section_id, user_id, role, status, enrolled_at
        FROM section_enrollments
        WHERE section_id = ?
        ORDER BY enrolled_at DESC
      `
    )
    .all(sectionId) as SectionEnrollmentRow[];

  return rows.map(mapEnrollmentRow);
}

export function getSectionEnrollment(
  sectionId: string,
  userId: string
): SectionEnrollmentRecord | undefined {
  const row = db
    .prepare(
      `
        SELECT enrollment_id, section_id, user_id, role, status, enrolled_at
        FROM section_enrollments
        WHERE section_id = ? AND user_id = ?
      `
    )
    .get(sectionId, userId) as SectionEnrollmentRow | undefined;

  return row ? mapEnrollmentRow(row) : undefined;
}

interface CreateAssignmentInput {
  assignmentId: string;
  sectionId: string;
  courseSlug: string;
  chapterId: string;
  exerciseId: string;
  title: string;
  dueAt?: number;
}

function mapAssignmentRow(row: AssignmentRow): AssignmentRecord {
  return {
    assignmentId: row.assignment_id,
    sectionId: row.section_id,
    courseSlug: row.course_slug,
    chapterId: row.chapter_id,
    exerciseId: row.exercise_id,
    title: row.title,
    dueAt: row.due_at,
    createdAt: row.created_at,
  };
}

export function createAssignment(input: CreateAssignmentInput): AssignmentRecord {
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO assignments (
        assignment_id, section_id, course_slug, chapter_id, exercise_id, title, due_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.assignmentId,
    input.sectionId,
    input.courseSlug,
    input.chapterId,
    input.exerciseId,
    input.title,
    input.dueAt ?? null,
    now
  );

  const row = db
    .prepare(
      `
        SELECT assignment_id, section_id, course_slug, chapter_id, exercise_id, title, due_at, created_at
        FROM assignments
        WHERE assignment_id = ?
      `
    )
    .get(input.assignmentId) as AssignmentRow | undefined;

  if (!row) {
    throw new Error("Failed to create assignment.");
  }

  return mapAssignmentRow(row);
}

export function listSectionAssignments(sectionId: string): AssignmentRecord[] {
  const rows = db
    .prepare(
      `
        SELECT assignment_id, section_id, course_slug, chapter_id, exercise_id, title, due_at, created_at
        FROM assignments
        WHERE section_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(sectionId) as AssignmentRow[];

  return rows.map(mapAssignmentRow);
}

function mapSectionLearnerMetricRow(row: SectionLearnerMetricRow): SectionLearnerMetric {
  return {
    sectionId: row.section_id,
    userId: row.user_id,
    attemptsCount: row.attempts_count,
    completedExercises: row.completed_exercises,
    lastAttemptAt: row.last_attempt_at,
    lastCompletionAt: row.last_completion_at,
  };
}

export function listSectionLearnerMetrics(sectionId: string): SectionLearnerMetric[] {
  const rows = db
    .prepare(
      `
        SELECT
          e.section_id,
          e.user_id,
          COUNT(a.attempt_id) AS attempts_count,
          COUNT(DISTINCT p.exercise_id) AS completed_exercises,
          MAX(a.submitted_at) AS last_attempt_at,
          MAX(p.completed_at) AS last_completion_at
        FROM section_enrollments e
        INNER JOIN class_sections s ON s.section_id = e.section_id
        LEFT JOIN attempts a
          ON a.user_id = e.user_id
          AND a.course_slug = s.course_slug
        LEFT JOIN progress p
          ON p.user_id = e.user_id
          AND p.course_slug = s.course_slug
        WHERE e.section_id = ?
          AND e.status = 'active'
          AND e.role = 'student'
        GROUP BY e.section_id, e.user_id
        ORDER BY completed_exercises DESC, attempts_count DESC, e.user_id ASC
      `
    )
    .all(sectionId) as SectionLearnerMetricRow[];

  return rows.map(mapSectionLearnerMetricRow);
}

function mapSectionGradeSummaryRow(row: SectionGradeSummaryRow): SectionGradeSummaryRecord {
  return {
    sectionId: row.section_id,
    userId: row.user_id,
    assignmentsCount: row.assignments_count,
    completedAssignments: row.completed_assignments,
    completionRate: row.completion_rate,
    attemptsCount: row.attempts_count,
    lastAttemptAt: row.last_attempt_at,
  };
}

export function listSectionGradeSummary(sectionId: string): SectionGradeSummaryRecord[] {
  const rows = db
    .prepare(
      `
        SELECT
          e.section_id,
          e.user_id,
          COUNT(DISTINCT ass.assignment_id) AS assignments_count,
          COUNT(DISTINCT p.exercise_id) AS completed_assignments,
          CASE
            WHEN COUNT(DISTINCT ass.assignment_id) = 0 THEN 0
            ELSE ROUND(
              (COUNT(DISTINCT p.exercise_id) * 100.0) / COUNT(DISTINCT ass.assignment_id),
              2
            )
          END AS completion_rate,
          COUNT(a.attempt_id) AS attempts_count,
          MAX(a.submitted_at) AS last_attempt_at
        FROM section_enrollments e
        INNER JOIN class_sections s ON s.section_id = e.section_id
        LEFT JOIN assignments ass
          ON ass.section_id = e.section_id
        LEFT JOIN attempts a
          ON a.user_id = e.user_id
          AND a.course_slug = s.course_slug
        LEFT JOIN progress p
          ON p.user_id = e.user_id
          AND p.course_slug = ass.course_slug
          AND p.chapter_id = ass.chapter_id
          AND p.exercise_id = ass.exercise_id
        WHERE e.section_id = ?
          AND e.status = 'active'
          AND e.role = 'student'
        GROUP BY e.section_id, e.user_id
        ORDER BY completion_rate DESC, completed_assignments DESC, e.user_id ASC
      `
    )
    .all(sectionId) as SectionGradeSummaryRow[];

  return rows.map(mapSectionGradeSummaryRow);
}

function mapSectionAssignmentBreakdownRow(
  row: SectionAssignmentBreakdownRow
): SectionAssignmentBreakdownRecord {
  return {
    assignmentId: row.assignment_id,
    sectionId: row.section_id,
    title: row.title,
    chapterId: row.chapter_id,
    exerciseId: row.exercise_id,
    dueAt: row.due_at,
    learnersTotal: row.learners_total,
    completedLearners: row.completed_learners,
    completionRate: row.completion_rate,
    lastCompletionAt: row.last_completion_at,
  };
}

export function listSectionAssignmentBreakdown(
  sectionId: string
): SectionAssignmentBreakdownRecord[] {
  const rows = db
    .prepare(
      `
        SELECT
          ass.assignment_id,
          ass.section_id,
          ass.title,
          ass.chapter_id,
          ass.exercise_id,
          ass.due_at,
          COUNT(DISTINCT e.user_id) AS learners_total,
          COUNT(DISTINCT p.user_id) AS completed_learners,
          CASE
            WHEN COUNT(DISTINCT e.user_id) = 0 THEN 0
            ELSE ROUND((COUNT(DISTINCT p.user_id) * 100.0) / COUNT(DISTINCT e.user_id), 2)
          END AS completion_rate,
          MAX(p.completed_at) AS last_completion_at
        FROM assignments ass
        LEFT JOIN section_enrollments e
          ON e.section_id = ass.section_id
          AND e.status = 'active'
          AND e.role = 'student'
        LEFT JOIN progress p
          ON p.user_id = e.user_id
          AND p.course_slug = ass.course_slug
          AND p.chapter_id = ass.chapter_id
          AND p.exercise_id = ass.exercise_id
        WHERE ass.section_id = ?
        GROUP BY
          ass.assignment_id,
          ass.section_id,
          ass.title,
          ass.chapter_id,
          ass.exercise_id,
          ass.due_at,
          ass.created_at
        ORDER BY
          ass.due_at IS NULL ASC,
          ass.due_at ASC,
          ass.created_at DESC
      `
    )
    .all(sectionId) as SectionAssignmentBreakdownRow[];

  return rows.map(mapSectionAssignmentBreakdownRow);
}

interface UpsertSectionRiskPolicyInput {
  sectionId: string;
  minAttemptsAtRisk: number | null;
  maxCompletionRateAtRisk: number | null;
  overdueIncompleteFlagsAtRisk: boolean | null;
  maxCompletionRateStalledAssignment: number | null;
}

function mapSectionRiskPolicyRow(row: SectionRiskPolicyRow): SectionRiskPolicyRecord {
  return {
    sectionId: row.section_id,
    minAttemptsAtRisk: row.min_attempts_at_risk,
    maxCompletionRateAtRisk: row.max_completion_rate_at_risk,
    overdueIncompleteFlagsAtRisk:
      row.overdue_incomplete_flags_at_risk === null
        ? null
        : row.overdue_incomplete_flags_at_risk === 1,
    maxCompletionRateStalledAssignment: row.max_completion_rate_stalled_assignment,
    updatedAt: row.updated_at,
  };
}

export function getSectionRiskPolicy(sectionId: string): SectionRiskPolicyRecord | undefined {
  const row = db
    .prepare(
      `
        SELECT
          section_id,
          min_attempts_at_risk,
          max_completion_rate_at_risk,
          overdue_incomplete_flags_at_risk,
          max_completion_rate_stalled_assignment,
          updated_at
        FROM section_risk_policies
        WHERE section_id = ?
      `
    )
    .get(sectionId) as SectionRiskPolicyRow | undefined;

  return row ? mapSectionRiskPolicyRow(row) : undefined;
}

export function upsertSectionRiskPolicy(
  input: UpsertSectionRiskPolicyInput
): SectionRiskPolicyRecord {
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO section_risk_policies (
        section_id,
        min_attempts_at_risk,
        max_completion_rate_at_risk,
        overdue_incomplete_flags_at_risk,
        max_completion_rate_stalled_assignment,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(section_id) DO UPDATE SET
        min_attempts_at_risk = excluded.min_attempts_at_risk,
        max_completion_rate_at_risk = excluded.max_completion_rate_at_risk,
        overdue_incomplete_flags_at_risk = excluded.overdue_incomplete_flags_at_risk,
        max_completion_rate_stalled_assignment = excluded.max_completion_rate_stalled_assignment,
        updated_at = excluded.updated_at
    `
  ).run(
    input.sectionId,
    input.minAttemptsAtRisk,
    input.maxCompletionRateAtRisk,
    input.overdueIncompleteFlagsAtRisk === null
      ? null
      : input.overdueIncompleteFlagsAtRisk
        ? 1
        : 0,
    input.maxCompletionRateStalledAssignment,
    now
  );

  const saved = getSectionRiskPolicy(input.sectionId);
  if (!saved) {
    throw new Error("Failed to save section risk policy.");
  }
  return saved;
}

export function deleteSectionRiskPolicy(sectionId: string) {
  db.prepare(`DELETE FROM section_risk_policies WHERE section_id = ?`).run(sectionId);
}

interface RecordSectionRiskPolicyAuditInput {
  sectionId: string;
  actorUserId: string;
  action: "upsert" | "reset";
  policy?: SectionRiskPolicyRecord;
}

function getRiskAuditRetentionDays(): number {
  const configured = Number.parseInt(process.env.CLASSROOM_RISK_AUDIT_RETENTION_DAYS ?? "", 10);
  if (!Number.isFinite(configured)) return 365;
  return Math.min(Math.max(configured, 1), 3650);
}

function getRiskAuditMaxRowsPerSection(): number {
  const configured = Number.parseInt(process.env.CLASSROOM_RISK_AUDIT_MAX_ROWS_PER_SECTION ?? "", 10);
  if (!Number.isFinite(configured)) return 1000;
  return Math.min(Math.max(configured, 50), 10000);
}

function purgeSectionRiskPolicyAudit(sectionId: string, now: number) {
  const retentionCutoff = now - getRiskAuditRetentionDays() * 24 * 60 * 60 * 1000;
  db.prepare(
    `
      DELETE FROM section_risk_policy_audit
      WHERE section_id = ? AND created_at < ?
    `
  ).run(sectionId, retentionCutoff);

  const maxRows = getRiskAuditMaxRowsPerSection();
  db.prepare(
    `
      DELETE FROM section_risk_policy_audit
      WHERE section_id = ?
        AND event_id NOT IN (
          SELECT event_id
          FROM section_risk_policy_audit
          WHERE section_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        )
    `
  ).run(sectionId, sectionId, maxRows);
}

export function recordSectionRiskPolicyAudit(input: RecordSectionRiskPolicyAuditInput) {
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO section_risk_policy_audit (
        event_id,
        section_id,
        actor_user_id,
        action,
        min_attempts_at_risk,
        max_completion_rate_at_risk,
        overdue_incomplete_flags_at_risk,
        max_completion_rate_stalled_assignment,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    randomUUID(),
    input.sectionId,
    input.actorUserId,
    input.action,
    input.policy?.minAttemptsAtRisk ?? null,
    input.policy?.maxCompletionRateAtRisk ?? null,
    input.policy?.overdueIncompleteFlagsAtRisk === null ||
      input.policy?.overdueIncompleteFlagsAtRisk === undefined
      ? null
      : input.policy.overdueIncompleteFlagsAtRisk
        ? 1
        : 0,
    input.policy?.maxCompletionRateStalledAssignment ?? null,
    now
  );
  purgeSectionRiskPolicyAudit(input.sectionId, now);
}

function mapSectionRiskPolicyAuditRow(
  row: SectionRiskPolicyAuditRow
): SectionRiskPolicyAuditRecord {
  const hasPolicy =
    row.min_attempts_at_risk !== null ||
    row.max_completion_rate_at_risk !== null ||
    row.overdue_incomplete_flags_at_risk !== null ||
    row.max_completion_rate_stalled_assignment !== null;

  return {
    eventId: row.event_id,
    sectionId: row.section_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    policy: hasPolicy
      ? {
          sectionId: row.section_id,
          minAttemptsAtRisk: row.min_attempts_at_risk,
          maxCompletionRateAtRisk: row.max_completion_rate_at_risk,
          overdueIncompleteFlagsAtRisk:
            row.overdue_incomplete_flags_at_risk === null
              ? null
              : row.overdue_incomplete_flags_at_risk === 1,
          maxCompletionRateStalledAssignment:
            row.max_completion_rate_stalled_assignment,
          updatedAt: row.created_at,
        }
      : undefined,
    createdAt: row.created_at,
  };
}

interface ListSectionRiskPolicyAuditOptions {
  limit?: number;
  action?: "upsert" | "reset";
  actorUserIdContains?: string;
}

export function listSectionRiskPolicyAudit(
  sectionId: string,
  options: ListSectionRiskPolicyAuditOptions = {}
): SectionRiskPolicyAuditRecord[] {
  const safeLimit = Math.min(Math.max(options.limit ?? 10, 1), 100);
  const whereParts = ["section_id = ?"];
  const params: Array<string | number> = [sectionId];
  if (options.action) {
    whereParts.push("action = ?");
    params.push(options.action);
  }
  if (options.actorUserIdContains && options.actorUserIdContains.trim().length > 0) {
    whereParts.push("LOWER(actor_user_id) LIKE ?");
    params.push(`%${options.actorUserIdContains.trim().toLowerCase()}%`);
  }
  params.push(safeLimit);
  const rows = db
    .prepare(
      `
        SELECT
          event_id,
          section_id,
          actor_user_id,
          action,
          min_attempts_at_risk,
          max_completion_rate_at_risk,
          overdue_incomplete_flags_at_risk,
          max_completion_rate_stalled_assignment,
          created_at
        FROM section_risk_policy_audit
        WHERE ${whereParts.join(" AND ")}
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(...params) as SectionRiskPolicyAuditRow[];

  return rows.map(mapSectionRiskPolicyAuditRow);
}
