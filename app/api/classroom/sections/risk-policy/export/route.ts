import { NextResponse } from "next/server";
import { SectionRiskPolicyAuditRecord } from "@/lib/grading/contracts";
import { listSectionRiskPolicyAudit } from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseAction(value: string): "upsert" | "reset" | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "upsert" || normalized === "reset") return normalized;
  return undefined;
}

function toCsvValue(value: string | number | boolean | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.split("\"").join("\"\"")}"`;
  }
  return raw;
}

function buildCsv(history: SectionRiskPolicyAuditRecord[]): string {
  const header = [
    "eventId",
    "sectionId",
    "actorUserId",
    "action",
    "createdAt",
    "minAttemptsAtRisk",
    "maxCompletionRateAtRisk",
    "overdueIncompleteFlagsAtRisk",
    "maxCompletionRateStalledAssignment",
  ].join(",");
  const rows = history.map((event) =>
    [
      event.eventId,
      event.sectionId,
      event.actorUserId,
      event.action,
      event.createdAt,
      event.policy?.minAttemptsAtRisk,
      event.policy?.maxCompletionRateAtRisk,
      event.policy?.overdueIncompleteFlagsAtRisk,
      event.policy?.maxCompletionRateStalledAssignment,
    ]
      .map(toCsvValue)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId")?.trim() ?? "";
  if (!sectionId) return badRequest("Missing required query param: sectionId.");

  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 200;
  const action = parseAction(url.searchParams.get("action") ?? "");
  const actorSearch = (url.searchParams.get("actor") ?? "").trim();
  const format = (url.searchParams.get("format") ?? "csv").trim().toLowerCase();
  if (format !== "csv" && format !== "json") {
    return badRequest("format must be either 'csv' or 'json'.");
  }

  const history = listSectionRiskPolicyAudit(sectionId, {
    limit,
    action,
    actorUserIdContains: actorSearch.length > 0 ? actorSearch : undefined,
  });

  if (format === "json") {
    return NextResponse.json({ history });
  }

  const csv = buildCsv(history);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="section-${sectionId}-risk-policy-audit.csv"`,
    },
  });
}
