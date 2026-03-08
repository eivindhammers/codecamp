import { NextResponse } from "next/server";
import { getSectionEnrollment, getUserProfile } from "@/lib/grading/submissionDb";

interface AuthResult {
  actorUserId: string;
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function getActorUserId(req: Request): string {
  return req.headers.get("x-actor-user-id")?.trim() ?? "";
}

export function requireGlobalStaff(
  req: Request
): { ok: true; value: AuthResult } | { ok: false; response: NextResponse } {
  const actorUserId = getActorUserId(req);
  if (!actorUserId) {
    return {
      ok: false,
      response: unauthorized("Missing required header: x-actor-user-id."),
    };
  }

  const profile = getUserProfile(actorUserId);
  if (!profile) {
    return {
      ok: false,
      response: unauthorized("Actor profile not found."),
    };
  }

  if (profile.role !== "instructor" && profile.role !== "ta") {
    return {
      ok: false,
      response: unauthorized("Only instructor or ta roles can perform this action."),
    };
  }

  return { ok: true, value: { actorUserId } };
}

export function requireSectionStaff(
  req: Request,
  sectionId: string
): { ok: true; value: AuthResult } | { ok: false; response: NextResponse } {
  const globalAccess = requireGlobalStaff(req);
  if (!globalAccess.ok) return globalAccess;

  const enrollment = getSectionEnrollment(sectionId, globalAccess.value.actorUserId);
  if (!enrollment || enrollment.status !== "active") {
    return {
      ok: false,
      response: unauthorized("Actor must be actively enrolled as staff in this section."),
    };
  }

  if (enrollment.role !== "instructor" && enrollment.role !== "ta") {
    return {
      ok: false,
      response: unauthorized("Actor does not have staff role in this section."),
    };
  }

  return globalAccess;
}
