import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
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
    exercise_id TEXT NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL,
    result_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

interface CreateSubmissionInput {
  submissionId: string;
  exerciseId: string;
  language: Language;
  code: string;
}

export interface SubmissionWorkItem {
  submissionId: string;
  exerciseId: string;
  language: Language;
  code: string;
}

export function createSubmission(input: CreateSubmissionInput) {
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO submissions (
        submission_id, exercise_id, language, code, status, result_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
    `
  ).run(
    input.submissionId,
    input.exerciseId,
    input.language,
    input.code,
    "queued",
    now,
    now
  );
}

export function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
  result?: GradingResult
) {
  const now = Date.now();
  db.prepare(
    `
      UPDATE submissions
      SET status = ?, result_json = ?, updated_at = ?
      WHERE submission_id = ?
    `
  ).run(status, result ? JSON.stringify(result) : null, now, submissionId);
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

  const row = db
    .prepare(
      `
        SELECT submission_id, exercise_id, language, code
        FROM submissions
        WHERE submission_id = ?
      `
    )
    .get(submissionId) as
    | {
        submission_id: string;
        exercise_id: string;
        language: Language;
        code: string;
      }
    | undefined;

  if (!row) return undefined;

  return {
    submissionId: row.submission_id,
    exerciseId: row.exercise_id,
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
