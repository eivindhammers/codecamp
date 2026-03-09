import { NextResponse } from "next/server";
import {
  CourseProgressResponse,
  ExerciseProgressResponse,
  UpsertExerciseProgressRequest,
  UpsertExerciseProgressResponse,
  UserCatalogProgressResponse,
} from "@/lib/grading/contracts";
import {
  getExerciseProgress,
  listCourseProgress,
  listUserProgress,
  recordExerciseProgress,
} from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId")?.trim() ?? "";
  const courseSlug = url.searchParams.get("courseSlug")?.trim() ?? "";
  const chapterId = url.searchParams.get("chapterId")?.trim() ?? "";
  const exerciseId = url.searchParams.get("exerciseId")?.trim() ?? "";

  if (!userId) {
    return badRequest("Missing required query param: userId.");
  }

  const hasChapter = Boolean(chapterId);
  const hasExercise = Boolean(exerciseId);

  if (hasChapter !== hasExercise) {
    return badRequest("chapterId and exerciseId must be provided together.");
  }

  if (hasChapter && hasExercise) {
    if (!courseSlug) {
      return badRequest("courseSlug is required when chapterId/exerciseId are provided.");
    }
    const progress = getExerciseProgress(userId, courseSlug, chapterId, exerciseId);
    const response: ExerciseProgressResponse = {
      completed: Boolean(progress),
      progress,
    };
    return NextResponse.json(response);
  }

  if (courseSlug) {
    const progress = listCourseProgress(userId, courseSlug);
    const response: CourseProgressResponse = { progress };
    return NextResponse.json(response);
  }

  const progress = listUserProgress(userId);
  const response: UserCatalogProgressResponse = { progress };
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  let body: UpsertExerciseProgressRequest;
  try {
    body = (await req.json()) as UpsertExerciseProgressRequest;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const userId = body.userId?.trim() ?? "";
  const courseSlug = body.courseSlug?.trim() ?? "";
  const chapterId = body.chapterId?.trim() ?? "";
  const exerciseId = body.exerciseId?.trim() ?? "";
  const xpAwarded = body.xpAwarded;
  const completionSource = body.completionSource ?? "local-validation";

  if (!userId || !courseSlug || !chapterId || !exerciseId) {
    return badRequest("Missing required fields: userId, courseSlug, chapterId, exerciseId.");
  }
  if (!Number.isInteger(xpAwarded) || xpAwarded <= 0) {
    return badRequest("xpAwarded must be a positive integer.");
  }
  if (completionSource !== "local-validation" && completionSource !== "server-grader") {
    return badRequest("completionSource must be one of: local-validation, server-grader.");
  }

  const result = recordExerciseProgress({
    userId,
    courseSlug,
    chapterId,
    exerciseId,
    xpAwarded,
    firstPassSubmissionId: `${completionSource}-${Date.now()}`,
  });
  const response: UpsertExerciseProgressResponse = {
    awardedXp: result.awardedXp,
    created: result.awardedXp > 0,
    progress: result.progress,
  };
  return NextResponse.json(response, { status: response.created ? 201 : 200 });
}
