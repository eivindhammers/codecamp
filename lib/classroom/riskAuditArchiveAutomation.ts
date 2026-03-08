import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  RiskArchiveAutomationItem,
  RiskArchiveAutomationResponse,
  SectionRiskArchivePolicyRecord,
} from "@/lib/grading/contracts";
import {
  getSectionRiskArchivePolicy,
  listClassSections,
  listSectionRiskArchivePolicies,
  listSectionRiskPolicyAuditSince,
  recordSectionRiskArchiveRun,
} from "@/lib/grading/submissionDb";

const DAY_MS = 24 * 60 * 60 * 1000;

function cadenceMs(policy: SectionRiskArchivePolicyRecord): number {
  if (policy.cadence === "daily") return DAY_MS;
  if (policy.cadence === "weekly") return 7 * DAY_MS;
  return 30 * DAY_MS;
}

function nextArchiveAt(policy: SectionRiskArchivePolicyRecord): number {
  const anchor = policy.lastArchivedAt ?? policy.updatedAt;
  return anchor + cadenceMs(policy);
}

function sanitizeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function archiveBaseDir(): string {
  const configured = process.env.CLASSROOM_RISK_ARCHIVE_BASE_DIR?.trim();
  if (configured && configured.length > 0) return configured;
  return path.join(process.cwd(), ".data", "risk-audit-archives");
}

function archiveBatchLimit(): number {
  const raw = Number.parseInt(process.env.CLASSROOM_RISK_ARCHIVE_BATCH_LIMIT ?? "", 10);
  if (!Number.isFinite(raw)) return 5000;
  return Math.min(Math.max(raw, 100), 20000);
}

function defaultActorUserId(): string {
  return process.env.CLASSROOM_RISK_ARCHIVE_ACTOR_USER_ID?.trim() || "system:risk-archive";
}

async function writeArchiveArtifact(
  sectionId: string,
  exportedAt: number,
  destinationLabel: string | null,
  events: unknown[]
): Promise<string> {
  const sectionDir = path.join(archiveBaseDir(), sanitizeSegment(sectionId));
  await mkdir(sectionDir, { recursive: true });
  const artifactPath = path.join(sectionDir, `${exportedAt}.json`);
  const payload = {
    sectionId,
    exportedAt,
    destinationLabel,
    eventsCount: events.length,
    events,
  };
  await writeFile(artifactPath, JSON.stringify(payload), "utf8");
  return artifactPath;
}

function resolveWindowStart(policy: SectionRiskArchivePolicyRecord, now: number): number {
  if (policy.lastArchivedAt !== null) {
    return policy.lastArchivedAt;
  }
  return now - policy.retentionDays * DAY_MS;
}

export async function executeSectionRiskAuditArchive(
  sectionId: string,
  actorUserId = defaultActorUserId(),
  now = Date.now()
): Promise<RiskArchiveAutomationItem> {
  const policy = getSectionRiskArchivePolicy(sectionId);
  if (!policy || !policy.enabled) {
    return {
      sectionId,
      due: false,
      status: "skipped",
      archivedRecords: 0,
      errorMessage: "Archive policy is not enabled for this section.",
    };
  }
  const due = now >= nextArchiveAt(policy);
  if (!due) {
    return {
      sectionId,
      due: false,
      status: "skipped",
      archivedRecords: 0,
    };
  }

  try {
    const events = listSectionRiskPolicyAuditSince(sectionId, {
      createdAtGte: resolveWindowStart(policy, now),
      createdAtLt: now,
      limit: archiveBatchLimit(),
    });
    const deliveryRef = await writeArchiveArtifact(
      sectionId,
      now,
      policy.destinationLabel,
      events
    );
    const run = recordSectionRiskArchiveRun({
      sectionId,
      status: "success",
      archivedRecords: events.length,
      deliveryRef,
      errorMessage: null,
      actorUserId,
    });
    return {
      sectionId,
      due: true,
      status: "success",
      archivedRecords: run.archivedRecords,
      deliveryRef: run.deliveryRef,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Archive execution failed.";
    const run = recordSectionRiskArchiveRun({
      sectionId,
      status: "failure",
      archivedRecords: 0,
      deliveryRef: null,
      errorMessage: message,
      actorUserId,
    });
    return {
      sectionId,
      due: true,
      status: "failure",
      archivedRecords: run.archivedRecords,
      errorMessage: run.errorMessage ?? message,
    };
  }
}

export async function executeDueRiskAuditArchives(
  actorUserId = defaultActorUserId(),
  now = Date.now()
): Promise<RiskArchiveAutomationResponse> {
  const sections = new Set(listClassSections().map((section) => section.sectionId));
  const policies = listSectionRiskArchivePolicies({ enabledOnly: true }).filter((policy) =>
    sections.has(policy.sectionId)
  );
  const processed: RiskArchiveAutomationItem[] = [];
  for (const policy of policies) {
    processed.push(await executeSectionRiskAuditArchive(policy.sectionId, actorUserId, now));
  }
  return { executedAt: now, processed };
}
