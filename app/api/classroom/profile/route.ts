import { NextResponse } from "next/server";
import { UserProfileResponse } from "@/lib/grading/contracts";
import { getSessionProfile } from "@/app/api/auth/_session";
import { upsertUserProfile } from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

interface ProfilePayload {
  userId?: string;
  displayName?: string;
  email?: string;
}

export async function POST(req: Request) {
  let body: ProfilePayload;
  try {
    body = (await req.json()) as ProfilePayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const userId = body.userId?.trim() ?? "";
  const displayName = body.displayName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!userId || !displayName) {
    return badRequest("Missing required fields: userId, displayName.");
  }

  const actor = getSessionProfile(req);
  if (!actor) {
    return forbidden("Missing active session cookie.");
  }
  if (actor.userId !== userId) {
    return forbidden("Actor may only update their own profile.");
  }
  if (email && email !== actor.email) {
    return forbidden("Profile email must match the authenticated session identity.");
  }

  const profile = upsertUserProfile({
    userId,
    displayName,
    email: actor.email,
    role: actor.role,
  });
  const response: UserProfileResponse = { profile };
  return NextResponse.json(response);
}
