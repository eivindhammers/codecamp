import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ClassSectionsResponse } from "@/lib/grading/contracts";
import { createClassSection, listClassSections } from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
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
  const sections = listClassSections(termId || undefined);
  const response: ClassSectionsResponse = { sections };
  return NextResponse.json(response);
}

export async function POST(req: Request) {
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

  const section = createClassSection({
    sectionId: randomUUID(),
    termId,
    courseSlug,
    title,
    instructorUserId,
  });
  return NextResponse.json(section, { status: 201 });
}
