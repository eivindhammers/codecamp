import { NextResponse } from "next/server";
import { AttemptsResponse } from "@/lib/grading/contracts";
import { listAttempts } from "@/lib/grading/submissionDb";

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
  const limitRaw = url.searchParams.get("limit")?.trim() ?? "";

  if (!userId || !courseSlug) {
    return badRequest("Missing required query params: userId, courseSlug.");
  }

  const hasChapter = Boolean(chapterId);
  const hasExercise = Boolean(exerciseId);
  if (hasChapter !== hasExercise) {
    return badRequest("chapterId and exerciseId must be provided together.");
  }

  const parsedLimit =
    limitRaw.length > 0 ? Number.parseInt(limitRaw, 10) : undefined;
  if (
    limitRaw.length > 0 &&
    (parsedLimit === undefined || !Number.isFinite(parsedLimit) || parsedLimit < 1)
  ) {
    return badRequest("limit must be a positive integer when provided.");
  }

  const attempts = listAttempts({
    userId,
    courseSlug,
    chapterId: hasChapter ? chapterId : undefined,
    exerciseId: hasExercise ? exerciseId : undefined,
    limit: parsedLimit,
  });

  const response: AttemptsResponse = { attempts };
  return NextResponse.json(response);
}
