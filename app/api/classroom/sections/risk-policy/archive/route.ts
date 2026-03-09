import { NextResponse } from "next/server";
import {
  RiskAuditArchiveCadence,
  SectionRiskArchivePolicyRecord,
  SectionRiskArchivePolicyResponse,
} from "@/lib/grading/contracts";
import {
  getSectionRiskArchivePolicy,
  listClassSections,
  upsertSectionRiskArchivePolicy,
} from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_CADENCE: RiskAuditArchiveCadence[] = ["daily", "weekly", "monthly"];

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseSectionId(req: Request): string {
  const url = new URL(req.url);
  return url.searchParams.get("sectionId")?.trim() ?? "";
}

function readNumberEnv(name: string, fallback: number, min: number, max: number): number {
  const configured = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(configured)) return fallback;
  return Math.min(Math.max(configured, min), max);
}

function getDefaultCadence(): RiskAuditArchiveCadence {
  const configured = (process.env.CLASSROOM_RISK_ARCHIVE_DEFAULT_CADENCE ?? "")
    .trim()
    .toLowerCase();
  if (configured === "daily" || configured === "weekly" || configured === "monthly") {
    return configured;
  }
  return "weekly";
}

function getDefaultRetentionDays(): number {
  return readNumberEnv("CLASSROOM_RISK_ARCHIVE_DEFAULT_RETENTION_DAYS", 180, 7, 3650);
}

function cadenceIntervalMs(cadence: RiskAuditArchiveCadence): number {
  if (cadence === "daily") return DAY_MS;
  if (cadence === "weekly") return 7 * DAY_MS;
  return 30 * DAY_MS;
}

function getDefaultPolicy(sectionId: string): SectionRiskArchivePolicyRecord {
  return {
    sectionId,
    enabled: false,
    cadence: getDefaultCadence(),
    retentionDays: getDefaultRetentionDays(),
    destinationLabel: null,
    lastArchivedAt: null,
    updatedAt: Date.now(),
  };
}

function toResponse(
  policy: SectionRiskArchivePolicyRecord
): SectionRiskArchivePolicyResponse {
  const anchor = policy.lastArchivedAt ?? policy.updatedAt;
  return {
    policy,
    nextArchiveAt: anchor + cadenceIntervalMs(policy.cadence),
  };
}

function ensureSectionExists(sectionId: string) {
  const section = listClassSections().find((item) => item.sectionId === sectionId);
  if (!section) {
    throw new Error("Unknown sectionId.");
  }
}

interface SaveArchivePolicyPayload {
  enabled?: boolean;
  cadence?: RiskAuditArchiveCadence;
  retentionDays?: number;
  destinationLabel?: string | null;
}

function parsePayload(
  sectionId: string,
  body: SaveArchivePolicyPayload
): Omit<SectionRiskArchivePolicyRecord, "lastArchivedAt" | "updatedAt"> {
  if (typeof body.enabled !== "boolean") {
    throw new Error("enabled is required and must be a boolean.");
  }
  if (!body.cadence || !ALLOWED_CADENCE.includes(body.cadence)) {
    throw new Error("cadence must be one of: daily, weekly, monthly.");
  }
  if (typeof body.retentionDays !== "number" || !Number.isFinite(body.retentionDays)) {
    throw new Error("retentionDays must be a finite number.");
  }
  if (body.retentionDays < 7 || body.retentionDays > 3650) {
    throw new Error("retentionDays must be between 7 and 3650.");
  }
  if (
    body.destinationLabel !== undefined &&
    body.destinationLabel !== null &&
    typeof body.destinationLabel !== "string"
  ) {
    throw new Error("destinationLabel must be a string when provided.");
  }

  const destinationLabel =
    body.destinationLabel === undefined || body.destinationLabel === null
      ? null
      : body.destinationLabel.trim() || null;

  return {
    sectionId,
    enabled: body.enabled,
    cadence: body.cadence,
    retentionDays: Math.round(body.retentionDays),
    destinationLabel,
  };
}

export async function GET(req: Request) {
  const sectionId = parseSectionId(req);
  if (!sectionId) return badRequest("Missing required query param: sectionId.");
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  ensureSectionExists(sectionId);

  const savedPolicy = getSectionRiskArchivePolicy(sectionId);
  return NextResponse.json(toResponse(savedPolicy ?? getDefaultPolicy(sectionId)));
}

export async function PUT(req: Request) {
  const sectionId = parseSectionId(req);
  if (!sectionId) return badRequest("Missing required query param: sectionId.");
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  ensureSectionExists(sectionId);

  let body: SaveArchivePolicyPayload;
  try {
    body = (await req.json()) as SaveArchivePolicyPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  try {
    const parsed = parsePayload(sectionId, body);
    const policy = upsertSectionRiskArchivePolicy(parsed);
    return NextResponse.json(toResponse(policy));
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : "Failed to save archive policy."
    );
  }
}
