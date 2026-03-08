import { NextResponse } from "next/server";
import {
  RiskAuditArchiveRunStatus,
  SectionRiskArchiveReportResponse,
} from "@/lib/grading/contracts";
import {
  getUserProfile,
  getSectionRiskArchiveReport,
  listClassSections,
  listSectionRiskArchiveRuns,
  recordSectionRiskArchiveRun,
} from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function parseSectionId(req: Request): string {
  const url = new URL(req.url);
  return url.searchParams.get("sectionId")?.trim() ?? "";
}

function parseWindowDays(req: Request): number {
  const url = new URL(req.url);
  const raw = Number.parseInt(url.searchParams.get("windowDays") ?? "", 10);
  if (!Number.isFinite(raw)) return 30;
  return Math.min(Math.max(raw, 1), 3650);
}

function parseLimit(req: Request): number {
  const url = new URL(req.url);
  const raw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  if (!Number.isFinite(raw)) return 10;
  return Math.min(Math.max(raw, 1), 100);
}

function ensureSectionExists(sectionId: string) {
  const section = listClassSections().find((item) => item.sectionId === sectionId);
  if (!section) {
    throw new Error("Unknown sectionId.");
  }
}

interface RecordArchiveRunPayload {
  status?: RiskAuditArchiveRunStatus;
  archivedRecords?: number;
  errorMessage?: string;
}

function parseStatus(value: unknown): RiskAuditArchiveRunStatus {
  if (value === "success" || value === "failure") return value;
  throw new Error("status must be one of: success, failure.");
}

function parseArchivedRecords(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("archivedRecords must be a finite number.");
  }
  if (value < 0 || value > 1_000_000) {
    throw new Error("archivedRecords must be between 0 and 1000000.");
  }
  return Math.round(value);
}

function parseErrorMessage(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error("errorMessage must be a string when provided.");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(req: Request) {
  const sectionId = parseSectionId(req);
  if (!sectionId) return badRequest("Missing required query param: sectionId.");
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  ensureSectionExists(sectionId);

  const response: SectionRiskArchiveReportResponse = {
    report: getSectionRiskArchiveReport(sectionId, parseWindowDays(req)),
    recentRuns: listSectionRiskArchiveRuns(sectionId, { limit: parseLimit(req) }),
  };
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  const sectionId = parseSectionId(req);
  if (!sectionId) return badRequest("Missing required query param: sectionId.");
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  const actorProfile = getUserProfile(auth.value.actorUserId);
  if (!actorProfile) {
    return forbidden("Actor profile not found.");
  }
  if (actorProfile.role !== "instructor") {
    return forbidden("Only instructors can record archive runs.");
  }
  ensureSectionExists(sectionId);

  let body: RecordArchiveRunPayload;
  try {
    body = (await req.json()) as RecordArchiveRunPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  try {
    const status = parseStatus(body.status);
    const archivedRecords = parseArchivedRecords(body.archivedRecords);
    const errorMessage = parseErrorMessage(body.errorMessage);
    if (status === "failure" && !errorMessage) {
      return badRequest("errorMessage is required when status is failure.");
    }
    if (status === "success" && errorMessage) {
      return badRequest("errorMessage must be omitted for successful runs.");
    }
    const run = recordSectionRiskArchiveRun({
      sectionId,
      status,
      archivedRecords,
      errorMessage,
      actorUserId: auth.value.actorUserId,
    });
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : "Failed to record archive run."
    );
  }
}
