import { NextResponse } from "next/server";
import { ClassroomRiskConfigResponse } from "@/lib/grading/contracts";
import { getClassroomRiskDefaults } from "@/app/api/classroom/_riskConfig";

export const runtime = "nodejs";

export async function GET() {
  const response: ClassroomRiskConfigResponse = {
    config: getClassroomRiskDefaults(),
  };
  return NextResponse.json(response);
}
