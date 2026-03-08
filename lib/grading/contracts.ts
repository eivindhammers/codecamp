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

export type ClassroomRole = "student" | "instructor" | "ta";
export type EnrollmentStatus = "active" | "dropped";

export interface UserProfileRecord {
  userId: string;
  displayName: string;
  email: string;
  role: ClassroomRole;
  createdAt: number;
  updatedAt: number;
}

export interface AcademicTermRecord {
  termId: string;
  title: string;
  startsAt: number;
  endsAt: number;
  createdAt: number;
}

export interface ClassSectionRecord {
  sectionId: string;
  termId: string;
  courseSlug: string;
  title: string;
  instructorUserId: string;
  createdAt: number;
}

export interface SectionEnrollmentRecord {
  enrollmentId: string;
  sectionId: string;
  userId: string;
  role: ClassroomRole;
  status: EnrollmentStatus;
  enrolledAt: number;
}

export interface AssignmentRecord {
  assignmentId: string;
  sectionId: string;
  courseSlug: string;
  chapterId: string;
  exerciseId: string;
  title: string;
  dueAt: number | null;
  createdAt: number;
}

export interface UserProfileResponse {
  profile: UserProfileRecord;
}

export interface AuthSessionRecord {
  sessionId: string;
  userId: string;
  expiresAt: number;
}

export interface AuthSessionResponse {
  session: AuthSessionRecord;
  profile: UserProfileRecord;
}

export interface AcademicTermsResponse {
  terms: AcademicTermRecord[];
}

export interface ClassSectionsResponse {
  sections: ClassSectionRecord[];
}

export interface SectionEnrollmentsResponse {
  enrollments: SectionEnrollmentRecord[];
}

export interface AssignmentsResponse {
  assignments: AssignmentRecord[];
}

export interface SectionLearnerMetric {
  sectionId: string;
  userId: string;
  attemptsCount: number;
  completedExercises: number;
  lastAttemptAt: number | null;
  lastCompletionAt: number | null;
}

export interface SectionLearnerMetricsResponse {
  metrics: SectionLearnerMetric[];
}

export interface SectionGradeSummaryRecord {
  sectionId: string;
  userId: string;
  assignmentsCount: number;
  completedAssignments: number;
  completionRate: number;
  attemptsCount: number;
  lastAttemptAt: number | null;
}

export interface SectionGradeSummaryResponse {
  summary: SectionGradeSummaryRecord[];
}
