import { NextResponse } from "next/server";
import { requireSectionStaff } from "@/app/api/classroom/_auth";
import { validateArchiveDestinationLabel } from "@/lib/classroom/riskAuditArchiveAutomation";
import { RiskArchiveDestinationValidation } from "@/lib/grading/contracts";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseSectionId(req: Request): string {
  const url = new URL(req.url);
  return url.searchParams.get("sectionId")?.trim() ?? "";
}

interface ValidatePayload {
  destinationLabel?: string | null;
}

export async function POST(req: Request) {
  const sectionId = parseSectionId(req);
  if (!sectionId) return badRequest("Missing required query param: sectionId.");
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  let body: ValidatePayload;
  try {
    body = (await req.json()) as ValidatePayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  if (
    body.destinationLabel !== undefined &&
    body.destinationLabel !== null &&
    typeof body.destinationLabel !== "string"
  ) {
    return badRequest("destinationLabel must be a string when provided.");
  }

  const validation: RiskArchiveDestinationValidation = validateArchiveDestinationLabel(
    body.destinationLabel ?? null
  );
  return NextResponse.json(validation);
}
