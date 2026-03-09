import { NextResponse } from "next/server";
import { getSubmission } from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const submission = getSubmission(id);

  if (!submission) {
    return NextResponse.json(
      { error: `Submission '${id}' was not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(submission);
}
