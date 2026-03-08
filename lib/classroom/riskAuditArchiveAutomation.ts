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
const WEBHOOK_PREFIX = "webhook:";

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

function webhookAllowHosts(): Set<string> {
  return new Set(
    (process.env.CLASSROOM_RISK_ARCHIVE_WEBHOOK_ALLOW_HOSTS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
  );
}

function parseWebhookDestination(destinationLabel: string | null): string | null {
  if (!destinationLabel) return null;
  const trimmed = destinationLabel.trim();
  if (!trimmed.toLowerCase().startsWith(WEBHOOK_PREFIX)) {
    return null;
  }
  const url = trimmed.slice(WEBHOOK_PREFIX.length).trim();
  return url.length > 0 ? url : null;
}

function validateWebhookDestination(urlRaw: string): URL {
  const url = new URL(urlRaw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Webhook destination must use http or https.");
  }
  const allowHosts = webhookAllowHosts();
  if (allowHosts.size > 0 && !allowHosts.has(url.host.toLowerCase())) {
    throw new Error(`Webhook host '${url.host}' is not allowed.`);
  }
  return url;
}

async function deliverToWebhook(
  destinationUrl: URL,
  artifactPath: string,
  sectionId: string,
  exportedAt: number,
  recordsCount: number
): Promise<string> {
  const timeoutMsRaw = Number.parseInt(
    process.env.CLASSROOM_RISK_ARCHIVE_WEBHOOK_TIMEOUT_MS ?? "",
    10
  );
  const timeoutMs = Number.isFinite(timeoutMsRaw)
    ? Math.min(Math.max(timeoutMsRaw, 1000), 30000)
    : 5000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(destinationUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        sectionId,
        exportedAt,
        recordsCount,
        artifactPath,
      }),
    });
    if (!response.ok) {
      throw new Error(`Webhook delivery failed with status ${response.status}.`);
    }
    return `webhook:${destinationUrl.toString()}`;
  } finally {
    clearTimeout(timeout);
  }
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
    let finalDeliveryRef = deliveryRef;
    const webhookRaw = parseWebhookDestination(policy.destinationLabel);
    if (webhookRaw) {
      finalDeliveryRef = await deliverToWebhook(
        validateWebhookDestination(webhookRaw),
        deliveryRef,
        sectionId,
        now,
        events.length
      );
    }
    const run = recordSectionRiskArchiveRun({
      sectionId,
      status: "success",
      archivedRecords: events.length,
      deliveryRef: finalDeliveryRef,
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
