import { NextResponse } from "next/server";
import { RiskAuditArchiveRunStatus, SectionRiskArchiveRunRecord } from "@/lib/grading/contracts";
import { listSectionRiskArchiveRuns } from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseStatus(value: string): RiskAuditArchiveRunStatus | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "success" || normalized === "failure") return normalized;
  return undefined;
}

function toCsvValue(value: string | number | boolean | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.split("\"").join("\"\"")}"`;
  }
  return raw;
}

function buildCsv(runs: SectionRiskArchiveRunRecord[]): string {
  const header = [
    "runId",
    "sectionId",
    "status",
    "archivedRecords",
    "deliveryRef",
    "errorMessage",
    "actorUserId",
    "createdAt",
  ].join(",");
  const rows = runs.map((run) =>
    [
      run.runId,
      run.sectionId,
      run.status,
      run.archivedRecords,
      run.deliveryRef,
      run.errorMessage,
      run.actorUserId,
      run.createdAt,
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
  const status = parseStatus(url.searchParams.get("status") ?? "");
  const format = (url.searchParams.get("format") ?? "csv").trim().toLowerCase();
  if (format !== "csv" && format !== "json") {
    return badRequest("format must be either 'csv' or 'json'.");
  }

  const runs = listSectionRiskArchiveRuns(sectionId, {
    limit: Math.min(limit, 100),
    status,
  });
  if (format === "json") {
    return NextResponse.json({ runs });
  }

  const csv = buildCsv(runs);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="section-${sectionId}-archive-runs.csv"`,
    },
  });
}
