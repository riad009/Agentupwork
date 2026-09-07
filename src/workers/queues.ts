import { Queue, type JobsOptions } from "bullmq";
import { env } from "@/lib/env";
import { getRedis } from "@/lib/redis";

export const QUEUE_NAMES = {
  automation: "automation",
  demo: "demo",
  maintenance: "maintenance",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface AutomationJobData {
  userId: string;
  trigger: "SCHEDULED" | "MANUAL" | "BACKFILL";
  searchProfileIds?: string[];
  skipDemos?: boolean;
}

export interface DemoRebuildJobData {
  userId: string;
  jobId: string;
  proposalId: string;
}

export interface MaintenanceJobData {
  task: "schedule-automations" | "prune-expired-tokens";
}

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 10_000 },
  removeOnComplete: { age: 60 * 60 * 24 * 7, count: 500 },
  removeOnFail: { age: 60 * 60 * 24 * 14 },
};

const queues = new Map<string, Queue>();

export function getQueue<T = unknown>(name: QueueName): Queue<T> {
  const existing = queues.get(name);
  if (existing) return existing as Queue<T>;

  const queue = new Queue(name, {
    connection: getRedis(),
    prefix: env.QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  queues.set(name, queue);
  return queue as Queue<T>;
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
}
