import { Queue } from "bullmq";
import { queueConnection } from "@/lib/queue/connection";

export const submissionQueueName = "submissions";
export const submissionJobName = "grade-submission";

export interface SubmissionJobData {
  submissionId: string;
}

let submissionQueue: Queue<SubmissionJobData, void, string> | null = null;

export function getSubmissionQueue() {
  if (!submissionQueue) {
    submissionQueue = new Queue<SubmissionJobData, void, string>(
      submissionQueueName,
      {
        connection: queueConnection,
      }
    );
  }

  return submissionQueue;
}
