import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  AttemptHistoryItem,
  ExerciseProgressRecord,
  GradingResult,
  SubmissionStatus,
  SubmissionStatusResponse,
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
