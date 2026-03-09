import { NextResponse } from "next/server";
import { ClassroomRiskConfigResponse } from "@/lib/grading/contracts";
import { requireGlobalStaff } from "@/app/api/classroom/_auth";
import { getClassroomRiskDefaults } from "@/app/api/classroom/_riskConfig";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = requireGlobalStaff(req);
  if (!auth.ok) return auth.response;
  const response: ClassroomRiskConfigResponse = {
    config: getClassroomRiskDefaults(),
  };
  return NextResponse.json(response);
}
