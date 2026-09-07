/**
 * Background worker process.
 *
 * Run with `npm run worker`. It consumes the automation and maintenance queues
 * and registers the repeatable scheduler tick.
 */
import { Worker, type Job } from "bullmq";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getRedis } from "@/lib/redis";
import { captureException } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { runAutomationPipeline } from "@/features/pipeline/run";
import { pruneExpiredTokens, scheduleDueAutomations } from "@/workers/scheduler";
import {
  getQueue,
  QUEUE_NAMES,
  type AutomationJobData,
  type MaintenanceJobData,
} from "@/workers/queues";

const connection = getRedis();
const prefix = env.QUEUE_PREFIX;

const automationWorker = new Worker<AutomationJobData>(
  QUEUE_NAMES.automation,
  async (job: Job<AutomationJobData>) => {
    logger.info({ jobId: job.id, userId: job.data.userId }, "Starting automation run");
    return runAutomationPipeline({
      userId: job.data.userId,
      trigger: job.data.trigger,
      searchProfileIds: job.data.searchProfileIds,
      skipDemos: job.data.skipDemos,
    });
  },
  { connection, prefix, concurrency: 2, lockDuration: 15 * 60_000 },
);

const maintenanceWorker = new Worker<MaintenanceJobData>(
  QUEUE_NAMES.maintenance,
  async (job: Job<MaintenanceJobData>) => {
    if (job.data.task === "schedule-automations") return scheduleDueAutomations();
    if (job.data.task === "prune-expired-tokens") return pruneExpiredTokens();
    return 0;
  },
  { connection, prefix, concurrency: 1 },
);

for (const worker of [automationWorker, maintenanceWorker]) {
  worker.on("failed", (job, error) => {
    captureException(error, { operation: `worker:${worker.name}`, extra: { jobId: job?.id } });
  });
  worker.on("completed", (job) => {
    logger.debug({ queue: worker.name, jobId: job.id }, "Job completed");
  });
}

async function registerRepeatables(): Promise<void> {
  const maintenance = getQueue<MaintenanceJobData>(QUEUE_NAMES.maintenance);

  await maintenance.upsertJobScheduler(
    "schedule-automations",
    { pattern: "*/5 * * * *" },
    { name: "schedule-automations", data: { task: "schedule-automations" } },
  );

  await maintenance.upsertJobScheduler(
    "prune-expired-tokens",
    { pattern: "0 * * * *" },
    { name: "prune-expired-tokens", data: { task: "prune-expired-tokens" } },
  );

  logger.info("Registered repeatable maintenance jobs");
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down worker");
  await Promise.allSettled([automationWorker.close(), maintenanceWorker.close()]);
  await prisma.$disconnect();
  await connection.quit().catch(() => undefined);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  captureException(reason, { operation: "worker:unhandledRejection" });
});

registerRepeatables()
  .then(() => logger.info({ queues: Object.values(QUEUE_NAMES) }, "Worker ready"))
  .catch((error) => {
    captureException(error, { operation: "worker:startup" });
    process.exit(1);
  });
