import { NextResponse } from "next/server";
import {
  ClassroomRiskConfig,
  SectionRiskPolicyResponse,
} from "@/lib/grading/contracts";
import {
  deleteSectionRiskPolicy,
  getSectionRiskPolicy,
  listSectionRiskPolicyAudit,
  listClassSections,
  recordSectionRiskPolicyAudit,
  upsertSectionRiskPolicy,
} from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";
import {
  applySectionRiskPolicy,
  getClassroomRiskDefaults,
} from "@/app/api/classroom/_riskConfig";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseSectionId(req: Request): string {
  const url = new URL(req.url);
  return url.searchParams.get("sectionId")?.trim() ?? "";
}

function parseLimit(req: Request): number {
  const url = new URL(req.url);
  const raw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  if (!Number.isFinite(raw)) return 10;
  return Math.min(Math.max(raw, 1), 100);
}

function parseAction(req: Request): "upsert" | "reset" | undefined {
  const url = new URL(req.url);
  const action = (url.searchParams.get("action") ?? "").trim().toLowerCase();
  if (action === "upsert" || action === "reset") return action;
  return undefined;
}

function parseActorSearch(req: Request): string | undefined {
  const url = new URL(req.url);
  const value = (url.searchParams.get("actor") ?? "").trim();
  return value.length > 0 ? value : undefined;
}

function parseNumber(
  value: unknown,
  field: string,
  min: number,
  max: number
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number.`);
  }
  if (value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}

function parseBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean.`);
  }
  return value;
}

interface SaveRiskPolicyPayload {
  minAttemptsAtRisk?: number;
  maxCompletionRateAtRisk?: number;
  overdueIncompleteFlagsAtRisk?: boolean;
  maxCompletionRateStalledAssignment?: number;
}

function getEffective(
  sectionId: string,
  options?: { limit?: number; action?: "upsert" | "reset"; actorUserIdContains?: string }
) {
  const defaults = getClassroomRiskDefaults();
  const policy = getSectionRiskPolicy(sectionId);
  const effectiveConfig = applySectionRiskPolicy(defaults, policy);
  const history = listSectionRiskPolicyAudit(sectionId, {
    limit: options?.limit ?? 10,
    action: options?.action,
    actorUserIdContains: options?.actorUserIdContains,
  });
  return { policy, effectiveConfig, history };
}

function ensureSectionExists(sectionId: string) {
  const section = listClassSections().find((item) => item.sectionId === sectionId);
  if (!section) {
    throw new Error("Unknown sectionId.");
  }
}

export async function GET(req: Request) {
  const sectionId = parseSectionId(req);
  if (!sectionId) return badRequest("Missing required query param: sectionId.");
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  ensureSectionExists(sectionId);

  const response: SectionRiskPolicyResponse = getEffective(sectionId, {
    limit: parseLimit(req),
    action: parseAction(req),
    actorUserIdContains: parseActorSearch(req),
  });
  return NextResponse.json(response);
}

export async function PUT(req: Request) {
  const sectionId = parseSectionId(req);
  if (!sectionId) return badRequest("Missing required query param: sectionId.");
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  ensureSectionExists(sectionId);

  let body: SaveRiskPolicyPayload;
  try {
    body = (await req.json()) as SaveRiskPolicyPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  try {
    const defaults = getClassroomRiskDefaults();
    const policy = upsertSectionRiskPolicy({
      sectionId,
      minAttemptsAtRisk:
        parseNumber(body.minAttemptsAtRisk, "minAttemptsAtRisk", 1, 100) ??
        defaults.minAttemptsAtRisk,
      maxCompletionRateAtRisk:
        parseNumber(body.maxCompletionRateAtRisk, "maxCompletionRateAtRisk", 0, 100) ??
        defaults.maxCompletionRateAtRisk,
      overdueIncompleteFlagsAtRisk:
        parseBoolean(
          body.overdueIncompleteFlagsAtRisk,
          "overdueIncompleteFlagsAtRisk"
        ) ?? defaults.overdueIncompleteFlagsAtRisk,
      maxCompletionRateStalledAssignment:
        parseNumber(
          body.maxCompletionRateStalledAssignment,
          "maxCompletionRateStalledAssignment",
          0,
          100
        ) ?? defaults.maxCompletionRateStalledAssignment,
    });
    recordSectionRiskPolicyAudit({
      sectionId,
      actorUserId: auth.value.actorUserId,
      action: "upsert",
      policy,
    });
    const effectiveConfig: ClassroomRiskConfig = applySectionRiskPolicy(defaults, policy);
    const response: SectionRiskPolicyResponse = {
      policy,
      effectiveConfig,
      history: listSectionRiskPolicyAudit(sectionId, { limit: 10 }),
    };
    return NextResponse.json(response);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Failed to save risk policy.");
  }
}

export async function DELETE(req: Request) {
  const sectionId = parseSectionId(req);
  if (!sectionId) return badRequest("Missing required query param: sectionId.");
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  ensureSectionExists(sectionId);

  deleteSectionRiskPolicy(sectionId);
  recordSectionRiskPolicyAudit({
    sectionId,
    actorUserId: auth.value.actorUserId,
    action: "reset",
  });
  const response: SectionRiskPolicyResponse = getEffective(sectionId);
  return NextResponse.json(response);
}
