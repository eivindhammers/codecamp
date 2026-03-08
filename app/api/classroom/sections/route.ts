import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ClassSectionsResponse } from "@/lib/grading/contracts";
import {
  countClassSections,
  createClassSection,
  getUserProfile,
  listClassSections,
} from "@/lib/grading/submissionDb";
import { requireGlobalStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

interface CreateSectionPayload {
  termId?: string;
  courseSlug?: string;
  title?: string;
  instructorUserId?: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const termId = url.searchParams.get("termId")?.trim() ?? "";
  const courseSlug = url.searchParams.get("courseSlug")?.trim() ?? "";
  const search = url.searchParams.get("search")?.trim() ?? "";
  const sortRaw = url.searchParams.get("sort")?.trim().toLowerCase() ?? "";
  const sort =
    sortRaw === "created_asc" ||
    sortRaw === "created_desc" ||
    sortRaw === "title_asc" ||
    sortRaw === "title_desc"
      ? sortRaw
      : "created_desc";
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const offsetRaw = Number.parseInt(url.searchParams.get("offset") ?? "", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
  const options = {
    termId: termId || undefined,
    courseSlug: courseSlug || undefined,
    search: search || undefined,
    sort,
    limit,
    offset,
  } as const;
  const sections = listClassSections(options);
  const totalCount = countClassSections(options);
  const response: ClassSectionsResponse = { sections, totalCount, limit, offset };
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  const auth = requireGlobalStaff(req);
  if (!auth.ok) return auth.response;
  const actorProfile = getUserProfile(auth.value.actorUserId);
  if (!actorProfile) {
    return forbidden("Actor profile not found.");
  }
  if (actorProfile.role !== "instructor") {
    return forbidden("Only instructors can create sections.");
  }

  let body: CreateSectionPayload;
  try {
    body = (await req.json()) as CreateSectionPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const termId = body.termId?.trim() ?? "";
  const courseSlug = body.courseSlug?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const instructorUserId = body.instructorUserId?.trim() ?? "";
  if (!termId || !courseSlug || !title || !instructorUserId) {
    return badRequest(
      "Missing required fields: termId, courseSlug, title, instructorUserId."
    );
  }

  if (auth.value.actorUserId !== instructorUserId) {
    return badRequest("instructorUserId must match the authenticated instructor.");
  }

  const section = createClassSection({
    sectionId: randomUUID(),
    termId,
    courseSlug,
    title,
    instructorUserId,
  });
  return NextResponse.json(section, { status: 201 });
}
