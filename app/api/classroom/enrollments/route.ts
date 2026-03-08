import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ClassroomRole,
  SectionEnrollmentsResponse,
} from "@/lib/grading/contracts";
import {
  enrollUserInSection,
  listSectionEnrollments,
} from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

interface EnrollPayload {
  sectionId?: string;
  userId?: string;
  role?: ClassroomRole;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId")?.trim() ?? "";
  if (!sectionId) {
    return badRequest("Missing required query param: sectionId.");
  }
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  const enrollments = listSectionEnrollments(sectionId);
  const response: SectionEnrollmentsResponse = { enrollments };
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  let body: EnrollPayload;
  try {
    body = (await req.json()) as EnrollPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const sectionId = body.sectionId?.trim() ?? "";
  const userId = body.userId?.trim() ?? "";
  const role = body.role;
  if (!sectionId || !userId || !role) {
    return badRequest("Missing required fields: sectionId, userId, role.");
  }

  if (!["student", "instructor", "ta"].includes(role)) {
    return badRequest("role must be one of: student, instructor, ta.");
  }
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  const enrollment = enrollUserInSection({
    enrollmentId: randomUUID(),
    sectionId,
    userId,
    role,
  });
  return NextResponse.json(enrollment, { status: 201 });
}
