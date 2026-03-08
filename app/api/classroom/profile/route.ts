import { NextResponse } from "next/server";
import { UserProfileResponse } from "@/lib/grading/contracts";
import { upsertUserProfile } from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
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

  if (!userId || !displayName || !email) {
    return badRequest("Missing required fields: userId, displayName, email.");
  }

  const profile = upsertUserProfile({
    userId,
    displayName,
    email,
    role: "student",
  });
  const response: UserProfileResponse = { profile };
  return NextResponse.json(response);
}
