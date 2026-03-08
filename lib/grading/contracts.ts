import { Language } from "@/lib/types";

export interface GradingTestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface GradingResult {
  status: "passed" | "failed" | "error";
  feedback: string[];
  tests: GradingTestResult[];
  awardedXp?: number;
}

export interface SubmissionRequest {
  userId: string;
  courseSlug: string;
  chapterId: string;
  exerciseId: string;
  xp: number;
  language: Language;
  code: string;
}

export type SubmissionStatus = "queued" | "running" | "completed";

export interface SubmissionStatusResponse {
  submissionId: string;
  status: SubmissionStatus;
  result?: GradingResult;
}

export interface AttemptHistoryItem {
  attemptId: string;
  submissionId: string;
  status: SubmissionStatus;
  submittedAt: number;
  completedAt: number | null;
  result?: GradingResult;
}

export interface AttemptsResponse {
  attempts: AttemptHistoryItem[];
}

export interface ExerciseProgressRecord {
  userId: string;
  courseSlug: string;
  chapterId: string;
  exerciseId: string;
  firstPassSubmissionId: string;
  xpAwarded: number;
  completedAt: number;
}

export interface ExerciseProgressResponse {
  completed: boolean;
  progress?: ExerciseProgressRecord;
}

export interface CourseProgressResponse {
  progress: ExerciseProgressRecord[];
}
