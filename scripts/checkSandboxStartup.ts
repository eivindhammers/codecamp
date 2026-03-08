import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { gradePythonSubmission } from "@/lib/grading/runPythonChecker";
import { gradeRSubmission } from "@/lib/grading/runRChecker";

const execFileAsync = promisify(execFile);

function getImage(runtime: "r" | "python") {
  if (runtime === "r") {
    return process.env.GRADER_DOCKER_R_IMAGE?.trim() || "r-base:4.4.1";
  }
  return process.env.GRADER_DOCKER_PYTHON_IMAGE?.trim() || "python:3.12-alpine";
}

function readMaxMs(name: string, fallback: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(raw, 1000), 120000);
}

function assertPassed(label: string, status: string, feedback: string[]) {
  if (status !== "passed") {
    const detail = feedback.join(" | ") || "No feedback returned.";
    throw new Error(`${label} checker failed during startup check: ${detail}`);
  }
}

async function ensureImageAvailable(image: string) {
  try {
    await execFileAsync("docker", ["image", "inspect", image], {
      timeout: 30 * 1000,
    });
  } catch {
    await execFileAsync("docker", ["pull", image], { timeout: 5 * 60 * 1000 });
  }
}

async function measureMs<T>(work: () => Promise<T>): Promise<{ result: T; elapsedMs: number }> {
  const startedAt = Date.now();
  const result = await work();
  return { result, elapsedMs: Date.now() - startedAt };
}

async function main() {
  if ((process.env.GRADER_SANDBOX_MODE ?? "").trim().toLowerCase() !== "docker") {
    throw new Error("GRADER_SANDBOX_MODE must be set to 'docker' for startup checks.");
  }

  process.env.GRADER_TIMEOUT_MS = "30000";

  const rImage = getImage("r");
  const pythonImage = getImage("python");
  await ensureImageAvailable(rImage);
  await ensureImageAvailable(pythonImage);

  const maxRMs = readMaxMs("GRADER_STARTUP_MAX_MS_R", 25000);
  const maxPythonMs = readMaxMs("GRADER_STARTUP_MAX_MS_PYTHON", 20000);

  const rRun = await measureMs(async () => gradeRSubmission("arithmetic", "result <- 42"));
  assertPassed("R", rRun.result.status, rRun.result.feedback);
  if (rRun.elapsedMs > maxRMs) {
    throw new Error(`R startup exceeded threshold: ${rRun.elapsedMs}ms > ${maxRMs}ms`);
  }

  const pythonRun = await measureMs(async () =>
    gradePythonSubmission("hello-python", 'print("Hello, Python!")')
  );
  assertPassed("Python", pythonRun.result.status, pythonRun.result.feedback);
  if (pythonRun.elapsedMs > maxPythonMs) {
    throw new Error(
      `Python startup exceeded threshold: ${pythonRun.elapsedMs}ms > ${maxPythonMs}ms`
    );
  }

  console.log(
    `[sandbox-startup] OK r=${rRun.elapsedMs}ms python=${pythonRun.elapsedMs}ms thresholds r<=${maxRMs}ms python<=${maxPythonMs}ms`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sandbox-startup] ${message}`);
  process.exit(1);
});
