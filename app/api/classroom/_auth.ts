import { NextResponse } from "next/server";
import { parseCookie, SESSION_COOKIE } from "@/app/api/auth/_session";
import {
  getAuthSession,
  getSectionEnrollment,
  getUserProfile,
  listClassSections,
} from "@/lib/grading/submissionDb";

interface AuthResult {
  actorUserId: string;
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "1" || value === "true" || value === "yes") return true;
  if (value === "0" || value === "false" || value === "no") return false;
  return fallback;
}

function allowRoleBasedSectionStaffBypass(): boolean {
  const defaultByMode =
    (process.env.AUTH_MODE ?? "bootstrap").trim().toLowerCase() === "oidc";
  return readBooleanEnv("AUTH_SECTION_STAFF_ROLE_BYPASS", defaultByMode);
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

  if (allowRoleBasedSectionStaffBypass()) {
    return globalAccess;
  }

  const enrollment = getSectionEnrollment(sectionId, globalAccess.value.actorUserId);
  if (!enrollment) {
    const section = listClassSections().find((item) => item.sectionId === sectionId);
    if (
      section &&
      section.instructorUserId === globalAccess.value.actorUserId
    ) {
      return globalAccess;
    }
  }
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

export function requireSectionInstructor(
  req: Request,
  sectionId: string
): { ok: true; value: AuthResult } | { ok: false; response: NextResponse } {
  const sectionStaff = requireSectionStaff(req, sectionId);
  if (!sectionStaff.ok) return sectionStaff;

  if (allowRoleBasedSectionStaffBypass()) {
    const profile = getUserProfile(sectionStaff.value.actorUserId);
    if (!profile || profile.role !== "instructor") {
      return {
        ok: false,
        response: unauthorized("Only instructor roles can perform this action."),
      };
    }
    return sectionStaff;
  }

  const enrollment = getSectionEnrollment(sectionId, sectionStaff.value.actorUserId);
  if (!enrollment || enrollment.status !== "active" || enrollment.role !== "instructor") {
    return {
      ok: false,
      response: unauthorized("Actor must be an active instructor in this section."),
    };
  }

  return sectionStaff;
}
