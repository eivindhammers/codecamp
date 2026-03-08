import { NextResponse } from "next/server";
import { ClassroomRiskConfigResponse } from "@/lib/grading/contracts";

export const runtime = "nodejs";

function parseIntegerEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(raw, min), max);
}

function parseNumberEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseFloat(process.env[name] ?? "");
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(raw, min), max);
}

function parseBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

export async function GET() {
  const response: ClassroomRiskConfigResponse = {
    config: {
      minAttemptsAtRisk: parseIntegerEnv("CLASSROOM_RISK_MIN_ATTEMPTS", 5, 1, 100),
      maxCompletionRateAtRisk: parseNumberEnv("CLASSROOM_RISK_MAX_COMPLETION_RATE", 25, 0, 100),
      overdueIncompleteFlagsAtRisk: parseBooleanEnv(
        "CLASSROOM_RISK_OVERDUE_INCOMPLETE_ENABLED",
        true
      ),
      maxCompletionRateStalledAssignment: parseNumberEnv(
        "CLASSROOM_STALLED_MAX_COMPLETION_RATE",
        60,
        0,
        100
      ),
    },
  };
  return NextResponse.json(response);
}
