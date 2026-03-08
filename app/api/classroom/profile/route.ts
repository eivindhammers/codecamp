import { NextResponse } from "next/server";
import { UserProfileResponse, ClassroomRole } from "@/lib/grading/contracts";
import { upsertUserProfile } from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

interface ProfilePayload {
  userId?: string;
  displayName?: string;
  email?: string;
  role?: ClassroomRole;
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
  const role = body.role;

  if (!userId || !displayName || !email || !role) {
    return badRequest("Missing required fields: userId, displayName, email, role.");
  }

  if (!["student", "instructor", "ta"].includes(role)) {
    return badRequest("role must be one of: student, instructor, ta.");
  }

  const profile = upsertUserProfile({ userId, displayName, email, role });
  const response: UserProfileResponse = { profile };
  return NextResponse.json(response);
}
