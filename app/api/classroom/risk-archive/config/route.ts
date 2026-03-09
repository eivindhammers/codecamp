import { NextResponse } from "next/server";
import { RiskArchiveGovernanceConfigResponse } from "@/lib/grading/contracts";
import { requireGlobalStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function readNumberEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(raw, min), max);
}

function parseHosts(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function parseReferenceNames(): string[] {
  return (process.env.CLASSROOM_RISK_ARCHIVE_DESTINATION_REF_NAMES ?? "")
    .split(",")
    .map((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
    )
    .filter((value) => value.length > 0);
}

function parseRevokedReferenceNames(): string[] {
  return (process.env.CLASSROOM_RISK_ARCHIVE_DESTINATION_REVOKED_REF_NAMES ?? "")
    .split(",")
    .map((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
    )
    .filter((value) => value.length > 0);
}

function defaultActorUserId(): string {
  return process.env.CLASSROOM_RISK_ARCHIVE_ACTOR_USER_ID?.trim() || "system:risk-archive";
}

function escalationNotificationTarget(): string | null {
  const value = process.env.CLASSROOM_RISK_ARCHIVE_ESCALATION_NOTIFY_TARGET?.trim();
  return value && value.length > 0 ? value : null;
}

function destinationEnvKey(name: string): string {
  return `CLASSROOM_RISK_ARCHIVE_DESTINATION_${name.toUpperCase()}`;
}

function buildDestinationReferenceHealth() {
  const configured = parseReferenceNames();
  const revoked = parseRevokedReferenceNames();
  const names = Array.from(new Set([...configured, ...revoked])).sort((a, b) =>
    a.localeCompare(b)
  );
  const revokedSet = new Set(revoked);
  return names.map((name) => {
    const envKey = destinationEnvKey(name);
    return {
      name,
      envKey,
      revoked: revokedSet.has(name),
      hasUrl: (process.env[envKey] ?? "").trim().length > 0,
    };
  });
}

export async function GET(req: Request) {
  const auth = requireGlobalStaff(req);
  if (!auth.ok) return auth.response;

  const response: RiskArchiveGovernanceConfigResponse = {
    config: {
      webhookAllowHosts: parseHosts("CLASSROOM_RISK_ARCHIVE_WEBHOOK_ALLOW_HOSTS"),
      uploadAllowHosts: parseHosts("CLASSROOM_RISK_ARCHIVE_UPLOAD_ALLOW_HOSTS"),
      destinationReferenceNames: parseReferenceNames(),
      destinationRevokedReferenceNames: parseRevokedReferenceNames(),
      destinationReferenceHealth: buildDestinationReferenceHealth(),
      webhookTimeoutMs: readNumberEnv(
        "CLASSROOM_RISK_ARCHIVE_WEBHOOK_TIMEOUT_MS",
        5000,
        1000,
        30000
      ),
      uploadTimeoutMs: readNumberEnv(
        "CLASSROOM_RISK_ARCHIVE_UPLOAD_TIMEOUT_MS",
        10000,
        1000,
        60000
      ),
      deliveryRetryCount: readNumberEnv(
        "CLASSROOM_RISK_ARCHIVE_DELIVERY_RETRY_COUNT",
        2,
        0,
        10
      ),
      deliveryRetryBackoffMs: readNumberEnv(
        "CLASSROOM_RISK_ARCHIVE_DELIVERY_RETRY_BACKOFF_MS",
        1000,
        100,
        10000
      ),
      archiveBatchLimit: readNumberEnv("CLASSROOM_RISK_ARCHIVE_BATCH_LIMIT", 5000, 100, 20000),
      defaultActorUserId: defaultActorUserId(),
      escalationFailureStreak: readNumberEnv(
        "CLASSROOM_RISK_ARCHIVE_ESCALATION_FAILURE_STREAK",
        3,
        1,
        20
      ),
      escalationFailureRatePercent: readNumberEnv(
        "CLASSROOM_RISK_ARCHIVE_ESCALATION_FAILURE_RATE_PERCENT",
        50,
        1,
        100
      ),
      escalationWindowDays: readNumberEnv(
        "CLASSROOM_RISK_ARCHIVE_ESCALATION_WINDOW_DAYS",
        30,
        1,
        365
      ),
      escalationNotificationTarget: escalationNotificationTarget(),
    },
  };
  return NextResponse.json(response);
}
