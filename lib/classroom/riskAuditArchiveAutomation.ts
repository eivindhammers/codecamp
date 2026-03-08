import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const PUT_URL_PREFIX = "puturl:";
const WEBHOOK_REF_PREFIX = "webhookref:";
const PUT_URL_REF_PREFIX = "puturlref:";

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

function parsePutUrlDestination(destinationLabel: string | null): string | null {
  if (!destinationLabel) return null;
  const trimmed = destinationLabel.trim();
  if (!trimmed.toLowerCase().startsWith(PUT_URL_PREFIX)) {
    return null;
  }
  const url = trimmed.slice(PUT_URL_PREFIX.length).trim();
  return url.length > 0 ? url : null;
}

function parseWebhookDestinationRef(destinationLabel: string | null): string | null {
  if (!destinationLabel) return null;
  const trimmed = destinationLabel.trim();
  if (!trimmed.toLowerCase().startsWith(WEBHOOK_REF_PREFIX)) {
    return null;
  }
  const refName = trimmed.slice(WEBHOOK_REF_PREFIX.length).trim();
  return refName.length > 0 ? refName : null;
}

function parsePutUrlDestinationRef(destinationLabel: string | null): string | null {
  if (!destinationLabel) return null;
  const trimmed = destinationLabel.trim();
  if (!trimmed.toLowerCase().startsWith(PUT_URL_REF_PREFIX)) {
    return null;
  }
  const refName = trimmed.slice(PUT_URL_REF_PREFIX.length).trim();
  return refName.length > 0 ? refName : null;
}

function destinationRefKey(refName: string): string {
  const normalized = refName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) {
    throw new Error("Destination reference name is invalid.");
  }
  return `CLASSROOM_RISK_ARCHIVE_DESTINATION_${normalized}`;
}

function resolveDestinationRefUrl(refName: string): string {
  const envKey = destinationRefKey(refName);
  const value = process.env[envKey]?.trim();
  if (!value) {
    throw new Error(`Destination reference '${refName}' is not configured (${envKey}).`);
  }
  return value;
}

export function validateArchiveDestinationLabel(destinationLabel: string | null): {
  valid: boolean;
  mode: "none" | "webhook" | "puturl" | "local";
  host?: string;
  message: string;
} {
  const trimmed = destinationLabel?.trim() ?? "";
  if (!trimmed) {
    return { valid: true, mode: "none", message: "No destination set; archives stay local." };
  }

  const webhookRaw = parseWebhookDestination(trimmed);
  if (webhookRaw) {
    try {
      const url = validateWebhookDestination(webhookRaw);
      return {
        valid: true,
        mode: "webhook",
        host: url.host,
        message: `Webhook destination validated for ${url.host}.`,
      };
    } catch (error) {
      return {
        valid: false,
        mode: "webhook",
        message:
          error instanceof Error ? error.message : "Webhook destination is invalid.",
      };
    }
  }

  const webhookRef = parseWebhookDestinationRef(trimmed);
  if (webhookRef) {
    try {
      const url = validateWebhookDestination(resolveDestinationRefUrl(webhookRef));
      return {
        valid: true,
        mode: "webhook",
        host: url.host,
        message: `Webhook reference '${webhookRef}' validated for ${url.host}.`,
      };
    } catch (error) {
      return {
        valid: false,
        mode: "webhook",
        message:
          error instanceof Error ? error.message : "Webhook destination reference is invalid.",
      };
    }
  }

  const putUrlRaw = parsePutUrlDestination(trimmed);
  if (putUrlRaw) {
    try {
      const url = validatePutDestination(putUrlRaw);
      return {
        valid: true,
        mode: "puturl",
        host: url.host,
        message: `PUT destination validated for ${url.host}.`,
      };
    } catch (error) {
      return {
        valid: false,
        mode: "puturl",
        message: error instanceof Error ? error.message : "PUT destination is invalid.",
      };
    }
  }

  const putUrlRef = parsePutUrlDestinationRef(trimmed);
  if (putUrlRef) {
    try {
      const url = validatePutDestination(resolveDestinationRefUrl(putUrlRef));
      return {
        valid: true,
        mode: "puturl",
        host: url.host,
        message: `PUT reference '${putUrlRef}' validated for ${url.host}.`,
      };
    } catch (error) {
      return {
        valid: false,
        mode: "puturl",
        message: error instanceof Error ? error.message : "PUT destination reference is invalid.",
      };
    }
  }

  return {
    valid: true,
    mode: "local",
    message: "Using local archive artifact storage path.",
  };
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

function uploadAllowHosts(): Set<string> {
  return new Set(
    (process.env.CLASSROOM_RISK_ARCHIVE_UPLOAD_ALLOW_HOSTS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
  );
}

function validatePutDestination(urlRaw: string): URL {
  const url = new URL(urlRaw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("PUT destination must use http or https.");
  }
  const allowHosts = uploadAllowHosts();
  if (allowHosts.size > 0 && !allowHosts.has(url.host.toLowerCase())) {
    throw new Error(`PUT destination host '${url.host}' is not allowed.`);
  }
  return url;
}

function webhookRetryCount(): number {
  const raw = Number.parseInt(
    process.env.CLASSROOM_RISK_ARCHIVE_DELIVERY_RETRY_COUNT ?? "",
    10
  );
  if (!Number.isFinite(raw)) return 2;
  return Math.min(Math.max(raw, 0), 10);
}

function webhookRetryBackoffMs(): number {
  const raw = Number.parseInt(
    process.env.CLASSROOM_RISK_ARCHIVE_DELIVERY_RETRY_BACKOFF_MS ?? "",
    10
  );
  if (!Number.isFinite(raw)) return 1000;
  return Math.min(Math.max(raw, 100), 10000);
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
  const retryCount = webhookRetryCount();
  const backoffMs = webhookRetryBackoffMs();
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
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
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Webhook delivery failed.");
      if (attempt < retryCount) {
        await wait(backoffMs * (attempt + 1));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("Webhook delivery failed.");
}

async function deliverToPutUrl(
  destinationUrl: URL,
  artifactPath: string
): Promise<string> {
  const timeoutMsRaw = Number.parseInt(
    process.env.CLASSROOM_RISK_ARCHIVE_UPLOAD_TIMEOUT_MS ?? "",
    10
  );
  const timeoutMs = Number.isFinite(timeoutMsRaw)
    ? Math.min(Math.max(timeoutMsRaw, 1000), 60000)
    : 10000;
  const retryCount = webhookRetryCount();
  const backoffMs = webhookRetryBackoffMs();
  const artifactBody = await readFile(artifactPath, "utf8");
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(destinationUrl.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: artifactBody,
      });
      if (!response.ok) {
        throw new Error(`PUT delivery failed with status ${response.status}.`);
      }
      return `puturl:${destinationUrl.toString()}`;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("PUT delivery failed.");
      if (attempt < retryCount) {
        await wait(backoffMs * (attempt + 1));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("PUT delivery failed.");
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
    const webhookRef = parseWebhookDestinationRef(policy.destinationLabel);
    if (webhookRef) {
      finalDeliveryRef = await deliverToWebhook(
        validateWebhookDestination(resolveDestinationRefUrl(webhookRef)),
        deliveryRef,
        sectionId,
        now,
        events.length
      );
    }
    const putUrlRaw = parsePutUrlDestination(policy.destinationLabel);
    if (putUrlRaw) {
      finalDeliveryRef = await deliverToPutUrl(
        validatePutDestination(putUrlRaw),
        deliveryRef
      );
    }
    const putUrlRef = parsePutUrlDestinationRef(policy.destinationLabel);
    if (putUrlRef) {
      finalDeliveryRef = await deliverToPutUrl(
        validatePutDestination(resolveDestinationRefUrl(putUrlRef)),
        deliveryRef
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
