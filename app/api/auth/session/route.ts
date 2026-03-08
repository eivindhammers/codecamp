import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  AuthSessionResponse,
  ClassroomRole,
  UserProfileResponse,
} from "@/lib/grading/contracts";
import {
  createAuthSession,
  deleteAuthSession,
  getAuthSession,
  getUserProfile,
  getUserProfileByEmail,
  upsertUserProfile,
} from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

const SESSION_COOKIE = "codecamp_session";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

function getSessionTtlMs(): number {
  const configured = Number.parseInt(process.env.AUTH_SESSION_TTL_MS ?? "", 10);
  if (!Number.isFinite(configured)) return 1000 * 60 * 60 * 24 * 7;
  return Math.min(Math.max(configured, 1000 * 60 * 15), 1000 * 60 * 60 * 24 * 30);
}

function parseCookie(req: Request, key: string): string {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const match = cookies.find((entry) => entry.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : "";
}

function withSessionCookie(response: NextResponse, sessionId: string, ttlMs: number) {
  const maxAge = Math.floor(ttlMs / 1000);
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(
      sessionId
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
  return response;
}

function clearSessionCookie(response: NextResponse) {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return response;
}

interface CreateSessionPayload {
  email?: string;
  displayName?: string;
}

function getBootstrapRole(email: string): ClassroomRole {
  const configured = process.env.AUTH_BOOTSTRAP_INSTRUCTOR_EMAILS ?? "";
  const allowed = configured
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  if (allowed.includes(email)) return "instructor";
  return "student";
}

export async function POST(req: Request) {
  let body: CreateSessionPayload;
  try {
    body = (await req.json()) as CreateSessionPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    return badRequest("A valid email is required.");
  }

  const existing = getUserProfileByEmail(email);
  const bootstrapRole = getBootstrapRole(email);
  const profile =
    existing ??
    upsertUserProfile({
      userId: randomUUID(),
      displayName: body.displayName?.trim() || email.split("@")[0] || "student",
      email,
      role: bootstrapRole,
    });

  const sessionId = randomUUID();
  const ttlMs = getSessionTtlMs();
  const session = createAuthSession(sessionId, profile.userId, ttlMs);
  const response: AuthSessionResponse = { session, profile };
  return withSessionCookie(NextResponse.json(response, { status: 201 }), sessionId, ttlMs);
}

export async function GET(req: Request) {
  const sessionId = parseCookie(req, SESSION_COOKIE);
  if (!sessionId) return unauthorized("No active session.");

  const session = getAuthSession(sessionId);
  if (!session) return unauthorized("Session is invalid or expired.");

  const profile = getUserProfile(session.userId);
  if (!profile) return unauthorized("Session user profile not found.");

  const response: UserProfileResponse = { profile };
  return NextResponse.json(response);
}

export async function DELETE(req: Request) {
  const sessionId = parseCookie(req, SESSION_COOKIE);
  if (sessionId) {
    deleteAuthSession(sessionId);
  }
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
