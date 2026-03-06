import { Worker } from "bullmq";
import { GradingResult } from "../lib/grading/contracts";
import {
  claimSubmissionForGrading,
  finalizeSubmission,
} from "../lib/grading/submissionDb";
import { gradeRSubmission } from "../lib/grading/runRChecker";
import { queueConnection } from "../lib/queue/connection";
import { submissionQueueName } from "../lib/queue/submissionQueue";

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? "2");

function unsupportedLanguageResult(language: string): GradingResult {
  return {
    status: "error",
    feedback: [`Language '${language}' is not supported by the worker yet.`],
    tests: [],
  };
}

const worker = new Worker(
  submissionQueueName,
  async (job) => {
    const submissionId = (job.data as { submissionId?: string }).submissionId;
    if (!submissionId) return;

    const workItem = claimSubmissionForGrading(submissionId);
    if (!workItem) return;

    try {
      let result: GradingResult;
      if (workItem.language === "r") {
        result = await gradeRSubmission(workItem.exerciseId, workItem.code);
      } else {
        result = unsupportedLanguageResult(workItem.language);
      }

      finalizeSubmission(submissionId, result);
    } catch (error) {
      finalizeSubmission(submissionId, {
        status: "error",
        feedback: [
          error instanceof Error
            ? `Worker execution failed: ${error.message}`
            : "Worker execution failed.",
        ],
        tests: [],
      });
      throw error;
    }
  },
  {
    connection: queueConnection,
    concurrency: Number.isNaN(concurrency) ? 2 : concurrency,
  }
);

worker.on("ready", () => {
  console.log("[worker] ready");
});

worker.on("completed", (job) => {
  console.log(`[worker] completed ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker] failed ${job?.id}: ${error.message}`);
});
