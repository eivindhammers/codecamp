import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AcademicTermsResponse } from "@/lib/grading/contracts";
import {
  createAcademicTerm,
  getUserProfile,
  listAcademicTerms,
} from "@/lib/grading/submissionDb";
import { requireGlobalStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

interface CreateTermPayload {
  title?: string;
  startsAt?: number;
  endsAt?: number;
}

export async function GET() {
  const terms = listAcademicTerms();
  const response: AcademicTermsResponse = { terms };
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
    return forbidden("Only instructors can create academic terms.");
  }

  let body: CreateTermPayload;
  try {
    body = (await req.json()) as CreateTermPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const title = body.title?.trim() ?? "";
  const startsAt = body.startsAt;
  const endsAt = body.endsAt;
  if (!title || typeof startsAt !== "number" || typeof endsAt !== "number") {
    return badRequest("Missing required fields: title, startsAt, endsAt.");
  }
  if (endsAt <= startsAt) {
    return badRequest("endsAt must be greater than startsAt.");
  }

  const term = createAcademicTerm({
    termId: randomUUID(),
    title,
    startsAt,
    endsAt,
  });
  return NextResponse.json(term, { status: 201 });
}
