import { NextResponse } from "next/server";
import {
  createSessionForProfile,
  parseCookie,
  resolveProfileFromEmail,
  setSessionCookieHeaders,
} from "@/app/api/auth/_session";

export const runtime = "nodejs";

const AUTH_STATE_COOKIE = "codecamp_auth_state";

interface OidcTokenResponse {
  access_token?: string;
}

interface OidcUserInfo {
  email?: string;
  preferred_username?: string;
  name?: string;
}

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

function clearAuthStateCookie(headers: Headers) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  headers.append(
    "Set-Cookie",
    `${AUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
}

function redirectWithError(req: Request, message: string): NextResponse {
  const url = new URL(req.url);
  const target = new URL("/classroom", url.origin);
  target.searchParams.set("authError", message);
  return NextResponse.redirect(target.toString());
}

async function exchangeCodeForAccessToken(req: Request, code: string): Promise<string> {
  const tokenUrl = getRequiredEnv("AUTH_OIDC_TOKEN_URL");
  const clientId = getRequiredEnv("AUTH_OIDC_CLIENT_ID");
  const clientSecret = getRequiredEnv("AUTH_OIDC_CLIENT_SECRET");
  const redirectUri = getRedirectUri(req);

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("OIDC token exchange failed.");
  }

  const payload = (await response.json()) as OidcTokenResponse;
  if (!payload.access_token) {
    throw new Error("OIDC provider did not return an access token.");
  }
  return payload.access_token;
}

async function fetchUserInfo(accessToken: string): Promise<OidcUserInfo> {
  const userInfoUrl = getRequiredEnv("AUTH_OIDC_USERINFO_URL");
  const response = await fetch(userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch OIDC user profile.");
  }
  return (await response.json()) as OidcUserInfo;
}

export async function GET(req: Request) {
  if (getAuthMode() !== "oidc") {
    return redirectWithError(req, "OIDC auth mode is not enabled.");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.trim() ?? "";
  const state = url.searchParams.get("state")?.trim() ?? "";
  const storedState = parseCookie(req, AUTH_STATE_COOKIE);
  if (!code) {
    return redirectWithError(req, "Missing OIDC authorization code.");
  }
  if (!state || !storedState || state !== storedState) {
    return redirectWithError(req, "OIDC state validation failed.");
  }

  try {
    const accessToken = await exchangeCodeForAccessToken(req, code);
    const userInfo = await fetchUserInfo(accessToken);
    const rawEmail = userInfo.email ?? userInfo.preferred_username ?? "";
    const email = rawEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("OIDC profile is missing a valid email claim.");
    }

    const profile = resolveProfileFromEmail(email, userInfo.name ?? undefined);
    const { sessionId, ttlMs } = createSessionForProfile(profile);
    const redirect = new URL("/classroom", url.origin);
    const response = NextResponse.redirect(redirect.toString());
    setSessionCookieHeaders(response.headers, sessionId, ttlMs);
    clearAuthStateCookie(response.headers);
    return response;
  } catch (error) {
    const response = redirectWithError(
      req,
      error instanceof Error ? error.message : "OIDC sign-in failed."
    );
    clearAuthStateCookie(response.headers);
    return response;
  }
}
