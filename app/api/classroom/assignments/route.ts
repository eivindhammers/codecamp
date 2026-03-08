import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AssignmentsResponse } from "@/lib/grading/contracts";
import {
  createAssignment,
  listSectionAssignments,
} from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

interface CreateAssignmentPayload {
  sectionId?: string;
  courseSlug?: string;
  chapterId?: string;
  exerciseId?: string;
  title?: string;
  dueAt?: number;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId")?.trim() ?? "";
  if (!sectionId) {
    return badRequest("Missing required query param: sectionId.");
  }
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  const assignments = listSectionAssignments(sectionId);
  const response: AssignmentsResponse = { assignments };
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  let body: CreateAssignmentPayload;
  try {
    body = (await req.json()) as CreateAssignmentPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const sectionId = body.sectionId?.trim() ?? "";
  const courseSlug = body.courseSlug?.trim() ?? "";
  const chapterId = body.chapterId?.trim() ?? "";
  const exerciseId = body.exerciseId?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const dueAt = body.dueAt;

  if (!sectionId || !courseSlug || !chapterId || !exerciseId || !title) {
    return badRequest(
      "Missing required fields: sectionId, courseSlug, chapterId, exerciseId, title."
    );
  }

  if (dueAt !== undefined && typeof dueAt !== "number") {
    return badRequest("dueAt must be a unix timestamp when provided.");
  }
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  const assignment = createAssignment({
    assignmentId: randomUUID(),
    sectionId,
    courseSlug,
    chapterId,
    exerciseId,
    title,
    dueAt,
  });
  return NextResponse.json(assignment, { status: 201 });
}
