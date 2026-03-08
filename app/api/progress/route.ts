import { NextResponse } from "next/server";
import {
  CourseProgressResponse,
  ExerciseProgressResponse,
} from "@/lib/grading/contracts";
import {
  getExerciseProgress,
  listCourseProgress,
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

  if (!userId || !courseSlug) {
    return badRequest("Missing required query params: userId, courseSlug.");
  }

  const hasChapter = Boolean(chapterId);
  const hasExercise = Boolean(exerciseId);

  if (hasChapter !== hasExercise) {
    return badRequest("chapterId and exerciseId must be provided together.");
  }

  if (hasChapter && hasExercise) {
    const progress = getExerciseProgress(userId, courseSlug, chapterId, exerciseId);
    const response: ExerciseProgressResponse = {
      completed: Boolean(progress),
      progress,
    };
    return NextResponse.json(response);
  }

  const progress = listCourseProgress(userId, courseSlug);
  const response: CourseProgressResponse = { progress };
  return NextResponse.json(response);
}
