import { GradingResult } from "@/lib/grading/contracts";

export interface ParsedCheckerOutput {
  status: "passed" | "failed";
  feedback: string[];
  tests: GradingResult["tests"];
}

export function parseCheckerOutput(stdout: string): ParsedCheckerOutput {
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
