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
}

export interface SubmissionRequest {
  exerciseId: string;
  language: Language;
  code: string;
}

export type SubmissionStatus = "queued" | "running" | "completed";

export interface SubmissionStatusResponse {
  submissionId: string;
  status: SubmissionStatus;
  result?: GradingResult;
}
