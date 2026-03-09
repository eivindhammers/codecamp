import { NextResponse } from "next/server";
import { SectionAssignmentBreakdownResponse } from "@/lib/grading/contracts";
import { listSectionAssignmentBreakdown } from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId")?.trim() ?? "";
  if (!sectionId) {
    return badRequest("Missing required query param: sectionId.");
  }
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  const assignments = listSectionAssignmentBreakdown(sectionId);
  const response: SectionAssignmentBreakdownResponse = { assignments };
  return NextResponse.json(response);
}
