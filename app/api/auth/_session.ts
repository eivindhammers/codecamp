import { randomUUID } from "node:crypto";
import {
  AuthSessionResponse,
  ClassroomRole,
  UserProfileRecord,
} from "@/lib/grading/contracts";
import {
  createAuthSession,
  deleteAuthSession,
  getAuthSession,
  getUserProfile,
  getUserProfileByEmail,
  upsertUserProfile,
} from "@/lib/grading/submissionDb";

export const SESSION_COOKIE = "codecamp_session";

export function getSessionTtlMs(): number {
  const configured = Number.parseInt(process.env.AUTH_SESSION_TTL_MS ?? "", 10);
  if (!Number.isFinite(configured)) return 1000 * 60 * 60 * 24 * 7;
  return Math.min(Math.max(configured, 1000 * 60 * 15), 1000 * 60 * 60 * 24 * 30);
}

export function parseCookie(req: Request, key: string): string {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const match = cookies.find((entry) => entry.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : "";
}

function buildCookieBase(maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function setSessionCookieHeaders(headers: Headers, sessionId: string, ttlMs: number) {
  const maxAge = Math.floor(ttlMs / 1000);
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; ${buildCookieBase(maxAge)}`
  );
}

export function clearSessionCookieHeaders(headers: Headers) {
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; ${buildCookieBase(0)}`
  );
}

export function getBootstrapRole(email: string): ClassroomRole {
  const configured = process.env.AUTH_BOOTSTRAP_INSTRUCTOR_EMAILS ?? "";
  const allowed = configured
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  if (allowed.includes(email)) return "instructor";
  return "student";
}

export function resolveProfileFromEmail(emailRaw: string, displayName?: string): UserProfileRecord {
  const email = emailRaw.trim().toLowerCase();
  const existing = getUserProfileByEmail(email);
  if (existing) return existing;

  return upsertUserProfile({
    userId: randomUUID(),
    displayName: displayName?.trim() || email.split("@")[0] || "student",
    email,
    role: getBootstrapRole(email),
  });
}

interface UpsertIdentityProfileInput {
  emailRaw: string;
  displayName?: string;
  role?: ClassroomRole;
}

export function upsertProfileFromIdentity(input: UpsertIdentityProfileInput): UserProfileRecord {
  const email = input.emailRaw.trim().toLowerCase();
  const existing = getUserProfileByEmail(email);
  const role = input.role ?? existing?.role ?? getBootstrapRole(email);
  const userId = existing?.userId ?? randomUUID();
  const displayName =
    input.displayName?.trim() || existing?.displayName || email.split("@")[0] || "student";

  return upsertUserProfile({
    userId,
    displayName,
    email,
    role,
  });
}

export function createSessionForProfile(profile: UserProfileRecord): {
  sessionId: string;
  ttlMs: number;
  response: AuthSessionResponse;
} {
  const sessionId = randomUUID();
  const ttlMs = getSessionTtlMs();
  const session = createAuthSession(sessionId, profile.userId, ttlMs);
  return {
    sessionId,
    ttlMs,
    response: { session, profile },
  };
}

export function getSessionProfile(req: Request): UserProfileRecord | undefined {
  const sessionId = parseCookie(req, SESSION_COOKIE);
  if (!sessionId) return undefined;
  const session = getAuthSession(sessionId);
  if (!session) return undefined;
  return getUserProfile(session.userId);
}

export function destroySession(req: Request) {
  const sessionId = parseCookie(req, SESSION_COOKIE);
  if (sessionId) deleteAuthSession(sessionId);
}
