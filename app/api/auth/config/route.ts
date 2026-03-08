import { NextResponse } from "next/server";
import { AuthConfigResponse } from "@/lib/grading/contracts";

export const runtime = "nodejs";

function getAuthMode(): "bootstrap" | "oidc" {
  return (process.env.AUTH_MODE ?? "bootstrap").trim().toLowerCase() === "oidc"
    ? "oidc"
    : "bootstrap";
}

export async function GET() {
  const response: AuthConfigResponse = {
    mode: getAuthMode(),
    loginPath: "/api/auth/login",
  };
  return NextResponse.json(response);
}
