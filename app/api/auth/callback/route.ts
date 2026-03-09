import { NextResponse } from "next/server";
import {
  createSessionForProfile,
  parseCookie,
  setSessionCookieHeaders,
  upsertProfileFromIdentity,
} from "@/app/api/auth/_session";
import { ClassroomRole } from "@/lib/grading/contracts";

export const runtime = "nodejs";

const AUTH_STATE_COOKIE = "codecamp_auth_state";

interface OidcTokenResponse {
  access_token?: string;
}

interface OidcUserInfo {
  email?: string;
  preferred_username?: string;
  name?: string;
  roles?: unknown;
  groups?: unknown;
  [key: string]: unknown;
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

function parseCsvEnv(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  );
}

function toStringArrayClaim(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
}

function resolveRoleFromClaims(userInfo: OidcUserInfo, email: string): ClassroomRole {
  const instructorEmails = parseCsvEnv("AUTH_OIDC_INSTRUCTOR_EMAILS");
  const taEmails = parseCsvEnv("AUTH_OIDC_TA_EMAILS");
  if (instructorEmails.has(email)) return "instructor";
  if (taEmails.has(email)) return "ta";

  const roleClaimKey = process.env.AUTH_OIDC_ROLE_CLAIM?.trim() || "roles";
  const groupClaimKey = process.env.AUTH_OIDC_GROUP_CLAIM?.trim() || "groups";
  const normalizedRoles = new Set(
    toStringArrayClaim(userInfo[roleClaimKey]).map((value) => value.toLowerCase())
  );
  const normalizedGroups = new Set(
    toStringArrayClaim(userInfo[groupClaimKey]).map((value) => value.toLowerCase())
  );

  const instructorRoleValues = parseCsvEnv("AUTH_OIDC_INSTRUCTOR_ROLE_VALUES");
  const taRoleValues = parseCsvEnv("AUTH_OIDC_TA_ROLE_VALUES");
  const instructorGroupValues = parseCsvEnv("AUTH_OIDC_INSTRUCTOR_GROUP_VALUES");
  const taGroupValues = parseCsvEnv("AUTH_OIDC_TA_GROUP_VALUES");

  for (const value of instructorRoleValues) {
    if (normalizedRoles.has(value)) return "instructor";
  }
  for (const value of taRoleValues) {
    if (normalizedRoles.has(value)) return "ta";
  }
  for (const value of instructorGroupValues) {
    if (normalizedGroups.has(value)) return "instructor";
  }
  for (const value of taGroupValues) {
    if (normalizedGroups.has(value)) return "ta";
  }

  const existingRole = process.env.AUTH_OIDC_DEFAULT_ROLE?.trim().toLowerCase();
  if (existingRole === "instructor" || existingRole === "ta") return existingRole;
  return "student";
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

    const role = resolveRoleFromClaims(userInfo, email);
    const profile = upsertProfileFromIdentity({
      emailRaw: email,
      displayName: userInfo.name ?? undefined,
      role,
    });
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
