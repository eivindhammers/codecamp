import { NextResponse } from "next/server";
import { SectionGradeSummaryResponse } from "@/lib/grading/contracts";
import { requireSectionStaff } from "@/app/api/classroom/_auth";
import { listSectionGradeSummary } from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function toCsv(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.split("\"").join("\"\"")}"`;
  }
  return raw;
}

function buildSummaryCsv(summary: SectionGradeSummaryResponse["summary"]): string {
  const headers = [
    "sectionId",
    "userId",
    "assignmentsCount",
    "completedAssignments",
    "completionRate",
    "attemptsCount",
    "lastAttemptAt",
  ];
  const rows = summary.map((row) =>
    [
      row.sectionId,
      row.userId,
      row.assignmentsCount,
      row.completedAssignments,
      row.completionRate,
      row.attemptsCount,
      row.lastAttemptAt,
    ]
      .map(toCsv)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId")?.trim() ?? "";
  const format = url.searchParams.get("format")?.trim().toLowerCase() ?? "json";
  if (!sectionId) {
    return badRequest("Missing required query param: sectionId.");
  }

  if (format !== "json" && format !== "csv") {
    return badRequest("format must be either 'json' or 'csv'.");
  }

  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;

  const summary = listSectionGradeSummary(sectionId);
  if (format === "csv") {
    const csv = buildSummaryCsv(summary);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"section-${sectionId}-summary.csv\"`,
      },
    });
  }

  const response: SectionGradeSummaryResponse = { summary };
  return NextResponse.json(response);
}
