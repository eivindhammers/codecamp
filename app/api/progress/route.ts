import { NextResponse } from "next/server";
import {
  CourseProgressResponse,
  ExerciseProgressResponse,
  UserCatalogProgressResponse,
} from "@/lib/grading/contracts";
import {
  getExerciseProgress,
  listCourseProgress,
  listUserProgress,
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
