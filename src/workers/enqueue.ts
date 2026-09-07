import "server-only";
import { logger } from "@/lib/logger";
import { isRedisAvailable } from "@/lib/redis";
import { getQueue, QUEUE_NAMES, type AutomationJobData } from "@/workers/queues";

export interface EnqueueResult {
  queued: boolean;
  mode: "queue" | "inline";
  jobId?: string;
}

/**
 * Queues an automation run.
 *
 * When Redis is unavailable the run is executed in-process instead so a
 * single-container deployment still works; the caller is told which path was
 * taken so the UI can set expectations.
 */
export async function enqueueAutomationRun(data: AutomationJobData): Promise<EnqueueResult> {
  if (await isRedisAvailable()) {
    const queue = getQueue<AutomationJobData>(QUEUE_NAMES.automation);
    const job = await queue.add("run", data, { jobId: `run:${data.userId}:${Date.now()}` });
    logger.info({ userId: data.userId, jobId: job.id }, "Queued automation run");
    return { queued: true, mode: "queue", jobId: job.id };
  }

  logger.warn({ userId: data.userId }, "Redis unavailable — running the pipeline in-process");

  const { runAutomationPipeline } = await import("@/features/pipeline/run");
  void runAutomationPipeline({
    userId: data.userId,
    trigger: data.trigger,
    searchProfileIds: data.searchProfileIds,
    skipDemos: data.skipDemos,
  }).catch((error) => logger.error({ err: error }, "In-process automation run failed"));

  return { queued: true, mode: "inline" };
}
