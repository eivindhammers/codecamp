import { NextResponse } from "next/server";
import { SectionOverviewResponse } from "@/lib/grading/contracts";
import {
  getSectionRiskArchivePolicy,
  getSectionRiskArchiveReport,
  getSectionRiskPolicy,
  listClassSections,
  listSectionAssignmentBreakdown,
  listSectionAssignments,
  listSectionGradeSummary,
  listSectionLearnerMetrics,
  listSectionRiskArchiveRuns,
  listSectionRiskPolicyAudit,
} from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";
import {
  applySectionRiskPolicy,
  getClassroomRiskDefaults,
} from "@/app/api/classroom/_riskConfig";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

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

function getDefaultCadence(): "daily" | "weekly" | "monthly" {
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

function cadenceIntervalMs(cadence: "daily" | "weekly" | "monthly"): number {
  if (cadence === "daily") return DAY_MS;
  if (cadence === "weekly") return 7 * DAY_MS;
  return 30 * DAY_MS;
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

  const defaults = getClassroomRiskDefaults();
  const riskPolicy = getSectionRiskPolicy(sectionId);
  const riskArchivePolicy =
    getSectionRiskArchivePolicy(sectionId) ?? {
      sectionId,
      enabled: false,
      cadence: getDefaultCadence(),
      retentionDays: getDefaultRetentionDays(),
      destinationLabel: null,
      lastArchivedAt: null,
      updatedAt: Date.now(),
    };
  const riskArchiveReport = getSectionRiskArchiveReport(sectionId, 30);
  const response: SectionOverviewResponse = {
    metrics: listSectionLearnerMetrics(sectionId),
    assignments: listSectionAssignments(sectionId),
    assignmentBreakdown: listSectionAssignmentBreakdown(sectionId),
    gradeSummary: listSectionGradeSummary(sectionId),
    riskPolicy,
    riskPolicyHistory: listSectionRiskPolicyAudit(sectionId, { limit: 50 }),
    effectiveRiskConfig: applySectionRiskPolicy(defaults, riskPolicy),
    riskArchivePolicy,
    riskArchiveNextAt:
      (riskArchivePolicy.lastArchivedAt ?? riskArchivePolicy.updatedAt) +
      cadenceIntervalMs(riskArchivePolicy.cadence),
    riskArchiveRecentRuns: listSectionRiskArchiveRuns(sectionId, { limit: 5 }),
    riskArchiveWindow: {
      totalRuns: riskArchiveReport.totalRuns,
      successRuns: riskArchiveReport.successRuns,
      failedRuns: riskArchiveReport.failedRuns,
      failureRate: riskArchiveReport.failureRate,
      lastSuccessAt: riskArchiveReport.lastSuccessAt,
      lastFailureAt: riskArchiveReport.lastFailureAt,
    },
  };
  return NextResponse.json(response);
}
