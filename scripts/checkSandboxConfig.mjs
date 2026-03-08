#!/usr/bin/env node

const nodeEnv = (process.env.NODE_ENV ?? "development").toLowerCase();
const configuredMode = (process.env.GRADER_SANDBOX_MODE ?? "").trim().toLowerCase();
const allowProdHostFallback = ["1", "true", "yes"].includes(
  (process.env.GRADER_ALLOW_HOST_MODE_IN_PRODUCTION ?? "").trim().toLowerCase()
);
const effectiveMode =
  configuredMode === "docker" || configuredMode === "host"
    ? configuredMode
    : nodeEnv === "production"
    ? "docker"
    : "host";

const errors = [];

if (nodeEnv === "production" && effectiveMode !== "docker") {
  if (!allowProdHostFallback) {
    errors.push(
      "Production must run with Docker sandbox mode (set GRADER_SANDBOX_MODE=docker, or set GRADER_ALLOW_HOST_MODE_IN_PRODUCTION=true only for emergency breakglass)."
    );
  }
}

if (effectiveMode === "docker") {
  if (!(process.env.GRADER_DOCKER_R_IMAGE ?? "").trim()) {
    errors.push("Set GRADER_DOCKER_R_IMAGE when Docker sandbox mode is enabled.");
  }
  if (!(process.env.GRADER_DOCKER_PYTHON_IMAGE ?? "").trim()) {
    errors.push("Set GRADER_DOCKER_PYTHON_IMAGE when Docker sandbox mode is enabled.");
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[sandbox-check] ${error}`);
  }
  process.exit(1);
}

console.log(`[sandbox-check] OK (env=${nodeEnv}, mode=${effectiveMode})`);
