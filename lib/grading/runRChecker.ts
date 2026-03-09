import { access, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GradingResult } from "@/lib/grading/contracts";
import { parseCheckerOutput } from "@/lib/grading/checkerOutput";
import { runCheckerProcess } from "@/lib/grading/runCheckerProcess";

const ARITHMETIC_EXERCISE_ID = "arithmetic";
const ARITHMETIC_CHECKER_PATH = path.join(
  process.cwd(),
  "content",
  "exercises",
  "intro-r",
  "basics",
  "arithmetic",
  "checker.R"
);

export async function gradeRSubmission(
  exerciseId: string,
  code: string
): Promise<GradingResult> {
  if (exerciseId !== ARITHMETIC_EXERCISE_ID) {
    return {
      status: "error",
      feedback: [
        `No server-side checker is configured yet for exercise '${exerciseId}'.`,
      ],
      tests: [],
    };
  }

  try {
    await access(ARITHMETIC_CHECKER_PATH, constants.R_OK);
  } catch {
    return {
      status: "error",
      feedback: ["Checker file is missing for this exercise."],
      tests: [],
    };
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "codecamp-r-check-"));
  const checkerPath = path.join(workDir, "checker.R");
  const submissionPath = path.join(workDir, "submission.R");
  const checkerOutputPath = path.join(workDir, "checker-output.txt");

  try {
    await copyFile(ARITHMETIC_CHECKER_PATH, checkerPath);
    await writeFile(submissionPath, code, "utf8");
    const checkerResult = await runCheckerProcess({
      runtime: "r",
      command: "Rscript",
      args: [checkerPath, submissionPath, checkerOutputPath],
      outputPath: checkerOutputPath,
      workDir,
    });

    if (checkerResult.error) {
      if (checkerResult.error.kind === "missing-runtime") {
        return {
          status: "error",
          feedback: [
            "Rscript was not found on the server. Install R to enable server-side grading.",
          ],
          tests: [],
        };
      }

      return {
        status: "error",
        feedback: [`R checker execution failed: ${checkerResult.error.message}`],
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
          ? `R checker setup failed: ${error.message}`
          : "R checker setup failed.",
      ],
      tests: [],
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
