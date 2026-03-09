import { NextResponse } from "next/server";
import { RiskArchiveAutomationResponse } from "@/lib/grading/contracts";
import {
  executeDueRiskAuditArchives,
  executeSectionRiskAuditArchive,
} from "@/lib/classroom/riskAuditArchiveAutomation";
import { getUserProfile, listClassSections } from "@/lib/grading/submissionDb";
import { requireGlobalStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

interface RunArchivePayload {
  sectionId?: string;
}

function ensureSectionExists(sectionId: string) {
  const exists = listClassSections().some((section) => section.sectionId === sectionId);
  if (!exists) {
    throw new Error("Unknown sectionId.");
  }
}

export async function POST(req: Request) {
  const auth = requireGlobalStaff(req);
  if (!auth.ok) return auth.response;
  const actorProfile = getUserProfile(auth.value.actorUserId);
  if (!actorProfile) {
    return forbidden("Actor profile not found.");
  }
  if (actorProfile.role !== "instructor") {
    return forbidden("Only instructors can run archive automation.");
  }

  let body: RunArchivePayload = {};
  try {
    body = (await req.json()) as RunArchivePayload;
  } catch {
    body = {};
  }

  const sectionId = body.sectionId?.trim();
  const executedAt = Date.now();
  try {
    if (sectionId && sectionId.length > 0) {
      ensureSectionExists(sectionId);
      const item = await executeSectionRiskAuditArchive(
        sectionId,
        auth.value.actorUserId,
        executedAt
      );
      const response: RiskArchiveAutomationResponse = {
        executedAt,
        processed: [item],
      };
      return NextResponse.json(response);
    }

    const response = await executeDueRiskAuditArchives(
      auth.value.actorUserId,
      executedAt
    );
    return NextResponse.json(response);
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : "Failed to execute archive automation."
    );
  }
}
