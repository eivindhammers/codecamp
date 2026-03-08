import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { GradingResult } from "@/lib/grading/contracts";

const execFileAsync = promisify(execFile);

const HELLO_PYTHON_EXERCISE_ID = "hello-python";
const HELLO_PYTHON_CHECKER_PATH = path.join(
  process.cwd(),
  "content",
  "exercises",
  "intro-python",
  "basics",
  "hello-python",
  "checker.py"
);

interface ParsedCheckerOutput {
  status: "passed" | "failed";
  feedback: string[];
  tests: GradingResult["tests"];
}

function parseCheckerOutput(stdout: string): ParsedCheckerOutput {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let status: "passed" | "failed" = "failed";
  const feedback: string[] = [];
  const tests: GradingResult["tests"] = [];

  for (const line of lines) {
    if (line.startsWith("STATUS:")) {
      const parsed = line.slice("STATUS:".length).trim().toLowerCase();
      status = parsed === "passed" ? "passed" : "failed";
      continue;
    }

    if (line.startsWith("FEEDBACK:")) {
      feedback.push(line.slice("FEEDBACK:".length).trim());
      continue;
    }

    if (line.startsWith("TEST:")) {
      const payload = line.slice("TEST:".length);
      const [name, passedRaw, message] = payload.split("|");
      tests.push({
        name: (name ?? "").trim(),
        passed: (passedRaw ?? "").trim().toLowerCase() === "pass",
        message: message?.trim(),
      });
    }
  }

  if (feedback.length === 0) {
    feedback.push(
      status === "passed"
        ? "Submission passed hidden tests."
        : "Submission did not pass hidden tests."
    );
  }

  return { status, feedback, tests };
}

export async function gradePythonSubmission(
  exerciseId: string,
  code: string
): Promise<GradingResult> {
  if (exerciseId !== HELLO_PYTHON_EXERCISE_ID) {
    return {
      status: "error",
      feedback: [
        `No server-side checker is configured yet for exercise '${exerciseId}'.`,
      ],
      tests: [],
    };
  }

  try {
    await access(HELLO_PYTHON_CHECKER_PATH, constants.R_OK);
  } catch {
    return {
      status: "error",
      feedback: ["Checker file is missing for this exercise."],
      tests: [],
    };
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "codecamp-py-check-"));
  const submissionPath = path.join(workDir, "submission.py");
  const checkerOutputPath = path.join(workDir, "checker-output.txt");

  try {
    await writeFile(submissionPath, code, "utf8");

    await execFileAsync("python3", [
      HELLO_PYTHON_CHECKER_PATH,
      submissionPath,
      checkerOutputPath,
    ]);

    const checkerOutput = await readFile(checkerOutputPath, "utf8");
    const parsed = parseCheckerOutput(checkerOutput);

    return {
      status: parsed.status,
      feedback: parsed.feedback,
      tests: parsed.tests,
    };
  } catch (error) {
    const message =
      error instanceof Error && "message" in error
        ? error.message
        : "Unknown execution error.";
    const missingPython = message.includes("ENOENT");

    return {
      status: "error",
      feedback: [
        missingPython
          ? "python3 was not found on the server. Install Python to enable server-side grading."
          : `Python checker execution failed: ${message}`,
      ],
      tests: [],
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
