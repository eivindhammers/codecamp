import { access, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GradingResult } from "@/lib/grading/contracts";
import { parseCheckerOutput } from "@/lib/grading/checkerOutput";
import { runCheckerProcess } from "@/lib/grading/runCheckerProcess";

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
  const checkerPath = path.join(workDir, "checker.py");
  const submissionPath = path.join(workDir, "submission.py");
  const checkerOutputPath = path.join(workDir, "checker-output.txt");

  try {
    await copyFile(HELLO_PYTHON_CHECKER_PATH, checkerPath);
    await writeFile(submissionPath, code, "utf8");
    const checkerResult = await runCheckerProcess({
      runtime: "python",
      command: "python3",
      args: [checkerPath, submissionPath, checkerOutputPath],
      outputPath: checkerOutputPath,
      workDir,
    });

    if (checkerResult.error) {
      if (checkerResult.error.kind === "missing-runtime") {
        return {
          status: "error",
          feedback: [
            "python3 was not found on the server. Install Python to enable server-side grading.",
          ],
          tests: [],
        };
      }

      return {
        status: "error",
        feedback: [`Python checker execution failed: ${checkerResult.error.message}`],
        tests: [],
      };
    }

    const checkerOutput = checkerResult.output ?? "";
    const parsed = parseCheckerOutput(checkerOutput);

    return {
      status: parsed.status,
      feedback: parsed.feedback,
      tests: parsed.tests,
    };
  } catch (error) {
    return {
      status: "error",
      feedback: [
        error instanceof Error
          ? `Python checker setup failed: ${error.message}`
          : "Python checker setup failed.",
      ],
      tests: [],
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
