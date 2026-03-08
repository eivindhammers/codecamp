#!/usr/bin/env node

function extractTag(imageRef) {
  const withoutDigest = imageRef.split("@")[0];
  const lastSlash = withoutDigest.lastIndexOf("/");
  const lastColon = withoutDigest.lastIndexOf(":");
  if (lastColon > lastSlash) {
    return withoutDigest.slice(lastColon + 1);
  }
  return "";
}

function validateImageRef(label, imageRef, errors) {
  const trimmed = (imageRef ?? "").trim();
  if (!trimmed) {
    errors.push(`${label} image is required when Docker sandbox mode is enabled.`);
    return;
  }

  const hasDigest = trimmed.includes("@sha256:");
  const tag = extractTag(trimmed);
  if (!hasDigest && !tag) {
    errors.push(
      `${label} image '${trimmed}' must include an explicit tag or sha256 digest.`
    );
    return;
  }
  if (tag.toLowerCase() === "latest") {
    errors.push(`${label} image '${trimmed}' must not use the 'latest' tag.`);
  }
}

const mode = (process.env.GRADER_SANDBOX_MODE ?? "").trim().toLowerCase();
const nodeEnv = (process.env.NODE_ENV ?? "development").trim().toLowerCase();
const effectiveMode =
  mode === "docker" || mode === "host" ? mode : nodeEnv === "production" ? "docker" : "host";

if (effectiveMode !== "docker") {
  console.log(`[sandbox-images] Skipped (mode=${effectiveMode})`);
  process.exit(0);
}

const errors = [];
validateImageRef("R", process.env.GRADER_DOCKER_R_IMAGE, errors);
validateImageRef("Python", process.env.GRADER_DOCKER_PYTHON_IMAGE, errors);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[sandbox-images] ${error}`);
  }
  process.exit(1);
}

console.log("[sandbox-images] OK");
