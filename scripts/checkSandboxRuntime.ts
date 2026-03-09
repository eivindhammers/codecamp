import { gradePythonSubmission } from "@/lib/grading/runPythonChecker";
import { gradeRSubmission } from "@/lib/grading/runRChecker";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function getImage(runtime: "r" | "python") {
  if (runtime === "r") {
    return process.env.GRADER_DOCKER_R_IMAGE?.trim() || "r-base:4.4.1";
  }
  return process.env.GRADER_DOCKER_PYTHON_IMAGE?.trim() || "python:3.12-alpine";
}

function assertPassed(label: string, status: string, feedback: string[]) {
  if (status !== "passed") {
    const detail = feedback.join(" | ") || "No feedback returned.";
    throw new Error(`${label} runtime check failed with status=${status}: ${detail}`);
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

async function main() {
  if ((process.env.GRADER_SANDBOX_MODE ?? "").trim().toLowerCase() !== "docker") {
    throw new Error("GRADER_SANDBOX_MODE must be set to 'docker' for runtime checks.");
  }

  process.env.GRADER_TIMEOUT_MS = "30000";

  const rImage = getImage("r");
  const pythonImage = getImage("python");
  await ensureImageAvailable(rImage);
  await ensureImageAvailable(pythonImage);

  const rResult = await gradeRSubmission("arithmetic", "result <- 42");
  assertPassed("R checker", rResult.status, rResult.feedback);

  const pyResult = await gradePythonSubmission("hello-python", 'print("Hello, Python!")');
  assertPassed("Python checker", pyResult.status, pyResult.feedback);

  console.log("[sandbox-runtime] OK");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sandbox-runtime] ${message}`);
  process.exit(1);
});
