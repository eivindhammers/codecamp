import { NextResponse } from "next/server";
import {
  getAuthSession,
  getSectionEnrollment,
  getUserProfile,
} from "@/lib/grading/submissionDb";

interface AuthResult {
  actorUserId: string;
}

const SESSION_COOKIE = "codecamp_session";

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function parseCookie(req: Request, key: string): string {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const match = cookies.find((entry) => entry.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : "";
}

export function requireGlobalStaff(
  req: Request
): { ok: true; value: AuthResult } | { ok: false; response: NextResponse } {
  const sessionId = parseCookie(req, SESSION_COOKIE);
  if (!sessionId) {
    return {
      ok: false,
      response: unauthorized("Missing active session cookie."),
    };
  }

  const session = getAuthSession(sessionId);
  if (!session) {
    return {
      ok: false,
      response: unauthorized("Session is invalid or expired."),
    };
  }

  const profile = getUserProfile(session.userId);
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

  return { ok: true, value: { actorUserId: profile.userId } };
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
