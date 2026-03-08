import { NextResponse } from "next/server";
import { SectionLearnerMetricsResponse } from "@/lib/grading/contracts";
import { listSectionLearnerMetrics } from "@/lib/grading/submissionDb";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId")?.trim() ?? "";
  if (!sectionId) {
    return badRequest("Missing required query param: sectionId.");
  }

  const metrics = listSectionLearnerMetrics(sectionId);
  const response: SectionLearnerMetricsResponse = { metrics };
  return NextResponse.json(response);
}
