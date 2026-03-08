import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { courses } from "@/lib/courses";
import { AssignmentsResponse } from "@/lib/grading/contracts";
import {
  createAssignment,
  listAcademicTerms,
  listClassSections,
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
  if (dueAt !== undefined && !Number.isFinite(dueAt)) {
    return badRequest("dueAt must be a finite unix timestamp when provided.");
  }
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  const section = listClassSections().find((item) => item.sectionId === sectionId);
  if (!section) {
    return badRequest("Unknown sectionId.");
  }
  if (section.courseSlug !== courseSlug) {
    return badRequest("courseSlug must match the section course.");
  }

  const course = courses.find((item) => item.slug === courseSlug);
  const chapter = course?.chapters.find((item) => item.id === chapterId);
  const exercise = chapter?.exercises.find((item) => item.id === exerciseId);
  if (!course || !chapter || !exercise) {
    return badRequest("Assignment must target a valid course/chapter/exercise.");
  }

  if (dueAt !== undefined) {
    const term = listAcademicTerms().find((item) => item.termId === section.termId);
    if (!term) {
      return badRequest("Section term is missing.");
    }
    if (dueAt < term.startsAt || dueAt > term.endsAt) {
      return badRequest("dueAt must be within the section term window.");
    }
  }

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
