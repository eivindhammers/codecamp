import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  SubmissionRequest,
  SubmissionStatusResponse,
} from "@/lib/grading/contracts";
import {
  createSubmission,
  updateSubmissionStatus,
} from "@/lib/grading/submissionDb";
import {
  getSubmissionQueue,
  submissionJobName,
  SubmissionJobData,
} from "@/lib/queue/submissionQueue";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  let body: SubmissionRequest;

  try {
    body = (await req.json()) as SubmissionRequest;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  if (!body.exerciseId || !body.language || typeof body.code !== "string") {
    return badRequest("Missing required fields: userId, courseSlug, chapterId, exerciseId, xp, language, code.");
  }

  if (
    !body.userId ||
    !body.courseSlug ||
    !body.chapterId ||
    typeof body.xp !== "number" ||
    body.xp < 0
  ) {
    return badRequest("Invalid fields: userId, courseSlug, chapterId, xp.");
  }

  if (body.language !== "r") {
    return badRequest("Only R server-side grading is enabled in this milestone.");
  }

  const submissionId = randomUUID();

  createSubmission({
    submissionId,
    userId: body.userId,
    courseSlug: body.courseSlug,
    chapterId: body.chapterId,
    exerciseId: body.exerciseId,
    xp: body.xp,
    language: body.language,
    code: body.code,
  });

  try {
    const submissionQueue = getSubmissionQueue();
    await (submissionQueue as unknown as {
      add: (
        name: string,
        data: SubmissionJobData,
        opts: { jobId: string; removeOnComplete: number; removeOnFail: number }
      ) => Promise<unknown>;
    }).add(
      submissionJobName,
      { submissionId },
      { jobId: submissionId, removeOnComplete: 1000, removeOnFail: 1000 }
    );
  } catch (error) {
    updateSubmissionStatus(submissionId, "completed", {
      status: "error",
      feedback: [
        error instanceof Error
          ? `Failed to enqueue submission: ${error.message}`
          : "Failed to enqueue submission.",
      ],
      tests: [],
    });
  }

  const response: SubmissionStatusResponse = {
    submissionId,
    status: "queued",
  };

  return NextResponse.json(response, { status: 202 });
}
