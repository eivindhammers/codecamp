import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const AUTH_STATE_COOKIE = "codecamp_auth_state";

function getAuthMode(): "bootstrap" | "oidc" {
  return (process.env.AUTH_MODE ?? "bootstrap").trim().toLowerCase() === "oidc"
    ? "oidc"
    : "bootstrap";
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getRedirectUri(req: Request): string {
  const configured = process.env.AUTH_OIDC_REDIRECT_URI?.trim();
  if (configured) return configured;
  const url = new URL(req.url);
  return `${url.origin}/api/auth/callback`;
}

function setAuthStateCookie(headers: Headers, state: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  headers.append(
    "Set-Cookie",
    `${AUTH_STATE_COOKIE}=${encodeURIComponent(
      state
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
  );
}

export async function GET(req: Request) {
  if (getAuthMode() !== "oidc") {
    return NextResponse.json({ error: "OIDC auth mode is not enabled." }, { status: 400 });
  }

  try {
    const authorizationUrl = new URL(getRequiredEnv("AUTH_OIDC_AUTHORIZATION_URL"));
    const state = randomUUID();
    const clientId = getRequiredEnv("AUTH_OIDC_CLIENT_ID");
    const scope = process.env.AUTH_OIDC_SCOPE?.trim() || "openid profile email";
    const redirectUri = getRedirectUri(req);

    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("scope", scope);
    authorizationUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizationUrl.toString());
    setAuthStateCookie(response.headers, state);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start OIDC sign-in flow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
