import { NextResponse } from "next/server";
import { AuthSessionResponse, UserProfileResponse } from "@/lib/grading/contracts";
import {
  clearSessionCookieHeaders,
  createSessionForProfile,
  destroySession,
  getSessionProfile,
  resolveProfileFromEmail,
  setSessionCookieHeaders,
} from "@/app/api/auth/_session";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

interface CreateSessionPayload {
  email?: string;
  displayName?: string;
}

export async function POST(req: Request) {
  const authMode = (process.env.AUTH_MODE ?? "bootstrap").trim().toLowerCase();
  if (authMode === "oidc") {
    return badRequest("Email bootstrap sign-in is disabled when AUTH_MODE=oidc.");
  }

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

  const profile = resolveProfileFromEmail(email, body.displayName);
  const { sessionId, ttlMs, response } = createSessionForProfile(profile);
  const nextResponse = NextResponse.json(response as AuthSessionResponse, { status: 201 });
  setSessionCookieHeaders(nextResponse.headers, sessionId, ttlMs);
  return nextResponse;
}

export async function GET(req: Request) {
  const profile = getSessionProfile(req);
  if (!profile) return unauthorized("Session user profile not found.");

  const response: UserProfileResponse = { profile };
  return NextResponse.json(response);
}

export async function DELETE(req: Request) {
  destroySession(req);
  const response = NextResponse.json({ ok: true });
  clearSessionCookieHeaders(response.headers);
  return response;
}
