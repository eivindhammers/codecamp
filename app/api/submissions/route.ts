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
    return badRequest("Missing required fields: exerciseId, language, code.");
  }

  if (body.language !== "r") {
    return badRequest("Only R server-side grading is enabled in this milestone.");
  }

  const submissionId = randomUUID();

  createSubmission({
    submissionId,
    exerciseId: body.exerciseId,
    language: body.language,
    code: body.code,
  });

  try {
    const submissionQueue = getSubmissionQueue();
    const addToQueue = submissionQueue.add as unknown as (
      name: string,
      data: SubmissionJobData,
      opts: { jobId: string; removeOnComplete: number; removeOnFail: number }
    ) => Promise<unknown>;

    await addToQueue(
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
