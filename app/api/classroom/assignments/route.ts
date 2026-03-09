import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { courses } from "@/lib/courses";
import { AssignmentsResponse } from "@/lib/grading/contracts";
import {
  createAssignment,
  getUserProfile,
  listAcademicTerms,
  listClassSections,
  listSectionAssignments,
} from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ASSIGNMENT_MAX_DUE_DAYS_AHEAD = 180;
const DEFAULT_ASSIGNMENT_PACING_EARLY_TOLERANCE_DAYS = 14;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getChapterPacingStart(
  termStartsAt: number,
  termEndsAt: number,
  chapterIndex: number,
  chapterCount: number
): number {
  if (chapterCount <= 1) return termStartsAt;
  const duration = Math.max(termEndsAt - termStartsAt, 0);
  const chapterOffset = duration * (chapterIndex / chapterCount);
  return termStartsAt + Math.floor(chapterOffset);
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
  const actorProfile = getUserProfile(auth.value.actorUserId);
  if (!actorProfile) {
    return forbidden("Actor profile not found.");
  }
  if (actorProfile.role !== "instructor") {
    return forbidden("Only instructors can create assignments.");
  }

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

    const maxDueDaysAhead = readPositiveIntEnv(
      "CLASSROOM_ASSIGNMENT_MAX_DUE_DAYS_AHEAD",
      DEFAULT_ASSIGNMENT_MAX_DUE_DAYS_AHEAD
    );
    const maxAllowedDueAt = Date.now() + maxDueDaysAhead * DAY_MS;
    if (dueAt > maxAllowedDueAt) {
      return badRequest(
        `dueAt exceeds max publish horizon (${maxDueDaysAhead} days ahead).`
      );
    }

    const chapterIndex = course.chapters.findIndex((item) => item.id === chapterId);
    if (chapterIndex < 0) {
      return badRequest("Assignment must target a valid chapter in the course.");
    }
    const pacingToleranceDays = readPositiveIntEnv(
      "CLASSROOM_ASSIGNMENT_PACING_EARLY_TOLERANCE_DAYS",
      DEFAULT_ASSIGNMENT_PACING_EARLY_TOLERANCE_DAYS
    );
    const recommendedStart = getChapterPacingStart(
      term.startsAt,
      term.endsAt,
      chapterIndex,
      course.chapters.length
    );
    const earliestAllowedDueAt = recommendedStart - pacingToleranceDays * DAY_MS;
    if (dueAt < earliestAllowedDueAt) {
      return badRequest(
        `dueAt is too early for chapter pacing (allowed ${pacingToleranceDays} days before chapter window).`
      );
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
